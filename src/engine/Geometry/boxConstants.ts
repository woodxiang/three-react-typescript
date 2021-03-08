import { Float32BufferAttribute, Uint16BufferAttribute } from 'three/src/core/BufferAttribute';
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

function getVerticeOfSurface(dir: Direction): Float32BufferAttribute {
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

export {
  vertices,
  normals,
  triangles,
  edges,
  edgesOnSurface,
  concatFloatAttribute,
  concatInt16Attribute,
  getVerticeOfSurface,
  getNormalOfSurface,
  getUVOfSurface,
};
