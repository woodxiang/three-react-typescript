import { isCancel } from '../../utils/CancelError';
import STLExLoader from '../STLExLoader';

test('load stl file test', async () => {
  const loader = new STLExLoader();

  const geometry = await loader.loadAsync('http://localhost:8081/api/stls/cast.stl');
  expect(geometry).not.toBeNull();
});

test('load stl file abort test', async () => {
  let cancelled = false;
  const loader = new STLExLoader();
  try {
    const geometryPromise = loader.loadAsync('http://localhost:8081/api/stls/cast.stl');
    loader.cancel();
    const geometry = await geometryPromise;
    expect(geometry).not.toBeNull();
  } catch (e) {
    if (isCancel(e)) {
      cancelled = true;
    }
  }

  expect(cancelled).toBeTruthy();
});
