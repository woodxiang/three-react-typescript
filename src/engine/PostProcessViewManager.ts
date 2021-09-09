import { Color } from 'three/src/math/Color';
import { Mesh } from 'three/src/objects/Mesh';
import BottomManager from './BottomManager';
import ContentManager, { BackgroundColor as BackgroundColorType } from './ContentManager';
import LegendManager from './LegendManager';
import { InterpolateLinear } from 'three/src/constants';
import LutEx from './LutEx';
import ColorMapLambertMaterial from './Materials/ColorMapLambertMaterial';
import { GeometryDataType } from './MeshFactory';
import { TextureLoader } from 'three/src/loaders/TextureLoader';
import PickValueHandler from './PickValueHandler';

export interface GateInterface {
  normalX: number;
  normalY: number;
  normalZ: number;
}

interface modelRange {
  min: number;
  max: number;
}

export type BackgroundColor = BackgroundColorType;

declare const window: Window & {
  assetBaseUrl: string
}

export default class PostProcessViewManager extends ContentManager {
  private wrappedEnableLegend = true;

  private wrappedEnableBottom = true;

  private logo: Promise<HTMLImageElement>;

  private readonly legend: LegendManager = new LegendManager();

  private readonly bottom: BottomManager = new BottomManager();

  public clearMeshesStatus = true;

  private dracoExMeshes = new Map<
    string,
    {
      min: number;
      max: number;
      visible: boolean;
      opacity: number;
    }
  >();

  private wrappedEnableValuePick = false;

  private readonly valuePick: PickValueHandler = new PickValueHandler();

  private dracoExPoints = new Map<string, { color: string; opacity: number; visible: boolean }>();

  private customColorMapWrapped: modelRange = { min: 0, max: 1 };

  get customColorMap(): modelRange {
    return this.customColorMapWrapped;
  }

  set customColorMap(colorMap: { min: number; max: number }) {
    this.customColorMapWrapped = colorMap;
    this.updateColormap();
  }

  constructor() {
    super();
    
    this.logo = new Promise<HTMLImageElement>((resolve, reject) => {
      const loader = new TextureLoader();
      if (window.assetBaseUrl) loader.setPath(window.assetBaseUrl);
      loader.load('/asset/supreium_logo.png', (texture) => {
        resolve(texture.image);
      }, undefined, (event) => {
        reject(event);
      });
    });
  }

  public async LoadDracoExMesh(
    url: string | Array<string>,
    fileType: string,
    split?: boolean,
    opacity?: number,
    onProgress?: (event: ProgressEvent<EventTarget>) => void
  ): Promise<void> {
    if (typeof url === 'string') {
      if (this.dracoExMeshes.has(url)) throw Error('exits url');
      const range = (await this.loadAndAddDracoExMesh(url, fileType, split, opacity, (e) => {
        if (this.progressCallback) this.progressCallback(e);
        if (onProgress) onProgress(e);
      })) as modelRange;
      if (range) {
        this.dracoExMeshes.set(url, { min: range.min, max: range.max, opacity: opacity || 1, visible: true });
        this.updateColormap();
      }
    } else if (url instanceof Array) {
      if (url.every((item) => this.dracoExMeshes.has(item))) throw Error('exits url');
      const list = url.filter((item) => !this.dracoExMeshes.has(item));
      const range = await this.loadAndAddDracoExMesh(list, fileType, split, opacity, (e) => {
        if (this.progressCallback) this.progressCallback(e);
        if (onProgress) onProgress(e);
      });
      console.log(range);
      if (range) {
        url.forEach((item, index) => {
          this.dracoExMeshes.set(item, {
            min: range[index].min,
            max: range[index].max,
            opacity: opacity || 1,
            visible: true,
          });
        });

        this.updateColormap();
      }
    }
  }

  protected async LoadDracoExPoints(url: string, color: string): Promise<void> {
    if (this.dracoExPoints.has(url)) {
      throw Error('exits url');
    }

    if (await this.loadAndAddDracoExPoints(url, color)) {
      this.dracoExPoints.set(url, { color, opacity: 1, visible: true });
    }
  }

  public async LoadPLYExMesh(url: string, opacity?: number): Promise<void> {
    const result = await this.factory.createColorMapMesh(url, GeometryDataType.PLYMesh, this.legend.lut, opacity);
    if (result) {
      result.mesh.name = url;
      this.engine?.addMesh(result.mesh);
      if (result.range) {
        this.dracoExMeshes.set(url, {
          min: result.range.min,
          max: result.range.max,
          opacity: opacity || 1,
          visible: true,
        });
        this.updateColormap();
      }
    }
  }

  public async loadAndAddStl(url: string, color: string, opacity?: number): Promise<any> {
    const mesh = await this.factory.createSolidMesh(url, GeometryDataType.STLMesh, color, opacity, {
      polygonOffset: true,
      polygonOffsetFactor: 6,
      polygonOffsetUnits: 3,
    });

    if (mesh) {
      this.engine?.addMesh(mesh);
      return true;
    }
    return mesh as Mesh;
  }

  public remove(url: string): boolean {
    const dracoExMesh = this.dracoExMeshes.get(url);
    if (dracoExMesh) {
      this.dracoExMeshes.delete(url);
      this.engine?.removeMesh(url);
      const totalRange = this.customColorMapWrapped;
      this.legend.setRange(totalRange);
      this.updateColormap();
      return true;
    }

    if (this.dracoExPoints.get(url)) {
      this.dracoExPoints.delete(url);
      this.engine?.removeMesh(url);
      return true;
    }

    return super.remove(url);
  }

