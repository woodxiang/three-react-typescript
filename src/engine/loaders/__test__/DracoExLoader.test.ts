import axios from 'axios';
import DracoExLoader from '../DracoExLoader';

test('load draco file test', async () => {
  const loader = new DracoExLoader();
  loader.setDecoderPath('http://localhost:8081/wasm/dracoEx/');
  const geometry = await loader.loadAsync('http://localhost:8081/api/dracos/res_00036645_tau_sma_surface.sd');
  expect(geometry).not.toBeNull();
});

test('load draco file cancel test', async () => {
  const loader = new DracoExLoader();
  loader.setDecoderPath('http://localhost:8081/wasm/dracoEx/');
  let cancelled = false;
  try {
    const geometryPromise = loader.loadAsync('http://localhost:8081/api/dracos/res_00036645_tau_sma_surface.sd');
    loader.cancel();
    const geometry = await geometryPromise;
    expect(geometry).not.toBeNull();
  } catch (e) {
    if (axios.isCancel(e)) {
      cancelled = true;
    }
  }

  expect(cancelled).toBeTruthy();
});
