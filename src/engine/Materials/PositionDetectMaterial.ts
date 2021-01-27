import { ShaderMaterial } from 'three/src/materials/ShaderMaterial';
import { Material } from 'three/src/materials/Material';
import { NoBlending } from 'three/src/constants';
import vert from '../shaders/positiondetect.vert.glsl';
import frag from '../shaders/positiondetect.frag.glsl';

export default class PositionDetectMaterial extends ShaderMaterial {
  public objectId: number;

  constructor(objectId: number) {
    super({
      vertexShader: vert,
      fragmentShader: frag,
    });
    this.lights = false;
    this.blending = NoBlending;
    this.objectId = objectId;
  }

  public copy(source: Material): this {
    super.copy(source);

    const v = <PositionDetectMaterial>this;
    if (!v) {
      throw Error('invalid input');
    }

    this.objectId = v.objectId;

    return this;
  }
}
