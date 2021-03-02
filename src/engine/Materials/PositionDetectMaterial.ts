import { ShaderMaterial } from 'three/src/materials/ShaderMaterial';
import { Material } from 'three/src/materials/Material';
import { NoBlending } from 'three/src/constants';
import { UniformsUtils } from 'three/src/renderers/shaders/UniformsUtils';
import { ShaderLib } from 'three/src/renderers/shaders/ShaderLib';
import { Matrix4 } from 'three/src/math/Matrix4';
import vert from '../shaders/positiondetect.vert.glsl';
import frag from '../shaders/positiondetect.frag.glsl';

export default class PositionDetectMaterial extends ShaderMaterial {
  public wrappedObjectId: number;

  private wrappedObjectTransform: Matrix4;

  constructor(objectId: number) {
    const extraUniforms = {
      objectId: { value: objectId },
      objectTransform: { value: new Matrix4() },
    };
    super({
      uniforms: UniformsUtils.merge([ShaderLib.basic.uniforms, extraUniforms]),
      vertexShader: vert,
      fragmentShader: frag,
    });
    this.lights = false;
    this.blending = NoBlending;
    this.wrappedObjectId = objectId;
    this.clipping = true;
    this.wrappedObjectTransform = new Matrix4();
  }

  public copy(source: Material): this {
    super.copy(source);

    const v = <PositionDetectMaterial>this;
    if (!v) {
      throw Error('invalid input');
    }

    this.wrappedObjectId = v.wrappedObjectId;
    this.wrappedObjectTransform = v.wrappedObjectTransform;

    return this;
  }

  get objectId(): number {
    return this.wrappedObjectId;
  }

  set objectId(newValue: number) {
    this.wrappedObjectId = newValue;
    this.uniforms.objectId.value = newValue;
  }

  get objectTransform(): Matrix4 {
    return this.wrappedObjectTransform;
  }

  set objectTransform(newValue: Matrix4) {
    this.wrappedObjectTransform = newValue;
    this.uniforms.objectTransform.value = newValue;
  }
}
