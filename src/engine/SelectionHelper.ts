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
 */
export default class SelectionHelper {
  static error = 0.0001;

  /**
   * Select a connected plane from a geometry.
   * @param geo input BufferGeomety
   * @param selectedTriangleIndex index of the selected triangle
   */
  public static findConnectedFacesInPlane(geo: BufferGeometry, selectedTriangleIndex: number): number[] {
    const positions = <BufferAttribute>geo.getAttribute('position');
    if (!positions) {
      throw Error('no postion.');
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
        if (d < 1 + SelectionHelper.error && d > 1 - SelectionHelper.error) {
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
    if (cosAngle < 1 - SelectionHelper.error) {
      let axis = new Vector3(0, 1, 0);
      let angle = Math.PI;
      if (cosAngle > -1 + SelectionHelper.error) {
        axis = selectedTriangleNormal.cross(new Vector3(0, 0, 1));
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
      if (Math.abs(currentZ - z) < SelectionHelper.error) {
        zFilteredTrianglesIndex.push(index);
      }
    });

    const tmpList: number[] = [];

    tmpList.push(selectedTriangleIndex);
    const adjencedTriangles: number[] = [];

    while (tmpList.length > 0) {
      const current = tmpList.pop();
      if (current) {
        const currentFace = SelectionHelper.getFace(positions, current);

        const toRemove: number[] = [];
        zFilteredTrianglesIndex.forEach((index) => {
          const itFace = SelectionHelper.getFace(positions, index);
          if (SelectionHelper.areTrianglesAdjencent(currentFace, itFace)) {
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

    adjencedTriangles.sort((v1, v2) => v1 - v2);

    return adjencedTriangles;
  }

  /**
   * make specified triangles display in other materials.
   * @param geo geo to update
   * @param indexes triangle indexes to display in specified material index
   * @param materialIndex specified material index.
   */
  public static AddGroup(geo: BufferGeometry, indexes: number[], materialIndex: number): void {
    if (!geo.index) {
      SelectionHelper.initIndexFromPositionAttribute(geo);
    }
    SelectionHelper.groupIndexes(geo, indexes, materialIndex);
  }

  /**
   * Remove group include specified triangle.
   * @param geo geometry to update
   * @param index the first triangle index.
   */
  public static RemoveGroup(geo: BufferGeometry, index: number): void {
    if (!geo.index) {
      throw Error('no indexes');
    }

    if (geo.groups.length < 2) {
      throw Error('no extra group to remove');
    }

    // find the group index.
    const currentIndex = <BufferAttribute>geo.index;

    let idxGroup = 0;
    for (; idxGroup < geo.groups.length; idxGroup += 1) {
      if (currentIndex.array[geo.groups[idxGroup].start] === index * 3) break;
    }

    if (idxGroup === 0) {
      throw Error('not in another group.');
    }
    if (idxGroup === geo.groups.length) {
      throw Error('invalid index');
    }

    SelectionHelper.mergeGroup(geo, 0, idxGroup);
  }

  /**
   * merge triangles in source group to target group.
   * @param geo geometry to operate.
   * @param targetGroupIndex target group to merge.
   * @param sourceGroupIndex source group to merge
   */
  private static mergeGroup(geo: BufferGeometry, targetGroupIndex: number, sourceGroupIndex: number): void {
    if (!geo.index) {
      throw Error('no index channel.');
    }
    if (geo.groups.length <= targetGroupIndex || geo.groups.length <= sourceGroupIndex) {
      throw Error('invalid group index.');
    }

    const indexBufferAttribute = <BufferAttribute>geo.index;

    const srcGroup = geo.groups[sourceGroupIndex];

    // save the source group in temp array.
    const tmpArray = new Array<number>(srcGroup.count);
    SelectionHelper.copyArray(indexBufferAttribute.array, srcGroup.start, tmpArray, 0, srcGroup.count);

    const targetGroup = geo.groups[targetGroupIndex];
    if (targetGroup.start < srcGroup.start) {
      // target group is ahead source group. move
      SelectionHelper.moveInBufferAttribute(
        indexBufferAttribute,
        targetGroup.start + targetGroup.count,
        targetGroup.start + targetGroup.count + srcGroup.count,
        srcGroup.start - targetGroup.start - targetGroup.count
      );
      SelectionHelper.mergeIntoBufferAttribute(
        indexBufferAttribute,
        targetGroup.start,
        targetGroup.count,
        targetGroup.start,
        tmpArray,
        0,
        srcGroup.count
      );
    } else {
      SelectionHelper.moveInBufferAttribute(
        indexBufferAttribute,
        srcGroup.start + srcGroup.count,
        srcGroup.start,
        srcGroup.start + srcGroup.count - targetGroup.start
      );
      SelectionHelper.mergeIntoBufferAttribute(
        indexBufferAttribute,
        targetGroup.start,
        targetGroup.count,
        targetGroup.start - srcGroup.count,
        tmpArray,
        0,
        srcGroup.count
      );
    }
  }

  /**
   *
   * @param targetBuf target bufferAttribute to operate on.
   * @param originStart postion of source1(on target buffer) to merge.
   * @param originLength length of source1
   * @param targetStart postion of target (on target buffer)
   * @param srcArray source 2 array
   * @param srcStart position on source 2
   * @param count count of source 2.
   */
  private static mergeIntoBufferAttribute(
    targetBuf: BufferAttribute,
    originStart: number,
    originLength: number,
    targetStart: number,
    srcArray: Array<number>,
    srcStart: number,
    count: number
  ) {
    if (originStart > targetStart) {
      // merge from begin to end
      let targetCursor = targetStart;
      let originCursor = originStart;
      let srcCursor = srcStart;
      while (targetCursor < targetStart + originLength + count) {
        if (srcArray[srcCursor] < targetBuf.array[originCursor]) {
          targetBuf.setX(targetCursor, srcArray[srcCursor]);
          srcCursor += 1;
        } else {
          targetBuf.setX(targetCursor, targetBuf.array[originCursor]);
          originCursor += 1;
        }

        targetCursor += 1;
      }
    } else {
      // merge from end to begin
      let targetCursor = targetStart + originLength + count - 1;
      let originCursor = originStart + originLength - 1;
      let srcCursor = srcStart + count - 1;
      while (targetCursor >= targetStart) {
        if (srcArray[srcCursor] > targetBuf.array[originCursor]) {
          targetBuf.setX(targetCursor, srcArray[srcCursor]);
          srcCursor -= 1;
        } else {
          targetBuf.setX(targetCursor, targetBuf.array[originCursor]);
          originCursor -= 1;
        }

        targetCursor -= 1;
      }
    }
  }

  /**
   * move items in bufferAttribute.
   * @param buf buf to move
   * @param srcStart position on source to move.
   * @param targetStart target postion to move
   * @param count number of item to move.
   */
  private static moveInBufferAttribute(
    buf: BufferAttribute,
    srcStart: number,
    targetStart: number,
    count: number
  ): void {
    const t = buf;
    if (srcStart > targetStart && srcStart <= targetStart + count) {
      // reverse copy to avoid overlap.
      for (let i = count - 1; i >= 0; i -= 1) {
        t.setX(targetStart + i, t.array[srcStart + i]);
      }
    } else {
      for (let i = 0; i < count; i += 1) {
        t.setX(targetStart + i, t.array[srcStart + i]);
      }
    }
  }

  /**
   * copy from ArrayLike to Array.
   * @param src source array
   * @param srcStart source start
   * @param target target array
   * @param targetStart target start
   * @param count count to copy
   */
  private static copyArray(
    src: ArrayLike<number>,
    srcStart: number,
    target: Array<number>,
    targetStart: number,
    count: number
  ): void {
    const t = target;
    if (src === target && srcStart > targetStart && srcStart <= targetStart + count) {
      // reverse copy to avoid overlap.
      for (let i = count - 1; i >= 0; i -= 1) {
        t[targetStart + i] = src[srcStart + i];
      }
    } else {
      for (let i = 0; i < count; i += 1) {
        t[targetStart + i] = src[srcStart + i];
      }
    }
  }

  /**
   * initialize a index array from position.
   * @param geo geo to init a index.
   */
  public static initIndexFromPositionAttribute(geo: BufferGeometry): void {
    const positions = geo.getAttribute('position');

    if (!positions) {
      throw Error('no position attribute.');
    }
    const pointCount = positions.count;
    const tmp = new Array(pointCount);
    for (let i = 0; i < pointCount; i += 1) {
      tmp[i] = i;
    }
    geo.setIndex(tmp);
  }

  public static clearIndexes(parent: Object3D): void {
    parent.children.forEach((child) => {
      if (child instanceof Group) {
        this.clearIndexes(<Group>child);
      } else {
        const mesh = <Mesh>child;
        const geo = <BufferGeometry>mesh.geometry;
        geo.setIndex(null);
        geo.clearGroups();
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

  /**
   * group specified triangles and display in different material.
   * @param geo the buffer geometry to update
   * @param indexes specify the indexes of the triangles to group
   * @param materialIndex specify the material index to display the triangles.
   */
  private static groupIndexes(geo: BufferGeometry, indexes: number[], materialIndex: number) {
    const oldIndex32 = <BufferAttribute>(<unknown>geo.index);
    if (!oldIndex32) {
      throw Error('unexpected null index.');
    }
    let srcIndex = 0;
    let destIndex = 0;
    let compIndex = 0;
    while (srcIndex < oldIndex32.count) {
      if (oldIndex32.array[srcIndex] === indexes[compIndex] * 3) {
        compIndex += 1;
      } else {
        if (destIndex !== srcIndex) {
          oldIndex32.setXYZ(
            destIndex,
            oldIndex32.array[srcIndex],
            oldIndex32.array[srcIndex + 1],
            oldIndex32.array[srcIndex + 2]
          );
        }
        destIndex += 3;
      }

      srcIndex += 3;
    }

    compIndex = 0;
    while (destIndex < oldIndex32.count) {
      oldIndex32.setXYZ(destIndex, indexes[compIndex] * 3, indexes[compIndex] * 3 + 1, indexes[compIndex] * 3 + 2);
      destIndex += 3;
      compIndex += 1;
    }

    // also move the group indexes.
    if (geo.groups.length === 0) {
      // if no groups yet.
      geo.addGroup(0, oldIndex32.count - indexes.length * 3);
    } else {
      const headGroup = geo.groups[0];
      headGroup.count -= indexes.length * 3;

      for (let i = 1; i < geo.groups.length; i += 1) {
        const currentGroup = geo.groups[i];
        currentGroup.start -= indexes.length * 3;
      }
    }
    geo.addGroup(oldIndex32.count - indexes.length * 3, indexes.length * 3, materialIndex);
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

  private static areTrianglesAdjencent(face1: Triangle, face2: Triangle): boolean {
    const dirsInTriangle1 = this.getTriangleEdgeDirs(face1);
    const dirsInTriangle2 = this.getTriangleEdgeDirs(face2);
    for (let i = 0; i < 3; i += 1) {
      const l1p1 = this.getTriangleVert(face1, i);
      const l1p2 = this.getTriangleVert(face1, (i + 1) % 3);

      for (let j = 0; j < 3; j += 1) {
        if (
          1 - Math.abs(this.getTriangleVert(dirsInTriangle1, i).dot(this.getTriangleVert(dirsInTriangle2, j))) <
          SelectionHelper.error
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
            1 - Math.abs(f1) < SelectionHelper.error &&
            1 - Math.abs(f2) < SelectionHelper.error &&
            Math.abs(f1 + f2) < SelectionHelper.error
          )
            return true;
        }
      }
    }

    return false;
  }
}
