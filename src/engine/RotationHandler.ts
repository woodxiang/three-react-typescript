import { Matrix4, Object3D, PerspectiveCamera, Vector2, Vector3 } from 'three';
import { CURSORTYPE, IActionCallback, IActionHandler, STATE } from './interfaces';

export default class RotationHandler implements IActionHandler {
  public isEnabled = true;

  public priority = 10;

  private previousPosition = new Vector2();

  private camera: PerspectiveCamera;

  private targetObject: Object3D;

  constructor(camera: PerspectiveCamera, targetObject: Object3D) {
    if (!camera || !targetObject) {
      throw Error('Invalid camera or target object.');
    }

    this.camera = camera;
    this.targetObject = targetObject;
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
        callbacker.cursorType = CURSORTYPE.ARRAW;
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
      if (callbacker.state === STATE.NONE) {
        if (event.buttons === 1) {
          callbacker.capturePointer(event.pointerId);
          callbacker.state = STATE.ROTATE;
          callbacker.cursorType = CURSORTYPE.HAND;
        }
      }
      if (callbacker.state === STATE.ROTATE) {
        const newPosition = new Vector2(event.offsetX, event.offsetY);
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

  private rotate(x: number, y: number, callback: IActionCallback): void {
    const size = callback.viewPortSize;
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

    this.targetObject.matrix = matrix.multiply(this.targetObject.matrix);
    this.targetObject.matrixWorldNeedsUpdate = true;
  }
}