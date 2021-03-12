import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

interface IAttributeProperties {
  position: string;
  normal: string;
  color: string;
  uv: string;
  generic: string;
}

interface IDracoLoader {
  defaultAttributeIDs: IAttributeProperties;
  defaultAttributeTypes: IAttributeProperties;
}

export default class DracoExLoader extends DRACOLoader {
  constructor() {
    super();
    const fixer = <IDracoLoader>(<unknown>this);
    fixer.defaultAttributeIDs.generic = 'GENERIC';
    fixer.defaultAttributeTypes.generic = 'Float32Array';
  }
}
