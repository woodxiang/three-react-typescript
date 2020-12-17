import Stats from 'three/examples/jsm/libs/stats.module';
import { Scene } from 'three/src/scenes/Scene';
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera';
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer';
import { AxesHelper } from 'three/src/helpers/AxesHelper';
import { Color } from 'three/src/math/Color';
import { AmbientLight } from 'three/src/lights/AmbientLight';
import { DirectionalLight } from 'three/src/lights/DirectionalLight';
import { Box3 } from 'three/src/math/Box3';
import { Mesh } from 'three/src/objects/Mesh';
import { Vector3 } from 'three/src/math/Vector3';
import { Matrix4 } from 'three/src/math/Matrix4';
import { Raycaster } from 'three/src/core/Raycaster';
import * as dat from 'dat.gui';
import { Vector2 } from 'three/src/math/Vector2';
import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { Group } from 'three/src/objects/Group';
import { Object3D } from 'three/src/core/Object3D';
import { MeshPhongMaterial } from 'three/src/materials/MeshPhongMaterial';
import { FrontSide } from 'three/src/constants';
import LiteEvent from './event';
import {
  IActionCallback,
  STATE,
  CURSORTYPE,
  IActionHandler,
  IHitTest,
  IHitTestResult,
  IObjectRotation,
  IHitTestHandler,
} from './interfaces';
import RotationHandler from './RotationHandler';
import ClickHandler from './ClickHandler';
import SelectionHelper from './SelectionHelper';

interface IInternalControlObject {
  fov: number;
  showAxesHelper: boolean;
}

/**
 * Rendering Engine
 */
export default class RenderingEngine implements IActionCallback, IObjectRotation, IHitTest {
  public viewPortSize: Vector2 = new Vector2();

  /**
   * Current State: moving or rotation or picking.
   */
  public state: STATE = STATE.NONE;

  private parentDiv: HTMLDivElement | undefined;

  private scene: Scene | undefined;

  private camera: PerspectiveCamera | undefined;

  private renderer: WebGLRenderer | undefined;

  private targetObject3D: Group | undefined;

  private adapteMatrix: Matrix4 = new Matrix4();

  private rotateMatrix: Matrix4 = new Matrix4();

  private axesHelper: AxesHelper | undefined;

  private clickHandler: ClickHandler | undefined;

  private selectionHelper = new SelectionHelper();

  private inactivePlaneMaterial = new MeshPhongMaterial({ color: '#00FF00', side: FrontSide });

  private activedPlaneMaterial = new MeshPhongMaterial({ color: '#FF0000', side: FrontSide });

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

  public readonly faceClickedEvent = new LiteEvent<IHitTestResult>();

  public hitTestHandler: IHitTestHandler | undefined = undefined;

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
    if (this.parentDiv) {
      throw Error('already initialzied.');
    }
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

    this.targetObject3D = new Group();
    this.targetObject3D.matrixAutoUpdate = false;
    this.scene.add(this.targetObject3D);

    this.clickHandler = new ClickHandler();
    this.actionHandlers.push(this.clickHandler, new RotationHandler(this.camera, this));

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

