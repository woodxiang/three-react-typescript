import { BufferAttribute } from 'three/src/core/BufferAttribute';
import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { Matrix4 } from 'three/src/math/Matrix4';
import { Triangle } from 'three/src/math/Triangle';
import { Vector3 } from 'three/src/math/Vector3';

export default class GeoHelper {
  static error = 0.0001;

  /**
   * Select a connected plane from a geometry.
   * @param geo input BufferGeomety
   * @param selectedTriangleIndex index of the selected triangle
   */
  public static selectFace(geo: BufferGeometry, selectedTriangleIndex: number): number[] {
    const positions = <BufferAttribute>geo.getAttribute('position');
    if (!positions) {
      throw Error('no postion.');
    }
    const normals = <BufferAttribute>geo.getAttribute('normal');
    if (!normals) {
      throw Error('no normals');
    }
    const indexes = geo.getIndex();
    const selectedFaceVertexIndexes = new Vector3();
    if (!indexes) {
      selectedFaceVertexIndexes.x = selectedTriangleIndex * 3;
      selectedFaceVertexIndexes.y = selectedTriangleIndex * 3 + 1;
      selectedFaceVertexIndexes.z = selectedTriangleIndex * 3 + 2;
    } else {
      selectedFaceVertexIndexes.fromBufferAttribute(indexes, selectedTriangleIndex);
    }

    // filter all the triangles with same normal exclude current selected one
    const triangleCount = positions.count / 3;
    const normalFilteredTrianglesIndex: number[] = [];
    const selectedTriangleNormal = new Vector3();
    selectedTriangleNormal.fromBufferAttribute(normals, selectedFaceVertexIndexes.x);

    const currentTriangleNormal = new Vector3();
    for (let i = 0; i < triangleCount; i += 1) {
      if (i !== selectedTriangleIndex) {
        const currentFaceVertexIndexes = new Vector3(i * 3, i * 3 + 1, i * 3 + 2);

        currentTriangleNormal.fromBufferAttribute(normals, currentFaceVertexIndexes.x);

        const d = currentTriangleNormal.dot(selectedTriangleNormal);
        if (d < 1 + GeoHelper.error && d > 1 - GeoHelper.error) {
          normalFilteredTrianglesIndex.push(i);
        }
      }
    }

    // filter the triangles in same plane,
    // rotate the selected normal to (0, 0, 1)
    selectedTriangleNormal.normalize();

    const selectedTrianglePosition = new Vector3();
    selectedTrianglePosition.fromBufferAttribute(positions, selectedFaceVertexIndexes.x);

    let { z } = selectedTrianglePosition;

    const cosAngle = selectedTriangleNormal.dot(new Vector3(0, 0, 1));
    const mat = new Matrix4();
    if (cosAngle < 1 - GeoHelper.error) {
      let axis = new Vector3(0, 1, 0);
      let angle = Math.PI;
      if (cosAngle > -1 + GeoHelper.error) {
        axis = selectedTriangleNormal.cross(new Vector3(0, 0, 1));
        angle = Math.sin(axis.length());
      }

      mat.makeRotationAxis(axis, angle);

      z = selectedTrianglePosition.clone().applyMatrix4(mat).z;
    }

    let zFilteredTrianglesIndex: number[] = [];

    normalFilteredTrianglesIndex.forEach((index) => {
      const currentTrianglePosition = new Vector3();
      currentTrianglePosition.fromBufferAttribute(positions, indexes ? indexes.getX(index) : index * 3);
      const currentZ = currentTrianglePosition.applyMatrix4(mat).z;
      if (Math.abs(currentZ - z) < GeoHelper.error) {
        zFilteredTrianglesIndex.push(index);
      }
    });

    const tmpList: number[] = [];

    tmpList.push(selectedTriangleIndex);
    const adjencedTriangles: number[] = [];

    while (tmpList.length > 0) {
      const current = tmpList.pop();
      if (current) {
        const currentFace = GeoHelper.getFace(positions, indexes, current);

        const toRemove: number[] = [];
        zFilteredTrianglesIndex.forEach((index) => {
          const itFace = GeoHelper.getFace(positions, indexes, index);
          if (GeoHelper.areTrianglesAdjencent(currentFace, itFace)) {
            toRemove.push(index);
            tmpList.push(index);
          }
        });

        zFilteredTrianglesIndex = zFilteredTrianglesIndex.filter((index) => {
          return toRemove.indexOf(index) < 0;
        });
        adjencedTriangles.push(current);
      }
    }

    return adjencedTriangles;
  }

  private static getFace(positions: BufferAttribute, indexes: BufferAttribute | null, current: number): Triangle {
    const currentFace = new Triangle();
    currentFace.a.fromBufferAttribute(positions, indexes ? indexes.getX(current) : current * 3);
    currentFace.b.fromBufferAttribute(positions, indexes ? indexes.getY(current) : current * 3 + 1);
    currentFace.c.fromBufferAttribute(positions, indexes ? indexes.getZ(current) : current * 3 + 2);
    return currentFace;
  }

  static getTriangleEdgeDirs(face: Triangle): Triangle {
    const ret = new Triangle();
    ret.a.subVectors(face.b, face.a).normalize();
    ret.b.subVectors(face.c, face.b).normalize();
    ret.c.subVectors(face.a, face.c).normalize();
    return ret;
  }

  static getTriangleVert(face: Triangle, index: number): Vector3 {
    switch (index) {
      case 0:
        return face.a;
      case 1:
        return face.b;
      case 2:
        return face.c;
      default:
        throw Error('invalid index.');
    }
  }

  static areTrianglesAdjencent(face1: Triangle, face2: Triangle): boolean {
    const dirsInTriangle1 = this.getTriangleEdgeDirs(face1);
    const dirsInTriangle2 = this.getTriangleEdgeDirs(face2);
    for (let i = 0; i < 3; i += 1) {
      const l1p1 = this.getTriangleVert(face1, i);
      const l1p2 = this.getTriangleVert(face1, (i + 1) % 3);

      for (let j = 0; j < 3; j += 1) {
        if (
          1 - Math.abs(this.getTriangleVert(dirsInTriangle1, i).dot(this.getTriangleVert(dirsInTriangle2, j))) <
          GeoHelper.error
        ) {
          const l2p1 = this.getTriangleVert(face2, j);
          const l2p2 = this.getTriangleVert(face2, (j + 1) % 3);
          const crosses: Vector3[] = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];
          crosses[0].subVectors(l2p1, l1p1).normalize();
          crosses[1].subVectors(l2p2, l1p1).normalize();
          crosses[2].subVectors(l2p1, l1p2).normalize();
          crosses[3].subVectors(l2p2, l1p2).normalize();
          const f1 = crosses[0].dot(crosses[1]);
          const f2 = crosses[2].dot(crosses[3]);
          if (f1 === 0 && f2 === 0) {
            return true;
          }
          if (f1 === 0 && f2 < 0) {
            return true;
          }
          if (f2 === 0 && f1 < 0) {
            return true;
          }
          if (
            1 - Math.abs(f1) < GeoHelper.error &&
            1 - Math.abs(f2) < GeoHelper.error &&
            Math.abs(f1 + f2) < GeoHelper.error
          )
            return true;
        }
      }
    }

    return false;
  }
}
