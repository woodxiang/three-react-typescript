import { ShaderMaterial, ShaderMaterialParameters } from 'three/src/materials/ShaderMaterial';
import { ShaderLib } from 'three/src/renderers/shaders/ShaderLib';
import { UniformsUtils } from 'three/src/renderers/shaders/UniformsUtils';
import { Color } from 'three/src/math/Color';
import { Material } from 'three/src/materials/Material';
import { Matrix4 } from 'three/src/math/Matrix4';
import vert from '../shaders/meshbasicex.vert.glsl';
import frag from '../shaders/meshbasicex.frag.glsl';
import IAfterProject from './IAfterProject';

export interface MeshLineExMaterialParameters extends ShaderMaterialParameters {
  diffuse?: Color;
  linewidth?: number;
  linecap?: 'round';
  linejoin?: 'round';
  afterProjectMatrix?: Matrix4;
}

export default class MeshLineExMaterial extends ShaderMaterial implements IAfterProject {
  public diffuse: Color;

  public linewidth: number;

  public linecap: string;

  public linejoin: string;

  public afterProjectMatrix: Matrix4;

  constructor(parameters?: MeshLineExMaterialParameters | undefined) {
    super();

    this.diffuse = new Color(0xffffff);
    this.linewidth = 1;
    this.linecap = 'round';
    this.linejoin = 'round';
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

    const v = <MeshLineExMaterial>source;
    if (!v) {
      throw Error('invalid input');
    }

    this.diffuse = v.diffuse;
    this.linewidth = v.linewidth;
    this.linecap = v.linecap;
    this.linejoin = v.linejoin;
    this.afterProjectMatrix = v.afterProjectMatrix;

    this.updateUniforms();

    return this;
  }

  private updateUniforms() {
    const uniforms = UniformsUtils.clone(ShaderLib.basic.uniforms);
    uniforms.afterProjectMatrix = { value: this.afterProjectMatrix };
    uniforms.diffuse = { value: this.diffuse };

    this.uniforms = uniforms;
    this.vertexShader = vert;
    this.fragmentShader = frag;
  }
}
