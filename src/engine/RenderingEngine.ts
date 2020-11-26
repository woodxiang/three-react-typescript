import Stats from 'three/examples/jsm/libs/stats.module';
import { Scene } from 'three/src/scenes/Scene';
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera';
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer';
import { Object3D } from 'three/src/core/Object3D';
import { AxesHelper } from 'three/src/helpers/AxesHelper';
import { Color } from 'three/src/math/Color';
import { AmbientLight } from 'three/src/lights/AmbientLight';
import { DirectionalLight } from 'three/src/lights/DirectionalLight';
import { Box3 } from 'three/src/math/Box3';
import { Mesh } from 'three/src/objects/Mesh';
import { Vector3 } from 'three/src/math/Vector3';
import { Matrix4 } from 'three/src/math/Matrix4';
import { MeshPhongMaterial } from 'three/src/materials/MeshPhongMaterial';
import { FrontSide } from 'three/src/constants';
import { Raycaster } from 'three/src/core/Raycaster';
import * as dat from 'dat.gui';
import { Vector2 } from 'three/src/math/Vector2';
import { BufferGeometry } from 'three';
import UrlRefObjectFactory, { DataRefUrl } from './UrlRefObjectFactory';
import LiteEvent from './event';
import { IActionCallback, STATE, CURSORTYPE, IActionHandler, IHitTest, IHitTestResult } from './interfaces';
import RotationHandler from './RotationHandler';
import ClickHandler from './ClickHandler';
import GeoHelper from './geohelper';

interface IInternalControlObject {
  fov: number;
  showAxesHelper: boolean;
}

/**
 * Rendering Engine
 */
export default class RenderingEngine implements IActionCallback, IHitTest {
  public viewPortSize: Vector2 = new Vector2();

  /**
   * Current State: moving or rotation or picking.
   */
  public state: STATE = STATE.NONE;

  private parentDiv: HTMLDivElement | undefined;

  private scene: Scene | undefined;

  private camera: PerspectiveCamera | undefined;

  private renderer: WebGLRenderer | undefined;

  private targetObject3D: Object3D | undefined;

  private axesHelper: AxesHelper | undefined;

  private debugMode = true;

  private stats: Stats | undefined;

  private gui: dat.GUI | undefined;

  private internalControl: IInternalControlObject = {
    fov: 15,
    showAxesHelper: true,
  };

  private actionHandlers: IActionHandler[] = [];

  private cursorTypeInternal: CURSORTYPE = CURSORTYPE.ARRAW;

  private capturedPointerId = -1;

  public readonly hitTestEvent = new LiteEvent<IHitTestResult>();

  public setDebugMode(isDebugMode: boolean): void {
    if (this.debugMode === isDebugMode) return;

    if (this.debugMode) {
      if (this.parentDiv && this.stats) {
        this.parentDiv.removeChild(this.stats.dom);
        this.stats = undefined;
      }
    } else if (this.parentDiv) {
      this.stats = Stats();
      this.stats.dom.style.position = 'absolute';
      this.parentDiv.appendChild(this.stats.dom);
    }
  }

  /**
   * initialize the rendering environment.
   * @param div the div element to rendering in.
   * @param width width of the rendering window
   * @param height height of the rendering window
   */
  public init(div: HTMLDivElement, width: number, height: number): void {
    this.parentDiv = div;
    this.scene = new Scene();
    this.camera = new PerspectiveCamera(this.internalControl.fov, width / height, 0.1, 1000);

    this.viewPortSize = new Vector2(width, height);

    // Create Render
    this.renderer = new WebGLRenderer();
    this.renderer.setSize(width, height);

    div.appendChild(this.renderer.domElement);

    this.camera.position.z = 5;

    this.prepareEnvironment();

    this.targetObject3D = new Object3D();
    this.targetObject3D.matrixAutoUpdate = false;
    this.scene.add(this.targetObject3D);

    this.actionHandlers.push(new ClickHandler(), new RotationHandler(this.camera, this.targetObject3D));

    if (this.debugMode) {
      this.stats = Stats();
      this.stats.dom.style.position = 'absolute';
      div.appendChild(this.stats.dom);

      this.gui = new dat.GUI();
      this.gui.add(this.internalControl, 'fov', 0.1, 180).onChange((newFov: number) => {
        if (this.camera) {
          this.camera.fov = newFov;
          this.camera.updateProjectionMatrix();
        }
      });
      this.gui.add(this.internalControl, 'showAxesHelper').onChange((value: boolean) => {
        if (!this.scene) return;
        if (value) {
          if (!this.axesHelper) {
            const axesHelper = new AxesHelper(1);
            this.scene.add(axesHelper);
            this.axesHelper = axesHelper;
          }
        } else if (this.axesHelper) {
          this.scene.remove(this.axesHelper);
          this.axesHelper = undefined;
        }
      });
    }

    this.initEvents();
  }

