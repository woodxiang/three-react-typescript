import { BufferAttribute } from 'three/src/core/BufferAttribute';
import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { Object3D } from 'three/src/core/Object3D';
import { Matrix4 } from 'three/src/math/Matrix4';
import { Triangle } from 'three/src/math/Triangle';
import { Vector3 } from 'three/src/math/Vector3';
import { Group } from 'three/src/objects/Group';
import { Mesh } from 'three/src/objects/Mesh';

/**
 * This helper class is use to help calculate connected flats
 * Tips the attributes can not update in place because when it compare
 * with cache it only compare the object reference.
 * REMARK: all this functions assume the geometry is not indexed.
 */
export default class SelectionHelper {
  private wrappedErrorRate = 0.001;

  private error = 0.001;

  private maxSize = 1;

  public get errorRate(): number {
    return this.wrappedErrorRate;
  }

  public set errorRate(newRate: number) {
    this.wrappedErrorRate = newRate;
    this.error = this.wrappedErrorRate * this.maxSize;
  }

  public setMaxSize(newMaxSize: number): void {
    this.maxSize = newMaxSize;
    this.error = this.wrappedErrorRate * this.maxSize;
  }

  /**
   * calculate the volume of specified geometry
   * @param geo the geometry to calculate
   */
  public static calculateGeometryVolume(geo: BufferGeometry): number {
    const { position } = geo.attributes;
    const faces = position.count / 3;
    let sum = 0;
    const p1 = new Vector3();
    const p2 = new Vector3();
    const p3 = new Vector3();
    for (let i = 0; i < faces; i += 1) {
      p1.fromBufferAttribute(position, i * 3 + 0);
      p2.fromBufferAttribute(position, i * 3 + 1);
      p3.fromBufferAttribute(position, i * 3 + 2);
      sum += p1.dot(p2.cross(p3)) / 6.0;
    }
    return sum;
  }

