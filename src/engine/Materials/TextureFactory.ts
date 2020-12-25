import { Lut } from 'three/examples/jsm/math/Lut';
import { RGBFormat } from 'three/src/constants';
import { DataTexture } from 'three/src/textures/DataTexture';

export default class TextureFactory {
  public static fromLut(lut: Lut): DataTexture {
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
}

// class ColorMapTexture extends DataTexture {
//   public colorMapOffset;

//   public colorMapRatio;

//   constructor(lut: Lut) {
//     const width = lut.lut.length;
//     const height = 1;
//     const size = width;

//     const data = new Uint8Array(size * 3);
//     for (let i = 0; i < size; i += 1) {
//       const c = lut.lut[i];
//       data[i * 3] = c.r * 255;
//       data[i * 3 + 1] = c.g * 255;
//       data[i * 3 + 2] = c.b * 255;
//     }
//     super(data, width, height, RGBFormat);

//     this.colorMapOffset = -lut.minV;
//     this.colorMapRatio = 1 / (lut.maxV - lut.minV);
//   }
// }
