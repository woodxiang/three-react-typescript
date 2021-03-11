import { Color } from 'three/src/math/Color';

enum LutExEntryType {
  Linner,
  Step,
}

interface ILutExEntry {
  color: Color;
  value: number;
  type: LutExEntryType;
}

const luts = new Map<string, ILutExEntry[]>([
  [
    'rainbow',
    [
      {
        color: new Color(0x0000ff),
        value: 0,
        type: LutExEntryType.Linner,
      },
      {
        color: new Color(0x00ffff),
        value: 0.2,
        type: LutExEntryType.Linner,
      },
      {
        color: new Color(0x00ff00),
        value: 0.5,
        type: LutExEntryType.Linner,
      },
      {
        color: new Color(0xffff00),
        value: 0.8,
        type: LutExEntryType.Linner,
      },
      {
        color: new Color(0xff0000),
        value: 1,
        type: LutExEntryType.Linner,
      },
    ],
  ],
]);

class LutEx {
  public readonly lut: Color[] = [];

  public n: number;

  public map: ILutExEntry[];

  constructor(colorMap: string | ILutExEntry[] | undefined = undefined, numberofColors = 32, type?: LutExEntryType) {
    this.n = numberofColors;
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

    const step = 1.0 / this.n;

    this.lut.length = 0;

    const colors = this.map.map((v) => new Color(v.color));
    for (let i = 0; i <= 1; i += step) {
      for (let j = 0; j < this.map.length - 1; j += 1) {
        if (i >= this.map[j].value && i < this.map[j + 1].value) {
          const min = this.map[j].value;
          const max = this.map[j + 1].value;

          const minColor = colors[j];
          const maxColor = colors[j + 1];

          const color =
            type || this.map[j].type === LutExEntryType.Linner
              ? minColor.clone().lerp(maxColor, (i - min) / (max - min))
              : minColor;

          this.lut.push(color);
          break;
        }
      }
    }
  }
}

export { LutExEntryType };
export type { ILutExEntry };
export { luts };
export default LutEx;
