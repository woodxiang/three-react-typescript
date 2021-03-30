import { FrontSide } from 'three/src/constants';
import { SphereGeometry } from 'three/src/geometries/SphereGeometry';
import { Color } from 'three/src/math/Color';
import { Vector3 } from 'three/src/math/Vector3';
import { Group } from 'three/src/objects/Group';
import { Mesh } from 'three/src/objects/Mesh';
import MeshLambertExMaterial from './Materials/MeshLambertExMaterial';
import { IOverlapDrawer } from './OverlapLayer';
import PickPositionHandler from './PickPositionHandler';
import RenderingEngine from './RenderingEngine';

export default class MeasurementHandler extends PickPositionHandler implements IOverlapDrawer {
  private engine: RenderingEngine | undefined;

  private static endpointNames = ['measurementEndpoint0', 'measurementEndpoint1'];

  private endpoints: Vector3[] = [];

  private selectedEndpoint: number | undefined;

  private measurementRoot: Group | undefined;

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
    super(30);
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (this.engine && this.endpoints.length === 2) {
      const distance = this.endpoints[0].clone().sub(this.endpoints[1]).length();

      const p1 = this.engine.calculateScreenPosition(this.endpoints[0]);
      const p2 = this.engine.calculateScreenPosition(this.endpoints[1]);

      ctx.strokeStyle = 'yellow';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      ctx.font = `Normal ${24}px Arial`;
      ctx.fillStyle = 'rgba(200, 0, 0, 1)';

      ctx.fillText(`${distance.toFixed(3)}`, p2.x + 10, p2.y);
    }
  }

  public bind(engine: RenderingEngine | undefined): void {
    if (this.engine === engine) return;
    if (this.engine !== undefined) {
      this.engine.invalidOverlap();
      this.engine.removeActionHandler(this);
      this.engine.removeOverlayLayer(this);
      if (this.measurementRoot) {
        const index = this.engine.root.children.indexOf(this.measurementRoot);
        if (index >= 0) {
          this.engine.root.children.splice(index, 1);
        }
        RenderingEngine.disposeGroup(this.measurementRoot);
        this.measurementRoot = undefined;
      }
    }
    this.engine = engine;
    if (this.engine) {
      this.engine.addActionHandler(this);
      this.engine.addOverlayLayer(this);

      this.measurementRoot = new Group();
      this.measurementRoot.name = '#measurement#';
      this.engine.root.add(this.measurementRoot);

      this.endpoints.forEach((v) => {
        this.addEndPoint(v);
      });

      this.engine.invalidOverlap();

      this.activePointMaterial.ReplaceAfterProjectMatrix(this.engine.afterProjectMatrix);
      this.inactivePointMaterial.ReplaceAfterProjectMatrix(this.engine.afterProjectMatrix);
    }
  }

  protected onHit(position: Vector3, name: string): boolean {
    const index = MeasurementHandler.endpointNames.indexOf(name);
    if (index > 0) {
      // a endpoint was selected.
      if (this.selectedEndpoint !== index) {
        // switch selected endpoint.
        this.selectedEndpoint = index;
      }
    } else {
      if (this.endpoints.length >= 2) {
        // remove the first endpoint.
        this.endpoints.splice(0, 1);
        if (this.measurementRoot) {
          const toDispose = this.measurementRoot.children[0] as Mesh;
          toDispose.geometry.dispose();

          this.measurementRoot.children.splice(0, 1);
        }
      }

      // add new endpoint.
      this.endpoints.push(position.clone());
      this.addEndPoint(position);
      this.engine?.invalidOverlap();
    }
    return true;
  }

  /**
   * add a new point and set it as active.
   * @param name name of the point
   * @param pos position of the point
   */
  private addEndPoint(pos: Vector3): void {
    if (this.engine && this.measurementRoot) {
      const ball = new SphereGeometry(this.engine.maxDim / 300, 4, 4);
      const mesh = new Mesh(ball, this.activePointMaterial);
      mesh.translateX(pos.x);
      mesh.translateY(pos.y);
      mesh.translateZ(pos.z);
      this.measurementRoot.add(mesh);
    }
  }
}