  get cursorType(): CURSORTYPE {
    return this.cursorTypeInternal;
  }

  set cursorType(newType: CURSORTYPE) {
    if (!this.renderer) {
      throw Error('not initilaized.');
    }
    this.cursorTypeInternal = newType;
    switch (newType) {
      case CURSORTYPE.CROSS:
        this.renderer.domElement.style.cursor = 'crosshair';
        break;
      case CURSORTYPE.HAND:
        this.renderer.domElement.style.cursor = 'move';
        break;
      default:
        this.renderer.domElement.style.cursor = 'pointer';
        break;
    }
  }

  /**
   * capture a point.
   * @param pointerId the device captured.
   */
  public capturePointer(pointerId: number): void {
    if (!this.renderer) {
      throw Error('not initilaized.');
    }
    if (this.capturedPointerId >= 0) {
      return;
    }
    this.renderer.domElement.setPointerCapture(pointerId);
    this.capturedPointerId = pointerId;
  }

  /**
   * release captured pointer.
   */
  public releasePointer(): void {
    if (!this.renderer) {
      throw Error('not initilaized.');
    }
    if (this.capturedPointerId >= 0) {
      this.renderer.domElement.releasePointerCapture(this.capturedPointerId);
      this.capturedPointerId = -1;
    }
  }

  /**
   * get the name of objects.
   */
  public getObjects(): string[] {
    if (!this.targetObject3D) {
      throw Error('object not ready.');
    }

    return this.targetObject3D.children.map((v: { name: string }) => v.name);
  }

  /**
   * remove specified object.
   * @param url name of the object to remove
   */
  public removeObject(url: string): void {
    if (!this.targetObject3D) {
      throw Error('object not ready');
    }

    const toRemove = this.targetObject3D.children.find((v: { name: string }) => v.name === url);
    if (toRemove) {
      this.targetObject3D.remove(toRemove);
    }
  }

  /**
   * specified the object information.
   * @param src the data to load
   */
  public async addUrlRefObject(src: DataRefUrl): Promise<void> {
    if (!this.targetObject3D) {
      throw Error('object not ready.');
    }

    if (!src) {
      return;
    }

    const geometry = await UrlRefObjectFactory.loadAsync(src);
    if (this.scene && geometry) {
      const materialColor = new Color();
      materialColor.set(src.color);

      const material = new MeshPhongMaterial({
        color: materialColor,
        side: FrontSide,
      });
      const mesh = new Mesh(geometry, material);
      mesh.name = src.url;
      this.targetObject3D.add(mesh);

      this.updateScales();
    }
  }

  /**
   * start animation.
   */
  public startAnimate(): void {
    if (!(this.renderer && this.scene && this.camera)) {
      throw new Error('Invalid renderer');
    }

    const animate = () => {
      if (!this) throw new Error('invalid this pointer');
      if (!(this.renderer && this.scene && this.camera)) {
        throw new Error('Invalid renderer');
      }
      requestAnimationFrame(animate);
      this.renderer.render(this.scene, this.camera);
      this.stats?.update();
    };
    animate();
  }

  /**
   * test the triangle on specified position.
   * @param xPos hit position x
   * @param yPos hit position y
   */
  public testTriangle(xPos: number, yPos: number): IHitTestResult | null {
    if (!this.targetObject3D) {
      throw Error('invalid target object');
    }
    if (!this.camera) {
      throw Error('invalid camera');
    }
    const rayCaster = new Raycaster();
    rayCaster.setFromCamera({ x: xPos, y: yPos }, this.camera);
    const intersection = rayCaster.intersectObjects(this.targetObject3D.children);

    if (intersection.length > 0) {
      const ret = intersection[0];
      if (!ret.faceIndex) {
        throw Error('invalid face index.');
      }
      return { name: ret.object.name, index: ret.faceIndex };
    }
    return null;
  }

  /**
   * handle window size changed.
   * @param width new width
   * @param height new height
   */
  public resize(width: number, height: number): void {
    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    if (this.renderer) this.renderer.setSize(width, height);
  }

