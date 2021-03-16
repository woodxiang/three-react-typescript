import Stats from 'three/examples/jsm/libs/stats.module';
import { Scene } from 'three/src/scenes/Scene';
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera';
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer';
import { Color } from 'three/src/math/Color';
import { AmbientLight } from 'three/src/lights/AmbientLight';
import { Box3 } from 'three/src/math/Box3';
import { Mesh } from 'three/src/objects/Mesh';
import { Vector3 } from 'three/src/math/Vector3';
import { Matrix4 } from 'three/src/math/Matrix4';
import { Raycaster } from 'three/src/core/Raycaster';
import { Vector2 } from 'three/src/math/Vector2';
import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { Group } from 'three/src/objects/Group';
import { Object3D } from 'three/src/core/Object3D';
import { MeshPhongMaterial } from 'three/src/materials/MeshPhongMaterial';
import { FloatType, FrontSide, LinearFilter, UnsignedByteType } from 'three/src/constants';
import { SphereGeometry } from 'three/src/geometries/SphereGeometry';
import { WebGLRenderTarget } from 'three/src/renderers/WebGLRenderTarget';
import { PointLight } from 'three/src/lights/PointLight';
import { Points } from 'three/src/objects/Points';
import { Vector4 } from 'three/src/math/Vector4';
import { Camera } from 'three/src/cameras/Camera';
import { encode } from './utils/encoder';
import {
  IActionCallback,
  STATE,
  CURSOR_TYPE,
  IActionHandler,
  IHitTest,
  IHitTestResult,
  IObjectRotation,
  IHitTestHandler,
  IFlat,
  renderingModelName,
  IRenderHandler,
} from './interfaces';
import RotationHandler from './RotationHandler';
import ClickHandler from './ClickHandler';
import SelectionHelper from './SelectionHelper';
import LiteEvent from './event';
import NavigatorHandler from './NavigatorHandler';
import TextureFactory from './Materials/TextureFactory';

/**
 * Rendering Engine
 */
export default class RenderingEngine implements IActionCallback, IObjectRotation, IHitTest {
  private wrappedViewPortSize: Vector2 = new Vector2();

  /**
   * Current State: moving or rotation or picking.
   */
  public state: STATE = STATE.NONE;

  private parentDiv: HTMLDivElement | undefined;

  private wrappedScene: Scene = new Scene();

  private renderer = new WebGLRenderer({ antialias: true, alpha: true });

  private camera = new PerspectiveCamera(15, 1, 0.01, 100);

  private wrappedRoot: Group = new Group(); // This is the root for all objects.

  private targetObject3D = new Group(); // this is the root for all target models.

  private adaptMatrix: Matrix4 = new Matrix4();

  private wrappedRotateMatrix: Matrix4 = new Matrix4();

  private wrappedMaxDim = 1;

  private wrappedBoundingBox: Box3 | undefined;

  private selectionHelper = new SelectionHelper();

  private inactiveFlatMaterial = new MeshPhongMaterial({ color: '#00FF00', side: FrontSide });

  private activeFlatMaterial = new MeshPhongMaterial({ color: '#FF0000', side: FrontSide });

  private inactivePointMaterial = new MeshPhongMaterial({ color: '#00FF00', side: FrontSide });

  private activePointMaterial = new MeshPhongMaterial({ color: '#FF0000', side: FrontSide });

  public wrappedAdaptRange: Box3 | undefined;

  public meshAddedEvent = new LiteEvent<Mesh | Points>();

  public meshRemovedEvent = new LiteEvent<string>();

  public meshVisibleChangedEvent = new LiteEvent<{ target: string; visible: boolean }>();

  public domainRangeChangedEvent = new LiteEvent<Box3>();

  public objectTransformChangedEvent = new LiteEvent<Matrix4>();

  private debugMode = true;

  private stats: Stats | undefined;

  private wrappedActionHandlers: IActionHandler[] = [];

