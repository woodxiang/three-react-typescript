import { Matrix4 } from 'three/src/math/Matrix4';

export default interface IAfterProject {
  readonly afterProjectMatrix: Matrix4;
  ReplaceAfterProjectMatrix(mat: Matrix4): void;
}
