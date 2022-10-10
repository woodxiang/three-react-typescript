import * as THREE from 'three';
import { Component } from './Component.js';

const Composite = function (parent, id) {
  const that = this;
  this.parent = parent;
  this.id = id;
  this.components = {};
  this.worker = null;
  this.workerPending = new Promise((resolve, reject) => {
    parent.decoderPending
      .then(() => {
        that.worker = parent.getWorker(id);
        resolve(that.worker);
      })
      .catch((reason) => reject(reason));
  });
  this.geometry = new THREE.BufferGeometry();
  this.geometry.compositeId = id;
  this.busy = Promise.resolve();
};

Composite.prototype = {
  constructor: Composite,

  addComponent(name, url, loadProgress, loadError) {
    const exist_comp = this.components[name];
    if (name === 'no_split' || !exist_comp) {
      if (exist_comp) {
        exist_comp.destroy();
      }
      const component = new Component(name, url, loadProgress, loadError);
      component.parent = this;
      this.components[name] = component;
    }
  },

  getComponentByName(name) {
    return this.components[name];
  },

  destroy() {
    const that = this;
    const decodePendingList = [];
    that.workerPending
      .then((worker) => {
        for (const name in that.components) {
          const { decodePending } = that.components[name];
          if (decodePending) decodePendingList.push(decodePending);
        }
        Promise.all(decodePendingList).then((results) => {
          for (const name in that.components) {
            that.components[name].destroy();
          }
          worker.terminate();
          that.geometry.dispose();
        });
      })
      .catch((reason) => console.log('Get worker failed:', reason));
  },

  cancel() {
    console.log('Cancel:', this.id);
  },
};

export { Composite };
