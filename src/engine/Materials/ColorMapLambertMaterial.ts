import { ShaderMaterial, ShaderMaterialParameters } from 'three/src/materials/ShaderMaterial';
import { ShaderLib } from 'three/src/renderers/shaders/ShaderLib';
import { UniformsUtils } from 'three/src/renderers/shaders/UniformsUtils';
import { Color } from 'three/src/math/Color';
import { Material } from 'three/src/materials/Material';
import { Texture } from 'three/src/textures/Texture';
import { Matrix4 } from 'three/src/math/Matrix4';
import { Combine, MultiplyOperation } from 'three/src/constants';
import vert from '../shaders/colormaplambert.vert.glsl';
import frag from '../shaders/colormaplambert.frag.glsl';
import IAfterProject from './IAfterProject';
import ISealable from './ISealable';
import toUniform from '../utils/uniformsUtilitiesExt';

export interface ColorMapLambertMaterialParameters extends ShaderMaterialParameters {
  diffuse?: Color | string | number;
  emissive?: Color | string | number;
  emissiveIntensity?: number;
  emissiveMap?: Texture | null;
  map?: Texture | null;
  lightMap?: Texture | null;
  lightMapIntensity?: number;
  aoMap?: Texture | null;
  aoMapIntensity?: number;
  specularMap?: Texture | null;
  alphaMap?: Texture | null;
  envMap?: Texture | null;
  combine?: Combine;
  reflectivity?: number;
  refractionRatio?: number;

  afterProjectMatrix?: Matrix4;
}

export default class ColorMapLambertMaterial extends ShaderMaterial implements IAfterProject, ISealable {
  public colorMapTexture: Texture;

  public colorMapOffset: number;

  public colorMapRatio: number;

  public emissive: Color;

  public emissiveIntensity: number;

  public emissiveMap: Texture | null;

  public map: Texture | null;

  public lightMap: Texture | null;

  public lightMapIntensity: number;

  public aoMap: Texture | null;

  public aoMapIntensity: number;

  public specularMap: Texture | null;

  public alphaMap: Texture | null;

  public envMap: Texture | null;

  public combine: Combine;

  public reflectivity: number;

  public refractionRatio: number;

  public afterProjectMatrix: Matrix4;

  public readonly isSealable: boolean = false;

  constructor(min: number, max: number, texture: Texture, parameters: ColorMapLambertMaterialParameters | undefined) {
    super();

    this.map = null;
    this.reflectivity = 1;
    this.lightMap = null;
    this.lightMapIntensity = 1.0;
    this.aoMap = null;
    this.aoMapIntensity = 1.0;
    this.emissive = new Color(0x000000);
    this.emissiveIntensity = 1.0;
    this.emissiveMap = null;
    this.specularMap = null;
    this.alphaMap = null;
    this.envMap = null;
    this.combine = MultiplyOperation;
    this.reflectivity = 1;
    this.refractionRatio = 0.98;

    const colorMapOffset = -min;
    const colorMapRatio = 1 / (max - min);
    this.colorMapOffset = colorMapOffset;
    this.colorMapRatio = colorMapRatio;
    this.colorMapTexture = texture;

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

    const v = <ColorMapLambertMaterial>this;
    if (!v) {
      throw Error('invalid input');
    }

    this.map = v.map;
    this.lightMap = v.map;
    this.lightMapIntensity = v.lightMapIntensity;
    this.aoMap = v.aoMap;
    this.aoMapIntensity = v.aoMapIntensity;
    this.emissive = v.emissive;
    this.emissiveIntensity = v.emissiveIntensity;
    this.emissiveMap = v.emissiveMap;
    this.specularMap = v.specularMap;
    this.alphaMap = v.alphaMap;
    this.envMap = v.envMap;
    this.combine = v.combine;
    this.reflectivity = v.reflectivity;
    this.refractionRatio = v.refractionRatio;

    this.colorMapTexture = v.colorMapTexture;
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
    this.uniforms.afterProjectMatrix.value = this.afterProjectMatrix;
  }
}
