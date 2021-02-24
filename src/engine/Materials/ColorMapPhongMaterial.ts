import { ShaderMaterial } from 'three/src/materials/ShaderMaterial';
import { Lut } from 'three/examples/jsm/math/Lut';
import { Color, Material } from 'three';
import { ShaderLib } from 'three/src/renderers/shaders/ShaderLib';
import { UniformsUtils } from 'three/src/renderers/shaders/UniformsUtils';
import vert from '../shaders/colormap.vert.glsl';
import frag from '../shaders/colormap.frag.glsl';
import TextureFactory from './TextureFactory';

export default class ColorMapPhongMaterial extends ShaderMaterial {
  public specular: Color;

  public shininess: number;

  public colorMapOffset: number;

  public colorMapRatio: number;

  constructor(lut: Lut | undefined = undefined) {
    if (lut) {
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
    } else {
      super();
      this.specular = new Color();
      this.shininess = 30;
      this.colorMapOffset = 0;
      this.colorMapRatio = 1;
    }
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

    return this;
  }
}
