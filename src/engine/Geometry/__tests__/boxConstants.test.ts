import { Direction } from '../../interfaces';
import { getVerticeOfSurface } from '../boxConstants';

test('generate triangles with x+ direction', () => {
  const result = getVerticeOfSurface(Direction.XPositive);
  expect(result.getX(0)).toBe(1);
});