  set enableLegend(enable: boolean) {
    this.wrappedEnableLegend = enable;
    this.legend.bind(enable ? this.engine : undefined);
  }

  get enableLegend(): boolean {
    return this.wrappedEnableLegend;
  }

  set enableBottom(enable: boolean) {
    this.wrappedEnableBottom = enable;
    this.bottom.bind(enable ? this.engine : undefined);
  }

  get enableBottom(): boolean {
    return this.wrappedEnableBottom;
  }
  
  set enableValuePick(enable: boolean) {
    this.wrappedEnableValuePick = enable;
    this.valuePick.bind(enable ? this.engine : undefined);
  }

  get enableValuePick(): boolean {
    return this.wrappedEnableValuePick;
  }

  protected onBind(): void {
    super.onBind();
    if (this.wrappedEnableLegend) this.legend.bind(this.engine);
    if (this.wrappedEnableBottom) this.bottom.bind(this.engine);
    if (this.wrappedEnableValuePick) this.valuePick.bind(this.engine);
  }

  protected onUnbind(): void {
    this.dracoExMeshes.forEach((value, key) => {
      this.engine?.removeMesh(key);
    });

    this.dracoExPoints.forEach((value, key) => {
      this.engine?.removeMesh(key);
    });

    this.legend.bind(undefined);
    this.bottom.bind(undefined);
    this.valuePick.bind(undefined);
    super.onUnbind();
  }

  protected restore(): void {
    super.restore();

    this.dracoExMeshes.forEach((value, key) => {
      this.loadAndAddDracoExMesh(key, '', value.opacity);
      if (!value.visible) {
        this.engine?.setVisible(false, key);
      }
    });
    this.updateColormap();
    this.dracoExPoints.forEach((value, key) => {
      this.loadAndAddDracoExPoints(key, value.color);
      if (!value.visible) {
        this.engine?.setVisible(false, key);
      }
    });
  }

  private async loadAndAddDracoExMesh(
    url: string | Array<string>,
    fileType: string,
    split: boolean = false,
    opacity?: number,
    onProgress?: (event: ProgressEvent<EventTarget>) => void
  ): Promise<modelRange | Array<modelRange> | undefined> {
    if (typeof url === 'string') {
      const result = await this.factory.createColorMapMesh(
        url,
        GeometryDataType.DracoExMesh,
        this.legend.lut,
        opacity,
        (e) => {
          if (this.progressCallback) this.progressCallback(e);
          if (onProgress) onProgress(e);
        },
        {attr: fileType, split}
      );
      if (result) {
        result.mesh.name = url;
        if (this.clearMeshesStatus) {
          this.dracoExMeshes.forEach((val, key) => {
            this.engine?.removeMesh(key);
          });
          this.dracoExMeshes.clear();
        }
        this.engine?.addMesh(result.mesh);
        return result.range;
      }
    } else if (url instanceof Array) {
      try {
        if (this.clearMeshesStatus) {
          this.dracoExMeshes.forEach((val, key) => {
            this.engine?.removeMesh(key);
          });
          this.dracoExMeshes.clear();
        }

        const results = [];
        for (const i in url) {
          const result = await this.factory.createColorMapMesh(
            url[i],
            GeometryDataType.DracoExMesh,
            this.legend.lut,
            opacity,
            (e) => {
              if (this.progressCallback) this.progressCallback(e);
              if (onProgress) onProgress(e);
            },
            {attr: fileType, split}
          );
          results.push(result);
        }
        if (this.clearMeshesStatus) {
          this.dracoExMeshes.forEach((val, key) => {
            this.engine?.removeMesh(key);
          });
          this.dracoExMeshes.clear();
        }
        results.forEach((result) => {
          if (result) this.engine?.addMesh(result.mesh);
        });

        return results.map((item) => ({ ...item.range }));
      } catch (err) {
        console.log(err);
        return undefined;
      }
    }
    return undefined;
  }

  private async loadAndAddDracoExPoints(url: string, color: string): Promise<boolean> {
    const result = await this.factory.createColorMapMesh(url, GeometryDataType.DracoExPoints, new Color(color));
    if (result) {
      this.engine?.addMesh(result.mesh);
      return true;
    }
    return false;
  }

  public calculateRange(): {
    min: number;
    max: number;
  } {
    if (this.dracoExMeshes.size === 0) return { max: 1, min: 0 };
    let min = Number.MAX_VALUE;
    let max = Number.MIN_VALUE;

    this.dracoExMeshes.forEach((v) => {
      if (v.min < min) min = v.min;
      if (v.max > max) max = v.max;
    });

    return { min, max };
  }

  private async updateColormap() {
    const totalRange = this.customColorMapWrapped;
    const newLut = new LutEx('hot_and_color_new1', 1048);
    newLut.setRange(totalRange);
    this.legend.updateLut(newLut);
    this.legend.setRange(totalRange);
    this.bottom.setLogo(await this.logo);

    if (this.engine) {
      this.dracoExMeshes.forEach((value, key) => {
        const mesh = this.engine?.findMesh(key);
        if (mesh) {
          const materials = [];
          if (mesh.material instanceof Array) {
            materials.push(...mesh.material);
          } else {
            materials.push(mesh.material);
          }
          materials.forEach((m) => {
            if (m instanceof ColorMapLambertMaterial) {
              (<ColorMapLambertMaterial>m).updateRange(totalRange.min, totalRange.max);
            }
          });
        }
      });
    }
  }

  public setLegendTitle(title: string, unit = ''): void {
    this.legend.setTitle(title, unit);
  }
}
