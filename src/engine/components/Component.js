import axios from "axios";
import * as THREE from "three";

var Component = function (name, url, loadProgress, loadError) {
  this.parent = null;
  this.name = name;
  this.url = url;
  this.buffer = null;
  this.worker = null;
  this.promise = Promise.resolve();
  this.loadProgress = loadProgress;
  this.loadError = loadError;
  this.done = false;
  this.decodePending = null;
};

Component.prototype = {
  constructor: Component,

  load: function () {
    const that = this;
    // const startDownload = performance.now();
    let prePromise = that.promise;
    that.promise = new Promise((resolve, reject) => {
      prePromise.then(() => {
        if (that.done) {
          console.log(`${that.parent.id} ${that.name} already done`);
          resolve();
          return;
        }

        axios.get(that.url, { responseType: "arraybuffer" }).then((resp) => {
          // console.log(`${that.name} download duration`, performance.now() - startDownload);
          resolve(resp.data);
        }).catch(reason => {
          // onError
          that.loadError(reason);
          reject(reason)
        });
      });
    });
    return that.promise;
  },

  decode: function () {
    const that = this;

    this.decodePending = new Promise((resolve, reject) => {
      if (that.done) {
        resolve(that.parent.geometry);
        return;
      }
      that.promise.then((buffer) => {
        that.parent.workerPending.then((worker) => {
          worker._callbacks[that.name] = { resolve: (msg) => {
            const geometryData = msg.geometry;
            const geometry = that.parent.geometry;
            switch (msg.name) {
              case "no_split":
                if (geometryData.index) {
                  geometry.setIndex(
                    new THREE.BufferAttribute(geometryData.index.array, 1)
                  );
                }
          
                for (var i = 0; i < geometryData.attributes.length; i++) {
                  var attribute = geometryData.attributes[i];
                  var name = attribute.name;
                  var array = attribute.array;
                  var itemSize = attribute.itemSize;
                  geometry.setAttribute(name, new THREE.BufferAttribute(array, itemSize));
                }
                break;
              case "base":
                that.done = true;
                break;
              case "position":
                if (geometryData.index) {
                  geometry.setIndex(
                    new THREE.BufferAttribute(geometryData.index.array, 1)
                  );
                }
                if (geometryData.attribute) {
                  const attr = geometryData.attribute;
                  geometry.setAttribute(attr.name, new THREE.BufferAttribute(attr.array, attr.itemSize));
                }
                that.done = true;
                break;
              default:
                if (geometryData.attribute) {
                  const attr = geometryData.attribute;
                  geometry.setAttribute('generic', new THREE.BufferAttribute(attr.array, attr.itemSize));
                }
                that.done = true;
                break;
            }
            resolve(geometry);
          }, reject };
          worker.postMessage({
            type: "decode",
            buffer,
            name: that.name,
          });
        })
      }).catch(reject);
    });
    return this.decodePending;
  },
  destroy: function () {
  },
};

export { Component };
