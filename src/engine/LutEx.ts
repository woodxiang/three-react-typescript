import { InterpolateLinear, InterpolationModes } from 'three/src/constants';
import { Color } from 'three/src/math/Color';

interface ILutExEntry {
  color: Color;
  value: number;
  method?: InterpolationModes;
}

const luts = new Map<string, ILutExEntry[]>([
  [
    'rainbow',
    [
      {
        color: new Color(0x0000ff),
        value: 0,
      },
      {
        color: new Color(0x00ffff),
        value: 0.2,
      },
      {
        color: new Color(0x00ff00),
        value: 0.5,
      },
      {
        color: new Color(0xffff00),
        value: 0.8,
      },
      {
        color: new Color(0xff0000),
        value: 1,
      },
    ],
  ],
]);

class LutEx {
  public readonly lut: Color[] = [];

  public n: number;

  public map: ILutExEntry[];

  public method?: InterpolationModes;

  constructor(
    colorMap: string | ILutExEntry[] | undefined = undefined,
    numberofColors = 32,
    method?: InterpolationModes
  ) {
    this.n = numberofColors;
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

    const { lut } = this;

    this.generateLookupTable(this.n, lut);
  }

  public generateLookupTable(n: number, output: Color[] | undefined = undefined): [Color[], number[]] {
    const lut: Color[] = output || [];
    const values: number[] = [];
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
