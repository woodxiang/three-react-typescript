import { v4 as uuid } from 'uuid';
import { Vector3 } from 'three/src/math/Vector3';
import { Color } from 'three/src/math/Color';
import { FrontSide } from 'three/src/constants';
import { SphereGeometry } from 'three/src/geometries/SphereGeometry';
import { Mesh } from 'three/src/objects/Mesh';
import { Group } from 'three/src/objects/Group';
import RenderingEngine from './RenderingEngine';
import PickPositionHandler from './PickPositionHandler';
import MeshLambertExMaterial from './Materials/MeshLambertExMaterial';

import { IAnnotationDrawer } from './AnnotationLayer';

export interface ISensorInfo {
  targetName: string;
  id: string;
  position: number[]; // [pos.x, pos.y, pos.z]
}

export default class SensorManager extends PickPositionHandler implements IAnnotationDrawer {
  private sensors: ISensorInfo[] = [];

  private pointSize = 1;

  private activeSensorName: string | undefined = undefined;

  private engine: RenderingEngine | undefined;

  private sensorsRoot: Group | undefined;

  private inactivePointMaterial = new MeshLambertExMaterial({
    diffuse: new Color('#00FF00'),
    side: FrontSide,
    clipping: true,
    lights: true,
  });

  private activePointMaterial = new MeshLambertExMaterial({
    diffuse: new Color('#FF0000'),
    side: FrontSide,
    clipping: true,
    lights: true,
  });

  private callbackHit: (flat: ISensorInfo, optType: string) => void;

  constructor() {
    super(5);
  }

  public bind(engine: RenderingEngine | undefined, _callbackHit: (sensor: ISensorInfo, optType: string) => void): void {
    if (this.engine === engine) return;
    if (this.engine !== undefined) {
      this.engine.invalidOverlap();
      this.engine.removeActionHandler(this);
      this.engine.removeOverlayLayer(this);
      if (this.sensorsRoot) {
        const index = this.engine.root.children.indexOf(this.sensorsRoot);
        if (index >= 0) {
          this.engine.root.children.splice(index, 1);
        }
        RenderingEngine.disposeGroup(this.sensorsRoot);
        this.sensorsRoot = undefined;
      }
    }
    this.engine = engine;
    if (this.engine) {
      this.engine.addActionHandler(this);
      this.engine.addOverlayLayer(this);
      this.sensorsRoot = new Group();
      this.sensorsRoot.name = '#sensors#';
      this.engine.root.add(this.sensorsRoot);

      const scale = this.engine.afterProjectMatrix?.elements[0] || 1;
      this.pointSize = this.engine.maxDim / 300 / scale;

      this.sensors.forEach((v) => {
        this.addPoint(v.id.toString(), v.position);
      });

      this.engine.invalidOverlap();
      this.activePointMaterial.ReplaceAfterProjectMatrix(this.engine.afterProjectMatrix);
      this.inactivePointMaterial.ReplaceAfterProjectMatrix(this.engine.afterProjectMatrix);
    }
    this.callbackHit = _callbackHit;
  }

  public bindActionHandler(enabledAction: boolean): void {
    if (this.engine !== undefined) {
      if (enabledAction) {
        this.engine.addActionHandler(this);
      } else {
        this.engine.removeActionHandler(this);
      }
    }
  }

  public draw(): void {}

  public handleWheel(): boolean {
    if (this.sensors) {
      const scale = this.engine.afterProjectMatrix?.elements[0] || 1;
      this.pointSize = this.engine.maxDim / 300 / scale;
      console.log(this.pointSize);
      this.sensors.forEach((v) => {
        const delSensor: ISensorInfo = { id: v.id, targetName: '', position: [] };
        this.deleteSensor(delSensor);
      });
      this.sensors.forEach((v) => {
        this.addPoint(v.id.toString(), v.position);
      });
    }
    return false;
  }

  public onHit(pos: Vector3, name: string): boolean {
    if (!this.engine) {
      throw Error('bind engine before invoke.');
    }

    const pickedSensor = this.sensors.find((v) => v.id === name);
    if (pickedSensor) {
      // select a sensor
      // if (this.activeSensorName) {
      //   this.activePoint(this.activeSensorName, false);
      // }
      // this.activePoint(pickedSensor.id, true);

      const delSensor: ISensorInfo = { id: pickedSensor.id, targetName: '', position: [] };
      this.deleteSensor(delSensor);

      console.log('hit a pickedSensor');
      this.callbackHit?.(pickedSensor, 'del');
    } else {
      const newSensor: ISensorInfo = {
        targetName: name,
        id: uuid().toString(),
        position: [pos.x, pos.y, pos.z],
      };
      this.sensors.push(newSensor);
      this.addPoint(newSensor.id, newSensor.position);
      if (this.activeSensorName) {
        this.activePoint(this.activeSensorName, false);
      }
      this.activeSensorName = newSensor.id;
      this.callbackHit?.(newSensor, 'add');
      this.engine?.invalidOverlap();
    }

    return true;
  }

  public getSensors(): ISensorInfo[] {
    // this.engine.activePoint
    return this.sensors;
  }

  public addSensor(sensor: ISensorInfo): void {
    this.sensors.push(sensor);
    if (this.engine) {
      this.addPoint(sensor.id, sensor.position);
    }
    // if (this.activeSensorName) {
    //   this.engine.activePoint(this.activeSensorName, false);
    // }
  }

  public deleteSensor(sensor: ISensorInfo): void {
    const delIdx = this.sensors.findIndex((item) => item.id === sensor.id);
    if (delIdx !== -1) {
      const pickedSensor = this.sensors.find((v) => v.id === sensor.id);
      this.callbackHit?.(pickedSensor, 'del');

      this.sensors.splice(delIdx, 1);
      // this.engine.removeMesh(sensor.id);
      const item = this.sensorsRoot.children.find((i) => i.name === sensor.id);
      this.sensorsRoot.remove(item);
    }

    // 更新激活对象：
    if (sensor.id === this.activeSensorName) {
      // 选中的为活动目标，删除后，设置最后一个为活动目标
      const lastSen: ISensorInfo = this.sensors[this.sensors.length - 1];
      if (lastSen) {
        if (this.sensors.length > 0) this.activePoint(lastSen.id, true);
        this.activeSensorName = lastSen.id;
      }
    }
  }

  public clearSensors(): void {
    this.sensors = [];
  }

  /**
   * add a new point and set it as active.
   * @param name name of the point
   * @param pos position of the point
   */
  private addPoint(name: string, pos: number[]): void {
    if (this.engine && this.sensorsRoot) {
      const ball = new SphereGeometry(this.pointSize, 16, 16);
      const mesh = new Mesh(ball, this.activePointMaterial);
      mesh.translateX(pos[0]);
      mesh.translateY(pos[1]);
      mesh.translateZ(pos[2]);
      mesh.name = name;
      ball.name = name;
      this.sensorsRoot.add(mesh);
    }
  }

  /**
   * set target sensor activity
   * @param name the target sensor to active/inactive
   * @param enable active/inactive
   */
  public activePoint(name: string, enable: boolean): void {
    if (this.engine) {
      const toUpdate = this.sensorsRoot?.children.find((v) => v.name === name);
      if (toUpdate && toUpdate instanceof Mesh) {
        toUpdate.material = enable ? this.activePointMaterial : this.inactivePointMaterial;
      }
    }
  }

  public clear(): void {
    if (this.sensorsRoot) {
      for (let i = this.sensorsRoot.children.length - 1; i >= 0; i -= 1) {
        this.sensorsRoot.remove(this.sensorsRoot.children[i]);
      }
    }
  }
}
