import { Float32BufferAttribute, Uint16BufferAttribute } from 'three/src/core/BufferAttribute';
import { Vector2 } from 'three/src/math/Vector2';
import { Vector3 } from 'three/src/math/Vector3';
import { Direction } from '../interfaces';

/* eslint-disable prettier/prettier */
const vertices = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [1, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [0, 1, 1],
  [1, 1, 1],
];

const normals = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [-1, 0, 0],
  [0, -1, 0],
  [0, 0, -1],
];

const triangles = [
  [1, 3, 7], // x+
  [1, 7, 5],
  [2, 6, 7], // y+
  [2, 7, 3],
  [4, 5, 7], // z+
  [4, 7, 6],
  [0, 6, 2], // x-
  [0, 4, 6],
  [0, 1, 5], // y-
  [0, 5, 4],
  [0, 3, 1], // z-
  [0, 2, 3],
];

const uvs = [
  [3 / 4, 1 / 3], // x+
  [3 / 4, 2 / 3],
  [1 / 2, 2 / 3],

  [3 / 4, 1 / 3],
  [1 / 2, 2 / 3],
  [1 / 2, 1 / 3],

  [1 / 4, 1], // y+
  [1 / 4, 2 / 3],
  [1 / 2, 2 / 3],

  [1 / 4, 1],
  [1 / 2, 2 / 3],
  [1 / 2, 1],

  [1 / 4, 1 / 3], // z+
  [1 / 2, 1 / 3],
  [1 / 2, 2 / 3],

  [1 / 4, 1 / 3],
  [1 / 2, 2 / 3],
  [1 / 4, 2 / 3],

  [0, 1 / 3], // x-
  [1 / 4, 2 / 3],
  [0, 2 / 3],

  [0, 1 / 3],
  [1 / 4, 1 / 3],
  [1 / 4, 2 / 3],

  [1 / 4, 0], // y-
  [1 / 2, 0],
  [1 / 2, 1 / 3],

  [1 / 4, 0],
  [1 / 2, 1 / 3],
  [1 / 4, 1 / 3],

  [1, 1 / 3], // z-
  [3 / 4, 2 / 3],
  [3 / 4, 1 / 3],

  [1, 1 / 3],
  [1, 2 / 3],
  [3 / 4, 2 / 3],
];

const edges = [
  [0, 1], // 0 x
  [2, 3], // 1
  [4, 5], // 2
  [6, 7], // 3
  [0, 2], // 4 y
  [1, 3], // 5
  [4, 6], // 6
  [5, 7], // 7
  [0, 4], // 8 z
  [2, 6], // 9
  [1, 5], // 10
  [3, 7], // 11
];

const edgesOnSurface = [
  [5, 7, 10, 11], // x+
  [9, 11, 1, 3], // y+
  [2, 3, 7, 6], // z+
  [4, 6, 8, 9], // x-
  [8, 10, 0, 2], // y-
  [4, 5, 0, 1], // z-
];

function concatFloatAttribute(input: number[][], itemSize: number): Float32BufferAttribute {
  if (input.length === 0) {
    throw Error('argument empty');
  }
  const resultLength = input.length * input[0].length;
  if (resultLength === 0) {
    throw Error('argument empty');
  }
  const ret = new Array<number>(resultLength);
  let targetCursor = 0;
  for (let i = 0; i < input.length; i += 1) {
    ret.splice(targetCursor, input[i].length, ...input[i]);
    targetCursor += input[i].length;
  }

  return new Float32BufferAttribute(ret, itemSize);
}

function concatInt16Attribute(input: number[][], itemSize: number): Uint16BufferAttribute {
  if (input.length === 0) {
    throw Error('argument empty');
  }
  const resultLength = input.length * input[0].length;
  if (resultLength === 0) {
    throw Error('argument empty');
  }
  const ret = new Array<number>(resultLength);
  let targetCursor = 0;
  for (let i = 0; i < input.length; i += 1) {
    ret.splice(targetCursor, input[i].length, ...input[i]);
    targetCursor += input[i].length;
  }

  return new Uint16BufferAttribute(ret, itemSize);
}

