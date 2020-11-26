import frag from '../shaders/points.frag.glsl';
import vert from '../shaders/points.vert.glsl';

export default class ParticalMaterial {
  private frag: string;

  private vert: string;

  constructor() {
    this.frag = frag;
    this.vert = vert;
  }
}
