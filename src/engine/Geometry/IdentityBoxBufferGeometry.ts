import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { Direction } from '../interfaces';
import { getVerticeOfSurface, getNormalOfSurface } from './boxConstants';

export default class IdentityBoxBufferGeometry extends BufferGeometry {
  constructor() {
    super();
    this.setAttribute('position', getVerticeOfSurface(Direction.Undefined));
    this.setAttribute('normal', getNormalOfSurface(Direction.Undefined));
  }
}