  /**
   * Select a connected flat from a geometry.
   * @param geo input BufferGeometry
   * @param selectedTriangleIndex index of the selected triangle
   */
  public findFlatByFace(
    geo: BufferGeometry,
    selectedTriangleIndex: number
  ): {
    faceIndexes: number[];
    normal: Vector3;
    area: number;
  } {
    const positions = <BufferAttribute>geo.getAttribute('position');
    if (!positions) {
      throw Error('no position.');
    }
    const normals = <BufferAttribute>geo.getAttribute('normal');
    if (!normals) {
      throw Error('no normals');
    }
    const selectedFaceVertexIndexes = new Vector3();
    selectedFaceVertexIndexes.x = selectedTriangleIndex * 3;
    selectedFaceVertexIndexes.y = selectedTriangleIndex * 3 + 1;
    selectedFaceVertexIndexes.z = selectedTriangleIndex * 3 + 2;

    // filter all the triangles with same normal exclude current selected one
    const triangleCount = positions.count / 3;
    const normalFilteredTrianglesIndex: number[] = [];
    const selectedTriangleNormal = new Vector3();
    selectedTriangleNormal.fromBufferAttribute(normals, selectedFaceVertexIndexes.x);
    selectedTriangleNormal.normalize();

    const currentTriangleNormal = new Vector3();
    for (let i = 0; i < triangleCount; i += 1) {
      if (i !== selectedTriangleIndex) {
        const currentFaceVertexIndexes = new Vector3(i * 3, i * 3 + 1, i * 3 + 2);

        currentTriangleNormal.fromBufferAttribute(normals, currentFaceVertexIndexes.x);
        currentTriangleNormal.normalize();
        const d = currentTriangleNormal.dot(selectedTriangleNormal);
        if (d < 1 + this.wrappedErrorRate && d > 1 - this.wrappedErrorRate) {
          normalFilteredTrianglesIndex.push(i);
        }
      }
    }

    // filter the triangles in same flat,
    // rotate the selected normal to (0, 0, 1)
    selectedTriangleNormal.normalize();

    const selectedTrianglePosition = new Vector3();
    selectedTrianglePosition.fromBufferAttribute(positions, selectedFaceVertexIndexes.x);

    let { z } = selectedTrianglePosition;

    const cosAngle = selectedTriangleNormal.dot(new Vector3(0, 0, 1));
    const mat = new Matrix4();
    if (cosAngle < 1 - this.wrappedErrorRate) {
      let axis = new Vector3(0, 1, 0);
      let angle = Math.PI;
      if (cosAngle > -1 + this.wrappedErrorRate) {
        axis = selectedTriangleNormal.clone().cross(new Vector3(0, 0, 1));
        angle = Math.asin(axis.length());
      }

      mat.makeRotationAxis(axis.normalize(), angle);

      z = selectedTrianglePosition.clone().applyMatrix4(mat).z;
    }

    let zFilteredTrianglesIndex: number[] = [];

    normalFilteredTrianglesIndex.forEach((index) => {
      const currentTrianglePosition = new Vector3();
      currentTrianglePosition.fromBufferAttribute(positions, index * 3);
      const currentZ = currentTrianglePosition.applyMatrix4(mat).z;
      if (Math.abs(currentZ - z) < this.error) {
        zFilteredTrianglesIndex.push(index);
      }
    });

    const tmpList: number[] = [];

    tmpList.push(selectedTriangleIndex);
    const adjacentTriangles: number[] = [];

    while (tmpList.length > 0) {
      const current = tmpList.pop();
      if (current !== undefined) {
        const currentFace = SelectionHelper.getFace(positions, current);

        const toRemove: number[] = [];
        zFilteredTrianglesIndex.forEach((index) => {
          const itFace = SelectionHelper.getFace(positions, index);
          if (this.areTrianglesAdjacent(currentFace, itFace)) {
            toRemove.push(index);
            tmpList.push(index);
          }
        });

        zFilteredTrianglesIndex = zFilteredTrianglesIndex.filter((index) => {
          return toRemove.indexOf(index) < 0;
        });
        adjacentTriangles.push(current);
      }
    }

    adjacentTriangles.sort((v1, v2) => v1 - v2);

    let area = 0.0;
    adjacentTriangles.forEach((index) => {
      const itFace = SelectionHelper.getFace(positions, index);
      area += itFace.getArea();
    });

    return { faceIndexes: adjacentTriangles, normal: selectedTriangleNormal, area };
  }

  public static updateGroups(
    geo: BufferGeometry,
    defaultMaterialIndex: number,
    inactiveFaces: { faces: number[]; materialIndex: number },
    activeFaces: { faces: number[]; materialIndex: number }
  ): void {
    const positions = <BufferAttribute>geo.getAttribute('position');
    if (!positions) {
      throw Error('no position.');
    }

    if (positions.count < (inactiveFaces.faces.length + activeFaces.faces.length) * 3) {
      throw Error('invalid argument');
    }

    if (inactiveFaces.faces.length + activeFaces.faces.length === 0) {
      // if no inactive and active faces, clear the index and group.
      SelectionHelper.resetGeometryGroups(geo);
      return;
    }

    const indexes = new Array<number>(positions.count);

    const selectedFaces = inactiveFaces.faces.concat(activeFaces.faces);
    selectedFaces.sort((a, b) => a - b);

    let targetCursor = 0;
    let selectedFacesCursor = 0;
    for (let i = 0; i < positions.count; i += 3) {
      if (Math.floor(i / 3) === selectedFaces[selectedFacesCursor]) {
        selectedFacesCursor += 1;
      } else {
        indexes[targetCursor] = i;
        indexes[targetCursor + 1] = i + 1;
        indexes[targetCursor + 2] = i + 2;

        targetCursor += 3;
      }
    }

    for (let i = 0; i < inactiveFaces.faces.length; i += 1) {
      indexes[targetCursor] = inactiveFaces.faces[i] * 3;
      indexes[targetCursor + 1] = inactiveFaces.faces[i] * 3 + 1;
      indexes[targetCursor + 2] = inactiveFaces.faces[i] * 3 + 2;
      targetCursor += 3;
    }

    for (let i = 0; i < activeFaces.faces.length; i += 1) {
      indexes[targetCursor] = activeFaces.faces[i] * 3;
      indexes[targetCursor + 1] = activeFaces.faces[i] * 3 + 1;
      indexes[targetCursor + 2] = activeFaces.faces[i] * 3 + 2;
      targetCursor += 3;
    }

    geo.clearGroups();
    geo.setIndex(indexes);
    const g1Count = positions.count - inactiveFaces.faces.length * 3 - activeFaces.faces.length * 3;
    if (g1Count > 0) {
      geo.addGroup(0, g1Count, defaultMaterialIndex);
    }
    if (inactiveFaces.faces.length > 0) {
      geo.addGroup(g1Count, inactiveFaces.faces.length * 3, inactiveFaces.materialIndex);
    }
    if (activeFaces.faces.length > 0) {
      geo.addGroup(g1Count + inactiveFaces.faces.length * 3, activeFaces.faces.length * 3, activeFaces.materialIndex);
    }
  }

