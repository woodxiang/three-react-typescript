import ActionHandlerBase from './ActionHandlerBase';
import { IActionCallback, IHitTest, STATE } from './interfaces';

export default class ClickHandler extends ActionHandlerBase {
  constructor(priority = 15) {
    super(priority);
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
}
