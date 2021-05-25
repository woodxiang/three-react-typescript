import { Scene } from 'three/src/scenes/Scene';
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera';
import { WebGLRenderer, WebGLRendererParameters } from 'three/src/renderers/WebGLRenderer';
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
import { FloatType, LinearFilter, UnsignedByteType } from 'three/src/constants';
import { WebGLRenderTarget } from 'three/src/renderers/WebGLRenderTarget';
import { PointLight } from 'three/src/lights/PointLight';
import { Points } from 'three/src/objects/Points';
import { Vector4 } from 'three/src/math/Vector4';
import { Camera } from 'three/src/cameras/Camera';
import { OrthographicCamera } from 'three/src/cameras/OrthographicCamera';
import { isBrowser, isNode } from 'browser-or-node';
import { encode } from './utils/encoder';
import { NodeWebGLRenderer } from '../node-threejs/node-three';
import Stats from './three/examples/jsm/libs/stats.module';
import {
  IActionCallback,
  STATE,
  CURSOR_TYPE,
  IActionHandler,
  IHitTestResult,
  IObjectRotation,
  renderingModelName,
  IRenderHandler,
} from './interfaces';
import RotationHandler from './RotationHandler';
import SelectionHelper from './SelectionHelper';
import LiteEvent from './event';
import TextureFactory from './TextureFactory';
import IAfterProject from './Materials/IAfterProject';
import MeshLambertExMaterial from './Materials/MeshLambertExMaterial';
import AnnotationLayer, { IAnnotationDrawer } from './AnnotationLayer';

/**
 * Rendering Engine
 */
export default class RenderingEngine implements IActionCallback, IObjectRotation {
  /**
   * Current State: moving or rotation or picking.
   * plugins can defined its own state.
   */
  public state: STATE = STATE.NONE;

  private parentDiv: HTMLDivElement | undefined;

  private wrappedScene: Scene | undefined;

  private renderer: WebGLRenderer | undefined;

  private wrappedCamera: PerspectiveCamera | OrthographicCamera | undefined;

  private wrappedRoot: Group | undefined; // This is the root for all objects.

  private targetObject3D: Group | undefined; // this is the root for all target models.

  private adaptMatrix: Matrix4 = new Matrix4(); // use this matrix to make objects adapt to range of -1 to 1. and the cent of the adapt range.

  private wrappedRotateMatrix: Matrix4 = new Matrix4(); // rotation matrix.

  private wrappedAfterProjectMatrix: Matrix4 = new Matrix4(); // 2d scale and move matrix.

  private wrappedMaxDim = 1; // maximum original dimension size.

  private wrappedBoundingBox: Box3 | undefined; // bounding box of all the objects.

  public fixedBoundingBox: Box3 | undefined; // fix bounding box of all the objects.

  public wrappedAdaptRange: Box3 | undefined; // user defined adapt range. if it is undefined use bounding box of all the objects.

  public meshAddedEvent = new LiteEvent<Mesh | Points>(); // raised when a mesh or points added.

  public meshRemovedEvent = new LiteEvent<string | string[]>(); // raise when a mesh of points removed.

  public meshVisibleChangedEvent = new LiteEvent<{ target: string; visible: boolean }>(); // mesh or objects visibility changed.

  public domainRangeChangedEvent = new LiteEvent<Box3>(); // raise when bounding box of all objects changed.

  public objectTransformChangedEvent = new LiteEvent<Matrix4>();

  public sizeChangedEvent = new LiteEvent<{ width: number; height: number }>();

  private overlapLayer: AnnotationLayer | undefined;

  private debugMode = false;

  private stats: Stats | undefined;

  private wrappedActionHandlers: IActionHandler[] = [];

  private wrappedRenderHandlers: IRenderHandler[] = [];

  private wrappedCursorType: CURSOR_TYPE = CURSOR_TYPE.ARROW;

  private capturedPointerId = -1;

