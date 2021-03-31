import { FrontSide } from 'three/src/constants';
import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { Material } from 'three/src/materials/Material';
import { Color } from 'three/src/math/Color';
import { Mesh } from 'three/src/objects/Mesh';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { Lut } from 'three/examples/jsm/math/Lut';
import { Points } from 'three/src/objects/Points';
import DracoExLoader from './loaders/DracoExLoader';
import ColorMapLambertMaterial from './Materials/ColorMapLambertMaterial';
import TextureFactory from './TextureFactory';
import LutEx from './LutEx';
import MeshLambertExMaterial from './Materials/MeshLambertExMaterial';
import PointsExMaterial from './Materials/PointsExMaterial';

export enum GeometryDataType {
  STLMesh = 1,
  DracoMesh,
  DracoExMesh,
  DracoExPoints,
}

export default class MeshFactory {
  public static async loadAsync(url: string, dataType: GeometryDataType): Promise<BufferGeometry> {
    switch (dataType) {
      case GeometryDataType.STLMesh:
        return MeshFactory.loadStlAsync(url);
      case GeometryDataType.DracoMesh:
        return MeshFactory.loadDracoAsync(url);
      case GeometryDataType.DracoExMesh:
      case GeometryDataType.DracoExPoints:
        return MeshFactory.loadDracoExAsync(url);
      default:
        throw Error('unexpected type.');
    }
  }

  public static async createSolidMesh(
    url: string,
    dataType: GeometryDataType,
    color: string,
    opacity = 1
  ): Promise<Mesh | undefined> {
    const geometry = await MeshFactory.loadAsync(url, dataType);

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
  }

  public static async createColorMapMesh(
    url: string,
    dataType: GeometryDataType,
    lut: string | Lut | LutEx | undefined = undefined,
    opacity = 1
  ): Promise<Mesh | Points | undefined> {
    const geometry = await MeshFactory.loadAsync(url, dataType);
    const range = MeshFactory.calculateValueRange(geometry, 'generic');
    let material: Material;
    if (!range) {
      material = new PointsExMaterial({ diffuse: new Color('cyan'), size: 0.05 });
      const points = new Points(geometry, material);
      points.name = url;
      return points;
    }
    material = this.createColorMapMaterial(range, lut, opacity);
    const mesh = new Mesh(geometry, material);
    mesh.name = url;

    return mesh;
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

  private static async loadStlAsync(
    url: string,
    onProgress?: (event: ProgressEvent<EventTarget>) => void
  ): Promise<BufferGeometry> {
    const loader = new STLLoader();
    const geo = (await loader.loadAsync(url, onProgress)) as BufferGeometry;
    return geo as BufferGeometry;
  }

  private static async loadDracoAsync(
    url: string,
    onProgress?: (event: ProgressEvent<EventTarget>) => void
  ): Promise<BufferGeometry> {
    const loader = new DRACOLoader();
    loader.setDecoderPath('/wasm/draco/');
    const geo = await loader.loadAsync(url, onProgress);

    geo.computeVertexNormals();

    loader.dispose();

    return geo as BufferGeometry;
  }

  private static async loadDracoExAsync(
    url: string,
    onProgress?: (event: ProgressEvent<EventTarget>) => void
  ): Promise<BufferGeometry> {
    const loader = new DracoExLoader();
    loader.setDecoderPath('./wasm/dracoEx/');
    const geo = await loader.loadAsync(url, onProgress);

    geo.computeVertexNormals();

    loader.dispose();

    return geo as BufferGeometry;
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
