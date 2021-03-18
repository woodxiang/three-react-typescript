import { Material } from 'three/src/materials/Material';
import { ShaderMaterial, ShaderMaterialParameters } from 'three/src/materials/ShaderMaterial';
import { Color } from 'three/src/math/Color';
import { Matrix4 } from 'three/src/math/Matrix4';
import { ShaderLib } from 'three/src/renderers/shaders/ShaderLib';
import { UniformsUtils } from 'three/src/renderers/shaders/UniformsUtils';
import { Texture } from 'three/src/textures/Texture';
import frag from '../shaders/pointsex.frag.glsl';
import vert from '../shaders/pointsex.vert.glsl';
import IAfterProject from './IAfterProject';

export interface PointsExMaterialParameters extends ShaderMaterialParameters {
  diffuse?: Color;
  map?: Texture;
  alphaMap?: Texture;
  size?: number;
  sizeAttenuation?: number;
  afterProjectMatrix?: Matrix4;
}

export default class PointsExMaterial extends ShaderMaterial implements IAfterProject {
  public diffuse: Color;

  public map: Texture | null;

  public alphaMap: Texture | null;

  public size: number;

  public sizeAttenuation: boolean;

  public afterProjectMatrix: Matrix4;

  constructor(parameters: PointsExMaterialParameters | undefined) {
    super();
    this.diffuse = new Color(0xffffff);
    this.map = null;
    this.alphaMap = null;
    this.size = 1;
    this.sizeAttenuation = true;
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

    const v = <PointsExMaterial>source;
    if (!v) {
      throw Error('invalid input');
    }

    this.diffuse = v.diffuse;
    this.map = v.map;
    this.alphaMap = v.alphaMap;
    this.size = v.size;
    this.sizeAttenuation = v.sizeAttenuation;
    this.afterProjectMatrix = v.afterProjectMatrix;

    this.updateUniforms();

    return this;
  }

  private updateUniforms() {
    const uniforms = UniformsUtils.clone(ShaderLib.phong.uniforms);
    uniforms.afterProjectMatrix = { value: this.afterProjectMatrix };
    uniforms.diffuse = { value: this.diffuse };
    uniforms.map = { value: this.map };
    uniforms.alphaMap = { value: this.alphaMap };
    uniforms.size = { value: this.size };
    uniforms.sizeAttenuation = { value: this.sizeAttenuation };

    this.uniforms = uniforms;
    this.vertexShader = vert;
    this.fragmentShader = frag;
  }
}
