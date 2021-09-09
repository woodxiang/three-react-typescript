/* eslint-disable class-methods-use-this */
import { FrontSide } from 'three/src/constants';
import { SphereGeometry } from 'three/src/geometries/SphereGeometry';
import { Color } from 'three/src/math/Color';
import { Vector3 } from 'three/src/math/Vector3';
import { Vector4 } from 'three/src/math/Vector4';
import { Group } from 'three/src/objects/Group';
import { Mesh } from 'three/src/objects/Mesh';
import ActionHandlerBase from './ActionHandlerBase';
import { IAnnotationDrawer } from './AnnotationLayer';
import { IActionCallback, STATE } from './interfaces';
import MeshLambertExMaterial from './Materials/MeshLambertExMaterial';
import RenderingEngine from './RenderingEngine';
import ValueDetectHelper from './ValueDetectHelper';

export default class PickValueHandler extends ActionHandlerBase implements IAnnotationDrawer {
  private engine: RenderingEngine | undefined;

  private selectedValue: number | undefined;

  private selectedPosition: Vector3 | undefined;

  private measurementRoot: Group | undefined;

  private activePointMaterial = new MeshLambertExMaterial({
    diffuse: new Color('#FF0000'),
    side: FrontSide,
    clipping: true,
    lights: true,
  });

  constructor() {
    super(30);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.engine && this.selectedPosition !== undefined && this.selectedValue !== undefined) {
      const p = this.engine.calculateScreenPosition(this.selectedPosition);
      ctx.font = `Normal ${24}px Arial`;
      ctx.fillStyle = 'rgba(200, 0, 0, 1)';

      ctx.fillText(`${this.selectedValue}`, p.x + 10, p.y);
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

      this.updateSelectedValue();

      this.engine.invalidOverlap();
      this.activePointMaterial.ReplaceAfterProjectMatrix(this.engine.afterProjectMatrix);
    }
  }

  private updateSelectedValue(pos: Vector3 | undefined = undefined, value: number | undefined = undefined) {
    if (this.engine && this.measurementRoot) {
      if (this.measurementRoot.children.length > 0) {
        const toDispose = this.measurementRoot.children[0] as Mesh;
        toDispose.geometry.dispose();
        this.measurementRoot.clear();
      }

      if (pos !== undefined) {
        const ball = new SphereGeometry(this.engine.maxDim / 300, 4, 4);
        const mesh = new Mesh(ball, this.activePointMaterial);
        mesh.translateX(pos.x);
        mesh.translateY(pos.y);
        mesh.translateZ(pos.z);
        this.measurementRoot.add(mesh);
      }

      this.selectedPosition = pos;
      this.selectedValue = value;
      this.engine.invalidOverlap();
    }
  }

  handleLeftButtonUp(event: PointerEvent, callback: IActionCallback): boolean {
    if (this.isEnabled) {
      const localCallback = callback;
      if (localCallback.state === STATE.NONE) {
        const detectScene = ValueDetectHelper.createDetectScene(callback.scene);
        const ret = callback.renderTargetAndReadFloat(
          detectScene,
          event.offsetX,
          event.offsetY,
          undefined,
          undefined,
          new Vector4(0, 0, 0, -1e38)
        );
        const value = ret[3];
        if (value > -1e10) {
          const pos = new Vector3(ret[0], ret[1], ret[2]);
          this.onHit(pos, value);
        }
      }
    }

    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private onHit(pos: Vector3, value: number): boolean {
    this.updateSelectedValue(pos, value);
    return true;
  }
}