  public Dispose(): void {
    if (this.debugMode) {
      this.gui?.destroy();
    }

    this.targetObject3D?.clear();
    this.scene?.clear();
    this.camera?.clear();
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
      case CURSORTYPE.ARRAW:
        this.renderer.domElement.style.cursor = 'pointer';
        break;
      default:
        this.renderer.domElement.style.cursor = 'default';
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
   * add mesh
   * @param newMesh new mesh to add
   * @param groupName the group if it is in a group.
   */
  public AddMesh(newMesh: Mesh, groupName: string | undefined = undefined): void {
    if (!this.targetObject3D) {
      throw Error('invalid target object group');
    }

    if (!groupName) {
      this.targetObject3D.add(newMesh);
    } else {
      let targetGroup = RenderingEngine.findGroup(this.targetObject3D, groupName);
      if (!targetGroup) {
        targetGroup = new Group();
        targetGroup.name = groupName;
        this.targetObject3D.add(targetGroup);
      }

      targetGroup.add(newMesh);
    }

    this.updateScales();
  }

  /**
   * remove specified mesh.
   * @param name the mesh name to remove.
   * @param groupName the group name if it included.
   */
  public RemoveMesh(name: string, groupName: string | undefined = undefined): boolean {
    if (!this.targetObject3D) {
      throw Error('no root.');
    }
    if (groupName) {
      const group = RenderingEngine.findGroup(this.targetObject3D, groupName);
      if (group) {
        const index = group.children.findIndex((mesh: Object3D) => mesh.name === name);
        group.children.splice(index, 1);
        return true;
      }
    } else {
      const index = this.targetObject3D.children.findIndex((mesh: Object3D) => mesh.name === name);
      this.targetObject3D.children.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Remove all the meshes
   */
  public ClearMeshes(): void {
    if (!this.targetObject3D) {
      throw Error('no root.');
    }

    this.targetObject3D.clear();
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
   * handle hit test
   * @param xPos x hit position
   * @param yPos y hit position
   */
  public hit(xPos: number, yPos: number): boolean {
    const hitTestReuslt = this.hitTest(xPos, yPos);
    if (this.hitTestHandler && hitTestReuslt) {
      return this.hitTestHandler.onHit(hitTestReuslt);
    }
    return false;
  }

  /**
   * Get the matrix of rotation.
   */
  public getRotationMatrix(): Matrix4 {
    return this.rotateMatrix;
  }

  /**
   * update rotation matrix and apply it.
   * @param mat new matrix for rotaion.
   */
  public setRotationMatrix(mat: Matrix4): void {
    this.rotateMatrix = mat;
    this.updateTargetObject3dMatrix();
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

  /**
   * update selected flats on specified object.
   * @param name the name of the object.
   * @param inactiveFaces inactiveFaces
   * @param activeFaces active faces.(last selected)
   */
  public updateFlats(name: string, inactiveFaces: number[], activeFaces: number[]): void {
    const mesh = this.findMesh(name);

    if (!mesh.material) {
      throw Error('no default material.');
    }
    if (!Array.isArray(mesh.material)) {
      mesh.material = [mesh.material, this.inactivePlaneMaterial, this.activedPlaneMaterial];
    }
    const geo = mesh.geometry as BufferGeometry;
    if (!geo) {
      throw Error('invalid geometry.');
    }

    SelectionHelper.UpdateGroups(
      geo,
      0,
      { faces: inactiveFaces, materialIndex: 1 },
      { faces: activeFaces, materialIndex: 2 }
    );
  }

  /**
   * Remove all flats.
   */
  public clearAllFlats(): void {
    if (this.targetObject3D) {
      SelectionHelper.clearIndexes(this.targetObject3D);
    }
  }

  public findFlat(name: string, index: number): { faceIndexes: number[]; normal: Vector3 } {
    const geometry = this.findGeometry(name);
    return this.selectionHelper.findConnectedFacesInPlane(geometry, index);
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

  /**
   * test the triangle on specified position.
   * @param xPos hit position x
   * @param yPos hit position y
   */
  private hitTest(xPos: number, yPos: number): IHitTestResult | null {
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
      if (!ret.face) {
        throw Error('invalid face index.');
      }
      return { name: ret.object.name, index: ret.face.a / 3, pos: ret.point };
    }
    return null;
  }

  private findMesh(name: string): Mesh {
    return this.targetObject3D?.children.find((item: { name: string }) => item.name === name) as Mesh;
  }

  private findGeometry(name: string): BufferGeometry {
    const mesh = this.findMesh(name);
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
      // calculate the matrix to adapte object position and scale to the
      // center of the clip space.
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
      this.adapteMatrix = matScale;

      // apply the adapte scale.
      this.updateTargetObject3dMatrix();
      this.selectionHelper.setMaxSize(maxDim);
    }
  }

  private updateTargetObject3dMatrix() {
    if (this.targetObject3D) {
      const matrix = this.rotateMatrix.clone();
      matrix.multiply(this.adapteMatrix);

      this.targetObject3D.matrix = matrix;
      this.targetObject3D.matrixWorldNeedsUpdate = true;
    }
  }

  private static findGroup(parent: Group, groupName: string): Group | undefined {
    for (let i = 0; i < parent.children.length; i += 1) {
      const group = <Group>parent.children[i];
      if (group) {
        if (group.name === groupName) return <Group>group;
        const ret = RenderingEngine.findGroup(<Group>group, groupName);
        if (ret) {
          return ret;
        }
      }
    }
    return undefined;
  }
}
