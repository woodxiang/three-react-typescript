import { Vector2 } from 'three/src/math/Vector2';
import { Mesh } from 'three/src/objects/Mesh';
import { Points } from 'three/src/objects/Points';
import { isNode } from 'browser-or-node';
import LiteEvent from './event';
import { IAnnotationDrawer } from './AnnotationLayer';

interface ILegendSource {
  addOverlayLayer(drawer: IAnnotationDrawer): void;
  removeOverlayLayer(drawer: IAnnotationDrawer): void;
  invalidOverlap(): void;
  meshAddedEvent: LiteEvent<Mesh | Points>;
  sizeChangedEvent: LiteEvent<{ width: number; height: number }>;
  readonly viewPortSize: Vector2;
}

export default class BottomManager implements IAnnotationDrawer {
  public enabled = true;

  private engine: ILegendSource | undefined;

  private logo: any = undefined; // HTMLImageElement | ImageData

  public bind(engine: ILegendSource | undefined): void {
    if (engine === this.engine) {
      return;
    }

    if (this.engine) {
      this.engine.invalidOverlap();
      this.engine.removeOverlayLayer(this);
      this.engine = undefined;
    }

    this.engine = engine;

    if (this.engine) {
      this.engine.addOverlayLayer(this);
    }
  }

  public setLogo(logo: HTMLImageElement): void {
    this.logo = logo;
    this.engine?.invalidOverlap();
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const width = 300;
    const height = 45;
    if (this.engine && this.logo) {
      const { x, y } = this.engine.viewPortSize;
      if (isNode) ctx.putImageData(this.logo, x - width - 30, y - height - 30, 0, 0, width, height);
      else ctx.drawImage(this.logo, x - width - 30, y - height - 30, width, height);
    }
  }
}
