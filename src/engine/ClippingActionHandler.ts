import { Float32BufferAttribute } from 'three/src/core/BufferAttribute';
import { MeshBasicMaterial } from 'three/src/materials/MeshBasicMaterial';
import { Matrix4 } from 'three/src/math/Matrix4';
import { Vector2 } from 'three/src/math/Vector2';
import { Vector3 } from 'three/src/math/Vector3';
import { Group } from 'three/src/objects/Group';
import { Mesh } from 'three/src/objects/Mesh';
import { Scene } from 'three/src/scenes/Scene';
import IdentityBoxBufferGeometry from './Geometry/IdentityBoxBufferGeometry';
import { CURSORTYPE, Direction, IActionCallback, IActionHandler, STATE } from './interfaces';

export interface IClippingSource {
  clipPositions: number[];
}

const CLIPPING = 10;
export default class ClippingActionHandler implements IActionHandler {
  public isEnabled = true;

  public priority = 5;

  private previousPosition: Vector2 = new Vector2();

  private activeDir = Direction.Undefined;

  private scene = new Scene();

  private root = new Group();

  private clipperMesh: Mesh;

  private manager: IClippingSource;

  constructor(manager: IClippingSource) {
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
        callbacker.cursorType = CURSORTYPE.HAND;
        callbacker.capturePointer(event.pointerId);
        callbacker.state = CLIPPING;
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
    return false;
  }

  // eslint-disable-next-line class-methods-use-this
  handleMouseWheel(): boolean {
    return false;
  }

  // eslint-disable-next-line class-methods-use-this
  handleKeyDown(): boolean {
    return false;
  }

  // eslint-disable-next-line class-methods-use-this
  handleKeyUp(): boolean {
    return false;
  }

  // eslint-disable-next-line class-methods-use-this
  handleMiddleButtonDown(): boolean {
    return false;
  }

  // eslint-disable-next-line class-methods-use-this
  handleMiddleButtonUp(): boolean {
    return false;
  }

  // eslint-disable-next-line class-methods-use-this
  handleRightButtonDown(): boolean {
    return false;
  }

  // eslint-disable-next-line class-methods-use-this
  handleRightButtonUp(): boolean {
    return false;
  }

  // eslint-disable-next-line class-methods-use-this
  handleWhell(): boolean {
    return false;
  }

  private TestReaction(offsetX: number, offsetY: number, callback: IActionCallback): Direction {
    const range = this.manager.clipPositions;
    const matrixClip = new Matrix4();
    matrixClip.scale(new Vector3(range[0] - range[3], range[1] - range[4], range[2] - range[5]));
    matrixClip.setPosition(new Vector3(range[3], range[4], range[5]));

    this.clipperMesh.matrix = matrixClip;
    this.clipperMesh.matrixAutoUpdate = false;

    this.root.matrix = callback.getMatrix();
    this.root.matrixAutoUpdate = false;

    const ret = callback.renderTargetAndReadFloat(this.scene, offsetX, offsetY);
    return Math.round(ret[0]) - 1;
  }
}
