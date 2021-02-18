import { v4 as uuid } from 'uuid';
import RenderingEngine from './RenderingEngine';
import { IHitTestHandler, IHitTestResult } from './interfaces';

export default class SensorManager implements IHitTestHandler {
  private sensors: { targetName: string; id: string; position: number[] }[] = [];

  private activeSensorName: string | undefined = undefined;

  private engine: RenderingEngine | undefined;

  public bind(engine: RenderingEngine | undefined): void {
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

    const pickedSensor = this.sensors.find((v) => v.id === name);
    if (pickedSensor) {
      // select a sensor
      if (this.activeSensorName) {
        this.engine.activePoint(this.activeSensorName, false);
      }
      this.engine.activePoint(pickedSensor.id, true);
    } else {
      const newSensor = { targetName: name, id: uuid().toString(), position: [pos.x, pos.y, pos.z] };
      this.sensors.push(newSensor);
      this.engine.addPoint(newSensor.id, newSensor.position);
      if (this.activeSensorName) {
        this.engine.activePoint(this.activeSensorName, false);
      }
      this.activeSensorName = newSensor.id;
    }

    return true;
  }
}
