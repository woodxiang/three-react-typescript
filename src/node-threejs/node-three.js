// import createCanvasGL from "./canvas-gl.js";
import * as THREE from "three";

let NodeWebGLRenderer = (options) => {
  // Create context
  const width = options.width ?? 0;
  const height = options.height ?? 0;
  const devicePixelRatio = options.devicePixelRatio ?? 1;
  // const canvas = createCanvasGL(width, height);
  // const gl = canvas.getContext("webgl");
  // gl.canvas = canvas;
  // const parameters = {
  //   ...options,
  //   canvas: canvas,
  //   context: gl,
  // };
  const renderer = new THREE.WebGLRenderer(parameters);
  // renderer.canvas = canvas;
  // renderer.gl = gl;
  renderer.autoClear = false;
  renderer.localClippingEnabled = true;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setPixelRatio(devicePixelRatio);
  renderer.setSize(width, height);
  renderer.domElement = document.createElement("div");
  return renderer;
};

export { NodeWebGLRenderer };