  private wrappedRenderHandlers: IRenderHandler[] = [];

  private wrappedCursorType: CURSOR_TYPE = CURSOR_TYPE.ARROW;

  private capturedPointerId = -1;

  public hitTestHandler: IHitTestHandler | undefined = undefined;

  private navigator: NavigatorHandler | undefined;

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
      throw Error('already initialized.');
    }
    this.parentDiv = div;
    this.camera.position.set(0, 0, 10);

    this.wrappedViewPortSize = new Vector2(width, height);

    this.resize(width, height);

    div.appendChild(this.renderer.domElement);

    this.prepareEnvironment();

    this.wrappedRoot.matrixAutoUpdate = false;

    this.targetObject3D.name = renderingModelName;

    this.wrappedRoot.add(this.targetObject3D);

    this.wrappedScene.add(this.wrappedRoot);

    this.navigator = new NavigatorHandler();
    this.navigator.bind(this);
    this.wrappedActionHandlers.push(new ClickHandler(), new RotationHandler(this.camera), this.navigator);

    if (this.debugMode) {
      this.stats = Stats();
      this.stats.dom.style.position = 'absolute';
      div.appendChild(this.stats.dom);
    }

    this.initEvents();
  }

  public dispose(): void {
    this.targetObject3D.clear();
    this.wrappedScene.clear();
    this.camera.clear();
  }

  get adaptRange(): Box3 | undefined {
    return this.wrappedAdaptRange;
  }

  set adaptRange(boundingBox: Box3 | undefined) {
    this.wrappedAdaptRange = boundingBox;
    if (boundingBox) {
      this.adaptMatrix = RenderingEngine.calculateAdaptMatrix(boundingBox).mat;
    } else if (this.wrappedBoundingBox) {
      this.adaptMatrix = RenderingEngine.calculateAdaptMatrix(this.wrappedBoundingBox).mat;
    }
  }

  get viewPortSize(): Vector2 {
    return this.wrappedViewPortSize;
  }

  get root(): Group {
    return this.wrappedRoot;
  }

  get scene(): Scene {
    return this.wrappedScene;
  }

  get cursorType(): CURSOR_TYPE {
    return this.wrappedCursorType;
  }

  set cursorType(newType: CURSOR_TYPE) {
    this.wrappedCursorType = newType;
    switch (newType) {
      case CURSOR_TYPE.CROSS:
        this.renderer.domElement.style.cursor = 'crosshair';
        break;
      case CURSOR_TYPE.HAND:
        this.renderer.domElement.style.cursor = 'move';
        break;
      case CURSOR_TYPE.ARROW:
        this.renderer.domElement.style.cursor = 'pointer';
        break;
      default:
        this.renderer.domElement.style.cursor = 'default';
        break;
    }
  }

  public addActionHandler(handler: IActionHandler): void {
    this.wrappedActionHandlers.push(handler);
    this.wrappedActionHandlers.sort((a, b) => a.priority - b.priority);
  }

  public removeActionHandler(handler: IActionHandler): void {
    const index = this.wrappedActionHandlers.indexOf(handler);
    if (index >= 0) {
      this.wrappedActionHandlers.splice(index, 1);
    }
  }

  public addRenderHandler(handler: IRenderHandler): void {
    this.wrappedRenderHandlers.push(handler);
    this.wrappedRenderHandlers.sort((a, b) => a.renderOrder - b.renderOrder);
  }

  public removeRenderHandler(handler: IRenderHandler): void {
    const index = this.wrappedRenderHandlers.indexOf(handler);
    if (index >= 0) {
      this.wrappedRenderHandlers.splice(index, 1);
    }
  }

  get boundingBox(): Box3 | undefined {
    return this.wrappedBoundingBox;
  }

  get cameraFov(): number {
    return this.camera.fov;
  }

  get cameraEye(): Vector3 {
    return this.camera.position;
  }

  // eslint-disable-next-line class-methods-use-this
  get cameraAt(): Vector3 {
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
    if (this.capturedPointerId >= 0) {
      this.renderer.domElement.releasePointerCapture(this.capturedPointerId);
      this.capturedPointerId = -1;
    }
  }

  /**
   * get the name of objects.
   */
  public getObjects(): string[] {
    return this.targetObject3D.children.map((v: { name: string }) => v.name);
  }

  public set enableClipping(enableClipping: boolean) {
    this.renderer.localClippingEnabled = enableClipping;
  }

  public get enableClipping(): boolean {
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
      const itemToRemove = this.targetObject3D.children[index] as Mesh;
      this.targetObject3D.children.splice(index, 1);
      itemToRemove.geometry.dispose();

      if (itemToRemove.material instanceof Array) {
        itemToRemove.material.forEach((v) => v.dispose());
      } else {
        itemToRemove.material.dispose();
      }

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
    const animate = () => {
      requestAnimationFrame(animate);
      this.render(this.camera);
      this.stats?.update();
    };
    animate();
  }

  public exportImage(
    width: number,
    height: number,
    scene: Scene | undefined = undefined,
    camera: Camera | undefined = undefined,
    viewPort: Vector4 | undefined = undefined
  ): Uint8Array {
    const target = new WebGLRenderTarget(width, height, { type: UnsignedByteType, stencilBuffer: true });

    this.renderer.setRenderTarget(target);
    let oldViewPort;
    if (viewPort) {
      oldViewPort = new Vector4();
      this.renderer.getViewport(oldViewPort);
      this.renderer.setViewport(viewPort);
    }
    if (scene === undefined) {
      this.render(this.camera);
    } else {
      this.renderer.render(
        scene === undefined ? this.wrappedScene : scene,
        camera === undefined ? this.camera : camera
      );
    }

    if (oldViewPort) {
      this.renderer.setViewport(oldViewPort);
    }

    const data = new Uint8Array(width * height * 4);

    this.renderer.readRenderTargetPixels(target, 0, 0, width, height, data);

    RenderingEngine.flipImageData(data, width, height);

    this.renderer.setRenderTarget(null);

    const jpgData = encode({ data, width, height }, 100);

    target.dispose();

    return jpgData.data;
  }

  public renderTargetAndReadFloat(
    scene: Scene,
    xPos: number,
    yPos: number,
    camera: Camera | undefined = undefined,
    viewPort: Vector4 | undefined = undefined
  ): Float32Array {
    const { width, height } = this.wrappedViewPortSize;
    const target = new WebGLRenderTarget(width, height, { type: FloatType, stencilBuffer: true });
    this.renderer.setRenderTarget(target);
    let oldViewPort;
    if (viewPort) {
      oldViewPort = new Vector4();
      this.renderer.getViewport(oldViewPort);
      this.renderer.setViewport(viewPort);
    }
    this.renderer.render(scene, camera === undefined ? this.camera : camera);
    if (oldViewPort) {
      this.renderer.setViewport(oldViewPort);
    }
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
    const hitTestResult = this.hitTest(xPos, yPos);
    if (this.hitTestHandler && hitTestResult) {
      return this.hitTestHandler.onHit(hitTestResult);
    }
    return false;
  }

  /**
   * Get the matrix of rotation.
   */
  public get rotationMatrix(): Matrix4 {
    return this.wrappedRotateMatrix;
  }

  /**
   * update rotation matrix and apply it.
   * @param mat new matrix for rotation.
   */
  public set rotationMatrix(mat: Matrix4) {
    this.wrappedRotateMatrix = mat;
    this.updateRootObjectMatrix();
  }

  public get matrix(): Matrix4 {
    const matrix = this.wrappedRotateMatrix.clone();
    matrix.multiply(this.adaptMatrix);

    return matrix;
  }

  /**
   * handle window size changed.
   * @param width new width
   * @param height new height
   */
  public resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
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
        const activeFlatMaterial = this.activeFlatMaterial.clone();
        activeFlatMaterial.clippingPlanes = mesh.material.clippingPlanes;
        mesh.material = [mesh.material, inactiveFlatMaterial, activeFlatMaterial];
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

  public updateBackground(newBackground: Color | Color[] | null): void {
    if (newBackground instanceof Array) {
      const colors = <Color[]>newBackground;
      const texture = TextureFactory.vertical1DFromColors(colors);
      texture.magFilter = LinearFilter;
      texture.minFilter = LinearFilter;
      this.wrappedScene.background = texture;
    } else {
      this.wrappedScene.background = newBackground;
    }
  }

  private initEvents() {
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
        if (handler.isEnabled && handler.handleWheel(event, this)) break;
      }
      event?.preventDefault();
    });
  }

  private render = (camera: Camera) => {
    this.renderer.render(this.wrappedScene, camera);
    this.renderer.autoClear = false;
    this.wrappedRenderHandlers.forEach((v) => {
      v.render(this.renderer);
    });
    this.renderer.autoClear = true;
  };

  /**
   * test the triangle on specified position.
   * @param xPos hit position x
   * @param yPos hit position y
   */
  private hitTest(xPos: number, yPos: number): IHitTestResult | null {
    const rayCaster = new Raycaster();
    rayCaster.layers.set(2);
    rayCaster.setFromCamera({ x: xPos, y: yPos }, this.camera);
    this.targetObject3D.children.forEach((element) => {
      if (element.visible) {
        element.layers.enable(2);
      } else {
        element.layers.disable(2);
      }
    });
    const intersection = rayCaster.intersectObjects(this.targetObject3D.children);

    if (intersection.length > 0) {
      const ret = intersection[0];
      if (!ret.face) {
        throw Error('invalid face index.');
      }

      const { matrix } = this;

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
    const ambientLight = new AmbientLight(0x4d4d4d);
    const light1 = new PointLight(0xffffff, 0.7);
    light1.position.set(3.0, 3.0, 3.0);
    const light2 = new PointLight(0xffffff, 0.7);
    light2.position.set(-3.0, -3.0, 3.0);
    this.wrappedScene.add(ambientLight);
    this.wrappedScene.add(light1);
    this.wrappedScene.add(light2);
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
      // calculate the matrix to adapted object position and scale to the
      // center of the clip space.

      const adapt = RenderingEngine.calculateAdaptMatrix(boundingBox);
      if (this.wrappedAdaptRange === undefined) {
        this.adaptMatrix = adapt.mat;
      }
      this.wrappedMaxDim = adapt.maxDim;

      this.domainRangeChangedEvent.trigger(boundingBox);

      // apply the adapt scale.
      this.updateRootObjectMatrix();
      this.selectionHelper.setMaxSize(this.wrappedMaxDim);
    } else {
      this.adaptMatrix = new Matrix4();
      this.domainRangeChangedEvent.trigger(undefined);
    }
  }

  private static calculateAdaptMatrix(boundingBox: Box3): { mat: Matrix4; maxDim: number } {
    const center = new Vector3();
    boundingBox.getCenter(center);
    const size = new Vector3();
    boundingBox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const matTranslate = new Matrix4();
    matTranslate.makeTranslation(-center.x, -center.y, -center.z);
    const matScale = new Matrix4();
    matScale.makeScale(2.0 / maxDim, 2.0 / maxDim, 2.0 / maxDim);

    matScale.multiply(matTranslate);
    return { mat: matScale, maxDim };
  }

  private updateRootObjectMatrix() {
    const { matrix } = this;

    if (this.wrappedRoot) {
      this.wrappedRoot.matrix = matrix;
      this.wrappedRoot.matrixWorldNeedsUpdate = true;
    }

    this.objectTransformChangedEvent.trigger(matrix);
  }
}
