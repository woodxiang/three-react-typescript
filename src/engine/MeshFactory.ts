import { FrontSide } from 'three/src/constants';
import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { Material } from 'three/src/materials/Material';
import { Color } from 'three/src/math/Color';
import { Mesh } from 'three/src/objects/Mesh';
import { Lut } from 'three/examples/jsm/math/Lut';
import { Points } from 'three/src/objects/Points';
import axios from 'axios';
import DracoExLoader from './loaders/DracoExLoader';
import ColorMapLambertMaterial from './Materials/ColorMapLambertMaterial';
import TextureFactory from './TextureFactory';
import LutEx from './LutEx';
import MeshLambertExMaterial from './Materials/MeshLambertExMaterial';
import PointsExMaterial from './Materials/PointsExMaterial';
import STLExLoader from './loaders/STLExLoader';
import CancelError, { isCancel } from './utils/CancelError';
import { ICancellableLoader } from './loaders/ICancellableLoader';

export enum GeometryDataType {
  STLMesh = 1,
  DracoExMesh,
  DracoExPoints,
}

export default class MeshFactory {
  private runningTasks = new Map<string, { loader: ICancellableLoader | undefined }>();

  private async loadAsync(url: string, dataType: GeometryDataType): Promise<BufferGeometry> {
    switch (dataType) {
      case GeometryDataType.STLMesh:
        return this.loadStlAsync(url);
      case GeometryDataType.DracoExMesh:
      case GeometryDataType.DracoExPoints:
        return this.loadDracoExAsync(url);
      default:
        throw Error('unexpected type.');
    }
  }

  public async createSolidMesh(
    url: string,
    dataType: GeometryDataType,
    color: string,
    opacity = 1
  ): Promise<Mesh | undefined> {
    if (this.runningTasks.has(url)) {
      throw Error('loading');
    }

    this.runningTasks.set(url, { loader: undefined });
    try {
      const geometry = await this.loadAsync(url, dataType);

      if (!this.runningTasks.get(url)) {
        throw new CancelError();
      }

      const materialColor = new Color();
      materialColor.set(color);

      const material = new MeshLambertExMaterial({
        diffuse: materialColor,
        reflectivity: 0.0,
        side: FrontSide,
        opacity,
        transparent: opacity < 1,
        clipping: true,
        lights: true,
      });

      const mesh = new Mesh(geometry, material);
      mesh.name = url;

      return mesh;
    } catch (e) {
      if (isCancel(e)) {
        return undefined;
      }

      throw Error(`unexpected exception ${e}`);
    } finally {
      this.runningTasks.delete(url);
    }
  }

  public async createColorMapMesh(
    url: string,
    dataType: GeometryDataType,
    lut: string | Lut | LutEx | Color | undefined = undefined,
    opacity = 1
  ): Promise<{ mesh: Mesh | Points; range: { min: number; max: number } | undefined } | undefined> {
    if (this.runningTasks.has(url)) {
      throw Error('loading');
    }

    this.runningTasks.set(url, { loader: undefined });
    try {
      const geometry = await this.loadAsync(url, dataType);
      if (!this.runningTasks.get(url)) {
        throw new CancelError();
      }
      const range = MeshFactory.calculateValueRange(geometry, 'generic');
      let material: Material;

      if (dataType === GeometryDataType.DracoExPoints) {
        if (!(lut instanceof Color)) {
          throw Error('invalid color');
        }
        material = new PointsExMaterial({ diffuse: lut, size: 0.05 });
        const points = new Points(geometry, material);
        points.name = url;
        return { mesh: points, range: undefined };
      }
      if (dataType === GeometryDataType.DracoExMesh) {
        if (lut instanceof Color) {
          throw Error('invalid color');
        }

        if (!range) {
          throw Error('no range.');
        }
        material = MeshFactory.createColorMapMaterial(range, lut, opacity);
        const mesh = new Mesh(geometry, material);
        mesh.name = url;

        return { mesh, range };
      }
      throw Error('invalid data type.');
    } catch (e) {
      if (isCancel(e)) {
        return undefined;
      }

      throw Error(`unexpected exception ${e}`);
    } finally {
      this.runningTasks.delete(url);
    }
  }

  public static createColorMapMaterial(
    range: { min: number; max: number },
    lut: string | Lut | LutEx | undefined,
    opacity = 1
  ): ColorMapLambertMaterial {
    let volatileLut = lut;
    if (!volatileLut) {
      volatileLut = new Lut('rainbow', 64);
    }
    if (typeof volatileLut === 'string') {
      volatileLut = new Lut(<string>volatileLut, 64);
    }
    if (!(volatileLut instanceof Lut) && !(volatileLut instanceof LutEx)) {
      throw Error('Invalid lut');
    }
    const material = new ColorMapLambertMaterial(range.min, range.max, TextureFactory.fromLut(volatileLut), {
      opacity,
      clipping: true,
      lights: true,
      transparent: opacity < 1,
    });
    return material;
  }

  public static createSolidMaterial(color: string, opacity = 1): MeshLambertExMaterial {
    const materialColor = new Color();
    materialColor.set(color);

    return new MeshLambertExMaterial({
      diffuse: materialColor,
      side: FrontSide,
      opacity,
      transparent: opacity < 1,
      clipping: true,
      lights: true,
    });
  }

  private async loadStlAsync(
    url: string,
    onProgress?: (event: ProgressEvent<EventTarget>) => void
  ): Promise<BufferGeometry> {
    const state = this.runningTasks.get(url);
    if (!state) {
      throw new CancelError('cancelled.');
    }

    const loader = new STLExLoader();
    this.runningTasks.set(url, { loader });

    try {
      const geo = await loader.loadAsync(url, onProgress);
      return geo;
    } catch (e) {
      if (axios.isCancel(e)) {
        throw new CancelError();
      }
      throw e;
    }
  }

  private async loadDracoExAsync(
    url: string,
    onProgress?: (event: ProgressEvent<EventTarget>) => void
  ): Promise<BufferGeometry> {
    const state = this.runningTasks.get(url);
    if (!state) {
      throw new CancelError('cancelled.');
    }

    const loader = new DracoExLoader();
    loader.setDecoderPath('./wasm/dracoEx/');

    try {
      this.runningTasks.set(url, { loader });
      const geo = await loader.loadAsync(url, onProgress);

      if (!this.runningTasks.has(url)) {
        throw new CancelError('cancelled after download');
      }

      geo.computeVertexNormals();
      return geo as BufferGeometry;
    } finally {
      loader.dispose();
    }
  }

  public cancel(url: string): void {
    const state = this.runningTasks.get(url);
    if (!state) {
      throw Error('no such task.');
    }

    state.loader?.cancel();

    this.runningTasks.delete(url);
  }

  public static calculateValueRange(
    geo: BufferGeometry,
    attributeName: string
  ): { min: number; max: number } | undefined {
    const attribute = geo.getAttribute(attributeName);
    if (attribute) {
      const values = <Array<number>>attribute.array;
      if (values) {
        let min = Number.MAX_VALUE;
        let max = Number.MIN_VALUE;
        values.forEach((v) => {
          if (v < min) min = v;
          if (v > max) max = v;
        });
        return { min, max };
      }
    }
    return undefined;
  }
}
