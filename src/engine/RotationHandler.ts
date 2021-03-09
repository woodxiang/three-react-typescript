import { PerspectiveCamera } from 'three/src/cameras/PerspectiveCamera';
import { Matrix4 } from 'three/src/math/Matrix4';
import { Vector2 } from 'three/src/math/Vector2';
import { Vector3 } from 'three/src/math/Vector3';
import ActionHandlerBase from './ActionHandlerBase';
import { CURSORTYPE, IActionCallback, STATE } from './interfaces';

export default class RotationHandler extends ActionHandlerBase {
  private previousPosition = new Vector2();

  private camera: PerspectiveCamera;

  constructor(camera: PerspectiveCamera) {
    super(10);

    if (!camera) {
      throw Error('Invalid camera');
    }

    this.camera = camera;
  }

  handleLeftButtonDown(event: PointerEvent, callback: IActionCallback): boolean {
    if (this.isEnabled) {
      const callbacker = callback;
      if (callbacker.state === STATE.NONE) {
        this.previousPosition = new Vector2(event.offsetX, event.offsetY);
        return false;
      }
    }
    return false;
  }

  handleLeftButtonUp(event: PointerEvent, callback: IActionCallback): boolean {
    if (this.isEnabled) {
      const callbacker = callback;
      if (callbacker.state === STATE.ROTATE) {
        callbacker.cursorType = CURSORTYPE.NONE;
        callbacker.releasePointer();
        callbacker.state = STATE.NONE;
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
        if (event.buttons === 1) {
          callbacker.capturePointer(event.pointerId);
          callbacker.state = STATE.ROTATE;
          callbacker.cursorType = CURSORTYPE.HAND;
        }
      }
      if (callbacker.state === STATE.ROTATE) {
        this.rotate(newPosition.x - this.previousPosition.x, newPosition.y - this.previousPosition.y, callbacker);
        this.previousPosition = newPosition;
        return true;
      }
    }
    return false;
  }

  handleMouseWheel(event: PointerEvent, callback: IActionCallback): boolean {
    if (this.isEnabled) {
      const callbacker = callback;
      if (callbacker.state === STATE.NONE) {
        return true;
      }
    }
    return false;
  }

  handleKeyDown(event: KeyboardEvent, callback: IActionCallback): boolean {
    if (this.isEnabled) {
      const callbacker = callback;
      if (callbacker.state === STATE.NONE) {
        return true;
      }
    }
    return false;
  }

  handleKeyUp(event: KeyboardEvent, callback: IActionCallback): boolean {
    if (this.isEnabled) {
      const callbacker = callback;
      if (callbacker.state === STATE.NONE) {
        return true;
      }
    }
    return false;
  }

  handleWhell(event: WheelEvent, callback: IActionCallback): boolean {
    if (this.isEnabled) {
      const callbacker = callback;
      if (callbacker.state === STATE.NONE) {
        this.zoom(event.deltaY);
        return true;
      }
    }

    return false;
  }

  private zoom(delta: number): void {
    this.camera.position.z *= 1.0 + delta / 120 / 10;
  }

  private rotate(x: number, y: number, callback: IActionCallback): void {
    const callbacker = callback;
    const size = callbacker.viewPortSize;
    const ratio = size.x / size.y;
    const scale = ratio > 1 ? size.y / 2 : size.x / 2;

    const xAngle = (Math.PI * x) / scale;
    const yAngle = (Math.PI * y) / scale;

    const matrix = new Matrix4();
    if (xAngle !== 0 || yAngle !== 0) {
      if (xAngle !== 0) {
        const m = new Matrix4();
        m.makeRotationAxis(this.camera.up, xAngle);
        matrix.multiply(m);
      }
      if (yAngle !== 0) {
        const dir = new Vector3();
        const m = new Matrix4();
        this.camera.getWorldDirection(dir);
        const yRotateAxis = dir.cross(this.camera.up);
        m.makeRotationAxis(yRotateAxis, yAngle);
        matrix.multiply(m);
      }
    }

    callbacker.rotationMatrix = matrix.multiply(callbacker.rotationMatrix);
  }
}
