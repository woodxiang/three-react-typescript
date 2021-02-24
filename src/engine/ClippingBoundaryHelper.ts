import { LineSegments, Matrix4, Vector3 } from 'three';
import { LineBasicMaterial } from 'three/src/materials/LineBasicMaterial';
import { Group } from 'three/src/objects/Group';
import IdentityBoxBoundaryBufferGeometry from './Geometry/IdentityBoxBoundaryBufferGeometry';
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
      const line = new LineSegments(boundaryGeo, new LineBasicMaterial({ color: 'white' }));

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