  private overlayUpdateRequired = false;

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
  public init(
    div: HTMLDivElement | undefined,
    width: number,
    height: number,
    canvas: HTMLCanvasElement | OffscreenCanvas | undefined = undefined,
    context: WebGLRenderingContext | undefined = undefined
  ): void {
    if (this.parentDiv) {
      throw Error('already initialized.');
    }

    this.parentDiv = div;
    this.wrappedScene = new Scene();
    if (isBrowser) {
      const renderParam: WebGLRendererParameters = { antialias: true, alpha: true };
      if (canvas) {
        renderParam.canvas = canvas;
      }
      if (context) {
        renderParam.context = context;
      }
      this.renderer = new WebGLRenderer(renderParam);
    } else if (isNode) {
      this.renderer = new NodeWebGLRenderer({
        width,
        height,
        antialias: true,
        alpha: true,
      });
    } else {
      throw Error('unknown environment.');
    }
    this.wrappedCamera = new PerspectiveCamera(15, 1, 0.01, 100);
    this.wrappedCamera.position.set(0, 0, 10);

    this.wrappedRoot = new Group();
    this.targetObject3D = new Group();
    this.overlapLayer = new AnnotationLayer();
    this.overlapLayer.init();

    this.resize(width, height);

    this.parentDiv?.appendChild(this.renderer.domElement);

    this.prepareEnvironment();

    this.wrappedRoot.matrixAutoUpdate = false;

    this.targetObject3D.name = renderingModelName;

    this.wrappedRoot.add(this.targetObject3D);

    this.wrappedScene.add(this.wrappedRoot);

    this.wrappedActionHandlers.push(new RotationHandler(this.wrappedCamera));

    if (this.debugMode && this.parentDiv) {
      this.stats = Stats();
      this.stats.dom.style.position = 'absolute';
      this.parentDiv.appendChild(this.stats.dom);
    }

    this.initEvents();
  }

  public dispose(): void {
    if (this.targetObject3D) this.targetObject3D.clear();
    if (this.wrappedScene) this.wrappedScene.clear();
    if (this.wrappedCamera) this.wrappedCamera.clear();
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
    if (!this.renderer) {
      throw Error('not initialized.');
    }
    const size = new Vector2();
    this.renderer.getSize(size);
    return size;
  }

  get root(): Group {
    if (!this.wrappedRoot) {
      throw Error('not initialized.');
    }
    return this.wrappedRoot;
  }

  get scene(): Scene {
    if (!this.wrappedScene) {
      throw Error('not initialized.');
    }
    return this.wrappedScene;
  }

  get cursorType(): CURSOR_TYPE {
    return this.wrappedCursorType;
  }

  set cursorType(newType: CURSOR_TYPE) {
    if (!this.renderer) {
      throw Error('not initialized.');
    }
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

  public addOverlayLayer(drawer: IAnnotationDrawer): void {
    if (!this.overlapLayer) {
      throw Error('not initialized.');
    }
    this.overlapLayer.drawers.push(drawer);
  }

  public removeOverlayLayer(drawer: IAnnotationDrawer): void {
    if (!this.overlapLayer) {
      throw Error('not initialized.');
    }
    const index = this.overlapLayer.drawers.indexOf(drawer);
    if (index >= 0) {
      this.overlapLayer.drawers.splice(index, 1);
    }
  }

  get boundingBox(): Box3 | undefined {
    return this.wrappedBoundingBox;
  }

  get camera(): Camera {
    if (!this.wrappedCamera) {
      throw Error('not initialized.');
    }
    return this.wrappedCamera;
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
      throw new Error('not initialized.');
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
      throw new Error('not initialized.');
    }

    if (this.capturedPointerId >= 0) {
      this.renderer.domElement.releasePointerCapture(this.capturedPointerId);
      this.capturedPointerId = -1;
    }
  }

  public set enableClipping(enableClipping: boolean) {
    if (!this.renderer) {
      throw new Error('not initialized.');
    }

    this.renderer.localClippingEnabled = enableClipping;
  }

