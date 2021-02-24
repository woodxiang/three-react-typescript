import { IActionCallback, IActionHandler, IObjectRotation, STATE } from './interfaces';

export default class ClippingActionHandler implements IActionHandler {
  public isEnabled = true;

  public priority = 5;

  handleLeftButtonDown(event: PointerEvent, callback: IActionCallback): boolean {
    if (this.isEnabled) {
      const callbacker = callback;
      if (callbacker.state === STATE.NONE) {
      }
    }

    return false;
  }

  handleLeftButtonUp(event: PointerEvent, callback: IActionCallback): boolean {
    return false;
  }

  handleMouseMove(event: PointerEvent, callback: IActionCallback): boolean {
    return false;
  }

  handleMouseWheel(event: PointerEvent, callback: IActionCallback): boolean {
    return false;
  }

  handleKeyDown(event: KeyboardEvent, callback: IActionCallback): boolean {
    return false;
  }

  handleKeyUp(event: KeyboardEvent, callback: IActionCallback): boolean {
    return false;
  }

  handleMiddleButtonDown(event: PointerEvent, callback: IActionCallback): boolean {
    return false;
  }

  handleMiddleButtonUp(event: PointerEvent, callback: IActionCallback): boolean {
    return false;
  }

  handleRightButtonDown(event: PointerEvent, callback: IActionCallback): boolean {
    return false;
  }

  handleRightButtonUp(event: PointerEvent, callback: IActionCallback): boolean {
    return false;
  }

  handleWhell(event: WheelEvent, callback: IActionCallback): boolean {
    return false;
  }
}
