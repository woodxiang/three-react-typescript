import { Vector2 } from 'three/src/math/Vector2';
import { Mesh } from 'three/src/objects/Mesh';
import { Points } from 'three/src/objects/Points';
import LiteEvent from './event';
import LutEx from './LutEx';
import { IAnnotationDrawer } from './AnnotationLayer';

interface ILegendSource {
  addOverlayLayer(drawer: IAnnotationDrawer): void;
  removeOverlayLayer(drawer: IAnnotationDrawer): void;
  invalidOverlap(): void;
  meshAddedEvent: LiteEvent<Mesh | Points>;
  sizeChangedEvent: LiteEvent<{ width: number; height: number }>;
  readonly viewPortSize: Vector2;
}

export default class LegendManager implements IAnnotationDrawer {
  public enabled = true;

  private engine: ILegendSource | undefined;

  private wrappedLut: LutEx | undefined = undefined;

  private range: { min: number; max: number } | undefined;

  private textFont = 'Arial';

  private textColor = '#999999';

  private title = '';

  private unit = '';

  get lut(): LutEx | undefined {
    return this.wrappedLut;
  }

  public bind(engine: ILegendSource | undefined): void {
    if (engine === this.engine) {
      return;
    }

    if (this.engine) {
      // clear all
      //
      this.engine.invalidOverlap();
      this.engine.removeOverlayLayer(this);
      this.engine = undefined;
    }

    this.engine = engine;

    if (this.engine) {
      // initialize all
      this.engine.addOverlayLayer(this);
    }
  }

  public setRange(range: { min: number; max: number }): void {
    this.range = range;
    this.engine?.invalidOverlap();
  }

  public setTitle(newTitle: string, unit = ''): void {
    this.title = newTitle;
    this.unit = unit;
    this.engine?.invalidOverlap();
  }

  public updateLut(lut: LutEx | undefined): void {
    this.wrappedLut = lut;
    this.engine?.invalidOverlap();
  }

  public getRange(): { min: number; max: number } | undefined {
    return this.range;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (this.engine && this.wrappedLut) {
      const { y } = this.engine.viewPortSize;
      const [clientWidth, clientHeight] = [y / 2, y / 2];

      const titleHeight = 0.1 * clientHeight;

      const colorBarTop = 0.5 * clientHeight;
      const colorBarLeft = 0.1 * clientWidth;
      const colorBarHeight = 0.8 * clientHeight;
      const colorBarWidth = 0.1 * clientWidth;

      const markLength = colorBarWidth * 0.1;

      ctx.font = `Normal ${36}px Arial`;
      ctx.fillStyle = 'rgba(200, 0, 0, 1)';
      ctx.strokeStyle = this.textColor;
      ctx.lineWidth = 1;

      // draw color box
      // ctx.strokeRect(colorBarLeft, colorBarTop, colorBarWidth, colorBarHeight);
      const nGrid = this.wrappedLut.map.length - 1;
      const step = colorBarHeight / nGrid;

      // 创建渐变
      const grd = ctx.createLinearGradient(colorBarLeft, colorBarTop + colorBarHeight, colorBarLeft, colorBarTop);
      for (let i = 0; i < nGrid; i += 1) {
        grd.addColorStop(this.wrappedLut.map[i].value, this.wrappedLut.map[i].rgb);
      }

      // 填充渐变
      ctx.fillStyle = grd;
      ctx.fillRect(colorBarLeft, colorBarTop, colorBarWidth, colorBarHeight);

      // draw marks
      const markLeft = colorBarLeft + colorBarWidth;

      ctx.beginPath();
      for (let i = 0; i <= nGrid; i += 1) {
        let skewing = 0;
        if (i === 0) skewing = 1;
        if (i === nGrid) skewing = -1;
        ctx.moveTo(markLeft, colorBarTop + step * i + skewing);
        ctx.lineTo(markLeft + markLength, colorBarTop + step * i + skewing);
      }
      ctx.stroke();

      // draw labels
      let labelFontSize = step * 0.5;
      if (labelFontSize > 36) {
        labelFontSize = 36;
      } else if (labelFontSize < 13) {
        labelFontSize = 13;
      }

      let maxTextSize = 0;
      const labelLeft = markLeft + markLength * 2;
      ctx.font = `Normal ${labelFontSize}px ${this.textFont}`;
      ctx.fillStyle = this.textColor;
      for (let i = 0; i <= nGrid; i += 1) {
        let label = this.wrappedLut.map[i].current.toFixed(4);
        if (this.unit === 'Pa' && this.title === 'Pressure') {
          label = (this.wrappedLut.map[i].current / 100000).toFixed(4);
        }
        const textSize = ctx.measureText(label);
        if (maxTextSize < textSize.width) {
          maxTextSize = textSize.width;
        }

        const offset = (textSize.fontBoundingBoxDescent - textSize.fontBoundingBoxAscent) / 2 || -3.5;

        ctx.fillText(label, labelLeft, colorBarTop + step * i - offset);
      }

      // Draw title

      const titleFontSize = Math.round(titleHeight * 0.5);
      ctx.font = `Normal ${titleFontSize}px ${this.textFont}`;
      ctx.fillStyle = '#999999';

      // 业务处理
      /**
       * 1. 当为压力，单位 Pa 时，转为 Bar ： 1Bar === 100000 Pa;
       */
      let unit = '';
      if (this.unit) {
        if (this.unit === 'Pa' && this.title === 'Pressure') {
          unit = `[Bar]`;
        } else {
          unit = `[${this.unit}]`;
        }
      }

      const testString = `${this.title} ${unit}`;
      ctx.fillText(testString, colorBarLeft - titleFontSize, colorBarTop - titleFontSize * 1.2);

      // this.drawLogo(ctx);
    }
  }

  // 画离散图
  // public drawDiscrete(ctx: CanvasRenderingContext2D): void {
  //   ctx.fillText('还未支持离散图', 0, 0);
  //   console.log('还未支持离散图');
  //   return undefined;
  // }
}
