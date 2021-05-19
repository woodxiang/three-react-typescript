/* eslint-disable class-methods-use-this */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera';
import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { AmbientLight } from 'three/src/lights/AmbientLight';
import { PointLight } from 'three/src/lights/PointLight';
import { TextureExLoader } from './loaders/TextureExLoader';
import { MeshBasicMaterial, MeshLambertMaterial } from 'three/src/materials/Materials';
import { Color } from 'three/src/math/Color';
import { Matrix4 } from 'three/src/math/Matrix4';
import { Vector4 } from 'three/src/math/Vector4';
import { Vector3 } from 'three/src/math/Vector3';
import { Group } from 'three/src/objects/Group';
import { Mesh } from 'three/src/objects/Mesh';
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer';
import { Scene } from 'three/src/scenes/Scene';
import ActionHandlerBase from './ActionHandlerBase';
import LiteEvent from './event';
import { generateArrow } from './Geometry/boxConstants';
import IdentityBoxBufferGeometry from './Geometry/IdentityBoxBufferGeometry';
import { IActionCallback, IActionHandler, IRenderHandler, STATE } from './interfaces';

interface INavigatorSource {
  addActionHandler(handler: IActionHandler): void;
  removeActionHandler(handler: IActionHandler): void;
  addRenderHandler(handler: IRenderHandler): void;
  removeRenderHandler(handler: IRenderHandler): void;
  readonly rotationMatrix: Matrix4;
  objectTransformChangedEvent: LiteEvent<Matrix4>;
}

declare const window: Window & {
  assetBaseUrl: string
}

const dirs = [
  new Vector3(1, 0, 0),
  new Vector3(0, 1, 0),
  new Vector3(0, 0, 1),
  new Vector3(-1, 0, 0),
  new Vector3(0, -1, 0),
  new Vector3(0, 0, -1),
];
export default class NavigatorHandler extends ActionHandlerBase implements IRenderHandler {
  public readonly renderOrder = 10;

  private engine: INavigatorSource | undefined;

  private scene: Scene = new Scene();

  private camera = new PerspectiveCamera(15, 1, 0.01, 100);

  private navigatorGroup = new Group();

  private viewPort = new Vector4(10, 10, 150, 150);

  private arrowGroup = new Group();

  private detectScene = new Scene();

  private detectGroup = new Group();

  constructor() {
    super(3);
    this.camera.position.set(0, 0, 10);

    this.prepareEnvironment();

    const cubeGeo = new IdentityBoxBufferGeometry(true);

    const loader = new TextureExLoader();
    if (window.assetBaseUrl) loader.setPath(window.assetBaseUrl);
    const texture = loader.load('/asset/dice.png');
    const cubeMaterial = new MeshLambertMaterial({ map: texture });

    const mesh = new Mesh(cubeGeo, cubeMaterial);

    const detectGeo = new IdentityBoxBufferGeometry(true);
    const detectMaterials = [
      new MeshBasicMaterial({ color: new Color(1, 0, 0) }),
      new MeshBasicMaterial({ color: new Color(0, 1, 0) }),
      new MeshBasicMaterial({ color: new Color(0, 0, 1) }),
      new MeshBasicMaterial({ color: new Color(-1, 0, 0) }),
      new MeshBasicMaterial({ color: new Color(0, -1, 0) }),
      new MeshBasicMaterial({ color: new Color(0, 0, -1) }),
    ];

    for (let i = 0; i < 6; i += 1) {
      detectGeo.addGroup(i * 6, 6, i);
    }

    const testMesh = new Mesh(detectGeo, detectMaterials);
    this.detectGroup.matrixAutoUpdate = false;
    this.detectGroup.add(testMesh);
    this.detectScene.add(this.detectGroup);

    const { position, normal } = generateArrow(0.7, 0.2, 0.05, 0.1, 10);

    const matrix = new Matrix4();
    matrix.setPosition(-0.5, -0.5, -0.5);
    mesh.matrix = matrix;
    mesh.matrixAutoUpdate = false;

    testMesh.matrix = matrix;
    testMesh.matrixAutoUpdate = false;

    this.navigatorGroup.add(mesh);
    this.navigatorGroup.add(this.arrowGroup);

    const xGeo = new BufferGeometry();
    xGeo.attributes.position = position;
    xGeo.attributes.normal = normal;
    const xMesh = new Mesh(xGeo, new MeshLambertMaterial({ color: 'red' }));
    xMesh.rotateY(Math.PI / 2);
    this.arrowGroup.add(xMesh);

    const yGeo = new BufferGeometry();
    yGeo.attributes.position = position;
    yGeo.attributes.normal = normal;
    const yMesh = new Mesh(yGeo, new MeshLambertMaterial({ color: 'green' }));
    yMesh.rotateX(-Math.PI / 2);
    this.arrowGroup.add(yMesh);

    const zGeo = new BufferGeometry();
    zGeo.attributes.position = position;
    zGeo.attributes.normal = normal;
    const zMesh = new Mesh(zGeo, new MeshLambertMaterial({ color: 'blue' }));
    this.arrowGroup.add(zMesh);

    this.scene.add(this.navigatorGroup);
  }