  public static resetGeometryGroups(geo: BufferGeometry): void {
    geo.setIndex(null);
    geo.clearGroups();
    const positions = <BufferAttribute>geo.getAttribute('position');
    if (!positions) {
      throw Error('no position.');
    }
    geo.addGroup(0, positions.count, 0);
  }

  public static clearIndexes(parent: Object3D): void {
    parent.children.forEach((child: Object3D) => {
      if (child instanceof Group) {
        this.clearIndexes(<Group>child);
      } else {
        const mesh = <Mesh>child;

        const geo = mesh.geometry as BufferGeometry;
        if (geo) {
          this.resetGeometryGroups(geo);
        }
      }
    });
  }

  private static getFace(positions: BufferAttribute, current: number): Triangle {
    const currentFace = new Triangle();
    currentFace.a.fromBufferAttribute(positions, current * 3);
    currentFace.b.fromBufferAttribute(positions, current * 3 + 1);
    currentFace.c.fromBufferAttribute(positions, current * 3 + 2);
    return currentFace;
  }

  private static getTriangleEdgeDirs(face: Triangle): Triangle {
    const ret = new Triangle();
    ret.a.subVectors(face.b, face.a).normalize();
    ret.b.subVectors(face.c, face.b).normalize();
    ret.c.subVectors(face.a, face.c).normalize();
    return ret;
  }

  private static getTriangleVert(face: Triangle, index: number): Vector3 {
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

  private areTrianglesAdjacent(face1: Triangle, face2: Triangle): boolean {
    const dirsInTriangle1 = SelectionHelper.getTriangleEdgeDirs(face1);
    const dirsInTriangle2 = SelectionHelper.getTriangleEdgeDirs(face2);
    for (let i = 0; i < 3; i += 1) {
      const l1p1 = SelectionHelper.getTriangleVert(face1, i);
      const l1p2 = SelectionHelper.getTriangleVert(face1, (i + 1) % 3);

      for (let j = 0; j < 3; j += 1) {
        if (
          1 -
            Math.abs(
              SelectionHelper.getTriangleVert(dirsInTriangle1, i).dot(
                SelectionHelper.getTriangleVert(dirsInTriangle2, j)
              )
            ) <
          this.wrappedErrorRate
        ) {
          const l2p1 = SelectionHelper.getTriangleVert(face2, j);
          const l2p2 = SelectionHelper.getTriangleVert(face2, (j + 1) % 3);
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
            1 - Math.abs(f1) < this.wrappedErrorRate &&
            1 - Math.abs(f2) < this.wrappedErrorRate &&
            Math.abs(f1 + f2) < this.wrappedErrorRate
          )
            return true;
        }
      }
    }

    return false;
  }
}
