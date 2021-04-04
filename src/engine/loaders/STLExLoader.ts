import axios, { CancelTokenSource } from 'axios';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { isNode } from 'browser-or-node';

interface ISTLParser {
  parse(text: ArrayBuffer): BufferGeometry;
}

export default class STLExLoader {
  private cancelSource: CancelTokenSource | undefined = undefined;

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

    const parser = <ISTLParser>new STLLoader();
    return parser.parse(data);
  }

  public cancel(): void {
    this.cancelSource?.cancel();
  }
}