  public get enableClipping(): boolean {
    if (!this.renderer) {
      throw new Error('not initialized.');
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

    if (this.targetObject3D.children.findIndex((mesh: Object3D) => mesh.name === newMesh.name) >= 0) {
      throw Error('duplicated object.');
    }

    this.updateMeshAfterProjectMatrix(newMesh);
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
      RenderingEngine.disposeMesh(itemToRemove);

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
        ? (mesh.material[0] as MeshLambertExMaterial)
        : (mesh.material as MeshLambertExMaterial);
      if (material) {
        material.updateColor(color);

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

    const removed = RenderingEngine.disposeGroup(this.targetObject3D);

    this.updateScales();

    this.meshRemovedEvent.trigger(removed);
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

  public renderFrame(): void {
    if (!this.wrappedCamera) {
      throw new Error('not initialized.');
    }
    this.render(this.wrappedCamera);
    this.stats?.update();
  }

  public calculateScreenPosition(pos: Vector3): Vector2 {
    let matrix = this.camera.matrixWorldInverse.clone().multiply(this.matrix);
    matrix = this.camera.projectionMatrix.clone().multiply(matrix);
    matrix = this.afterProjectMatrix.clone().multiply(matrix);

    const ret = pos.clone().applyMatrix4(matrix);

    return new Vector2(((ret.x + 1) / 2) * this.viewPortSize.x, ((1 - ret.y) / 2) * this.viewPortSize.y);
  }

  /**
   * start animation.
   */
  public startAnimate(): void {
    if (!this.wrappedCamera) {
      throw new Error('not initialized.');
    }

    const camera = this.wrappedCamera;
    const animate = () => {
      requestAnimationFrame(animate);
      this.render(camera);
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
    if (!this.renderer || !this.wrappedCamera || !this.wrappedScene) {
      throw new Error('not initialized.');
    }

    const oldSize = new Vector2();
    this.renderer.getSize(oldSize);

    this.resize(width, height);

    const target = new WebGLRenderTarget(width, height, { type: UnsignedByteType, stencilBuffer: true });

    this.renderer.setRenderTarget(target);
    let oldViewPort;
    if (viewPort) {
      oldViewPort = new Vector4();
      this.renderer.getViewport(oldViewPort);
      this.renderer.setViewport(viewPort);
    }
    if (scene === undefined) {
      this.render(this.wrappedCamera);
    } else {
      this.renderer.render(
        scene === undefined ? this.wrappedScene : scene,
        camera === undefined ? this.wrappedCamera : camera
      );
    }

    if (oldViewPort) {
      this.renderer.setViewport(oldViewPort);
    }

    this.resize(oldSize.width, oldSize.height);

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
    viewPort: Vector4 | undefined = undefined,
    clearColor: Vector4 | undefined = undefined
  ): Float32Array {
    if (!this.renderer || !this.wrappedCamera) {
      throw new Error('not initialized.');
    }

    const size = new Vector2();
    this.renderer.getSize(size);
    const target = new WebGLRenderTarget(size.x, size.y, { type: FloatType, stencilBuffer: true });
    this.renderer.setRenderTarget(target);
    if (clearColor !== undefined) {
      this.renderer.setClearColor(new Color(clearColor.x, clearColor.y, clearColor.z), clearColor.w);
    }
    let oldViewPort;
    if (viewPort) {
      oldViewPort = new Vector4();
      this.renderer.getViewport(oldViewPort);
      this.renderer.setViewport(viewPort);
    }
    this.renderer.render(scene, camera === undefined ? this.wrappedCamera : camera);
    if (oldViewPort) {
      this.renderer.setViewport(oldViewPort);
    }
    const data = new Float32Array(4);
    this.renderer.readRenderTargetPixels(target, xPos, size.y - yPos, 1, 1, data);
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
    this.invalidOverlap();
  }

  public get afterProjectMatrix(): Matrix4 {
    return this.wrappedAfterProjectMatrix;
  }

  public set afterProjectMatrix(mat: Matrix4) {
    this.wrappedAfterProjectMatrix.copy(mat);
    this.invalidOverlap();
  }

  public get matrix(): Matrix4 {
    return this.wrappedRotateMatrix.clone().multiply(this.adaptMatrix);
  }

  public resetView(): void {
    this.afterProjectMatrix = new Matrix4();
    this.rotationMatrix = new Matrix4();
    this.invalidOverlap();
  }

  public invalidOverlap(): void {
    this.overlayUpdateRequired = true;
  }

  /**
   * handle window size changed.
   * @param width new width
   * @param height new height
   */
  public resize(width: number, height: number, resizeRenderer = true): void {
    if (!this.wrappedCamera || !this.renderer) {
      throw Error('Not initialized.');
    }
    if (this.wrappedCamera instanceof PerspectiveCamera) {
      this.wrappedCamera.aspect = width / height;
    } else {
      this.wrappedCamera.left = -width / height;
      this.wrappedCamera.right = width / height;
    }
    this.wrappedCamera.updateProjectionMatrix();

    if (resizeRenderer) {
      // do not resize renderer when export image
      //
      this.renderer.setSize(width, height);
    }

    this.overlapLayer?.resize(width, height);

    this.sizeChangedEvent?.trigger({ width, height });
  }

  public updateBackground(newBackground: Color | Color[] | null): void {
    if (!this.wrappedScene) {
      throw new Error('not initialized.');
    }

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

  private updateMeshAfterProjectMatrix(mesh: Mesh | Points) {
    if (mesh.material instanceof Array) {
      mesh.material.forEach((v) => {
        const m = (v as unknown) as IAfterProject;
        if (m.ReplaceAfterProjectMatrix) {
          m.ReplaceAfterProjectMatrix(this.wrappedAfterProjectMatrix);
        }
      });
    } else {
      const m = (mesh.material as unknown) as IAfterProject;
      if (m.ReplaceAfterProjectMatrix) {
        m.ReplaceAfterProjectMatrix(this.wrappedAfterProjectMatrix);
      }
    }
  }

  private initEvents() {
    if (!this.renderer) {
      throw new Error('not initialized.');
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
        if (handler.isEnabled && handler.handleWheel(event, this)) break;
      }
      event?.preventDefault();
    });
  }

  private render = (camera: Camera) => {
    if (!this.renderer || !this.wrappedScene) {
      throw new Error('not initialized.');
    }
    const { renderer } = this;
    this.renderer.render(this.wrappedScene, camera);
    this.renderer.autoClear = false;
    this.wrappedRenderHandlers.forEach((v) => {
      v.render(renderer);
    });
    if (this.overlapLayer) {
      if (this.overlayUpdateRequired) {
        this.overlapLayer.update();
        this.overlayUpdateRequired = false;
      }
      this.overlapLayer.render(this.renderer);
    }
    this.renderer.autoClear = true;
  };

  /**
   * test the triangle on specified position.
   * @param xPos hit position x
   * @param yPos hit position y
   */
  public hitTest(xPos: number, yPos: number): IHitTestResult | null {
    if (!this.wrappedCamera || !this.targetObject3D) {
      throw new Error('not initialized.');
    }
    const p = new Vector3(xPos, yPos, 0);
    p.applyMatrix4(this.afterProjectMatrix.clone().invert());

    const rayCaster = new Raycaster();
    rayCaster.layers.set(2);
    rayCaster.setFromCamera({ x: p.x, y: p.y }, this.wrappedCamera);
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

  public findMesh(name: string): Mesh | undefined {
    if (!this.targetObject3D) {
      throw Error('no root');
    }
    const collection = this.targetObject3D.children;

    return collection.find((mesh: Object3D) => mesh.name === name) as Mesh;
  }

  public findGeometry(name: string): BufferGeometry | undefined {
    const mesh = this.findMesh(name);
    if (mesh) return mesh.geometry as BufferGeometry;
    return undefined;
  }

  private prepareEnvironment(): void {
    if (!this.wrappedScene) {
      throw new Error('not initialized.');
    }

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

    if (this.fixedBoundingBox) {
      if (this.wrappedBoundingBox) return;
      boundingBox = this.fixedBoundingBox;
    } else {
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
      this.invalidOverlap();
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

  public static disposeGroup(group: Group): string[] {
    const ret: string[] = [];
    group.children.forEach((v) => {
      if (v instanceof Group) {
        const r = this.disposeGroup(<Group>v);
        ret.push(...r);
      } else if (v instanceof Mesh) {
        ret.push(v.name);
        RenderingEngine.disposeMesh(<Mesh>v);
      } else if (v instanceof Points) {
        ret.push(v.name);
        RenderingEngine.disposeMesh(<Points>v);
      }
    });
    group.clear();

    return ret;
  }

  public static disposeMesh(itemToRemove: Mesh | Points): void {
    itemToRemove.geometry.dispose();

    if (itemToRemove.material instanceof Array) {
      itemToRemove.material.forEach((v) => v.dispose());
    } else {
      itemToRemove.material.dispose();
    }
  }
}
