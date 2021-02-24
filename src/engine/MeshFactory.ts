import { FrontSide } from 'three/src/constants';
import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { Material } from 'three/src/materials/Material';
import { MeshPhongMaterial } from 'three/src/materials/MeshPhongMaterial';
import { Color } from 'three/src/math/Color';
import { Mesh } from 'three/src/objects/Mesh';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { Lut } from 'three/examples/jsm/math/Lut';
import { PointsMaterial } from 'three/src/materials/PointsMaterial';
import { Points } from 'three/src/objects/Points';
import DracoExLoader from './DracoExLoader';
import ColorMapPhongMaterial from './Materials/ColorMapPhongMaterial';

export enum GeometryDataType {
  STLMesh = 1,
  DracoMesh,
  DracoMeshEx,
}

export default class MeshFactory {
  public static async loadAsync(url: string, dataType: GeometryDataType): Promise<BufferGeometry> {
    switch (dataType) {
      case GeometryDataType.STLMesh:
        return MeshFactory.loadStlAsync(url);
      case GeometryDataType.DracoMesh:
        return MeshFactory.loadDracoAsync(url);
      case GeometryDataType.DracoMeshEx:
        return MeshFactory.loadDracoExAsync(url);
      default:
        throw Error('unexpected type.');
    }
  }

  public static async createSolidMesh(
    url: string,
    dataType: GeometryDataType,
    color: string
  ): Promise<Mesh | undefined> {
    const geometry = await MeshFactory.loadAsync(url, dataType);

    const materialColor = new Color();
    materialColor.set(color);

    const material = new MeshPhongMaterial({
      color: materialColor,
      side: FrontSide,
    });
    material.specular.set(0.9);
    const mesh = new Mesh(geometry, material);
    mesh.name = url;

    return mesh;
  }

  public static async createColorMapMesh(url: string, dataType: GeometryDataType): Promise<Mesh | Points | undefined> {
    const geometry = await MeshFactory.loadAsync(url, dataType);
    const range = MeshFactory.calculateValueRange(geometry, 'generic');
    let material: Material;
    if (!range) {
      material = new PointsMaterial({ color: new Color('cyan'), size: 0.05 });
      const points = new Points(geometry, material);
      points.name = url;
      return points;
    }
    material = this.createColorMapMaterial(range, 'rainbow');
    const mesh = new Mesh(geometry, material);
    mesh.name = url;

    return mesh;
  }

  public static createColorMapMaterial(
    range: { min: number; max: number },
    lut: string | Lut | undefined
  ): ColorMapPhongMaterial {
    let volatileLut = lut;
    if (!volatileLut) {
      volatileLut = new Lut('rainbow', 8192);
    }
    if (typeof volatileLut === 'string') {
      volatileLut = new Lut(<string>volatileLut, 8192);
    }
    if (!(volatileLut instanceof Lut)) {
      throw Error('Invalid lut');
    }
    volatileLut.setMin(range.min);
    volatileLut.setMax(range.max);
    const material = new ColorMapPhongMaterial(volatileLut);
    material.specular.set(0.9);
    return material;
  }

  public static createSolidMaterial(color: string): MeshPhongMaterial {
    const materialColor = new Color();
    materialColor.set(color);

    return new MeshPhongMaterial({
      color: materialColor,
      side: FrontSide,
    });
  }

  public static async createMeshWithMultiMaterial(
    url: string,
    dataType: GeometryDataType,
    materials: Material[]
  ): Promise<Mesh | undefined> {
    const geometry = await MeshFactory.loadAsync(url, dataType);

    const mesh = new Mesh(geometry, materials);
    mesh.name = url;

    return mesh;
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
    loader.setDecoderPath('./wasm/draco/');
    const geo = await loader.loadAsync(url, onProgress);

    geo.computeVertexNormals();

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

    return geo as BufferGeometry;
  }

  private static calculateValueRange(
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
