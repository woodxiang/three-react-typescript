import { ShaderMaterial, ShaderMaterialParameters } from 'three/src/materials/ShaderMaterial';
import { Material } from 'three/src/materials/Material';
import { NoBlending } from 'three/src/constants';
import { UniformsUtils } from 'three/src/renderers/shaders/UniformsUtils';
import { ShaderLib } from 'three/src/renderers/shaders/ShaderLib';
import { Matrix4 } from 'three/src/math/Matrix4';
import vert from '../shaders/valuedetect.vert.glsl';
import frag from '../shaders/valuedetect.frag.glsl';
import IAfterProject from './IAfterProject';
import toUniform from '../utils/uniformsUtilitiesExt';

export interface ValueDetectMaterialParameters extends ShaderMaterialParameters {
  afterProjectMatrix?: Matrix4;
}

export default class ValueDetectMaterial extends ShaderMaterial implements IAfterProject {
  public afterProjectMatrix: Matrix4;

  constructor(parameters?: ValueDetectMaterialParameters) {
    super();
    this.blending = NoBlending;

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

    const v = <ValueDetectMaterial>source;
    if (!v) {
      throw Error('invalid input');
    }

    this.afterProjectMatrix = v.afterProjectMatrix;

    this.updateUniforms();
    return this;
  }

  private updateUniforms() {
    this.uniforms = UniformsUtils.merge([ShaderLib.phong.uniforms, toUniform(this)]);
    this.vertexShader = vert;
    this.fragmentShader = frag;
    this.uniforms.afterProjectMatrix.value = this.afterProjectMatrix;
  }
}
