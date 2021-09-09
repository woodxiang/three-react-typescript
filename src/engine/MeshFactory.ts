import { FrontSide } from 'three/src/constants';
import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { BufferAttribute } from 'three/src/core/BufferAttribute';
import { Material } from 'three/src/materials/Material';
import { Color } from 'three/src/math/Color';
import { Mesh } from 'three/src/objects/Mesh';
import { Points } from 'three/src/objects/Points';
import axios from 'axios';
import { isNode } from 'browser-or-node';
import { Lut } from 'three/examples/jsm/math/Lut';
import ComponentsManager from './components/ComponentsManager';
import ColorMapLambertMaterial from './Materials/ColorMapLambertMaterial';
import TextureFactory from './TextureFactory';
import LutEx from './LutEx';
import MeshLambertExMaterial from './Materials/MeshLambertExMaterial';
import PointsExMaterial from './Materials/PointsExMaterial';
import STLExLoader from './loaders/STLExLoader';
import PLYExLoader from './loaders/PLYExLoader';
import CancelError, { isCancel } from './utils/CancelError';
import { ICancellableLoader } from './loaders/ICancellableLoader';

export enum GeometryDataType {
  STLMesh = 1,
  DracoExMesh,
  DracoExPoints,
  PLYMesh,
}

export interface MeshConfig {
  attr: string | undefined;
  split: boolean;
}

declare const window: Window & {
  assetBaseUrl: string;
};

export default class MeshFactory {
  private static componentsManager: ComponentsManager;

  private runningTasks = new Map<string, { loader: ICancellableLoader | undefined }>();

  private async loadAsync(
    url: string,
    dataType: GeometryDataType,
    onProgress?: (event: ProgressEvent<EventTarget>) => void,
    config?: MeshConfig
  ): Promise<BufferGeometry> {
    if (!MeshFactory.componentsManager) {
      MeshFactory.componentsManager = new ComponentsManager();
      if (isNode) {
        MeshFactory.componentsManager.setDecoderPath(`${window.assetBaseUrl}/draco/split/`);
      } else {
        MeshFactory.componentsManager.setDecoderPath('./wasm/split/');
      }
      MeshFactory.componentsManager.setDecoderConfig({ type: 'wasm' });
      MeshFactory.componentsManager.loadDecoder().catch((reason) => console.log('Load decoder failed:', reason));
    }
    switch (dataType) {
      case GeometryDataType.STLMesh:
        return this.loadStlAsync(url, onProgress);
      case GeometryDataType.DracoExMesh:
      case GeometryDataType.DracoExPoints:
        return this.loadDracoExAsync(url, onProgress, config?.split ? config.attr : undefined);
      case GeometryDataType.PLYMesh:
        return this.loadPlyAsync(url, onProgress);
      default:
        throw Error('unexpected type.');
    }
  }

