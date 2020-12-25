import { ShaderMaterial } from 'three/src/materials/ShaderMaterial';
import { Lut } from 'three/examples/jsm/math/Lut';
import { Color } from 'three';
import { ShaderLib } from 'three/src/renderers/shaders/ShaderLib';
import { UniformsUtils } from 'three/src/renderers/shaders/UniformsUtils';
import vert from '../shaders/colormap.vert.glsl';
import frag from '../shaders/colormap.frag.glsl';
import TextureFactory from './TextureFactory';

export default class ColorMapPhoneMaterial extends ShaderMaterial {
  public specular;

  public shininess;

  public colorMapOffset;

  public colorMapRatio;

  constructor(lut: Lut) {
    const colorMapOffset = -lut.minV;
    const colorMapRatio = 1 / (lut.maxV - lut.minV);
    const texture = TextureFactory.fromLut(lut);
    const extraUniforms = {
      colorMapTexture: { value: texture },
      colorMapOffset: { value: colorMapOffset },
      colorMapRatio: { value: colorMapRatio },
    };

    super({
      uniforms: UniformsUtils.merge([ShaderLib.phong.uniforms, extraUniforms]),
      vertexShader: vert,
      fragmentShader: frag,
    });

    this.lights = true;
    this.specular = new Color(0x111111);
    this.shininess = 30;
    this.colorMapOffset = colorMapOffset;
    this.colorMapRatio = colorMapRatio;
  }
}
