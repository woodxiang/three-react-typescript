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
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as dat from 'dat.gui';
import UrlRefObjectFactory, { DataRefUrl } from './UrlRefObjectFactory';
import LiteEvent from './event';

interface IInternalControlObject {
  fov: number;
  showAxesHelper: boolean;
}

interface IHistTestResult {
  name: string;
  index: number;
}

/**
 * Rendering Engine
 */
export default class RenderingEngine {
  private parentDiv: HTMLDivElement | undefined;

  private scene: Scene | undefined;

  private camera: PerspectiveCamera | undefined;

  private renderer: WebGLRenderer | undefined;

  private orbit: OrbitControls | undefined;

  private targetObject3D: Object3D | undefined;

  private axesHelper: AxesHelper | undefined;

  private debugMode = true;

  private stats: Stats | undefined;

  private gui: dat.GUI | undefined;

  private internalControl: IInternalControlObject = {
    fov: 15,
    showAxesHelper: true,
  };

  public readonly histTestEvent = new LiteEvent<IHistTestResult>();

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
    this.camera = new PerspectiveCamera(
      this.internalControl.fov,
      width / height,
      0.1,
      1000
    );

    // Create Render
    this.renderer = new WebGLRenderer();
    this.renderer.setSize(width, height);

    div.appendChild(this.renderer.domElement);

    this.camera.position.z = 5;

    this.prepareEnvironment();

    this.orbit = new OrbitControls(this.camera, div);
    this.orbit.update();

    this.targetObject3D = new Object3D();
    this.targetObject3D.matrixAutoUpdate = false;
    this.scene.add(this.targetObject3D);

    // create hit test
    this.initHistTest(div);

    if (this.debugMode) {
      this.stats = Stats();
      this.stats.dom.style.position = 'absolute';
      div.appendChild(this.stats.dom);

      this.gui = new dat.GUI();
      this.gui
        .add(this.internalControl, 'fov', 0.1, 180)
        .onChange((newFov: number) => {
          if (this.camera) {
            this.camera.fov = newFov;
            this.camera.updateProjectionMatrix();
          }
        });
      this.gui
        .add(this.internalControl, 'showAxesHelper')
        .onChange((value: boolean) => {
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
  }

  private initHistTest(div: HTMLDivElement) {
    div.addEventListener('click', (event: MouseEvent) => {
      if (!this.renderer) {
        throw Error('no render');
      }
      const result = this.HitTest(
        (event.offsetX / this.renderer.domElement.clientWidth) * 2 - 1,
        -(event.offsetY / this.renderer.domElement.clientHeight) * 2 + 1
      );

      if (result) {
        this.histTestEvent.trigger(result);
      }
    });
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

  /**
   * get the name of objects.
   */
  public getObjects(): string[] {
    if (!this.targetObject3D) {
      throw Error('object not ready.');
    }

    return this.targetObject3D.children.map((v) => v.name);
  }

  /**
   * remove specified object.
   * @param url name of the object to remove
   */
  public removeObject(url: string): void {
    if (!this.targetObject3D) {
      throw Error('object not ready');
    }

    const toRemove = this.targetObject3D.children.find((v) => v.name === url);
    if (toRemove) {
      this.targetObject3D.remove(toRemove);
    }
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

  public HitTest(xPos: number, yPos: number): IHistTestResult | null {
    if (!this.targetObject3D) {
      throw Error('invalid target object');
    }
    if (!this.camera) {
      throw Error('invalid camera');
    }
    const rayCaster = new Raycaster();
    rayCaster.setFromCamera({ x: xPos, y: yPos }, this.camera);
    const intersection = rayCaster.intersectObjects(
      this.targetObject3D.children
    );

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
}
