import { Direction } from '../../interfaces';
import { getVerticesOfSurface } from '../boxConstants';

test('generate triangles with x+ direction', () => {
  const result = getVerticesOfSurface(Direction.XPositive);
  expect(result.getX(0)).toBe(1);
});
