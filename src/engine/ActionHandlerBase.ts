/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable class-methods-use-this */
import { IActionCallback, IActionHandler } from './interfaces';

export default class ActionHandlerBase implements IActionHandler {
  public isEnabled: boolean;

  public readonly priority: number;

  constructor(priority = 10, enabled = true) {
    this.priority = priority;
    this.isEnabled = enabled;
  }

  handleLeftButtonDown(event: PointerEvent, callback: IActionCallback): boolean {
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

  handleWheel(event: WheelEvent, callback: IActionCallback): boolean {
    return false;
  }
}
