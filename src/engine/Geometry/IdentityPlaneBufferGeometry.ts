import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { Direction } from '../interfaces';
import { getNormalOfSurface, getVerticeOfSurface } from './boxConstants';

export default class IdentityPlaneBufferGeometry extends BufferGeometry {
  constructor(dir: Direction) {
    super();

    this.setAttribute('position', getVerticeOfSurface(dir));
    this.setAttribute('normal', getNormalOfSurface(dir));
  }
}
