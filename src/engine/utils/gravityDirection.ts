import { Matrix4, Matrix4Tuple } from 'three/src/math/Matrix4';
// 定义重力方向

// 重力方向
//   <Option value={61}>X+</Option>
//   <Option value={62}>X-</Option>
//   <Option value={63}>Y+</Option>
//   <Option value={64}>Y-</Option>
//   <Option value={65}>Z+</Option>
//   <Option value={66}>Z-</Option>

function getColumn(dir: 'x' | '-x' | 'y' | '-y' | 'z' | '-z'): Array<number> {
  if (dir === 'x') {
    return [1, 0, 0];
  }
  if (dir === '-x') {
    return [-1, 0, 0];
  }
  if (dir === 'y') {
    return [0, 1, 0];
  }
  if (dir === '-y') {
    return [0, -1, 0];
  }
  if (dir === 'z') {
    return [0, 0, 1];
  }
  if (dir === '-z') {
    return [0, 0, -1];
  }
  return [0, 0, 0];
}

function getDirection(direction = ['x', 'y', 'z']): Matrix4Tuple {
  let columns = [];
  direction.forEach((item, index) => {
    columns = columns.concat([...getColumn(direction[index] as 'x' | '-x' | 'y' | '-y' | 'z' | '-z'), 0]);
  });
  columns = columns.concat([0, 0, 0, 1]);
  return columns as Matrix4Tuple;
}

const getGravityDirection = (
  direction: number,
  normal: { normalX: number; normalY: number; normalZ: number }
): Matrix4 => {
  let materix4 = new Matrix4();
  switch (direction) {
    case 61:
      materix4 = materix4.makeRotationZ(-Math.PI / 2);
      if (normal.normalY > 0) materix4.set(...getDirection(['-z', '-x', 'y']));
      if (normal.normalY < 0) materix4.set(...getDirection(['z', '-x', '-y']));
      if (normal.normalZ > 0) materix4.set(...getDirection(['-y', '-x', '-z']));
      break;
    case 62:
      materix4 = materix4.makeRotationZ(Math.PI / 2);
      if (normal.normalY > 0) materix4.set(...getDirection(['z', 'x', 'y']));
      if (normal.normalY < 0) materix4.set(...getDirection(['-z', 'x', '-y']));
      if (normal.normalZ < 0) materix4.set(...getDirection(['y', 'x', '-z']));
      break;
    case 63:
      materix4 = materix4.makeRotationZ(Math.PI);
      if (normal.normalX > 0) materix4.set(...getDirection(['z', '-y', 'x']));
      if (normal.normalX < 0) materix4.set(...getDirection(['-z', '-y', '-x']));
      if (normal.normalZ < 0) materix4.set(...getDirection(['x', '-y', '-z']));
      break;
    case 64:
      if (normal.normalX > 0) materix4.set(...getDirection(['-z', 'y', 'x']));
      if (normal.normalX < 0) materix4.set(...getDirection(['z', 'y', '-x']));
      if (normal.normalZ > 0) materix4.set(...getDirection(['-x', 'y', '-z']));
      break;
    case 65:
      materix4 = materix4.makeRotationX(Math.PI / 2);
      if (normal.normalX > 0) materix4.set(...getDirection(['-y', '-z', 'x']));
      if (normal.normalX < 0) materix4.set(...getDirection(['y', '-z', '-x']));
      if (normal.normalY < 0) materix4.set(...getDirection(['-y', '-z', '-x']));
      break;
    case 66:
      materix4 = materix4.makeRotationX(-Math.PI / 2);
      if (normal.normalX > 0) materix4.set(...getDirection(['y', 'z', '-x']));
      if (normal.normalX < 0) materix4.set(...getDirection(['-y', 'z', 'x']));
      if (normal.normalY > 0) materix4.set(...getDirection(['-x', 'z', 'y']));
      break;
    default:
  }
  return materix4;
};

export default getGravityDirection;
