import { createCanvas } from 'canvas';
import { OrthographicCamera } from 'three/src/cameras/OrthographicCamera';
import { SpriteMaterial } from 'three/src/materials/SpriteMaterial';
import { Vector2 } from 'three/src/math/Vector2';
import { Sprite } from 'three/src/objects/Sprite';
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer';
import { Scene } from 'three/src/scenes/Scene';
import { CanvasTexture } from 'three/src/textures/CanvasTexture';
import { isBrowser } from './utils/environment';

export interface IAnnotationDrawer {
  draw(ctx: CanvasRenderingContext2D): void;
}

export default class AnnotationLayer {
  private scene: Scene | undefined;

  private camera: OrthographicCamera | undefined;

  private canvas: HTMLCanvasElement | undefined;

  private sprite: Sprite | undefined;

  private size = new Vector2(0, 0);

  public drawers: IAnnotationDrawer[] = [];

  public init(): void {
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 1, 2);
    this.camera.position.set(0, 0, 1);

    this.canvas = isBrowser() ? document.createElement('canvas') : <HTMLCanvasElement>(<unknown>createCanvas(1, 1));
    const texture = new CanvasTexture(this.canvas);

    this.sprite = new Sprite();
    this.sprite.material = new SpriteMaterial({
      map: texture,
    });

    this.sprite.scale.set(2, 2, 2);
    this.sprite.position.set(0, 0, 0);

    this.scene = new Scene();
    this.scene.add(this.sprite);
  }

  public update(): void {
    if (!this.canvas || !this.scene) {
      throw Error('not initialized.');
    }

    this.canvas.width = this.size.x;
    this.canvas.height = this.size.y;
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      this.drawers.forEach((v) => {
        v.draw(ctx);
      });
    }

    const map = this.sprite?.material.map;
    if (map) {
      map.needsUpdate = true;
    }
  }

  public resize(width: number, height: number): void {
    if (!this.camera || !this.sprite) {
      throw new Error('not initialized.');
    }

    this.size.set(width, height);
    const ratio = width / height;
    this.camera.left = -ratio;
    this.camera.right = ratio;
    this.camera.updateProjectionMatrix();

    this.sprite.scale.set(2 * ratio, 2, 2);

    this.update();
  }

  public render(renderer: WebGLRenderer): void {
    if (!this.scene || !this.camera) {
      throw new Error('not initialized.');
    }

    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
  }
}
