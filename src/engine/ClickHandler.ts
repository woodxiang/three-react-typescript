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
      const localCallback = callback;
      if (localCallback.state === STATE.NONE) {
        const hitTester = <IHitTest>(<unknown>localCallback);
        if (hitTester) {
          return hitTester.hit(
            (event.offsetX / localCallback.viewPortSize.x) * 2 - 1,
            -(event.offsetY / localCallback.viewPortSize.y) * 2 + 1
          );
        }
      }
    }

    return false;
  }
}
