import Stats from 'three/examples/jsm/libs/stats.module';
import { Scene } from 'three/src/scenes/Scene';
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera';
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer';
import { AxesHelper } from 'three/src/helpers/AxesHelper';
import { Color } from 'three/src/math/Color';
import { AmbientLight } from 'three/src/lights/AmbientLight';
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
import { FloatType, FrontSide, UnsignedByteType } from 'three/src/constants';
import { SphereGeometry } from 'three/src/geometries/SphereGeometry';
import { WebGLRenderTarget } from 'three/src/renderers/WebGLRenderTarget';
import { PointLight } from 'three/src/lights/PointLight';
import { Points } from 'three/src/objects/Points';
import { encode } from './utils/encoder';
import {
  IActionCallback,
  STATE,
  CURSORTYPE,
  IActionHandler,
  IHitTest,
  IHitTestResult,
  IObjectRotation,
  IHitTestHandler,
  IFlat,
  renderingModelName,
} from './interfaces';
import RotationHandler from './RotationHandler';
import ClickHandler from './ClickHandler';
import SelectionHelper from './SelectionHelper';
import LiteEvent from './event';

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

  public root: Group = new Group(); // This is the root for all objects.

  private targetObject3D = new Group(); // this is the root for all target models.

  private adapteMatrix: Matrix4 = new Matrix4();

  private rotateMatrix: Matrix4 = new Matrix4();

  private wrappedMaxDim = 1;

  private wrappedBoundingBox: Box3 | undefined;

  private axesHelper: AxesHelper | undefined;

  private selectionHelper = new SelectionHelper();

  private inactiveFlatMaterial = new MeshPhongMaterial({ color: '#00FF00', side: FrontSide });

  private activedFlatMaterial = new MeshPhongMaterial({ color: '#FF0000', side: FrontSide });

  private inactivePointMaterial = new MeshPhongMaterial({ color: '#00FF00', side: FrontSide });

  private activePointMaterial = new MeshPhongMaterial({ color: '#FF0000', side: FrontSide });

  public meshAddedEvent = new LiteEvent<Mesh | Points>();

  public meshRemovedEvent = new LiteEvent<string>();

  public meshVisibleChangedEvent = new LiteEvent<{ target: string; visible: boolean }>();

  public domainRangeChangedEvent = new LiteEvent<Box3>();

  public objectTransformChangedEvent = new LiteEvent<Matrix4>();

  private debugMode = true;

  private stats: Stats | undefined;

  private gui: dat.GUI | undefined;

  private internalControl: IInternalControlObject = {
    fov: 15,
    showAxesHelper: true,
  };

  private wrappedActionHandlers: IActionHandler[] = [];

  private wrappedCursorType: CURSORTYPE = CURSORTYPE.ARRAW;

  private capturedPointerId = -1;

  public hitTestHandler: IHitTestHandler | undefined = undefined;

  private testScene = new Scene();

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
    this.camera = new PerspectiveCamera(this.internalControl.fov, width / height, 0.01, 100);
    this.camera.position.set(0, 0, 10);

    this.viewPortSize = new Vector2(width, height);

    // Create Render
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);

    div.appendChild(this.renderer.domElement);

    this.prepareEnvironment();

    this.root.matrixAutoUpdate = false;

    this.targetObject3D.name = renderingModelName;

    this.root.add(this.targetObject3D);

    this.scene.add(this.root);

    this.wrappedActionHandlers.push(new ClickHandler(), new RotationHandler(this.camera, this));

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

  public dispose(): void {
    if (this.debugMode) {
      this.gui?.destroy();
    }

    this.targetObject3D?.clear();
    this.scene?.clear();
    this.camera?.clear();
  }

  get cursorType(): CURSORTYPE {
    return this.wrappedCursorType;
  }

  set cursorType(newType: CURSORTYPE) {
    if (!this.renderer) {
      throw Error('not initilaized.');
    }
    this.wrappedCursorType = newType;
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

  get actionHandler(): IActionHandler[] {
    return this.wrappedActionHandlers;
  }

  get boundingBox(): Box3 | undefined {
    return this.wrappedBoundingBox;
  }

  get cameraFov(): number {
    const ret = this.camera?.fov;
    if (ret === undefined) {
      throw Error('invalid camera');
    }

    return ret;
  }

  get cameraEye(): Vector3 {
    const ret = this.camera?.position;
    if (ret === undefined) {
      throw Error('invalid camera');
    }

    return ret;
  }

  // eslint-disable-next-line class-methods-use-this
  get camaerAt(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  get maxDim(): number {
    return this.wrappedMaxDim;
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

  public set enableClipping(enableClipping: boolean) {
    if (!this.renderer) {
      throw Error('not intialized.');
    }
    this.renderer.localClippingEnabled = enableClipping;
  }

  public get enableClipping(): boolean {
    if (!this.renderer) {
      throw Error('not intialized.');
    }

    return this.renderer.localClippingEnabled;
  }

  /**
   * add mesh
   * @param newMesh new mesh to add
   * @param groupName the group if it is in a group.
   */
  public addMesh(newMesh: Mesh | Points): void {
    if (!this.targetObject3D) {
      throw Error('invalid target object group');
    }

    this.targetObject3D.add(newMesh);

    this.updateScales();

    this.meshAddedEvent.trigger(newMesh);
  }

  /**
   * remove specified mesh.
   * @param name the mesh name to remove.
   * @param groupName the group name if it included.
   */
  public removeMesh(name: string): boolean {
    if (!this.targetObject3D) {
      throw Error('no root.');
    }

    const index = this.targetObject3D.children.findIndex((mesh: Object3D) => mesh.name === name);
    if (index >= 0) {
      this.targetObject3D.children.splice(index, 1);
      this.updateScales();
      this.meshRemovedEvent.trigger(name);
      return true;
    }

    return false;
  }

  public setVisible(visible: boolean, name: string): boolean {
    const mesh = this.findMesh(name);
    if (mesh) {
      mesh.visible = visible;
      this.meshVisibleChangedEvent.trigger({ target: name, visible });
      return true;
    }
    return false;
  }

  public setMeshColor(color: Color, name: string): boolean {
    const mesh = this.findMesh(name);

    if (mesh) {
      const material = Array.isArray(mesh.material)
        ? (mesh.material[0] as MeshPhongMaterial)
        : (mesh.material as MeshPhongMaterial);
      if (material) {
        material.color.set(color);

        return true;
      }
    }

    return false;
  }

  /**
   * Remove all the meshes
   */
  public clearMeshes(): void {
    if (!this.targetObject3D) {
      throw Error('no root.');
    }

    this.targetObject3D.clear();
  }

  public calculateMeshVolume(name: string): number {
    if (!this.targetObject3D) {
      throw Error('no root.');
    }

    const obj = <BufferGeometry>(
      (<Mesh>(<unknown>this.targetObject3D.children.find((mesh: Object3D) => mesh.name === name)))?.geometry
    );
    if (obj) {
      return SelectionHelper.calculateGeometryVolume(obj);
    }

    throw Error('no specified geometry.');
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

  public exportImage(width: number, height: number, scene: Scene | undefined = undefined): Uint8Array {
    if (!this.renderer || !this.scene || !this.camera) {
      throw Error('invalid render');
    }
    const target = new WebGLRenderTarget(width, height, { type: UnsignedByteType });

    this.renderer.setRenderTarget(target);

    this.renderer.render(scene === undefined ? this.scene : scene, this.camera);

    const data = new Uint8Array(width * height * 4);

    this.renderer.readRenderTargetPixels(target, 0, 0, width, height, data);

    RenderingEngine.flipImageData(data, width, height);

    this.renderer.setRenderTarget(null);

    const jpgdata = encode({ data, width, height }, 100);

    target.dispose();

    return jpgdata.data;
  }

  public renderTargetAndReadFloat(scene: Scene, xPos: number, yPos: number): Float32Array {
    if (!this.renderer || !this.scene || !this.camera) {
      throw Error('invalid render');
    }
    const { width, height } = this.viewPortSize;
    const target = new WebGLRenderTarget(width, height, { type: FloatType });
    this.renderer.setRenderTarget(target);
    this.renderer.render(scene, this.camera);
    const data = new Float32Array(4);
    this.renderer.readRenderTargetPixels(target, xPos, height - yPos, 1, 1, data);
    this.renderer.setRenderTarget(null);
    target.dispose();
    return data;
  }

  private static flipImageData(img: Uint8Array | Float32Array, width: number, height: number) {
    const nFlip = Math.floor(height / 2);

    let buf: Uint8Array | Float32Array;
    for (let i = 0; i < nFlip; i += 1) {
      buf = img.slice(i * width * 4, (i + 1) * width * 4);
      img.copyWithin(i * width * 4, (height - i - 1) * width * 4, (height - i) * width * 4);
      img.set(buf, (height - i - 1) * width * 4);
    }
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
    this.updateRootObjectMatrix();
  }

  public getMatrix(): Matrix4 {
    const matrix = this.rotateMatrix.clone();
    matrix.multiply(this.adapteMatrix);

    return matrix;
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
    if (mesh) {
      if (!mesh.material) {
        throw Error('no default material.');
      }
      if (!Array.isArray(mesh.material)) {
        const inactiveFlatMaterial = this.inactiveFlatMaterial.clone();
        inactiveFlatMaterial.clippingPlanes = mesh.material.clippingPlanes;
        const activedFlatMaterial = this.activedFlatMaterial.clone();
        activedFlatMaterial.clippingPlanes = mesh.material.clippingPlanes;
        mesh.material = [mesh.material, inactiveFlatMaterial, activedFlatMaterial];
      }
      const geo = mesh.geometry as BufferGeometry;
      if (!geo) {
        throw Error('invalid geometry.');
      }

      SelectionHelper.updateGroups(
        geo,
        0,
        { faces: inactiveFaces, materialIndex: 1 },
        { faces: activeFaces, materialIndex: 2 }
      );
    }
  }

  /**
   * Remove all flats.
   */
  public clearAllFlats(): void {
    if (this.targetObject3D) {
      SelectionHelper.clearIndexes(this.targetObject3D);
    }
  }

  /**
   * find all connected faces with same normal with specified face.
   * @param name the name of the target object.
   * @param index the index of the source face.
   */
  public findFlat(name: string, index: number): IFlat | undefined {
    const geometry = this.findGeometry(name);
    if (geometry) {
      return this.selectionHelper.findFlatByFace(geometry, index);
    }
    return undefined;
  }

  /**
   * add a new point and set it as active.
   * @param name name of the point
   * @param pos position of the point
   */
  public addPoint(name: string, pos: number[]): void {
    if (!this.targetObject3D) {
      throw Error('no container.');
    }

    const ball = new SphereGeometry(this.wrappedMaxDim / 300, 4, 4);
    const mesh = new Mesh(ball, this.activePointMaterial);
    mesh.translateX(pos[0]);
    mesh.translateY(pos[1]);
    mesh.translateZ(pos[2]);
    mesh.name = name;
    ball.name = name;
    this.targetObject3D.add(mesh);
  }

  /**
   * set target sensor activity
   * @param name the target sensor to active/inactive
   * @param enable active/inactive
   */
  public activePoint(name: string, enable: boolean): void {
    if (!this.targetObject3D) {
      throw Error('no container.');
    }

    const toUpdate = <Mesh>this.targetObject3D.children.find((v) => v.name === name);
    if (toUpdate) {
      toUpdate.material = enable ? this.activePointMaterial : this.inactivePointMaterial;
    }
  }

  private initEvents() {
    if (!this.renderer) {
      throw Error('Not initliazed.');
    }

    this.renderer.domElement.addEventListener('pointerdown', (event: PointerEvent) => {
      for (let i = 0; i < this.wrappedActionHandlers.length; i += 1) {
        const handler = this.wrappedActionHandlers[i];
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
      for (let i = 0; i < this.wrappedActionHandlers.length; i += 1) {
        const handler = this.wrappedActionHandlers[i];
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
      for (let i = 0; i < this.wrappedActionHandlers.length; i += 1) {
        const handler = this.wrappedActionHandlers[i];
        if (handler.isEnabled && handler.handleMouseMove(event, this)) break;
      }
      event?.preventDefault();
    });

    this.renderer.domElement.addEventListener('keydown', (event: KeyboardEvent) => {
      for (let i = 0; i < this.wrappedActionHandlers.length; i += 1) {
        const handler = this.wrappedActionHandlers[i];
        if (handler.isEnabled && handler.handleKeyDown(event, this)) break;
      }
      event?.preventDefault();
    });

    this.renderer.domElement.addEventListener('keyup', (event: KeyboardEvent) => {
      for (let i = 0; i < this.wrappedActionHandlers.length; i += 1) {
        const handler = this.wrappedActionHandlers[i];
        if (handler.isEnabled && handler.handleKeyUp(event, this)) break;
      }
      event?.preventDefault();
    });

    this.renderer.domElement.addEventListener('wheel', (event: WheelEvent) => {
      for (let i = 0; i < this.wrappedActionHandlers.length; i += 1) {
        const handler = this.wrappedActionHandlers[i];
        if (handler.isEnabled && handler.handleWhell(event, this)) break;
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

      const matrix = this.getMatrix();

      const m = matrix.invert();
      return { name: ret.object.name, index: ret.face.a / 3, pos: ret.point.applyMatrix4(m) };
    }
    return null;
  }

  private findMesh(name: string): Mesh | undefined {
    if (!this.targetObject3D) {
      throw Error('no root');
    }
    const collection = this.targetObject3D.children;

    return collection.find((mesh: Object3D) => mesh.name === name) as Mesh;
  }

  private findGeometry(name: string): BufferGeometry | undefined {
    const mesh = this.findMesh(name);
    if (mesh) return mesh.geometry as BufferGeometry;
    return undefined;
  }

  private prepareEnvironment(): void {
    if (!this.scene) {
      throw new Error('scene not intialized.');
    }
    this.scene.background = new Color(0xaaaaaa);
    const ambientLight = new AmbientLight(0x4d4d4d);
    const light1 = new PointLight(0xffffff, 0.7);
    light1.position.set(3.0, 3.0, 3.0);
    const light2 = new PointLight(0xffffff, 0.7);
    light2.position.set(-3.0, -3.0, 3.0);
    this.scene.add(ambientLight);
    this.scene.add(light1);
    this.scene.add(light2);
  }

  private updateScales(): void {
    if (!this.targetObject3D) {
      throw Error('object not ready');
    }
    let boundingBox: Box3 | undefined;

    for (let i = 0; i < this.targetObject3D.children.length; i += 1) {
      const thisMesh = this.targetObject3D.children[i] as Mesh;
      if (thisMesh) {
        const thisGeometry = thisMesh.geometry;
        if (!thisGeometry.boundingBox) thisGeometry.computeBoundingBox();
        const thisBox = thisGeometry.boundingBox;
        if (thisBox) {
          if (!boundingBox) {
            boundingBox = thisBox.clone();
          } else {
            boundingBox.union(thisBox);
          }
        }
      }
    }

    this.wrappedBoundingBox = boundingBox;

    if (boundingBox) {
      // calculate the matrix to adapte object position and scale to the
      // center of the clip space.
      const center = new Vector3();
      boundingBox.getCenter(center);
      const size = new Vector3();
      boundingBox.getSize(size);
      this.wrappedMaxDim = Math.max(size.x, size.y, size.z);
      const matTranslate = new Matrix4();
      matTranslate.makeTranslation(-center.x, -center.y, -center.z);
      const matScale = new Matrix4();
      matScale.makeScale(2.0 / this.wrappedMaxDim, 2.0 / this.wrappedMaxDim, 2.0 / this.wrappedMaxDim);

      matScale.multiply(matTranslate);
      this.adapteMatrix = matScale;

      this.domainRangeChangedEvent.trigger(boundingBox);

      // apply the adapte scale.
      this.updateRootObjectMatrix();
      this.selectionHelper.setMaxSize(this.wrappedMaxDim);
    } else {
      this.adapteMatrix = new Matrix4();
      this.domainRangeChangedEvent.trigger(undefined);
    }
  }

  private updateRootObjectMatrix() {
    const matrix = this.getMatrix();

    if (this.root) {
      this.root.matrix = matrix;
      this.root.matrixWorldNeedsUpdate = true;
    }

    this.objectTransformChangedEvent.trigger(matrix);
  }
}
