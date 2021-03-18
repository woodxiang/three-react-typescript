import { ShaderMaterial, ShaderMaterialParameters } from 'three/src/materials/ShaderMaterial';
import { Material } from 'three/src/materials/Material';
import { NoBlending } from 'three/src/constants';
import { UniformsUtils } from 'three/src/renderers/shaders/UniformsUtils';
import { ShaderLib } from 'three/src/renderers/shaders/ShaderLib';
import { Matrix4 } from 'three/src/math/Matrix4';
import vert from '../shaders/positiondetect.vert.glsl';
import frag from '../shaders/positiondetect.frag.glsl';
import IAfterProject from './IAfterProject';

export interface PositionDetectMaterialParameters extends ShaderMaterialParameters {
  afterProjectMatrix?: Matrix4;
}

export default class PositionDetectMaterial extends ShaderMaterial implements IAfterProject {
  public wrappedObjectId: number;

  private wrappedObjectTransform: Matrix4;

  public afterProjectMatrix: Matrix4;

  constructor(objectId: number, parameters?: PositionDetectMaterialParameters) {
    super();
    this.blending = NoBlending;

    this.wrappedObjectId = objectId;
    this.wrappedObjectTransform = new Matrix4();
    this.afterProjectMatrix = new Matrix4();

    if (parameters) this.setValues(parameters);

    this.updateUniforms();
  }

  public ReplaceAfterProjectMatrix(mat: Matrix4): void {
    this.afterProjectMatrix = mat;
    this.uniforms.afterProjectMatrix.value = mat;
  }

  public copy(source: Material): this {
    super.copy(source);

    const v = <PositionDetectMaterial>source;
    if (!v) {
      throw Error('invalid input');
    }

    this.wrappedObjectId = v.wrappedObjectId;
    this.wrappedObjectTransform = v.wrappedObjectTransform;
    this.afterProjectMatrix = v.afterProjectMatrix;

    this.updateUniforms();
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

  private updateUniforms() {
    const uniforms = UniformsUtils.clone(ShaderLib.basic.uniforms);
    uniforms.afterProjectMatrix = { value: this.afterProjectMatrix };
    uniforms.objectId = { value: this.objectId };
    uniforms.objectTransform = { value: this.objectTransform };

    this.uniforms = uniforms;
    this.vertexShader = vert;
    this.fragmentShader = frag;
  }
}
