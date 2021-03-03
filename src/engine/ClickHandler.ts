import { IActionCallback, IActionHandler, IHitTest, STATE } from './interfaces';

export default class ClickHandler implements IActionHandler {
  public readonly priority;

  public isEnabled = true;

  constructor(priority = 15) {
    this.priority = priority;
  }

  // eslint-disable-next-line class-methods-use-this
  handleLeftButtonDown(): boolean {
    return false;
  }

  handleLeftButtonUp(event: PointerEvent, callback: IActionCallback): boolean {
    if (this.isEnabled) {
      const callbacker = callback;
      if (callbacker.state === STATE.NONE) {
        const hitTester = <IHitTest>(<unknown>callbacker);
        if (hitTester) {
          return hitTester.hit(
            (event.offsetX / callbacker.viewPortSize.x) * 2 - 1,
            -(event.offsetY / callbacker.viewPortSize.y) * 2 + 1
          );
        }
      }
    }

    return false;
  }

  // eslint-disable-next-line class-methods-use-this
  handleMouseMove(): boolean {
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
}
