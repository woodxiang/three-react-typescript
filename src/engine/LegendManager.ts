import { OrthographicCamera } from 'three/src/cameras/OrthographicCamera';
import { InterpolateDiscrete } from 'three/src/constants';
import { SpriteMaterial } from 'three/src/materials/SpriteMaterial';
import { Vector2 } from 'three/src/math/Vector2';
import { Mesh } from 'three/src/objects/Mesh';
import { Points } from 'three/src/objects/Points';
import { Sprite } from 'three/src/objects/Sprite';
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer';
import { Scene } from 'three/src/scenes/Scene';
import { CanvasTexture } from 'three/src/textures/CanvasTexture';
import LiteEvent from './event';
import LutEx from './LutEx';
import { IOverlapDrawer } from './OverlapLayer';

interface ILegendSource {
  addOverlayLayer(drawer: IOverlapDrawer): void;
  removeOverlayLayer(drawer: IOverlapDrawer): void;
  invalidOverlap(): void;
  meshAddedEvent: LiteEvent<Mesh | Points>;
  sizeChangedEvent: LiteEvent<{ width: number; height: number }>;
  readonly viewPortSize: Vector2;
}

export default class LegendManager implements IOverlapDrawer {
  public enabled = true;

  private engine: ILegendSource | undefined;

  private wrappedLut: LutEx | undefined = undefined;

  private range: { min: number; max: number } | undefined;

  private textFont = 'Arial';

  private textColor = 'rgb(0, 0, 0)';

  private title = '';

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

  public setTitle(newTitle: string): void {
    this.title = newTitle;
    this.engine?.invalidOverlap();
  }

  public updateLut(lut: LutEx | undefined): void {
    this.wrappedLut = lut;
    this.engine?.invalidOverlap();
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (this.engine && this.wrappedLut) {
      const { y } = this.engine.viewPortSize;
      const [clientWidth, clientHeight] = [y / 3, y / 3];

      const titleHeight = 0.1 * clientHeight;

      const colorBarTop = 0.15 * clientHeight;
      const colorBarLeft = 0.1 * clientWidth;
      const colorBarHeight = 0.8 * clientHeight;
      const colorBarWidth = 0.1 * clientWidth;

      const markLength = colorBarWidth * 0.1;

      ctx.font = `Normal ${36}px Arial`;
      ctx.fillStyle = 'rgba(200, 0, 0, 1)';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;

      // draw color box
      ctx.strokeRect(colorBarLeft, colorBarTop, colorBarWidth, colorBarHeight);
      const nGrid = this.wrappedLut.map.length - 1;
      const step = colorBarHeight / nGrid;

      for (let i = 0; i < nGrid; i += 1) {
        const { color } = this.wrappedLut.map[i];

        ctx.fillStyle = `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(
          color.b * 255
        )}, 1)`;

        ctx.fillRect(colorBarLeft, colorBarTop + step * i, colorBarWidth, step);
      }
      ctx.beginPath();
      for (let i = 1; i < nGrid; i += 1) {
        ctx.moveTo(colorBarLeft, colorBarTop + step * i);
        ctx.lineTo(colorBarLeft + colorBarWidth, colorBarTop + step * i);
      }
      ctx.stroke();

      // draw marks
      const markLeft = colorBarLeft + colorBarWidth;

      ctx.beginPath();
      for (let i = 0; i <= nGrid; i += 1) {
        ctx.moveTo(markLeft, colorBarTop + step * i);
        ctx.lineTo(markLeft + markLength, colorBarTop + step * i);
      }
      ctx.stroke();

      // draw labels
      let labelFontSize = step * 0.5;
      if (labelFontSize > 36) {
        labelFontSize = 36;
      }

      let maxTextSize = 0;
      const labelLeft = markLeft + markLength * 2;
      ctx.font = `Normal ${labelFontSize}px ${this.textFont}`;
      ctx.fillStyle = this.textColor;
      for (let i = 0; i <= nGrid; i += 1) {
        const label = this.wrappedLut.map[i].value.toFixed(5);
        const textSize = ctx.measureText(label);
        if (maxTextSize < textSize.width) {
          maxTextSize = textSize.width;
        }

        ctx.fillText(
          label,
          labelLeft,
          colorBarTop + step * i - (textSize.fontBoundingBoxDescent - textSize.fontBoundingBoxAscent) / 2
        );
      }

      const totalSize = maxTextSize + labelLeft + clientWidth * 0.1;

      // Draw title
      const titleFontSize = Math.round(titleHeight * 0.8);
      ctx.font = `Normal ${titleFontSize}px ${this.textFont}`;
      ctx.fillStyle = this.textColor;
      const testString = this.title;
      const textSize = ctx.measureText(testString);
      ctx.fillText(
        testString,
        Math.max((totalSize - textSize.width) / 2, 0),
        (titleHeight - textSize.fontBoundingBoxAscent) / 2 + textSize.fontBoundingBoxAscent
      );
    }
  }

  public render(renderer: WebGLRenderer): void {
    if (!this.scene || !this.camera) {
      throw new Error('not initialized.');
    }

    if (this.enabled) {
      renderer.clearDepth();
      if (this.wrappedLut) {
        renderer.render(this.scene, this.camera);
      }
    }
  }
}
