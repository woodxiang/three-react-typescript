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
import { IRenderHandler } from './interfaces';
import LutEx from './LutEx';

interface ILegendSource {
  addRenderHandler(handler: IRenderHandler): void;
  removeRenderHandler(handler: IRenderHandler): void;
  meshAddedEvent: LiteEvent<Mesh | Points>;
  sizeChangedEvent: LiteEvent<{ width: number; height: number }>;
  readonly viewPortSize: Vector2;
}

export default class LegendManager implements IRenderHandler {
  public renderOrder = 9999;

  public enabled = true;

  private scene = new Scene();

  private camera = new OrthographicCamera(-1, 1, 1, -1, 1, 2);

  private engine: ILegendSource | undefined;

  private lut: LutEx | undefined = undefined;

  private canvas = document.createElement('canvas');

  private sprite: Sprite = new Sprite();

  private size = new Vector2();

  private range: { min: number; max: number } | undefined;

  private textFont = 'Arial';

  private textColor = 'rgb(0, 0, 0)';

  private title = '';

  constructor() {
    this.camera.position.set(0, 0, 1);
    const texture = new CanvasTexture(this.canvas);
    this.sprite.material = new SpriteMaterial({
      map: texture,
    });

    this.sprite.scale.set(0.8, 0.8, 0.8);
    this.sprite.position.set(-0.5, 0.5, 0);

    this.scene.add(this.sprite);
  }

  public bind(engine: ILegendSource | undefined): void {
    if (engine === this.engine) {
      return;
    }

    if (this.engine) {
      this.engine.sizeChangedEvent.remove(this.onSizeChanged);
      this.engine.removeRenderHandler(this);
      this.engine = undefined;
    }

    this.engine = engine;

    if (this.engine) {
      this.engine.addRenderHandler(this);
      this.engine.sizeChangedEvent.add(this.onSizeChanged);
      const sz = this.engine.viewPortSize;
      this.onSizeChanged({ width: sz.x, height: sz.y });
    }
  }

  public setRange(range: { min: number; max: number }): void {
    this.range = range;
    this.update();
  }

  public setTitle(newTitle: string): void {
    this.title = newTitle;
    this.update();
  }

  public updateLut(lut: LutEx | undefined): void {
    this.lut = lut;
    this.update();
  }

  private update(): void {
    if (!this.lut) {
      return;
    }

    const table = this.lut.generateLookupTable(21);

    const itemNumber = this.lut.method === InterpolateDiscrete ? this.lut.map.length : 20;

    const clientWidth = 1024 * 2;
    const clientHeight = 1024 * 2;

    const titleHeight = 0.1 * clientHeight;

    const colorBarTop = 0.15 * clientHeight;
    const colorBarLeft = 0.1 * clientWidth;
    const colorBarHeight = 0.8 * clientHeight;
    const colorBarWidth = 0.1 * clientWidth;

    const markLength = colorBarWidth * 0.1;

    this.canvas.width = clientWidth;
    this.canvas.height = clientHeight;
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.font = `Normal ${96}px Arial`;
      ctx.fillStyle = 'rgba(200, 0, 0, 1)';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 5;

      // draw color box
      ctx.strokeRect(colorBarLeft, colorBarTop, colorBarWidth, colorBarHeight);
      const nGrid = this.lut.map.length - 1;
      const step = colorBarHeight / nGrid;

      for (let i = 0; i < nGrid; i += 1) {
        const { color } = this.lut.map[i];

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
      if (labelFontSize > 96) {
        labelFontSize = 96;
      }

      let maxTextSize = 0;
      const labelLeft = markLeft + markLength * 2;
      ctx.font = `Normal ${labelFontSize}px ${this.textFont}`;
      ctx.fillStyle = this.textColor;
      for (let i = 0; i <= nGrid; i += 1) {
        const label = this.lut.map[i].value.toFixed(5);
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
    if (this.enabled) {
      renderer.clearDepth();
      if (this.lut) {
        renderer.render(this.scene, this.camera);
      }
    }
  }

  private onSizeChanged = (newSize: { width: number; height: number } | undefined) => {
    if (newSize) {
      this.size.set(newSize.width, newSize.height);
      const ratio = newSize.width / newSize.height;
      this.camera.left = -ratio;
      this.camera.right = ratio;
      this.camera.updateProjectionMatrix();

      this.sprite.position.set(-ratio + 0.5, 0.5, 0);

      this.update();
    }
  };
}
