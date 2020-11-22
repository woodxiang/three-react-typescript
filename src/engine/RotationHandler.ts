import {
  CURSORTYPE,
  IActionCallback,
  IActionHandler,
  STATE,
} from './controls/interfaces';

export default class RotationHandler implements IActionHandler {
  public isEnabled = true;

  public priority = 10;

  handleLeftButtonDown(
    event: PointerEvent,
    callback: IActionCallback
  ): boolean {
    if (this.isEnabled) {
      const callbacker = callback;
      if (callbacker.state === STATE.NONE) {
        callbacker.state = STATE.ROTATE;
        callbacker.capturePointer(event.pointerId);
        callbacker.cursorType = CURSORTYPE.HAND;
        return true;
      }
    }
    return false;
  }

  handleLeftButtonUp(event: PointerEvent, callback: IActionCallback): boolean {
    if (this.isEnabled) {
      const callbacker = callback;
      if (callbacker.state === STATE.ROTATE) {
        callbacker.cursorType = CURSORTYPE.ARRAW;
        callbacker.ReleasePointer();
        callbacker.state = STATE.NONE;
        return true;
      }
    }
    return false;
  }

  handleMouseMove(event: PointerEvent, callback: IActionCallback): boolean {
    if (this.isEnabled) {
      const callbacker = callback;
      if (callbacker.state === STATE.ROTATE) {
        return true;
      }
    }
    return false;
  }

  handleMouseWheel(event: PointerEvent, callback: IActionCallback): boolean {
    return false;
  }

  handleKeyDown(event: KeyboardEvent, callback: IActionCallback): boolean {
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
}
