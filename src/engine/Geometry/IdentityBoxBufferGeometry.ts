import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { Direction } from '../interfaces';
import { getVerticeOfSurface, getNormalOfSurface, getUVOfSurface } from './boxConstants';

export default class IdentityBoxBufferGeometry extends BufferGeometry {
  constructor(withUvs = false) {
    super();
    this.setAttribute('position', getVerticeOfSurface(Direction.Undefined));
    this.setAttribute('normal', getNormalOfSurface(Direction.Undefined));
    if (withUvs) {
      this.setAttribute('uv', getUVOfSurface(Direction.Undefined));
    }
  }
}
