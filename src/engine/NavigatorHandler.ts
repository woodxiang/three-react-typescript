/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Vector4, WebGLRenderer } from 'three';
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera';
import { BoxGeometry } from 'three/src/geometries/BoxGeometry';
import { MeshBasicMaterial, MeshLambertMaterial } from 'three/src/materials/Materials';
import { Matrix4 } from 'three/src/math/Matrix4';
import { Group } from 'three/src/objects/Group';
import { Mesh } from 'three/src/objects/Mesh';
import { Scene } from 'three/src/scenes/Scene';
import ActionHandlerBase from './ActionHandlerBase';
import LiteEvent from './event';
import { IRenderHandler } from './interfaces';

interface INavigatorSource {
  addRenderHandler(handler: IRenderHandler): void;
  removeRenderHandler(handler: IRenderHandler): void;
  readonly rotationMatrix: Matrix4;
  objectTransformChangedEvent: LiteEvent<Matrix4>;
}

export default class NavigatorHandler extends ActionHandlerBase implements IRenderHandler {
  public readonly renderOrder = 10;

  private engine: INavigatorSource | undefined;

  private scene: Scene = new Scene();

  private camera = new PerspectiveCamera(15, 1, 0.01, 100);

  private navigatorGroup = new Group();

  constructor() {
    super(3);
    this.camera.position.set(0, 0, 10);

    const cubeGeo = new BoxGeometry(1, 1, 1);
    const cubeMaterial = new MeshBasicMaterial({ color: 'red' });

    const mesh = new Mesh(cubeGeo, cubeMaterial);

    this.navigatorGroup.add(mesh);
    this.scene.add(this.navigatorGroup);
  }

  public bind(engine: INavigatorSource | undefined): void {
    if (engine === this.engine) {
      return;
    }

    if (this.engine) {
      // unbind old engine;
      this.engine.removeRenderHandler(this);
      this.engine.objectTransformChangedEvent.remove(this.onTransformChanged);
      this.engine = undefined;
    }

    this.engine = engine;

    // bind the new engine;
    if (this.engine) {
      this.navigatorGroup.matrix = this.engine.rotationMatrix;
      this.navigatorGroup.matrixAutoUpdate = false;
      this.engine.objectTransformChangedEvent.add(this.onTransformChanged);
      this.engine.addRenderHandler(this);
    }
  }

  public render(renderer: WebGLRenderer): void {
    renderer.clearDepth();
    const oldViewPort = new Vector4();
    renderer.getViewport(oldViewPort);
    renderer.setViewport(10, 10, 100, 100);
    renderer.render(this.scene, this.camera);
    renderer.setViewport(oldViewPort);
  }

  private onTransformChanged = (): void => {
    if (this.engine && this.engine.rotationMatrix) {
      this.navigatorGroup.matrix = this.engine.rotationMatrix;
    }
  };
}
