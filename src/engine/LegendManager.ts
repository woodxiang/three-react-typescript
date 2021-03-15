import { OrthographicCamera } from 'three/src/cameras/OrthographicCamera';
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

  public readonly lut: LutEx = new LutEx();

  private canvas = document.createElement('canvas');

  private sprite: Sprite = new Sprite();

  private size = new Vector2();

  private range: { min: number; max: number } | undefined;

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

  private update(): void {
    if (!this.lut) {
      return;
    }

    const clientWidth = 1024 * 2;
    const clientHeight = 1024 * 2;

    const titleHeight = 0.1 * clientHeight;

    const colorBarTop = 0.15 * clientHeight;
    const colorBarLeft = 0.1 * clientWidth;
    const colorBarHeight = 0.8 * clientHeight;
    const colorBarWidth = 0.1 * clientWidth;

    const textFont = 'Arial';
    const textColor = 'rgb(0, 0, 0)';

    this.canvas.width = clientWidth;
    this.canvas.height = clientHeight;
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.font = `Normal ${96}px Arial`;
      ctx.fillStyle = 'rgba(200, 0, 0, 1)';
      // ctx.fillText('this is a test', 0, textShift);
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 10;
      ctx.strokeRect(0, 0, clientWidth - 1, clientHeight - 1);

      // Draw title
      const titleFontSize = Math.round(titleHeight * 0.8);
      const titleFontShift = Math.round(titleFontSize * 0.43);
      ctx.font = `Normal ${titleFontSize}px Arial`;
      ctx.fillStyle = textColor;
      const testString = 'test title';
      const textSize = ctx.measureText(testString);
      ctx.fillText(
        testString,
        (clientWidth - textSize.width) / 2,
        (titleHeight - textSize.fontBoundingBoxAscent) / 2 + textSize.fontBoundingBoxAscent
      );

      // draw color box
      ctx.strokeRect(colorBarLeft, colorBarTop, colorBarWidth, colorBarHeight);
      const nMap = this.lut.map.length;
      const step = colorBarHeight / (nMap - 1);
      ctx.beginPath();
      ctx.moveTo(colorBarLeft, colorBarTop + step);
      ctx.lineTo(colorBarLeft + colorBarWidth, colorBarTop + step);
      ctx.stroke();
    }
  }

  public render(renderer: WebGLRenderer): void {
    if (this.enabled) {
      renderer.clearDepth();
      renderer.render(this.scene, this.camera);
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
