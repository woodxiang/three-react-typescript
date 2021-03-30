import { ShaderMaterial, ShaderMaterialParameters } from 'three/src/materials/ShaderMaterial';
import { ShaderLib } from 'three/src/renderers/shaders/ShaderLib';
import { UniformsUtils } from 'three/src/renderers/shaders/UniformsUtils';
import { Color } from 'three/src/math/Color';
import { Material } from 'three/src/materials/Material';
import { Matrix4 } from 'three/src/math/Matrix4';
import vert from '../shaders/meshbasicex.vert.glsl';
import frag from '../shaders/meshbasicex.frag.glsl';
import IAfterProject from './IAfterProject';
import toUniform from '../utils/uniformsUtilitiesExt';

export interface MeshBasicExMaterialParameters extends ShaderMaterialParameters {
  diffuse?: Color;
  afterProjectMatrix?: Matrix4;
}

export default class MeshBasicExMaterial extends ShaderMaterial implements IAfterProject {
  public diffuse: Color;

  public afterProjectMatrix: Matrix4;

  constructor(parameters?: MeshBasicExMaterialParameters | undefined) {
    super();

    this.diffuse = new Color(0xffffff);
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

    const v = <MeshBasicExMaterial>source;
    if (!v) {
      throw Error('invalid input');
    }

    this.diffuse = v.diffuse;
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