function getVerticesOfSurface(dir: Direction): Float32BufferAttribute {
  let indexes: number[] = [];
  if (dir >= 0) {
    indexes = [...triangles[dir * 2], ...triangles[dir * 2 + 1]];
  } else {
    indexes = new Array<number>(3 * 12);
    for (let i = 0; i < 12; i += 1) {
      [indexes[i * 3], indexes[i * 3 + 1], indexes[i * 3 + 2]] = triangles[i];
    }
  }

  const ret = new Array<number>(indexes.length * 3);
  for (let i = 0; i < indexes.length; i += 1) {
    [ret[i * 3], ret[i * 3 + 1], ret[i * 3 + 2]] = vertices[indexes[i]];
  }

  return new Float32BufferAttribute(ret, 3);
}

function getNormalOfSurface(dir: Direction): Float32BufferAttribute {
  let dirs: number[];
  if (dir >= 0) {
    dirs = [dir];
  } else {
    dirs = [0, 1, 2, 3, 4, 5];
  }

  // copy 3*2 times for each direction.
  const ret = new Array<number>(dirs.length * 3 * 3 * 2);
  for (let i = 0; i < dirs.length; i += 1) {
    for (let j = 0; j < 6; j += 1) {
      [ret[(i * 6 + j) * 3], ret[(i * 6 + j) * 3 + 1], ret[(i * 6 + j) * 3 + 2]] = normals[dirs[i]];
    }
  }

  return new Float32BufferAttribute(ret, 3);
}

function getUVOfSurface(dir: Direction): Float32BufferAttribute {
  let dirs: number[];
  if (dir >= 0) {
    dirs = [dir];
  } else {
    dirs = [0, 1, 2, 3, 4, 5];
  }

  const ret = new Array<number>(dirs.length * 3 * 2 * 2);
  for (let index = 0; index < dirs.length; index += 1) {
    const srcIndex = dirs[index];

    for (let i = 0; i < 6; i += 1) {
      [ret[(index * 6 + i) * 2], ret[(index * 6 + i) * 2 + 1]] = uvs[srcIndex * 6 + i];
    }
  }

  return new Float32BufferAttribute(ret, 2);
}

function vec3ToNumberArray(input: Vector3[]): number[] {
  const ret = new Array<number>(input.length * 3);
  for (let i = 0; i < input.length; i += 1) {
    ret[i * 3 + 0] = input[i].x;
    ret[i * 3 + 1] = input[i].y;
    ret[i * 3 + 2] = input[i].z;
  }
  return ret;
}