  public async createSolidMesh(
    url: string,
    dataType: GeometryDataType,
    color: string,
    opacity = 1,
    config: any,
    onProgress?: (event: ProgressEvent<EventTarget>) => void
  ): Promise<Mesh | undefined> {
    if (this.runningTasks.has(url)) {
      throw Error('loading');
    }

    this.runningTasks.set(url, { loader: undefined });
    try {
      const geometry = await this.loadAsync(url, dataType, onProgress);

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
        ...config,
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
    opacity = 1,
    onProgress?: (event: ProgressEvent<EventTarget>) => void,
    config?: MeshConfig
  ): Promise<{ mesh: Mesh | Points; range: { min: number; max: number } | undefined } | undefined> {
    if (this.runningTasks.has(url)) {
      throw Error('loading');
    }

    this.runningTasks.set(url, { loader: undefined });
    try {
      const geometry = await this.loadAsync(url, dataType, onProgress, config);
      if (!this.runningTasks.get(url)) {
        throw new CancelError();
      }
      const range = MeshFactory.calculateValueRange(geometry, 'generic');
      let material: Material;

      switch (dataType) {
        case GeometryDataType.DracoExPoints: {
          if (!(lut instanceof Color)) {
            throw Error('invalid color');
          }
          material = new PointsExMaterial({ diffuse: lut, size: 0.05 });
          const points = new Points(geometry, material);
          points.name = url;
          return { mesh: points, range: undefined };
        }
        case GeometryDataType.DracoExMesh:
        case GeometryDataType.PLYMesh: {
          if (lut instanceof Color) {
            throw Error('invalid color');
          }

          if (!range) {
            throw Error('no range.');
          }
          material = MeshFactory.createColorMapMaterial(range, lut, opacity);
          let geo = geometry;
          if (config?.attr) 
            geo = MeshFactory.formatGeoAttribute(geometry, 'generic', config?.attr);
          const mesh = new Mesh(geo, material);
          mesh.name = url;

          return { mesh, range };
        }
        default:
          throw new Error('invalid datatype.');
      }
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
    onProgress?: (event: ProgressEvent<EventTarget>) => void,
    attr?: string
  ): Promise<BufferGeometry> {
    const state = this.runningTasks.get(url);
    if (!state) {
      throw new CancelError('cancelled.');
    }

    const compositeId = 0;
    const { componentsManager } = MeshFactory;
    componentsManager.destroyComposite(compositeId);
    const composite = componentsManager.addComposite(compositeId);

    this.runningTasks.set(url, { loader: composite });

    if (!this.runningTasks.has(url)) {
      throw new CancelError('cancelled after download');
    }

    const promise = new Promise<BufferGeometry>((resolve) => {
      const onDone = (value: BufferGeometry) => {
        resolve(value);
      };
      const onError = (err: string) => {
        console.log('Failed to load:', url, err);
        throw new CancelError(err);
      };
      if (attr) {
        const fileName = url.substring(0, url.lastIndexOf('.'));
        composite.addComponent('base', url, onProgress, onError);
        composite.addComponent('position', `${fileName}_position.drc`, onProgress, onError);
        composite.addComponent(attr, `${fileName}_${attr}.drc`, onProgress, onError);
        componentsManager
          .loadComponent(compositeId, 'base')
          .then(() => {
            componentsManager
              .loadComponent(compositeId, 'position')
              .then(() => {
                componentsManager.loadComponent(compositeId, attr).catch((err) => {
                  onError(`load ${attr} err: ${err}`);
                });
              })
              .catch((err) => {
                onError(`load position err: ${err}`);
              });
          })
          .catch((err) => {
            onError(`load base err: ${err}`);
          });

        componentsManager
          .decodeComponent(compositeId, 'base')
          .then(() => {
            componentsManager
              .decodeComponent(compositeId, 'position')
              .then(() => {
                componentsManager
                  .decodeComponent(compositeId, attr)
                  .then(onDone)
                  .catch((err) => {
                    onError(`decode ${attr} err: ${err}`);
                  });
              })
              .catch((err) => {
                onError(`decode position err: ${err}`);
              });
          })
          .catch((err) => {
            onError(`decode base err: ${err}`);
          });
      } else {
        composite.addComponent('no_split', url, onProgress, onError);
        componentsManager.loadComponent(compositeId, 'no_split').catch((err) => {
          onError(`load no_split err: ${err}`);
        });
        componentsManager
          .decodeComponent(compositeId, 'no_split')
          .then(onDone)
          .catch((err) => {
            onError(`decode no_split err: ${err}`);
          });
      }
    });

    const geo = await promise;
    geo.computeVertexNormals();
    return geo;
  }

  private async loadPlyAsync(
    url: string,
    onProgress?: (event: ProgressEvent<EventTarget>) => void
  ): Promise<BufferGeometry> {
    const state = this.runningTasks.get(url);
    if (!state) {
      throw new CancelError('cancelled.');
    }

    const loader = new PLYExLoader();
    this.runningTasks.set(url, { loader });

    try {
      return loader.loadAsync(url, undefined, onProgress, undefined);
    } catch (e) {
      if (axios.isCancel(e)) {
        throw new CancelError();
      }
      throw e;
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

  public static formatGeoAttribute(geo: BufferGeometry, attributeName: string, fileType: string): BufferGeometry {
    const attribute = geo.getAttribute(attributeName);
    if (attribute) {
      const { array, count } = attribute;
      if (array.length === count) {
        return geo;
      }
      if (fileType === 'defect') {
        const current = geo.clone();
        const len = geo.attributes.generic.array.length;
        const list = new Float32Array(len);
        for (let i = 0; i < len; i += 1) {
          if (i % 2 === 1) list[(i - 1) / 2] = attribute.array[i];
        }
        const attr = new BufferAttribute(list, 1);
        current.setAttribute(attributeName, attr);
        return current;
      }
      if (fileType === 'temperature') {
        const current = geo.clone();
        const len = geo.attributes.generic.array.length;
        const list = new Float32Array(len);
        for (let i = 0; i < len; i += 1) {
          if (i % 2 === 1) list[(i - 1) / 2] = attribute.array[i];
        }
        const attr = new BufferAttribute(list, 1);
        current.setAttribute(attributeName, attr);
        return current;
      }
    }
    return geo;
  }
}
