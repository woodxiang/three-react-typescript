import { InterpolateLinear, InterpolationModes } from 'three/src/constants';
import { Color } from 'three/src/math/Color';
import colorMapUtil from './utils/colorMap';

interface ILutExEntry {
  color: Color;
  rgb: string;
  current: number;
  value: number;
  method?: InterpolationModes;
}

const luts = new Map<string, ILutExEntry[]>([]);
for (const entry of colorMapUtil.entries()) {
  luts.set(
    entry[0],
    entry[1].map((color) => ({
      color: new Color(...color.rgb.map((item) => item / 255)),
      current: color.index,
      value: color.index,
      rgb: `rgb(${color.rgb[0]}, ${color.rgb[1]}, ${color.rgb[2]})`,
    }))
  );
}

class LutEx {
  public readonly lut: Color[] = [];

  public n: number;

  public map: ILutExEntry[];

  public method?: InterpolationModes;

  constructor(
    colorMap: string | ILutExEntry[] | undefined = undefined,
    numberOfColors = 32,
    method?: InterpolationModes
  ) {
    this.n = numberOfColors;
    this.method = method;
    let map: ILutExEntry[] | undefined;
    if (typeof colorMap === 'string') {
      map = luts.get(colorMap);
    } else if (colorMap instanceof Array) {
      map = colorMap;
    }
    if (map === undefined) {
      map = luts.get('rainbow');
    }

    if (!map) {
      throw Error('no color map');
    }

    this.map = map;

    // const { lut } = this;

    // this.generateLookupTable(this.n, lut);
  }

  public setRange(range: { min: number; max: number }): void {
    const { min, max } = range;
    const len = this.map.length;
    const item = len > 1 ? (max - min) / (len - 1) : max - min;
    for (let i = 0; i < len - 1; i += 1) {
      this.map[i].current = Math.round((max - item * i) * 10000) / 10000;
    }
    this.map[len - 1].current = Math.round(min * 10000) / 10000;

    this.generateLookupTable(this.n, this.lut);
  }

  public generateLookupTable(n: number, output: Color[] | undefined = undefined): [Color[], number[]] {
    const lut: Color[] = output || [];
    const values: number[] = [];
    // const step = Math.floor((1.0 / n) * 1000) / 1000;
    const step = 1.0 / n;

    lut.length = 0;

    const colors = this.map.map((v) => new Color(v.color));
    for (let i = 0; i <= 1; i += step) {
      for (let j = 0; j < this.map.length - 1; j += 1) {
        if (i >= this.map[j].value && i < this.map[j + 1].value) {
          const min = this.map[j].value;
          const max = this.map[j + 1].value;

          const minColor = colors[j];
          const maxColor = colors[j + 1];

          const color =
            (this.method || this.map[j].method || InterpolateLinear) === InterpolateLinear
              ? minColor.clone().lerp(maxColor, (i - min) / (max - min))
              : minColor;

          lut.push(color);
          values.push(i);
          break;
        }
      }
    }

    return [lut, values];
  }
}

export type { ILutExEntry };
export { luts };
export default LutEx;
