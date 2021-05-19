import * as THREE from "three";
import { Component } from "./Component.js";

var Composite = function (parent, id) {
  let that = this;
  this.parent = parent;
  this.id = id;
  this.components = {};
  this.worker = null;
  this.workerPending = new Promise((resolve, reject) => {
    parent.decoderPending.then(() => {
      that.worker = parent.getWorker(id);
      resolve(that.worker);
    }).catch(reason => reject(reason));
  });
  this.geometry = new THREE.BufferGeometry();
  this.geometry.compositeId = id;
  this.busy = Promise.resolve();
};

Composite.prototype = {
  constructor: Composite,

  addComponent: function (name, url, loadProgress, loadError) {
    const exist_comp = this.components[name];
    if (name === "no_split" || !exist_comp) {
      if (exist_comp) {
        exist_comp.destroy();
      }
      let component = new Component(name, url, loadProgress, loadError);
      component.parent = this;
      this.components[name] = component;
    }
  },

  getComponentByName: function (name) {
    return this.components[name];
  },

  destroy: function () {
    const that = this;
    let decodePendingList = [];
    that.workerPending.then((worker) => {
      for (let name in that.components) {
        const decodePending = that.components[name].decodePending;
        if (decodePending) decodePendingList.push(decodePending);
      }
      Promise.all(decodePendingList).then((results) => {
        for (let name in that.components) {
          that.components[name].destroy();
        }
        worker.terminate();
        that.geometry.dispose();
      });
    }).catch(reason => console.log("Get worker failed:", reason))
  },

  cancel: function () {
    console.log("Cancel:", this.id);
  },
};

export { Composite };
