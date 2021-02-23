import { IActionCallback, IActionHandler, IObjectRotation, STATE } from './interfaces';

export default class ClippingHandler implements IActionHandler {
  public isEnabled = true;

  public priority = 5;

  private targetObject: IObjectRotation;

  constructor(targetObject: IObjectRotation) {
    if (!targetObject) {
      throw Error('Invalid target object');
    }

    this.targetObject = targetObject;
  }

  handleLeftButtonDown(event: PointerEvent, callback: IActionCallback): boolean {
    if (this.isEnabled) {
      const callbacker = callback;
      if (callbacker.state === STATE.NONE) {
      }
    }
  }

  handleLeftButtonUp(event: PointerEvent, callback: IActionCallback): boolean {
    throw new Error('Method not implemented.');
  }

  handleMouseMove(event: PointerEvent, callback: IActionCallback): boolean {
    throw new Error('Method not implemented.');
  }

  handleMouseWheel(event: PointerEvent, callback: IActionCallback): boolean {
    throw new Error('Method not implemented.');
  }

  handleKeyDown(event: KeyboardEvent, callback: IActionCallback): boolean {
    throw new Error('Method not implemented.');
  }

  handleKeyUp(event: KeyboardEvent, callback: IActionCallback): boolean {
    throw new Error('Method not implemented.');
  }

  handleMiddleButtonDown(event: PointerEvent, callback: IActionCallback): boolean {
    throw new Error('Method not implemented.');
  }

  handleMiddleButtonUp(event: PointerEvent, callback: IActionCallback): boolean {
    throw new Error('Method not implemented.');
  }

  handleRightButtonDown(event: PointerEvent, callback: IActionCallback): boolean {
    throw new Error('Method not implemented.');
  }

  handleRightButtonUp(event: PointerEvent, callback: IActionCallback): boolean {
    throw new Error('Method not implemented.');
  }

  handleWhell(event: WheelEvent, callback: IActionCallback): boolean {
    throw new Error('Method not implemented.');
  }
}
