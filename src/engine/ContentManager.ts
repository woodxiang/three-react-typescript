import { Color } from 'three/src/math/Color';
import { Mesh } from 'three/src/objects/Mesh';
import { Matrix4 } from 'three/src/math/Matrix4';
import { Scene } from 'three/src/scenes/Scene';
import { Vector4 } from 'three/src/math/Vector4';
import { Camera } from 'three/src/cameras/Camera';
import ClippingManager from './ClippingManager';
import MeshFactory, { GeometryDataType } from './MeshFactory';
import NavigatorHandler from './NavigatorHandler';
import RenderingEngine from './RenderingEngine';
import getGravityDirection from './utils/gravityDirection';

export type BackgroundColor = Color | Color[] | null;

export interface GateInterface {
  normalX: number;
  normalY: number;
  normalZ: number;
}

type ProgressCallback = (event: ProgressEvent<EventTarget>) => void | undefined;

export default class ContentManager {
  protected engine: RenderingEngine | undefined;

  private wrappedEnableNavigator = true;

  private readonly navigator: NavigatorHandler = new NavigatorHandler();

  private wrappedEnableClipping = false;

  public readonly clipping: ClippingManager = new ClippingManager();

  private wrappedBackground: Color | Color[] | null = new Color('grey');

  public progressCallback: ProgressCallback | undefined = undefined;

  private stlMeshes = new Map<string, { color: string; opacity: number; visible: boolean }>();

  // 定义初始化状态，根据这些内容进行初始化
  private wrapperGravityDirection = 61;

  private wrapperGate: GateInterface = { normalX: 0, normalY: 1, normalZ: 0 };

  protected factory = new MeshFactory();

  public bind(engine: RenderingEngine | undefined): void {
    if (this.engine === engine) {
      return;
    }

    if (this.engine !== undefined) {
      // unbind engine
      this.navigator.bind(undefined);
      this.clipping.bind(undefined);

      this.onUnbind();
    }

    this.engine = engine;
    if (this.engine) {
      // bind engine;
      if (this.wrappedEnableNavigator) this.navigator.bind(this.engine);
      if (this.wrappedEnableClipping) this.clipping.bind(this.engine);

      this.onBind();

      this.restore();
    }
  }

  public async LoadStl(url: string, color: string, opacity?: number): Promise<void> {
    if (this.stlMeshes.has(url)) {
      throw Error('exists url');
    }

    await this.loadAndAddStl(url, color, opacity);
    this.stlMeshes.set(url, { color, opacity: opacity || 1, visible: true });
  }

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  public remove(url: string): boolean {
    if (this.stlMeshes.get(url)) {
      this.stlMeshes.delete(url);
      this.engine?.removeMesh(url);
      return true;
    }

    this.factory.cancel(url);
    return false;
  }

  public clearMeshes(): void {
    this.stlMeshes.clear();
    this.engine?.clearMeshes();
  }

  set enableClipping(enable: boolean) {
    this.wrappedEnableClipping = enable;
    this.clipping.bind(enable ? this.engine : undefined);
  }

  get enableClipping(): boolean {
    return this.wrappedEnableClipping;
  }

  set enableClippingAction(enable: boolean) {
    this.clipping.enableAction = enable;
  }

  get enableClippingAction(): boolean {
    return this.clipping.enableAction;
  }

  get rotationMatrix(): Matrix4 {
    if (!this.engine) throw Error('not initialized.');
    return this.engine.rotationMatrix;
  }

  set rotationMatrix(rotationMatrix: Matrix4) {
    if (!this.engine) throw Error('not initialized.');
    this.engine.rotationMatrix = rotationMatrix;
  }

  set enableNavigator(enable: boolean) {
    this.wrappedEnableNavigator = enable;
    this.navigator.bind(enable ? this.engine : undefined);
  }

  get enableNavigator(): boolean {
    return this.wrappedEnableNavigator;
  }

  get background(): Color | Color[] | null {
    return this.wrappedBackground;
  }

