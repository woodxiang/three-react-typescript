import { Color } from 'three/src/math/Color';
import { Mesh } from 'three/src/objects/Mesh';
import { Points } from 'three/src/objects/Points';
import ClippingManager from './ClippingManager';
import FlatManager from './FlatsManager';
import LegendManager from './LegendManager';
import LutEx from './LutEx';
import PointsExMaterial from './Materials/PointsExMaterial';
import MeshFactory, { GeometryDataType } from './MeshFactory';
import NavigatorHandler from './NavigatorHandler';
import RenderingEngine from './RenderingEngine';
import SensorManager from './SensorManager';

export default class ContentManager {
  private engine: RenderingEngine | undefined;

  private wrappedEnableLegend = true;

  private readonly legend: LegendManager = new LegendManager();

  private wrappedEnableNavigator = true;

  private readonly navigator: NavigatorHandler = new NavigatorHandler();

  private wrappedEnableFlats = false;

  public readonly flats: FlatManager = new FlatManager();

  private wrappedEnableClipping = false;

  public readonly clipping: ClippingManager = new ClippingManager();

  private wrappedEnableSensors = false;

  private readonly sensors: SensorManager = new SensorManager();

  private dracoExMeshes = new Map<
    string,
    {
      min: number;
      max: number;
      visible: boolean;
      opacity: number;
    }
  >();

  private stlMeshes = new Map<string, { color: string; opacity: number; visible: boolean }>();

  private dracoMeshes = new Map<string, { color: string; opacity: number; visible: boolean }>();

  private dracoExPoints = new Map<string, { color: string; opacity: number; visible: boolean }>();

  public bind(engine: RenderingEngine | undefined): void {
    if (this.engine === engine) {
      return;
    }

    if (this.engine !== undefined) {
      // unbind engine
      this.legend.bind(undefined);
      this.navigator.bind(undefined);
      this.flats.bind(undefined);
      this.clipping.bind(undefined);
      this.sensors.bind(undefined);
    }

    this.engine = engine;
    if (this.engine) {
      // bind engine;
      if (this.wrappedEnableLegend) this.legend.bind(this.engine);
      if (this.wrappedEnableNavigator) this.navigator.bind(this.engine);
      if (this.wrappedEnableFlats) this.flats.bind(this.engine);
      if (this.wrappedEnableClipping) this.clipping.bind(this.engine);
      if (this.wrappedEnableSensors) this.sensors.bind(this.engine);
    }
  }

  public async LoadStl(url: string, color: string, opacity?: number): Promise<void> {
    if (this.stlMeshes.has(url)) {
      throw Error('exists url');
    }

    this.stlMeshes.set(url, { color, opacity: opacity || 1, visible: true });

    if (!this.engine) {
      return;
    }
    const mesh = await MeshFactory.createSolidMesh(url, GeometryDataType.STLMesh, color, opacity);

    if (this.engine && mesh) {
      this.engine.addMesh(mesh);
    }
  }

  public async LoadDracoMesh(url: string, color: string, opacity?: number): Promise<void> {
    if (this.dracoMeshes.has(url)) {
      throw Error('exits url');
    }

    this.dracoMeshes.set(url, { color, opacity: opacity || 1, visible: true });

    if (this.engine) {
      const mesh = await MeshFactory.createSolidMesh(url, GeometryDataType.DracoMesh, color, opacity);
      if (mesh) {
        this.engine.addMesh(mesh);
      }
    }
  }

  public async LoadDracoExMesh(url: string, opacity?: number): Promise<void> {
    if (this.dracoExMeshes.has(url)) {
      throw Error('exits url');
    }

    const geometry = await MeshFactory.loadAsync(url, GeometryDataType.DracoExMesh);
    const range = MeshFactory.calculateValueRange(geometry, 'generic');
    if (!range) {
      throw Error('invalid file.');
    }

    this.dracoExMeshes.set(url, { min: range.min, max: range.max, opacity: opacity || 1, visible: true });
    // add color mapped mesh.
    this.legend.updateLut(new LutEx());
    const totalRange = this.calculateRange();
    this.legend.setRange(totalRange);

    if (this.engine) {
      const material = MeshFactory.createColorMapMaterial(totalRange, this.legend.lut);
      const mesh = new Mesh(geometry, material);
      mesh.name = url;

      this.engine.addMesh(mesh);

      // TODO: update all the color map materials.
    }
  }

  public async LoadDracoExPoints(url: string, color: string): Promise<void> {
    if (this.dracoExPoints.has(url)) {
      throw Error('exits url');
    }

    this.dracoExPoints.set(url, { color, opacity: 1, visible: true });
    if (this.engine) {
      const geometry = await MeshFactory.loadAsync(url, GeometryDataType.DracoExPoints);
      const material = new PointsExMaterial({ diffuse: new Color(color), size: 0.05 });
      const points = new Points(geometry, material);
      points.name = url;
      this.engine.addMesh(points);
    }
  }

  public remove(url: string): void {
    const dracoExMesh = this.dracoExMeshes.get(url);
    if (dracoExMesh) {
      this.dracoExMeshes.delete(url);
      this.engine?.removeMesh(url);
      const totalRange = this.calculateRange();
      this.legend.setRange(totalRange);
      return;
    }

    if (this.stlMeshes.get(url)) {
      this.stlMeshes.delete(url);
      this.engine?.removeMesh(url);
      return;
    }

    if (this.dracoMeshes.get(url)) {
      this.dracoMeshes.delete(url);
      this.engine?.removeMesh(url);
      return;
    }

    if (this.dracoExPoints.get(url)) {
      this.dracoExPoints.delete(url);
      this.engine?.removeMesh(url);
    }
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

  set enableFlats(enable: boolean) {
    this.wrappedEnableFlats = enable;
    this.flats.bind(enable ? this.engine : undefined);
    if (enable) {
      this.flats.restore();
    }
  }

  get enableFlats(): boolean {
    return this.wrappedEnableFlats;
  }

  set isMultipleSelection(enable: boolean) {
    this.flats.isMultipleSelection = enable;
  }

  get isMultipleSelection(): boolean {
    return this.flats.isMultipleSelection;
  }

  set enableSensors(enable: boolean) {
    this.wrappedEnableSensors = enable;
    this.sensors.bind(enable ? this.engine : undefined);
  }

  get enableSensors(): boolean {
    return this.wrappedEnableSensors;
  }

  set enableLegend(enable: boolean) {
    this.wrappedEnableLegend = enable;
    this.legend.bind(enable ? this.engine : undefined);
  }

  get enableLegend(): boolean {
    return this.wrappedEnableLegend;
  }

  set enableNavigator(enable: boolean) {
    this.wrappedEnableNavigator = enable;
    this.navigator.bind(enable ? this.engine : undefined);
  }

  get enableNavigator(): boolean {
    return this.wrappedEnableNavigator;
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