  private initEvents() {
    if (!this.renderer) {
      throw Error('Not initliazed.');
    }

    this.renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
      for (let i = 0; i < this.actionHandlers.length; i += 1) {
        const handler = this.actionHandlers[i];
        if (handler.isEnabled) {
          let isTerminated = false;
          switch (event.button) {
            case 0:
              isTerminated = handler.handleLeftButtonDown(event, this);
              break;
            case 1:
              isTerminated = handler.handleMiddleButtonDown(event, this);
              break;
            case 2:
              isTerminated = handler.handleRightButtonDown(event, this);
              break;
            default:
              throw Error('invalid button.');
          }
          if (isTerminated) {
            break;
          }
        }
      }
      event?.preventDefault();
    });

    this.renderer.domElement.addEventListener('pointerup', (event: PointerEvent) => {
      for (let i = 0; i < this.actionHandlers.length; i += 1) {
        const handler = this.actionHandlers[i];
        if (handler.isEnabled) {
          let isTerminated = false;
          switch (event.button) {
            case 0:
              isTerminated = handler.handleLeftButtonUp(event, this);
              break;
            case 1:
              isTerminated = handler.handleMiddleButtonUp(event, this);
              break;
            case 2:
              isTerminated = handler.handleRightButtonUp(event, this);
              break;
            default:
              throw Error('invalid button.');
          }
          if (isTerminated) {
            break;
          }
        }
      }
      event?.preventDefault();
    });

    this.renderer.domElement.addEventListener('pointermove', (event: PointerEvent) => {
      for (let i = 0; i < this.actionHandlers.length; i += 1) {
        const handler = this.actionHandlers[i];
        if (handler.isEnabled && handler.handleMouseMove(event, this)) break;
      }
      event?.preventDefault();
    });

    this.renderer.domElement.addEventListener('keydown', (event: KeyboardEvent) => {
      for (let i = 0; i < this.actionHandlers.length; i += 1) {
        const handler = this.actionHandlers[i];
        if (handler.isEnabled && handler.handleKeyDown(event, this)) break;
      }
      event?.preventDefault();
    });

    this.renderer.domElement.addEventListener('keyup', (event: KeyboardEvent) => {
      for (let i = 0; i < this.actionHandlers.length; i += 1) {
        const handler = this.actionHandlers[i];
        if (handler.isEnabled && handler.handleKeyUp(event, this)) break;
      }
      event?.preventDefault();
    });
  }

  public selectFace(name: string, index: number): void {
    const geometry = this.findGeometry(name);
    GeoHelper.selectFace(geometry, index);
  }

  private findGeometry(name: string): BufferGeometry {
    const mesh = this.targetObject3D?.children.find((item: { name: string }) => item.name === name);

    return (<Mesh>mesh).geometry as BufferGeometry;
  }

  private prepareEnvironment(): void {
    if (!this.scene) {
      throw new Error('scene not intialized.');
    }
    this.scene.background = new Color(0xaaaaaa);
    const ambientLight = new AmbientLight(0x333333);
    const light = new DirectionalLight(0xffffff, 1.0);

    this.scene.add(ambientLight);
    this.scene.add(light);

    const axesHelper = new AxesHelper(1);
    this.scene.add(axesHelper);
    this.axesHelper = axesHelper;
  }

  private updateScales(): void {
    if (!this.targetObject3D) {
      throw Error('object not ready');
    }
    let boundingBox: Box3 | null = null;

    for (let i = 0; i < this.targetObject3D.children.length; i += 1) {
      const thisMesh = this.targetObject3D.children[i] as Mesh;
      if (thisMesh) {
        const thisGeometry = thisMesh.geometry;
        if (!thisGeometry.boundingBox) thisGeometry.computeBoundingBox();
        const thisBox = thisGeometry.boundingBox;
        if (thisBox) {
          if (!boundingBox) {
            boundingBox = thisBox;
          } else {
            boundingBox.union(thisBox);
          }
        }
      }
    }

    if (boundingBox) {
      const center = new Vector3();
      boundingBox.getCenter(center);
      const size = new Vector3();
      boundingBox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const matTranslate = new Matrix4();
      matTranslate.makeTranslation(-center.x, -center.y, -center.z);
      const matScale = new Matrix4();
      matScale.makeScale(1.0 / maxDim, 1.0 / maxDim, 1.0 / maxDim);

      matScale.multiply(matTranslate);
      this.targetObject3D.matrix = matScale;
      this.targetObject3D.matrixWorldNeedsUpdate = true;
    }
  }
}