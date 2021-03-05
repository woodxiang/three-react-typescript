import { Float32BufferAttribute } from 'three/src/core/BufferAttribute';
import { MeshBasicMaterial } from 'three/src/materials/MeshBasicMaterial';
import { Matrix4 } from 'three/src/math/Matrix4';
import { Vector2 } from 'three/src/math/Vector2';
import { Vector3 } from 'three/src/math/Vector3';
import { Vector4 } from 'three/src/math/Vector4';
import { Group } from 'three/src/objects/Group';
import { Mesh } from 'three/src/objects/Mesh';
import { Scene } from 'three/src/scenes/Scene';
import ActionHandlerBase from './ActionHandlerBase';
import IdentityBoxBufferGeometry from './Geometry/IdentityBoxBufferGeometry';
import { CURSORTYPE, Direction, IActionCallback, STATE } from './interfaces';

export interface IClippingManager {
  clipPositions: number[];
  updateClip(dir: Direction, newValue: number): void;
}

const CLIPPING = 10;
export default class ClippingActionHandler extends ActionHandlerBase {
  private previousPosition: Vector2 = new Vector2();

  private activeDir = Direction.Undefined;

  private scene = new Scene();

  private root = new Group();

  private clipperMesh: Mesh;

  private manager: IClippingManager;

  constructor(manager: IClippingManager) {
    super(5);
    this.manager = manager;
    this.scene.add(this.root);

    const testGeo = new IdentityBoxBufferGeometry();

    const colors = new Array<number>(6 * 2 * 3 * 3);
    for (let i = 0; i < 6; i += 1) {
      for (let j = 0; j < 6; j += 1) {
        const idx = (i * 6 + j) * 3;
        colors[idx] = i + 1;
        colors[idx + 1] = 0;
        colors[idx + 2] = 0;
      }
    }

    testGeo.setAttribute('color', new Float32BufferAttribute(colors, 3));
    this.clipperMesh = new Mesh(testGeo, new MeshBasicMaterial({ vertexColors: true }));
    this.root.add(this.clipperMesh);
  }

  handleLeftButtonDown(event: PointerEvent, callback: IActionCallback): boolean {
    if (this.isEnabled) {
      const callbacker = callback;
      if (callbacker.state === STATE.NONE) {
        this.activeDir = this.TestReaction(event.offsetX, event.offsetY, callbacker);
        if (this.activeDir === Direction.Undefined) {
          return false;
        }
        this.previousPosition = new Vector2(event.offsetX, event.offsetY);
        return true;
      }
    }

    return false;
  }

  handleLeftButtonUp(event: PointerEvent, callback: IActionCallback): boolean {
    if (this.isEnabled) {
      const callbacker = callback;
      if (callbacker.state === CLIPPING) {
        callbacker.state = STATE.NONE;
        callbacker.releasePointer();
        callbacker.cursorType = CURSORTYPE.NONE;
        this.activeDir = Direction.Undefined;
        return true;
      }
    }
    return false;
  }

  handleMouseMove(event: PointerEvent, callback: IActionCallback): boolean {
    if (this.isEnabled) {
      const callbacker = callback;
      const newPosition = new Vector2(event.offsetX, event.offsetY);
      if (callbacker.state === STATE.NONE) {
        if (this.activeDir === Direction.Undefined) {
          return false;
        }

        if (event.buttons === 1) {
          callbacker.capturePointer(event.pointerId);
          callbacker.state = CLIPPING;
          callbacker.cursorType = CURSORTYPE.HAND;
        }
      }

      if (callbacker.state === CLIPPING) {
        const delta = newPosition.clone().sub(this.previousPosition);
        this.dragClipSurface(delta, callback);
        this.previousPosition = newPosition;
        return true;
      }
    }
    return false;
  }

  private TestReaction(offsetX: number, offsetY: number, callback: IActionCallback): Direction {
    const range = this.manager.clipPositions;
    const matrixClip = new Matrix4();
    matrixClip.scale(new Vector3(range[0] - range[3], range[1] - range[4], range[2] - range[5]));
    matrixClip.setPosition(new Vector3(range[3], range[4], range[5]));

    this.clipperMesh.matrix = matrixClip;
    this.clipperMesh.matrixAutoUpdate = false;

    this.root.matrix = callback.matrix;
    this.root.matrixAutoUpdate = false;

    const ret = callback.renderTargetAndReadFloat(this.scene, offsetX, offsetY);
    return Math.round(ret[0]) - 1;
  }

  private dragClipSurface(deltaPos: Vector2, callback: IActionCallback) {
    const dirNormalMap = [
      new Vector4(1, 0, 0, 1),
      new Vector4(0, 1, 0, 1),
      new Vector4(0, 0, 1, 1),
      new Vector4(-1, 0, 0, 1),
      new Vector4(0, -1, 0, 1),
      new Vector4(0, 0, -1, 1),
    ];

    const pd = dirNormalMap[this.activeDir];
    const viewSize = callback.viewPortSize;

    const matrixShift = callback.rotationMatrix.clone();
    matrixShift.elements[12] = 0;
    matrixShift.elements[13] = 0;
    matrixShift.elements[14] = 0;
    matrixShift.elements[15] = 1;

    pd.applyMatrix4(matrixShift);
    const p1 = new Vector3(deltaPos.x, -deltaPos.y, 0);
    const p2 = new Vector3(pd.x, pd.y, pd.z);
    const dotMultiple = p1.clone().dot(p2);

    const ratio = viewSize.width / viewSize.height;
    const screenScale = ratio > 1 ? viewSize.height / 2.0 : viewSize.width / 2.0;

    const ratio2 =
      (Math.tan(((callback.cameraFov / 180) * Math.PI) / 2.0) * (callback.camaerAt.z - callback.cameraEye.z)) /
      screenScale;
    const delta = pd.z === 1 ? 0 : (dotMultiple * ratio2) / (1 - pd.z * pd.z) / (2.0 / callback.maxDim);

    if (delta !== 0) {
      this.drag(delta);
    }
  }

  private drag(delta: number) {
    const newValue = this.manager.clipPositions[this.activeDir] + (this.activeDir < 3 ? -delta : delta);
    this.manager.updateClip(this.activeDir, newValue);
  }
}
