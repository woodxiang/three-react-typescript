import MeshFactory, { GeometryDataType } from '../MeshFactory';
import PositionDetectHelper from '../PositionDetectHelper';
import RenderingEngine from '../RenderingEngine';

test.skip('clone scene for position detect', async () => {
  const engine = new RenderingEngine();
  expect(engine).not.toBeNull();
  engine.init(new HTMLDivElement(), 1920, 1080);
  const mesh = await MeshFactory.createSolidMesh('http://localhost/stls/cast.tsl', GeometryDataType.STLMesh, 'pink');
  expect(mesh).not.toBeUndefined();
  if (mesh) {
    engine.addMesh(mesh);
  }

  const newScene = PositionDetectHelper.createDetectScene(engine.scene);

  const ret = engine.exportImage(1920, 1080, newScene);

  expect(ret).not.toBeNull();
});