function generateArrow(
  length: number,
  headLength: number,
  radius: number,
  headRadius: number,
  slidesNumber: number
): { position: Float32BufferAttribute; normal: Float32BufferAttribute } {
  const anchors = new Array<Vector2>(slidesNumber * 2);
  const step = Math.PI / slidesNumber;

  for (let i = 0; i < slidesNumber * 2; i += 1) {
    anchors[i] = new Vector2(Math.cos(step * i), Math.sin(step * i));
  }

  const stickAnchors = new Array<Vector2>(slidesNumber * 2);
  const headAnchors = new Array<Vector2>(slidesNumber * 2);
  for (let i = 0; i < slidesNumber * 2; i += 1) {
    stickAnchors[i] = anchors[i].clone().multiplyScalar(radius);
    headAnchors[i] = anchors[i].clone().multiplyScalar(headRadius);
  }

  const pos = new Array<Vector3>(slidesNumber * 5 * 3);
  const norm = new Array<Vector3>(slidesNumber * 5 * 3);

  let cursor = 0;
  // bottom
  for (let i = 0; i < slidesNumber; i += 1) {
    const v1 = stickAnchors[((i + 1) % slidesNumber) * 2];
    const v2 = stickAnchors[i * 2];

    pos[i * 3 + 0] = new Vector3(0, 0, 0);
    norm[i * 3 + 0] = new Vector3(0, 0, -1);
    pos[i * 3 + 1] = new Vector3(v1.x, v1.y, 0);
    norm[i * 3 + 1] = new Vector3(0, 0, -1);
    pos[i * 3 + 2] = new Vector3(v2.x, v2.y, 0);
    norm[i * 3 + 2] = new Vector3(0, 0, -1);
  }

  cursor += slidesNumber * 3;
  // stick side
  for (let i = 0; i < slidesNumber; i += 1) {
    const v1 = stickAnchors[i * 2];
    const v2 = stickAnchors[((i + 1) % slidesNumber) * 2];

    pos[cursor + i * 6 + 0] = new Vector3(v1.x, v1.y, 0);
    norm[cursor + i * 6 + 0] = new Vector3(v1.x, v1.y, 0);
    pos[cursor + i * 6 + 1] = new Vector3(v2.x, v2.y, 0);
    norm[cursor + i * 6 + 1] = new Vector3(v2.x, v2.y, 0);
    pos[cursor + i * 6 + 2] = new Vector3(v1.x, v1.y, length);
    norm[cursor + i * 6 + 2] = new Vector3(v1.x, v1.y, 0);

    pos[cursor + i * 6 + 3] = new Vector3(v2.x, v2.y, 0);
    norm[cursor + i * 6 + 3] = new Vector3(v2.x, v2.y, 0);
    pos[cursor + i * 6 + 4] = new Vector3(v2.x, v2.y, length);
    norm[cursor + i * 6 + 4] = new Vector3(v2.x, v2.y, 0);
    pos[cursor + i * 6 + 5] = new Vector3(v1.x, v1.y, length);
    norm[cursor + i * 6 + 5] = new Vector3(v1.x, v1.y, 0);
  }

  cursor += slidesNumber * 6;
  // head bottom
  for (let i = 0; i < slidesNumber; i += 1) {
    const v1 = headAnchors[i * 2];
    const v2 = headAnchors[((i + 1) % slidesNumber) * 2];
    pos[cursor + i * 3 + 0] = new Vector3(0, 0, length);
    norm[cursor + i * 3 + 0] = new Vector3(0, 0, -1);
    pos[cursor + i * 3 + 1] = new Vector3(v2.x, v2.y, length);
    norm[cursor + i * 3 + 1] = new Vector3(0, 0, -1);
    pos[cursor + i * 3 + 2] = new Vector3(v1.x, v1.y, length);
    norm[cursor + i * 3 + 2] = new Vector3(0, 0, -1);
  }

  cursor += slidesNumber * 3;

  const z = (headRadius * headRadius) / headLength;
  // head slopes
  for (let i = 0; i < slidesNumber; i += 1) {
    const v1 = headAnchors[i * 2];
    const v2 = headAnchors[(i * 2 + 1) % (slidesNumber * 2)];
    const v3 = headAnchors[((i + 1) % slidesNumber) * 2];

    pos[cursor + i * 3 + 0] = new Vector3(0, 0, length + headLength);
    norm[cursor + i * 3 + 0] = new Vector3(v2.x, v2.y, z);
    pos[cursor + i * 3 + 1] = new Vector3(v1.x, v1.y, length);
    norm[cursor + i * 3 + 1] = new Vector3(v1.x, v1.y, z);
    pos[cursor + i * 3 + 2] = new Vector3(v3.x, v3.y, length);
    norm[cursor + i * 3 + 2] = new Vector3(v3.x, v3.y, z);
  }

  const posAttribute = new Float32BufferAttribute(vec3ToNumberArray(pos), 3);
  const normAttribute = new Float32BufferAttribute(vec3ToNumberArray(norm), 3);

  return { position: posAttribute, normal: normAttribute };
}

export {
  vertices,
  normals,
  triangles,
  edges,
  edgesOnSurface,
  concatFloatAttribute,
  concatInt16Attribute,
  getVerticesOfSurface,
  getNormalOfSurface,
  getUVOfSurface,
  generateArrow,
};
