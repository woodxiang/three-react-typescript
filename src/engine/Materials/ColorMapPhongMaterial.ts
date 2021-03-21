import { ShaderMaterial, ShaderMaterialParameters } from 'three/src/materials/ShaderMaterial';
import { ShaderLib } from 'three/src/renderers/shaders/ShaderLib';
import { UniformsUtils } from 'three/src/renderers/shaders/UniformsUtils';
import { Color } from 'three/src/math/Color';
import { Material } from 'three/src/materials/Material';
import { Texture } from 'three/src/textures/Texture';
import { Matrix4 } from 'three/src/math/Matrix4';
import toUniform from '../utils/uniformsUtilitiesExt';
import vert from '../shaders/colormapphong.vert.glsl';
import frag from '../shaders/colormapphong.frag.glsl';
import IAfterProject from './IAfterProject';
import ISealable from './ISealable';

export interface ColorMapPhongMaterialParameters extends ShaderMaterialParameters {
  specular?: Color;
  shininess?: number;
}

export default class ColorMapPhongMaterial extends ShaderMaterial implements IAfterProject, ISealable {
  public specular: Color;

  public shininess: number;

  public colorMapTexture: Texture;

  public colorMapOffset: number;

  public colorMapRatio: number;

  public afterProjectMatrix: Matrix4;

  public readonly isSealable: boolean = false;

  constructor(min: number, max: number, texture: Texture, parameters: ColorMapPhongMaterialParameters | undefined) {
    super();

    this.specular = new Color(0x111111);
    this.shininess = 30;
    this.colorMapTexture = texture;

    const colorMapOffset = -min;
    const colorMapRatio = 1 / (max - min);
    this.colorMapOffset = colorMapOffset;
    this.colorMapRatio = colorMapRatio;

    this.afterProjectMatrix = new Matrix4();
    if (parameters) this.setValues(parameters);

    this.updateUniforms();
  }

  public ReplaceAfterProjectMatrix(mat: Matrix4): void {
    this.afterProjectMatrix = mat;
    this.uniforms.afterProjectMatrix.value = mat;
  }

  public updateRange(min: number, max: number): void {
    const colorMapOffset = -min;
    const colorMapRatio = 1 / (max - min);
    this.uniforms.colorMapOffset = { value: colorMapOffset };
    this.uniforms.colorMapRatio = { value: colorMapRatio };
  }

  public copy(source: Material): this {
    super.copy(source);

    const v = <ColorMapPhongMaterial>this;
    if (!v) {
      throw Error('invalid input');
    }

    this.specular = v.specular;
    this.shininess = v.shininess;
    this.colorMapOffset = v.colorMapOffset;
    this.colorMapRatio = v.colorMapRatio;
    this.afterProjectMatrix = v.afterProjectMatrix;

    this.updateUniforms();
    return this;
  }

  private updateUniforms(): void {
    this.uniforms = UniformsUtils.merge([ShaderLib.phong.uniforms, toUniform(this)]);
    this.vertexShader = vert;
    this.fragmentShader = frag;
  }
}
