import { BufferGeometry } from 'three/src/core/BufferGeometry';
import STLCachedLoader from './STLCachedLoader';

export enum GeometryDataType {
  STLMesh = 1,
  DracoMesh,
  DracoCloud,
}

export interface DataRefUrl {
  url: string;
  dataType: GeometryDataType;
  color: string;
}

export default class UrlRefObjectFactory {
  private static async loadStlAsync(
    url: string,
    onProgress?: (event: ProgressEvent<EventTarget>) => void
  ): Promise<BufferGeometry> {
    const loader = new STLCachedLoader();
    const geo = await loader.loadAsync(url, onProgress);

    return geo as BufferGeometry;
  }

  public static async loadAsync(dataRefUrl: DataRefUrl): Promise<BufferGeometry> {
    switch (dataRefUrl.dataType) {
      case GeometryDataType.STLMesh:
        return UrlRefObjectFactory.loadStlAsync(dataRefUrl.url);
      default:
        throw Error('unexpected type.');
    }
  }
}
