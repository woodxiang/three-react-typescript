import { v4 as uuid } from 'uuid';
import { Vector3 } from 'three/src/math/Vector3';
import RenderingEngine from './RenderingEngine';
import PickPositionHandler from './PickPositionHandler';

export default class SensorManager extends PickPositionHandler {
  private sensors: { targetName: string; id: string; position: number[] }[] = [];

  private activeSensorName: string | undefined = undefined;

  private engine: RenderingEngine | undefined;

  constructor() {
    super(20);
  }

  public bind(engine: RenderingEngine | undefined): void {
    if (this.engine === engine) return;
    if (this.engine !== undefined) {
      this.engine.removeActionHandler(this);
    }
    this.engine = engine;
    if (this.engine) {
      this.engine?.addActionHandler(this);
    }
  }

  public onHit(pos: Vector3, name: string | undefined): boolean {
    if (!this.engine) {
      throw Error('bind engine before invoke.');
    }

    if (name === undefined) {
      return false;
    }

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
