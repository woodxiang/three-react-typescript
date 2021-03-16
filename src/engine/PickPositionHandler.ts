/* eslint-disable class-methods-use-this */
import { Vector3 } from 'three/src/math/Vector3';
import ActionHandlerBase from './ActionHandlerBase';
import { IActionCallback, STATE } from './interfaces';
import PositionDetectHelper from './PositionDetectHelper';

export default class PickPositionHandler extends ActionHandlerBase {
  // eslint-disable-next-line class-methods-use-this
  handleLeftButtonDown(): boolean {
    return false;
  }

  handleLeftButtonUp(event: PointerEvent, callback: IActionCallback): boolean {
    if (this.isEnabled) {
      const localCallback = callback;
      if (localCallback.state === STATE.NONE) {
        const detectScene = PositionDetectHelper.createDetectScene(callback.scene);
        const ret = callback.renderTargetAndReadFloat(
          detectScene.scene,
          event.offsetX,
          event.offsetY,
          undefined,
          undefined
        );
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
}
