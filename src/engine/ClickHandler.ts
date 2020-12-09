import { IActionCallback, IActionHandler, SELECTIONMODE, IFaceSelection, IHitTest, STATE } from './interfaces';

export default class ClickHandler implements IActionHandler {
  private selectionModeInternal = SELECTIONMODE.Disabled;

  public priority = 9;

  public get isEnabled(): boolean {
    return this.selectionModeInternal !== SELECTIONMODE.Disabled;
  }

  public set isEnabled(isEnabled: boolean) {
    if (isEnabled) {
      this.selectionModeInternal = SELECTIONMODE.Point;
    } else {
      this.selectionModeInternal = SELECTIONMODE.Disabled;
    }
  }

  public get selectionMode(): SELECTIONMODE {
    return this.selectionModeInternal;
  }

  public set selectionMode(newMode: SELECTIONMODE) {
    this.selectionModeInternal = newMode;
  }

  // eslint-disable-next-line class-methods-use-this
  handleLeftButtonDown(): boolean {
    return false;
  }

  handleLeftButtonUp(event: PointerEvent, callback: IActionCallback): boolean {
    switch (this.selectionModeInternal) {
      case SELECTIONMODE.Plane:
        {
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
                faceSelection.clickOnFace(testResult.name, testResult.index);
                return true;
              }
            }
          }
        }
        break;

      case SELECTIONMODE.Point:
        throw Error('Not implemented.');

      default:
        break;
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
