import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { concatFloatAttribute, concatInt16Attribute, edges, vertices } from './boxConstants';

export default class IdentityBoxBoundaryBufferGeometry extends BufferGeometry {
  constructor() {
    super();
    this.setAttribute('position', concatFloatAttribute(vertices, 3));
    this.setIndex(concatInt16Attribute(edges, 1));
  }
}
