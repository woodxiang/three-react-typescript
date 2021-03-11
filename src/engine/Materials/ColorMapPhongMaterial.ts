import { ShaderMaterial, ShaderMaterialParameters } from 'three/src/materials/ShaderMaterial';
import { ShaderLib } from 'three/src/renderers/shaders/ShaderLib';
import { UniformsUtils } from 'three/src/renderers/shaders/UniformsUtils';
import { Color } from 'three/src/math/Color';
import { Material } from 'three/src/materials/Material';
import { Texture } from 'three/src/textures/Texture';
import vert from '../shaders/colormap.vert.glsl';
import frag from '../shaders/colormap.frag.glsl';

export default class ColorMapPhongMaterial extends ShaderMaterial {
  public specular: Color;

  public shininess: number;

  public colorMapOffset: number;

  public colorMapRatio: number;

  constructor(min = 0, max = 1, texture: Texture | undefined, parameters: ShaderMaterialParameters | undefined) {
    if (texture) {
      const colorMapOffset = -min;
      const colorMapRatio = 1 / (max - min);
      const extraUniforms = {
        colorMapTexture: { value: texture },
        colorMapOffset: { value: colorMapOffset },
        colorMapRatio: { value: colorMapRatio },
      };

      super({
        ...parameters,
        uniforms: UniformsUtils.merge([ShaderLib.phong.uniforms, extraUniforms]),
        vertexShader: vert,
        fragmentShader: frag,
      });

      this.lights = true;
      this.specular = new Color(0x111111);
      this.shininess = 30;
      this.colorMapOffset = colorMapOffset;
      this.colorMapRatio = colorMapRatio;

      if (parameters && parameters.opacity) {
        this.uniforms.opacity = { value: parameters?.opacity };
      }
    } else {
      super();
      this.specular = new Color();
      this.shininess = 30;
      this.colorMapOffset = 0;
      this.colorMapRatio = 1;
    }
    this.clipping = true;
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
