import { Lut } from 'three/examples/jsm/math/Lut';
import { RGBFormat } from 'three/src/constants';
import { Color } from 'three/src/math/Color';
import { DataTexture } from 'three/src/textures/DataTexture';
import LutEx from './LutEx';

export default class TextureFactory {
  public static fromLut(lut: Lut | LutEx): DataTexture {
    const width = lut.lut.length;
    const height = 1;
    const size = width;

    const data = new Uint8Array(size * 3);
    for (let i = 0; i < size; i += 1) {
      const c = lut.lut[i];
      data[i * 3] = c.r * 255;
      data[i * 3 + 1] = c.g * 255;
      data[i * 3 + 2] = c.b * 255;
    }
    return new DataTexture(data, width, height, RGBFormat);
  }

  public static vertical1DFromColors(colors: Color[]): DataTexture {
    const height = colors.length;
    const width = 1;
    const size = height;

    const data = new Uint8Array(size * 3);
    for (let i = 0; i < size; i += 1) {
      const c = colors[i];
      data[i * 3] = c.r * 255;
      data[i * 3 + 1] = c.g * 255;
      data[i * 3 + 2] = c.b * 255;
    }
    return new DataTexture(data, width, height, RGBFormat);
  }
}
