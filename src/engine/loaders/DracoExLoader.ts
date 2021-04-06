import axios, { CancelTokenSource, ResponseType } from 'axios';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { isNode } from 'browser-or-node';

interface IAttributeProperties {
  position: string;
  normal: string;
  color: string;
  uv: string;
  generic: string;
}

interface ITaskConfig {
  attributeIDs: IAttributeProperties;
  attributeTypes: IAttributeProperties;
  useUniqueIDs: boolean;
}

interface IDracoLoader {
  defaultAttributeIDs: IAttributeProperties;
  defaultAttributeTypes: IAttributeProperties;
  decoderPath: string;

  decodeGeometry(buffer: ArrayBuffer, taskConfig: ITaskConfig): Promise<BufferGeometry>;
}

export default class DracoExLoader extends DRACOLoader {
  private cancelSource: CancelTokenSource | undefined = undefined;

  constructor() {
    super();
    const fixer = <IDracoLoader>(<unknown>this);
    fixer.defaultAttributeIDs.generic = 'GENERIC';
    fixer.defaultAttributeTypes.generic = 'Float32Array';
  }

  public async loadAsync(url: string, onProgress?: (event: ProgressEvent) => void): Promise<BufferGeometry> {
    const cancelToken = axios.CancelToken;
    this.cancelSource = cancelToken.source();

    const stlContent = await axios(url, {
      responseType: 'arraybuffer',
      onDownloadProgress: onProgress,
      cancelToken: this.cancelSource.token,
    });

    let { data } = stlContent;

    if (isNode) {
      const ab = new ArrayBuffer(data.length);
      const view = new Uint8Array(ab);
      for (let i = 0; i < data.length; i += 1) {
        view[i] = data[i];
      }

      data = ab;
    }

    this.cancelSource.token.throwIfRequested();
    const fixer = <IDracoLoader>(<unknown>this);
    const taskConfig = {
      attributeIDs: fixer.defaultAttributeIDs,
      attributeTypes: fixer.defaultAttributeTypes,
      useUniqueIDs: false,
    };

    return fixer.decodeGeometry(data, taskConfig);
  }

  public cancel(): void {
    this.cancelSource?.cancel();
  }

  // eslint-disable-next-line no-underscore-dangle
  protected async _loadLibrary(url: string, responseType: ResponseType): Promise<any> {
    const fixer = <IDracoLoader>(<unknown>this);
    const response = await axios(fixer.decoderPath + url, { responseType });
    return response.data;
  }
}
