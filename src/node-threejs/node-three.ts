import { sRGBEncoding } from 'three/src/constants';
import { WebGLRenderer, WebGLRendererParameters } from 'three/src/renderers/WebGLRenderer';

interface NodeWebGLRendererParameters extends WebGLRendererParameters {
  width: number;
  height: number;
  devicePixelRatio: number;
}

export default class NodeWebGLRenderer extends WebGLRenderer {
  constructor(parameters?: NodeWebGLRendererParameters) {
    super(parameters);
    this.autoClear = false;
    this.localClippingEnabled = true;
    this.outputEncoding = sRGBEncoding;
    const devicePixelRatio = parameters?.devicePixelRatio ?? 1;
    this.setPixelRatio(devicePixelRatio);
    this.setSize(parameters?.width ?? 0, parameters?.height ?? 0);
    this.domElement = document.createElement('canvas');
  }
}
