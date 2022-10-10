import { BufferGeometry } from 'three';
import Composite from './Composite';

/**
 * Base class for component manager.
 */
export default class ComponentManager {
  constructor(manager?: object);

  loadDecoder(): Promise<string | ArrayBuffer>;

  setDecoderPath(path: string);

  setDecoderConfig(config: object);

  addComposite(idx: int): Composite;

  decodeComponent(compositeId: int, componentName: string): Promise<BufferGeometry>;

  loadComponent(compositeId: int, componentName: string): Promise<ArrayBuffer | undefined>;

  destroyComposite(compositeId: int);
}
