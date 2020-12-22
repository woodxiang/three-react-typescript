import { FrontSide } from 'three/src/constants';
import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { Material } from 'three/src/materials/Material';
import { MeshPhongMaterial } from 'three/src/materials/MeshPhongMaterial';
import { Color } from 'three/src/math/Color';
import { Mesh } from 'three/src/objects/Mesh';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import STLCachedLoader from './STLCachedLoader';

export enum GeometryDataType {
  STLMesh = 1,
  DracoMesh,
  DracoCloud,
}

export default class MeshFactory {
  public static async loadAsync(url: string, dataType: GeometryDataType): Promise<BufferGeometry> {
    switch (dataType) {
      case GeometryDataType.STLMesh:
        return MeshFactory.loadStlAsync(url);
      case GeometryDataType.DracoMesh:
        return MeshFactory.loadDracoAsync(url);
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
    const mesh = new Mesh(geometry, material);
    mesh.name = url;

    return mesh;
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
    const loader = new STLCachedLoader();
    const geo = (await loader.loadAsync(url, onProgress)) as BufferGeometry;
    return geo as BufferGeometry;
  }

  private static async loadDracoAsync(
    url: string,
    onProgress?: (event: ProgressEvent<EventTarget>) => void
  ): Promise<BufferGeometry> {
    const loader = new DRACOLoader();
    loader.setDecoderPath('./wasm/');
    const geo = await loader.loadAsync(url, onProgress);

    geo.computeVertexNormals();

    return geo as BufferGeometry;
  }
}
