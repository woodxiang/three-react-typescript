import { IActionCallback, IActionHandler, IFaceSelection, IHitTest, STATE } from './interfaces';

export default class ClickHandler implements IActionHandler {
  public isEnabled = true;

  public priority = 9;

  // eslint-disable-next-line class-methods-use-this
  handleLeftButtonDown(): boolean {
    return false;
  }

  handleLeftButtonUp(event: PointerEvent, callback: IActionCallback): boolean {
    if (this.isEnabled) {
      const callbacker = callback;
      const faceSelection = <IFaceSelection>(<unknown>callbacker);
      if (faceSelection && callbacker.state === STATE.NONE) {
        const hitTester = (callbacker as unknown) as IHitTest;
        if (hitTester) {
          const testResult = hitTester.testTriangle(
            (event.offsetX / callbacker.viewPortSize.x) * 2 - 1,
            -(event.offsetY / callbacker.viewPortSize.y) * 2 + 1
          );
          if (testResult) {
            faceSelection.selectFace(testResult.name, testResult.index);
            return true;
          }
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
}
