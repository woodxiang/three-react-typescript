import axios from "axios";
import { FileLoader, Loader } from "three";
import { isNode } from 'browser-or-node';
import { Worker as NodeWorker } from "worker_threads";

import { Composite } from "./Composite.js";
import { DracoWorker } from "./DracoWorker.js";

var ComponentsManager = function (manager) {
  let that = this;
  Loader.call(that, manager);

  that.defaultAttributeIDs = {
    position: "POSITION",
    normal: "NORMAL",
    color: "COLOR",
    uv: "TEX_COORD",
  };
  that.defaultAttributeTypes = {
    position: "Float32Array",
    normal: "Float32Array",
    color: "Float32Array",
    uv: "Float32Array",
  };

  that.decoderPath = "";
  that.decoderConfig = {};
  that.decoderBinary = null;
  that.decoderPending = null;

  that.workerLimit = 4;
  that.workerPool = [];
  that.workerNextTaskID = 1;
  that.workerSourceURL = "";

  that.composites = {};
  that.currentComposite = null;
};

ComponentsManager.prototype = Object.assign(Object.create(Loader.prototype), {
  constructor: ComponentsManager,

  _loadLibrary: function (url, responseType) {
    return new Promise((resolve, reject) => {
      if (isNode) {
        axios.get(this.decoderPath + url, { responseType }).then((resp) => {
          resolve(resp.data);
        }).catch(reason => reject(reason));
      } else {
        var loader = new FileLoader(this.manager);
        loader.setPath(this.decoderPath);
        loader.setResponseType(responseType);
        loader.setWithCredentials(this.withCredentials);
        loader.load(url, resolve, undefined, reject);
      }
    });
  },

  // Load draco decoder
  loadDecoder: async function () {
    let that = this;
    if (isNode) {
      that.decoderPending = that._loadLibrary("draco_decoder.js-1.4.wasm", "arraybuffer").then((wasmBinary) => {
        that.decoderConfig.wasmBinary = wasmBinary;
        that.workerSourceURL = "./public/draco/split/DracoWorkerWrapped.js";
      });
    } else {
      that.dracoWorkerScript = DracoWorker.toString();
      that.dracoWorkerScript = that.dracoWorkerScript.substring(
        that.dracoWorkerScript.indexOf("{") + 1,
        that.dracoWorkerScript.lastIndexOf("}")
      );

      var librariesPending = [];
      librariesPending.push(that._loadLibrary("draco_wasm_wrapper.js", "text"));
      librariesPending.push(
        that._loadLibrary("draco_decoder.wasm", "arraybuffer")
      );
      that.decoderPending = Promise.all(librariesPending).then((libraries) => {
        var jsContent = libraries[0];
        that.decoderConfig.wasmBinary = libraries[1];
        var body = [
          "/* draco decoder */",
          jsContent,
          "",
          "/* worker */",
          that.dracoWorkerScript,
        ].join("\n");

        that.workerSourceURL = URL.createObjectURL(new Blob([body]));
      });
    }

    await that.decoderPending;
  },

  getWorker: function (id) {
    var worker;
    if (isNode) {
      worker = new NodeWorker(this.workerSourceURL, { name: `Worker${id}` });
    } else {
      worker = new Worker(this.workerSourceURL, { name: `Worker${id}` });
    }
    worker._callbacks = {};
    worker.postMessage({ type: "init", decoderConfig: this.decoderConfig });
    
    const onMessage = (message) => {
      let callback = worker._callbacks[message.name];
      if (!callback) return;

      switch (message.type) {
        case "decode":
          callback.resolve(message);
          break;

        case "error":
          callback.reject(message);
          break;

        default:
          console.error(
            'THREE.DRACOLoader: Unexpected message, "' + message.type + '"'
          );
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
  },

  setDecoderPath: function (path) {
    this.decoderPath = path;
    return this;
  },

  setDecoderConfig: function (config) {
    this.decoderConfig = config;
    return this;
  },

  setWorkerLimit: function (workerLimit) {
    this.workerLimit = workerLimit;
    return this;
  },

  addComposite: function (idx) {
    let composite = this.composites[idx];
    if (composite) {
      return composite;
    }
    composite = new Composite(this, idx);
    this.composites[idx] = composite;
    return composite;
  },

  loadComponent: function (compositeId, componentName) {
    let composite = this.composites[compositeId];
    if (!composite) {
      return Promise.reject(`no_composite_${compositeId}`);
    }
    let component = composite.getComponentByName(componentName);
    if (!component) {
      reject(`no_component_${componentName}`);
    }
    return component.load();
  },

  getComponent: function (compositeId) {
    return this.composites[compositeId];
  },

  decodeComponent: function (compositeId, componentName) {
    let composite = this.composites[compositeId];
    if (!composite) {
      return Promise.reject(`no_composite_${compositeId}`);
    }
    const busy = composite.busy;
    if (!busy) {
      return Promise.reject(`no_composite_busy_${compositeId}`);
    }
    let promise = new Promise((resolve, reject) => {
      busy.then(() => {
        let component = composite.getComponentByName(componentName);
        if (!component) {
          reject(`no_component_${componentName}`);
        }
        component.decode().then((value) => {
          resolve(value);
        }).catch((reason) => reject(reason));
      }).catch((reason) => reject(reason));
    });
    composite.busy = promise;
    return promise;
  },

  destroyComposite: function (compositeId) {
    let composite = this.composites[compositeId];
    if (composite) {
      composite.destroy();
      delete this.composites[compositeId];
      console.log(`Composite ${compositeId} destroied.`);
    }
  },

  destroyAll: function (except) {
    let that = this;
    for (let compositeId in that.composites)
      if (compositeId != except) that.destroyComposite(compositeId);
  },
});

export default ComponentsManager;
