import { ShaderMaterial } from 'three/src/materials/ShaderMaterial';
import { Lut } from 'three/examples/jsm/math/Lut';
import ColorMapTexture from './ColorMapTexture';
import frag from '../shaders/colormap.frag.glsl';
import vert from '../shaders/colormap.vert.glsl';

export default class ColorMapPhoneMaterial extends ShaderMaterial {
  constructor(lut: Lut) {
    const texture = new ColorMapTexture(lut);
    const extraUniforms = {
      colorMapTexture: { value: texture },
      colorMapOffset: { value: texture.colorMapOffset },
      colorMapRatio: { value: texture.colorMapRatio },
    };
    super({ uniforms: extraUniforms, vertexShader: vert, fragmentShader: frag });
  }
}