  set background(newColor: Color | Color[] | null) {
    this.wrappedBackground = newColor;
    if (this.engine) {
      this.engine.updateBackground(this.wrappedBackground);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  protected onBind(): void {
    if (this.engine) {
      this.engine.updateBackground(this.wrappedBackground);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  protected onUnbind(): void {
    this.stlMeshes.forEach((value, key) => {
      this.engine?.removeMesh(key);
    });
  }

  protected restore(): void {
    this.stlMeshes.forEach((v, key) => {
      this.loadAndAddStl(key, v.color, v.opacity);
      if (!v.visible) {
        this.engine?.setVisible(false, key);
      }
    });
  }

  protected async loadAndAddStl(
    url: string,
    color: string,
    opacity?: number,
    onProgress?: (event: ProgressEvent<EventTarget>) => void
  ): Promise<any> {
    const mesh = await this.factory.createSolidMesh(url, GeometryDataType.STLMesh, color, opacity, {}, (e) => {
      if (this.progressCallback) this.progressCallback(e);
      if (onProgress) onProgress(e);
    });

    if (mesh) {
      this.engine?.addMesh(mesh);
      return true;
    }
    return mesh ? (mesh as Mesh) : undefined;
  }

  public changeBackground(newBackground: BackgroundColor): void {
    if (this.engine) {
      this.engine.updateBackground(newBackground);
    }
  }

  public bindProgress(callback: (event: ProgressEvent<EventTarget>) => void): void {
    this.progressCallback = callback;
  }

  set gravityDirection(direction: number) {
    this.wrapperGravityDirection = direction;
  }

  get gravityDirection(): number {
    return this.wrapperGravityDirection;
  }

  set gate(currentGate: GateInterface) {
    this.wrapperGate = currentGate;
  }

  get gate(): GateInterface {
    return this.wrapperGate;
  }

  public resetPerspective(): void {
    this.engine?.resetView();
    const currDirection = getGravityDirection(this.wrapperGravityDirection, this.wrapperGate);
    this.rotationMatrix = currDirection;
  }

  public turnToFace(curAxis: string): void {
    const rota = Math.PI;
    const m1 = new Matrix4();
    if (curAxis === 'X+') {
      m1.makeRotationY(-rota / 2);
    } else if (curAxis === 'X-') {
      m1.makeRotationY(rota / 2);
    } else if (curAxis === 'Y+') {
      m1.makeRotationX(rota / 2);
    } else if (curAxis === 'Y-') {
      m1.makeRotationX(-rota / 2);
    } else if (curAxis === 'Z+') {
      m1.makeRotationY(0);
    } else if (curAxis === 'Z-') {
      m1.makeRotationY(rota);
    }
    this.rotationMatrix = m1;
  }

  public turnToG(curAxis: string): void {
    const rota = Math.PI;
    const m1 = new Matrix4();
    if (curAxis === 'X+') {
      m1.makeRotationZ(-rota / 2);
    } else if (curAxis === 'X-') {
      m1.makeRotationZ(rota / 2);
    } else if (curAxis === 'Y+') {
      m1.makeRotationZ(rota);
    } else if (curAxis === 'Y-') {
      m1.makeRotationX(0);
    } else if (curAxis === 'Z+') {
      m1.makeRotationX(rota / 2);
    } else if (curAxis === 'Z-') {
      m1.makeRotationX(-rota / 2);
    }
    this.rotationMatrix = m1;
  }

  public setMeshColor(color: Color, name: string): void {
    if (this.engine) {
      this.engine.setMeshColor(color, name);
    }
  }

  public setMeshOpacity(opacity: number, name: string): void {
    if (this.engine) {
      this.engine.setMeshOpacity(opacity, name);
    }
  }

  public setVisible(visible: boolean, name: string): void {
    if (this.engine) {
      this.engine.setVisible(visible, name);
    }
  }

  public setFuzzyVisible(visible: boolean, name: string): void {
    if (this.engine) {
      this.engine.setFuzzyVisible(visible, name);
    }
  }

  public calculateMeshVolume(name: string): number {
    if (this.engine) {
      return this.engine.calculateMeshVolume(name);
    }
    return 0;
  }

  public getEngine(): RenderingEngine | undefined {
    return this.engine;
  }

  public screenShot(
    width = 0,
    height = 0,
    scene: Scene | undefined = undefined,
    camera: Camera | undefined = undefined,
    viewPort: Vector4 | undefined = undefined
  ): Uint8Array {
    if (!this.engine) throw Error('not initialized.');
    if (width === 0 || height === 0) {
      return this.engine.exportImage(this.engine.width, this.engine.height);
    }
    return this.engine.exportImage(width, height, scene, camera, viewPort);
  }
}
