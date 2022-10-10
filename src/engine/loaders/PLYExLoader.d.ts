/**
 * @author Arton
 *
 * Description: A THREE loader for simple binary PLY files.
 *
 * Limitations: This decoder is for Node.js, don't use this in browser.
 *  This decoder is for binary PLY files.
 *
 * Usage:
 *	var loader = new PLYExLoader();
 *	loader.load('./models/ply/binary/test.ply', function (geometry) {
 *		scene.add( new THREE.Mesh( geometry ) );
 *	} );
 *
 */
import { BufferGeometry, Loader, LoadingManager } from 'three';
import { ICancellableLoader } from './ICancellableLoader';

export default class PLYExLoader extends Loader implements ICancellableLoader {
  constructor(manager?: LoadingManager) {
    super(manager);
  }

  public loadAsync(
    url: string,
    onLoad?: (geometry: BufferGeometry) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: ErrorEvent) => void
  ): Promise<BufferGeometry>;

  public cancel(): void;
}
