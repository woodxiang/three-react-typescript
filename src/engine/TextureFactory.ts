import { LinearFilter, RGBAFormat } from 'three/src/constants';
import { Color } from 'three/src/math/Color';
import { DataTexture } from 'three/src/textures/DataTexture';
import { Lut } from './three/examples/jsm/math/Lut';
import LutEx from './LutEx';

export default class TextureFactory {
  public static fromLut(lut: Lut | LutEx): DataTexture {
    const width = lut.lut.length;
    const height = 1;
    const size = width;

    const data = new Uint8Array(size * 4);
    for (let i = 0; i < size; i += 1) {
      const c = lut.lut[i];
      data[i * 4] = c.r * 255;
      data[i * 4 + 1] = c.g * 255;
      data[i * 4 + 2] = c.b * 255;
      data[i * 4 + 3] = 255;
    }
    const texture = new DataTexture(data, width, height, RGBAFormat);
    texture.magFilter = LinearFilter;
    texture.minFilter = LinearFilter;
    return texture;
  }

  public static vertical1DFromColors(colors: Color[]): DataTexture {
    const height = colors.length;
    const width = 1;
    const size = height;

    const data = new Uint8Array(size * 4);
    for (let i = 0; i < size; i += 1) {
      const c = colors[i];
      data[i * 4] = c.r * 255;
      data[i * 4 + 1] = c.g * 255;
      data[i * 4 + 2] = c.b * 255;
      data[i * 4 + 3] = 255;
    }
    return new DataTexture(data, width, height, RGBAFormat);
  }
}
