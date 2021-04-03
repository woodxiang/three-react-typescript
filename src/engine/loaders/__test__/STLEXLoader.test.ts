import STLExLoader from '../STLExLoader';

test('load stl file test', async () => {
  const loader = new STLExLoader();

  const geometry = await loader.loadAsync('http://localhost:8081/api/stls/cast.stl');
  expect(geometry).not.toBeNull();
});
