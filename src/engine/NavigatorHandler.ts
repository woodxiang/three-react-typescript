/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera';
import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { AmbientLight } from 'three/src/lights/AmbientLight';
import { PointLight } from 'three/src/lights/PointLight';
import { TextureLoader } from 'three/src/loaders/TextureLoader';
import { MeshBasicMaterial, MeshLambertMaterial } from 'three/src/materials/Materials';
import { Color } from 'three/src/math/Color';
import { Matrix4 } from 'three/src/math/Matrix4';
import { Vector4 } from 'three/src/math/Vector4';
import { Group } from 'three/src/objects/Group';
import { Mesh } from 'three/src/objects/Mesh';
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer';
import { Scene } from 'three/src/scenes/Scene';
import ActionHandlerBase from './ActionHandlerBase';
import LiteEvent from './event';
import { generateArrow } from './Geometry/boxConstants';
import IdentityBoxBufferGeometry from './Geometry/IdentityBoxBufferGeometry';
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

    this.prepareEnvironment();

    const cubeGeo = new IdentityBoxBufferGeometry(true);

    const texture = new TextureLoader().load('./asset/dice.png');
    const cubeMaterial = new MeshLambertMaterial({ map: texture });

    const mesh = new Mesh(cubeGeo, cubeMaterial);

    const { position, normal } = generateArrow(0.7, 0.2, 0.05, 0.1, 10);

    const matrix = new Matrix4();
    matrix.setPosition(-0.5, -0.5, -0.5);
    mesh.matrix = matrix;
    mesh.matrixAutoUpdate = false;

    this.navigatorGroup.add(mesh);

    const xGeo = new BufferGeometry();
    xGeo.attributes.position = position;
    xGeo.attributes.normal = normal;
    const xMesh = new Mesh(xGeo, new MeshLambertMaterial({ color: 'red' }));
    xMesh.rotateY(Math.PI / 2);
    this.navigatorGroup.add(xMesh);

    const yGeo = new BufferGeometry();
    yGeo.attributes.position = position;
    yGeo.attributes.normal = normal;
    const yMesh = new Mesh(yGeo, new MeshLambertMaterial({ color: 'green' }));
    yMesh.rotateX(-Math.PI / 2);
    this.navigatorGroup.add(yMesh);

    const zGeo = new BufferGeometry();
    zGeo.attributes.position = position;
    zGeo.attributes.normal = normal;
    const zMesh = new Mesh(zGeo, new MeshLambertMaterial({ color: 'blue' }));
    this.navigatorGroup.add(zMesh);

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
    renderer.setViewport(10, 10, 150, 150);
    renderer.render(this.scene, this.camera);
    renderer.setViewport(oldViewPort);
  }

  private prepareEnvironment(): void {
    const ambientLight = new AmbientLight(0x4d4d4d);
    const light1 = new PointLight(0xffffff, 0.7);
    light1.position.set(3.0, 3.0, 3.0);
    const light2 = new PointLight(0xffffff, 0.7);
    light2.position.set(-3.0, -3.0, 3.0);
    this.scene.add(ambientLight);
    this.scene.add(light1);
    this.scene.add(light2);
  }

  private onTransformChanged = (): void => {
    if (this.engine && this.engine.rotationMatrix) {
      this.navigatorGroup.matrix = this.engine.rotationMatrix;
    }
  };
}
