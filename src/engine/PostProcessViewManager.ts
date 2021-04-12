import { Color } from 'three/src/math/Color';
import ContentManager from './ContentManager';
import LegendManager from './LegendManager';
import LutEx from './LutEx';
import ColorMapLambertMaterial from './Materials/ColorMapLambertMaterial';
import { GeometryDataType } from './MeshFactory';

export default class PostProcessViewManager extends ContentManager {
  private wrappedEnableLegend = true;

  private readonly legend: LegendManager = new LegendManager();

  private dracoExMeshes = new Map<
    string,
    {
      min: number;
      max: number;
      visible: boolean;
      opacity: number;
    }
  >();

  private dracoExPoints = new Map<string, { color: string; opacity: number; visible: boolean }>();

  public async LoadDracoExMesh(url: string, opacity?: number): Promise<void> {
    if (this.dracoExMeshes.has(url)) {
      throw Error('exits url');
    }

    const range = await this.loadAndAddDracoExMesh(url, opacity);
    if (range) {
      this.dracoExMeshes.set(url, { min: range.min, max: range.max, opacity: opacity || 1, visible: true });
      this.updateColormap();
    }
  }

  public async LoadDracoExPoints(url: string, color: string): Promise<void> {
    if (this.dracoExPoints.has(url)) {
      throw Error('exits url');
    }

    if (await this.loadAndAddDracoExPoints(url, color)) {
      this.dracoExPoints.set(url, { color, opacity: 1, visible: true });
    }
  }

  public remove(url: string): boolean {
    const dracoExMesh = this.dracoExMeshes.get(url);
    if (dracoExMesh) {
      this.dracoExMeshes.delete(url);
      this.engine?.removeMesh(url);
      const totalRange = this.calculateRange();
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

  protected onBind(): void {
    super.onBind();
    if (this.wrappedEnableLegend) this.legend.bind(this.engine);
  }

  protected onUnbind(): void {
    this.dracoExMeshes.forEach((value, key) => {
      this.engine?.removeMesh(key);
    });

    this.dracoExPoints.forEach((value, key) => {
      this.engine?.removeMesh(key);
    });

    this.legend.bind(undefined);
    super.onUnbind();
  }

  protected restore(): void {
    super.restore();

    this.dracoExMeshes.forEach((value, key) => {
      this.loadAndAddDracoExMesh(key, value.opacity);
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
    url: string,
    opacity?: number
  ): Promise<{ min: number; max: number } | undefined> {
    const result = await this.factory.createColorMapMesh(url, GeometryDataType.DracoExMesh, this.legend.lut, opacity);
    if (result) {
      result.mesh.name = url;

      this.engine?.addMesh(result.mesh);
      return result.range;
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

  private calculateRange(): {
    min: number;
    max: number;
  } {
    let min = Number.MAX_VALUE;
    let max = Number.MIN_VALUE;

    this.dracoExMeshes.forEach((v) => {
      if (v.min < min) min = v.min;
      if (v.max > max) max = v.max;
    });

    return { min, max };
  }

  private updateColormap() {
    const totalRange = this.calculateRange();
    const newLut = new LutEx();
    this.legend.updateLut(newLut);
    this.legend.setRange(totalRange);

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
}