  public bind(engine: INavigatorSource | undefined): void {
    if (engine === this.engine) {
      return;
    }

    if (this.engine) {
      // unbind old engine;
      this.engine.removeActionHandler(this);
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
      this.engine.addActionHandler(this);
      this.engine.addRenderHandler(this);
    }
  }

  public render(renderer: WebGLRenderer): void {
    renderer.clearDepth();
    const oldViewPort = new Vector4();
    renderer.getViewport(oldViewPort);
    renderer.setViewport(this.viewPort);
    renderer.render(this.scene, this.camera);
    renderer.setViewport(oldViewPort);
  }

  handleLeftButtonUp(event: PointerEvent, callback: IActionCallback): boolean {
    if (this.isEnabled) {
      const localCallback = callback;
      if (localCallback.state === STATE.NONE) {
        if (
          event.offsetX >= this.viewPort.x &&
          event.offsetX <= this.viewPort.x + this.viewPort.z &&
          localCallback.viewPortSize.y - event.offsetY >= this.viewPort.y &&
          localCallback.viewPortSize.y - event.offsetY <= this.viewPort.y + this.viewPort.w
        ) {
          // detect clicked direction
          //
          const result = localCallback.renderTargetAndReadFloat(
            this.detectScene,
            event.offsetX,
            event.offsetY,
            this.camera,
            this.viewPort
          );

          let dir = result[0] + result[1] * 2 + result[2] * 3;
          if (dir < 0) dir = -dir + 3;
          dir -= 1;
          if (dir < 0) {
            return false;
          }

          const r = localCallback.rotationMatrix.clone();
          // turn selected direction to Z direction.
          //
          let matrix = this.turnSelectedDir2Z(dir, r);

          // rotate around z axis to align other axes
          matrix = this.alignSelectedDir(dir, matrix);

          localCallback.rotationMatrix = matrix;

          return true;
        }
      }
    }
    return false;
  }

  private alignSelectedDir(dir: number, r: Matrix4): Matrix4 {
    const nextDir = (dir + 1) % 6;
    const v2 = dirs[nextDir].clone().applyMatrix4(r);

    // find the closest axis
    //
    let maxAngle = 0;
    let alignDir = 0;
    for (let i = 0; i < dirs.length; i += 1) {
      if (i !== 2 && i !== 5) {
        const x = v2.dot(dirs[i]);
        if (x >= 0 && x > maxAngle) {
          maxAngle = x;
          alignDir = i;
        }
      }
    }

    const rotateAxis = dirs[2].clone();
    const rotateAngle = Math.asin(v2.clone().cross(dirs[alignDir]).z);
    rotateAxis.normalize();
    const matrix = new Matrix4().makeRotationAxis(rotateAxis, rotateAngle);
    matrix.multiply(r);

    return matrix;
  }

  private turnSelectedDir2Z(dir: number, r: Matrix4): Matrix4 {
    const matrix = new Matrix4();
    const v2 = dirs[dir].clone();
    const vz = new Vector3(0, 0, 1);
    v2.applyMatrix4(r);

    let rotateAxis = v2.clone().cross(vz);
    let rotateAngle = 0;
    if (rotateAxis.length() < 0.00001) {
      rotateAxis = new Vector3(0, 1, 0);
      if (v2.z + vz.z < 1) {
        // turn back around Y axis
        rotateAngle = Math.PI;
      }
    } else {
      rotateAxis.normalize();
      rotateAngle = Math.acos(v2.clone().dot(vz));
    }

    matrix.makeRotationAxis(rotateAxis, rotateAngle);
    matrix.multiply(r);
    return matrix;
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
      this.detectGroup.matrix = this.engine.rotationMatrix;
    }
  };
}
