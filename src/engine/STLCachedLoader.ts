import BlobCache from 'blobcache';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { FileLoader } from 'three/src/loaders/FileLoader';

export default class STLCachedLoader extends STLLoader {
  load(
    url: string,
    onLoad: (geometry: BufferGeometry) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: ErrorEvent) => void
  ): void {
    const blobCache = new BlobCache<ArrayBuffer>('sares-db', 1);
    blobCache.openAsync().then(() => {
      blobCache.pickAsync(url).then((content) => {
        const blob = content;
        const decode = (arryBuffer: ArrayBuffer) => {
          try {
            const geometry = this.parse(arryBuffer);
            onLoad(geometry);
          } catch (err: unknown) {
            const errorEvent = err as ErrorEvent;
            if (onError) onError(errorEvent);
          }
        };
        if (!blob) {
          const loader = new FileLoader(this.manager);
          loader.setPath(this.path);
          loader.setResponseType('arraybuffer');
          loader.setRequestHeader(this.requestHeader);
          loader.setWithCredentials(this.withCredentials);

          loader.load(
            url,
            (text) => {
              try {
                onLoad(this.parse(text));
              } catch (e) {
                if (onError) {
                  onError(e);
                } else {
                  console.error(e);
                }

                this.manager.itemError(url);
              }
            },
            onProgress,
            onError
          );
        } else {
          if (onProgress) {
            onProgress(
              new ProgressEvent(typeof ProgressEvent, {
                lengthComputable: true,
                loaded: blob.byteLength,
                total: blob.byteLength,
              })
            );
          }
          decode(blob);
        }
      });
    });
  }
}
