import { Color } from 'three/src/math/Color';
import { Mesh } from 'three/src/objects/Mesh';
import { Points } from 'three/src/objects/Points';
import ContentManager from './ContentManager';
import LegendManager from './LegendManager';
import LutEx from './LutEx';
import PointsExMaterial from './Materials/PointsExMaterial';
import MeshFactory, { GeometryDataType } from './MeshFactory';

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

  private dracoMeshes = new Map<string, { color: string; opacity: number; visible: boolean }>();

  private dracoExPoints = new Map<string, { color: string; opacity: number; visible: boolean }>();

  public async LoadDracoExMesh(url: string, opacity?: number): Promise<void> {
    if (this.dracoExMeshes.has(url)) {
      throw Error('exits url');
    }

    const range = await this.loadAndAddDracoExMesh(url, opacity);

    this.dracoExMeshes.set(url, { min: range.min, max: range.max, opacity: opacity || 1, visible: true });
  }

  public async LoadDracoMesh(url: string, color: string, opacity?: number): Promise<void> {
    if (this.dracoMeshes.has(url)) {
      throw Error('exits url');
    }

    await this.loadAndAddDracoMesh(url, color, opacity);
    this.dracoMeshes.set(url, { color, opacity: opacity || 1, visible: true });
  }

  public async LoadDracoExPoints(url: string, color: string): Promise<void> {
    if (this.dracoExPoints.has(url)) {
      throw Error('exits url');
    }

    await this.loadAndAddDracoExPoints(url, color);
    this.dracoExPoints.set(url, { color, opacity: 1, visible: true });
  }

  public remove(url: string): boolean {
    const dracoExMesh = this.dracoExMeshes.get(url);
    if (dracoExMesh) {
      this.dracoExMeshes.delete(url);
      this.engine?.removeMesh(url);
      const totalRange = this.calculateRange();
      this.legend.setRange(totalRange);
      return true;
    }

    if (this.dracoMeshes.get(url)) {
      this.dracoMeshes.delete(url);
      this.engine?.removeMesh(url);
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

    this.dracoMeshes.forEach((value, key) => {
      this.engine?.removeMesh(key);
    });

    this.legend.bind(undefined);
    super.onUnbind();
  }

  protected restore(): void {
    super.restore();
    this.dracoMeshes.forEach((value, key) => {
      this.loadAndAddDracoMesh(key, value.color, value.opacity);
      if (!value.visible) {
        this.engine?.setVisible(false, key);
      }
    });
    this.dracoExMeshes.forEach((value, key) => {
      this.loadAndAddDracoExMesh(key, value.opacity);
      if (!value.visible) {
        this.engine?.setVisible(false, key);
      }
    });
    this.dracoExPoints.forEach((value, key) => {
      this.loadAndAddDracoExPoints(key, value.color);
      if (!value.visible) {
        this.engine?.setVisible(false, key);
      }
    });
  }

  private async loadAndAddDracoExMesh(url: string, opacity?: number): Promise<{ min: number; max: number }> {
    const geometry = await MeshFactory.loadAsync(url, GeometryDataType.DracoExMesh);
    const range = MeshFactory.calculateValueRange(geometry, 'generic');
    if (!range) {
      throw Error('invalid file.');
    }

    // add color mapped mesh.
    this.legend.updateLut(new LutEx());
    const totalRange = this.calculateRange();
    this.legend.setRange(totalRange);

    if (this.engine) {
      const material = MeshFactory.createColorMapMaterial(totalRange, this.legend.lut, opacity);
      const mesh = new Mesh(geometry, material);
      mesh.name = url;

      this.engine.addMesh(mesh);
    }

    return range;
  }

  private async loadAndAddDracoMesh(url: string, color: string, opacity?: number): Promise<void> {
    if (this.engine) {
      const mesh = await MeshFactory.createSolidMesh(url, GeometryDataType.DracoMesh, color, opacity);
      if (mesh) {
        this.engine.addMesh(mesh);
      }
    }
  }

  private async loadAndAddDracoExPoints(url: string, color: string): Promise<void> {
    if (this.engine) {
      const geometry = await MeshFactory.loadAsync(url, GeometryDataType.DracoExPoints);
      const material = new PointsExMaterial({ diffuse: new Color(color), size: 0.05 });
      const points = new Points(geometry, material);
      points.name = url;
      this.engine.addMesh(points);
    }
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
}
