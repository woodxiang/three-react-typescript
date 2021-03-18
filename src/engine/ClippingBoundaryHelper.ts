import { Color } from 'three/src/math/Color';
import { Matrix4 } from 'three/src/math/Matrix4';
import { Vector3 } from 'three/src/math/Vector3';
import { Group } from 'three/src/objects/Group';
import { LineSegments } from 'three/src/objects/LineSegments';
import IdentityBoxBoundaryBufferGeometry from './Geometry/IdentityBoxBoundaryBufferGeometry';
import LineBasicExMaterial from './Materials/LineBasicExMaterial';
import RenderingEngine from './RenderingEngine';

/**
 * Helper class to display clipping boundary.
 */
export default class ClippingBoundaryHelper {
  private static clippingBoundaryName = '#clippingBoundary#';

  private engine: RenderingEngine | undefined;

  private clippingBoundary = new Group();

  constructor() {
    this.clippingBoundary.name = ClippingBoundaryHelper.clippingBoundaryName;
  }

  set visible(visible: boolean) {
    this.clippingBoundary.visible = visible;
  }

  get visible(): boolean {
    return this.clippingBoundary.visible;
  }

  public bind(engine: RenderingEngine | undefined): void {
    if (this.engine === engine) {
      return;
    }

    if (this.engine) {
      const index = this.engine.root.children.indexOf(this.clippingBoundary);
      this.engine.root.children.splice(index, 1);
      this.clippingBoundary.clear();
    }

    this.engine = engine;

    if (this.engine) {
      const { root } = this.engine;

      if (!root) {
        throw Error('invalid root');
      }

      root.add(this.clippingBoundary);
      const boundaryGeo = new IdentityBoxBoundaryBufferGeometry();
      const line = new LineSegments(
        boundaryGeo,
        new LineBasicExMaterial({ diffuse: new Color('white'), afterProjectMatrix: this.engine.afterProjectMatrix })
      );

      this.clippingBoundary.add(line);
    }
  }

  public update(range: number[]): void {
    const matrix = new Matrix4();
    matrix.scale(new Vector3(range[0] - range[3], range[1] - range[4], range[2] - range[5]));
    matrix.setPosition(new Vector3(range[3], range[4], range[5]));

    this.clippingBoundary.matrix = matrix;
    this.clippingBoundary.matrixAutoUpdate = false;
  }
}
