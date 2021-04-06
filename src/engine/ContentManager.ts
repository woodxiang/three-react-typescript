import { Color } from 'three/src/math/Color';
import ClippingManager from './ClippingManager';
import MeshFactory, { GeometryDataType } from './MeshFactory';
import NavigatorHandler from './NavigatorHandler';
import RenderingEngine from './RenderingEngine';

export default class ContentManager {
  protected engine: RenderingEngine | undefined;

  private wrappedEnableNavigator = true;

  private readonly navigator: NavigatorHandler = new NavigatorHandler();

  private wrappedEnableClipping = false;

  public readonly clipping: ClippingManager = new ClippingManager();

  private wrappedBackground: Color | Color[] | null = new Color('grey');

  private stlMeshes = new Map<string, { color: string; opacity: number; visible: boolean }>();

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

  private async loadAndAddStl(url: string, color: string, opacity?: number): Promise<boolean> {
    const mesh = await this.factory.createSolidMesh(url, GeometryDataType.STLMesh, color, opacity);

    if (mesh) {
      this.engine?.addMesh(mesh);
      return true;
    }
    return false;
  }
}
