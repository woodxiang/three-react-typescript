/* eslint-disable */
import axios from 'axios';
import { FileLoader, Loader } from 'three';
import { isNode } from 'browser-or-node';
import { Worker as NodeWorker } from 'worker_threads';

import { Composite } from './Composite.js';
import { DracoWorker } from './DracoWorker.js';

class ComponentsManager extends Loader {
  constructor(manager) {
    super(manager);

    this.defaultAttributeIDs = {
      position: 'POSITION',
      normal: 'NORMAL',
      color: 'COLOR',
      uv: 'TEX_COORD',
    };

    this.defaultAttributeTypes = {
      position: 'Float32Array',
      normal: 'Float32Array',
      color: 'Float32Array',
      uv: 'Float32Array',
    };

    this.decoderPath = '';
    this.decoderConfig = {};
    this.decoderBinary = null;
    this.decoderPending = null;

    this.workerLimit = 4;
    this.workerPool = [];
    this.workerNextTaskID = 1;
    this.workerSourceURL = '';

    this.composites = {};
    this.currentComposite = null;
  }

  _loadLibrary(url, responseType) {
    return new Promise((resolve, reject) => {
      if (isNode) {
        axios
          .get(this.decoderPath + url, { responseType })
          .then((resp) => {
            resolve(resp.data);
          })
          .catch((reason) => reject(reason));
      } else {
        const loader = new FileLoader(this.manager);
        loader.setPath(this.decoderPath);
        loader.setResponseType(responseType);
        loader.setWithCredentials(this.withCredentials);
        loader.load(url, resolve, undefined, reject);
      }
    });
  }

  // Load draco decoder
  async loadDecoder() {
    const that = this;
    if (isNode) {
      that.decoderPending = that._loadLibrary('draco_decoder.js-1.4.wasm', 'arraybuffer').then((wasmBinary) => {
        that.decoderConfig.wasmBinary = wasmBinary;
        that.workerSourceURL = './public/draco/split/DracoWorkerWrapped.js';
      });
    } else {
      that.dracoWorkerScript = DracoWorker.toString();
      that.dracoWorkerScript = that.dracoWorkerScript.substring(
        that.dracoWorkerScript.indexOf('{') + 1,
        that.dracoWorkerScript.lastIndexOf('}')
      );

      const librariesPending = [];
      librariesPending.push(that._loadLibrary('draco_wasm_wrapper.js', 'text'));
      librariesPending.push(that._loadLibrary('draco_decoder.wasm', 'arraybuffer'));
      that.decoderPending = Promise.all(librariesPending).then((libraries) => {
        const jsContent = libraries[0];
        that.decoderConfig.wasmBinary = libraries[1];
        const body = ['/* draco decoder */', jsContent, '', '/* worker */', that.dracoWorkerScript].join('\n');

        that.workerSourceURL = URL.createObjectURL(new Blob([body]));
      });
    }

    await that.decoderPending;
  }

  getWorker(id) {
    let worker;
    if (isNode) {
      worker = new NodeWorker(this.workerSourceURL, { name: `Worker${id}` });
    } else {
      worker = new Worker(this.workerSourceURL, { name: `Worker${id}` });
    }
    worker._callbacks = {};
    worker.postMessage({ type: 'init', decoderConfig: this.decoderConfig });

    const onMessage = (message) => {
      const callback = worker._callbacks[message.name];
      if (!callback) return;

      switch (message.type) {
        case 'decode':
          callback.resolve(message);
          break;

        case 'error':
          callback.reject(message);
          break;

        default:
          console.error('THREE.DRACOLoader: Unexpected message, "' + message.type + '"');
      }
    };
    if (isNode) {
      worker.on('message', onMessage);
    } else {
      worker.onmessage = function (e) {
        onMessage(e.data);
      };
    }
    return worker;
  }

  setDecoderPath(path) {
    this.decoderPath = path;
    return this;
  }

  setDecoderConfig(config) {
    this.decoderConfig = config;
    return this;
  }

  setWorkerLimit(workerLimit) {
    this.workerLimit = workerLimit;
    return this;
  }

  addComposite(idx) {
    let composite = this.composites[idx];
    if (composite) {
      return composite;
    }
    composite = new Composite(this, idx);
    this.composites[idx] = composite;
    return composite;
  }

  loadComponent(compositeId, componentName) {
    const composite = this.composites[compositeId];
    if (!composite) {
      return Promise.reject(`no_composite_${compositeId}`);
    }
    const component = composite.getComponentByName(componentName);
    if (!component) {
      reject(`no_component_${componentName}`);
    }
    return component.load();
  }

  getComponent(compositeId) {
    return this.composites[compositeId];
  }

  decodeComponent(compositeId, componentName, decoderError) {
    const composite = this.composites[compositeId];
    if (!composite) {
      return Promise.reject(`no_composite_${compositeId}`);
    }
    const { busy } = composite;
    if (!busy) {
      return Promise.reject(`no_composite_busy_${compositeId}`);
    }
    const promise = new Promise((resolve, reject) => {
      busy
        .then(() => {
          const component = composite.getComponentByName(componentName);
          if (!component) {
            reject(`no_component_${componentName}`);
          }
          component
            .decode()
            .then((value) => {
              resolve(value);
            })
            .catch((reason) => {
              decoderError(reason);
              reject(reason);
            });
        })
        .catch((reason) => {
          reject(reason);
        });
    });
    composite.busy = promise;
    return promise;
  }

  destroyComposite(compositeId) {
    const composite = this.composites[compositeId];
    if (composite) {
      composite.destroy();
      delete this.composites[compositeId];
      console.log(`Composite ${compositeId} destroied.`);
    }
  }

  destroyAll(except) {
    const that = this;
    for (const compositeId in that.composites) {
      if (compositeId != except) that.destroyComposite(compositeId);
    }
  }
}

export default ComponentsManager;
