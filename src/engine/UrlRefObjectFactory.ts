import { FrontSide } from 'three/src/constants';
import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { MeshPhongMaterial } from 'three/src/materials/MeshPhongMaterial';
import { Color } from 'three/src/math/Color';
import { Mesh } from 'three/src/objects/Mesh';
import STLCachedLoader from './STLCachedLoader';

export enum GeometryDataType {
  STLMesh = 1,
  DracoMesh,
  DracoCloud,
}

export default class UrlRefObjectFactory {
  public static async loadAsync(url: string, dataType: GeometryDataType): Promise<BufferGeometry> {
    switch (dataType) {
      case GeometryDataType.STLMesh:
        return UrlRefObjectFactory.loadStlAsync(url);
      default:
        throw Error('unexpected type.');
    }
  }

  public static async createSolidMesh(
    url: string,
    dataType: GeometryDataType,
    color: string
  ): Promise<Mesh | undefined> {
    const geometry = await UrlRefObjectFactory.loadAsync(url, dataType);

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

  private static async loadStlAsync(
    url: string,
    onProgress?: (event: ProgressEvent<EventTarget>) => void
  ): Promise<BufferGeometry> {
    const loader = new STLCachedLoader();
    const geo = await loader.loadAsync(url, onProgress);

    return geo as BufferGeometry;
  }
}
