import { v4 as uuid } from 'uuid';
import RenderingEngine from '../engine/RenderingEngine';
import { IHitTestHandler, IHitTestResult } from '../engine/interfaces';

export default class SensorManager implements IHitTestHandler {
  private sensors: { targetName: string; id: string; position: number[] }[] = [];

  private engine: RenderingEngine | undefined;

  public Bind(engine: RenderingEngine | undefined): void {
    if (this.engine === engine) return;
    if (this.engine !== undefined) {
      this.engine.hitTestHandler = undefined;
    }
    this.engine = engine;
    if (this.engine !== undefined) {
      this.engine.hitTestHandler = <IHitTestHandler>this;
    }
  }

  public onHit(res: IHitTestResult): boolean {
    if (!this.engine) {
      throw Error('bind engine before invoke.');
    }

    const { name, pos } = res;

    if (this.sensors.findIndex((v) => v.id === name) > 0) {
      // select a sensor
    } else {
      this.sensors.push({ targetName: name, id: uuid().toString(), position: [pos.x, pos.y, pos.z] });
    }

    return true;
  }
}
