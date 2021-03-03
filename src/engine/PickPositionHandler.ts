/* eslint-disable class-methods-use-this */
import { Vector3 } from 'three/src/math/Vector3';
import { IActionCallback, IActionHandler, STATE } from './interfaces';
import PositionDetectHelper from './PositionDetectHelper';

export default class PickPositionHandler implements IActionHandler {
  public readonly priority;

  public isEnabled = true;

  constructor(priority: number) {
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
        const detectScene = PositionDetectHelper.createDetectScene(callback.scene);
        const ret = callback.renderTargetAndReadFloat(detectScene.scene, event.offsetX, event.offsetY);
        const position = new Vector3(ret[0], ret[1], ret[2]);
        const objId = Math.round(ret[3]);
        const objName = detectScene.map.get(objId);
        this.onHit(position, objName);
      }
    }

    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected onHit(position: Vector3, name: string | undefined): boolean {
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
