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

export default class SensorManager extends PickPositionHandler {
  private sensors: { targetName: string; id: string; position: number[] }[] = [];

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

  constructor() {
    super(20);
  }

  public bind(engine: RenderingEngine | undefined): void {
    if (this.engine === engine) return;
    if (this.engine !== undefined) {
      this.engine.removeActionHandler(this);
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
      this.sensorsRoot = new Group();
      this.sensorsRoot.name = '#sensors#';
      this.engine.root.add(this.sensorsRoot);

      this.sensors.forEach((v) => {
        this.addPoint(v.id.toString(), v.position);
      });

      this.activePointMaterial.ReplaceAfterProjectMatrix(this.engine.afterProjectMatrix);
      this.inactivePointMaterial.ReplaceAfterProjectMatrix(this.engine.afterProjectMatrix);
    }
  }

  public onHit(pos: Vector3, name: string): boolean {
    if (!this.engine) {
      throw Error('bind engine before invoke.');
    }

    const pickedSensor = this.sensors.find((v) => v.id === name);
    if (pickedSensor) {
      // select a sensor
      if (this.activeSensorName) {
        this.activePoint(this.activeSensorName, false);
      }
      this.activePoint(pickedSensor.id, true);
    } else {
      const newSensor = { targetName: name, id: uuid().toString(), position: [pos.x, pos.y, pos.z] };
      this.sensors.push(newSensor);
      this.addPoint(newSensor.id, newSensor.position);
      if (this.activeSensorName) {
        this.activePoint(this.activeSensorName, false);
      }
      this.activeSensorName = newSensor.id;
    }

    return true;
  }

  /**
   * add a new point and set it as active.
   * @param name name of the point
   * @param pos position of the point
   */
  private addPoint(name: string, pos: number[]): void {
    if (this.engine && this.sensorsRoot) {
      const ball = new SphereGeometry(this.engine.maxDim / 300, 4, 4);
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
  private activePoint(name: string, enable: boolean): void {
    if (this.engine) {
      const toUpdate = this.sensorsRoot?.children.find((v) => v.name === name);
      if (toUpdate && toUpdate instanceof Mesh) {
        toUpdate.material = enable ? this.activePointMaterial : this.inactivePointMaterial;
      }
    }
  }
}
