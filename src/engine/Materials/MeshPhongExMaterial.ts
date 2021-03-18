import { ShaderMaterial, ShaderMaterialParameters } from 'three/src/materials/ShaderMaterial';
import { ShaderLib } from 'three/src/renderers/shaders/ShaderLib';
import { UniformsUtils } from 'three/src/renderers/shaders/UniformsUtils';
import { Color } from 'three/src/math/Color';
import { Material } from 'three/src/materials/Material';
import { Matrix4 } from 'three/src/math/Matrix4';
import vert from '../shaders/meshphongex.vert.glsl';
import frag from '../shaders/meshphongex.frag.glsl';
import IAfterProject from './IAfterProject';

export interface MeshPhongExMaterialParameters extends ShaderMaterialParameters {
  specular?: Color;

  shininess?: number;

  diffuse?: Color;

  reflectivity?: number;

  afterProjectMatrix?: Matrix4;
}

export default class MeshPhongExMaterial extends ShaderMaterial implements IAfterProject {
  public specular: Color;

  public shininess: number;

  public reflectivity: number;

  public diffuse: Color;

  public afterProjectMatrix: Matrix4;

  constructor(parameters: MeshPhongExMaterialParameters | undefined) {
    super();

    this.specular = new Color(0x111111);
    this.shininess = 30;
    this.diffuse = new Color(0xffffff);
    this.reflectivity = 1;
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

    const v = <MeshPhongExMaterial>source;
    if (!v) {
      throw Error('invalid input');
    }

    this.specular = v.specular;
    this.shininess = v.shininess;
    this.diffuse = v.diffuse;
    this.afterProjectMatrix = v.afterProjectMatrix;

    this.updateUniforms();

    return this;
  }

  private updateUniforms() {
    const uniforms = UniformsUtils.clone(ShaderLib.phong.uniforms);
    uniforms.afterProjectMatrix = { value: this.afterProjectMatrix };
    uniforms.specular = { value: this.specular };
    uniforms.shininess = { value: this.shininess };
    uniforms.diffuse = { value: this.diffuse };
    uniforms.reflectivity = { value: this.reflectivity };

    this.uniforms = uniforms;
    this.vertexShader = vert;
    this.fragmentShader = frag;
  }
}
