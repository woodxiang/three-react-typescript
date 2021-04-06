import fs from 'fs';
import NodeEnvironmentHelper from '../utils/NodeEnvironmentHelper';
import MeshFactory, { GeometryDataType } from '../MeshFactory';
import PositionDetectHelper from '../PositionDetectHelper';
import RenderingEngine from '../RenderingEngine';

test('clone scene for position detect', async () => {
  const { canvas, context } = NodeEnvironmentHelper.createContext(1920, 1080);
  const engine = new RenderingEngine();
  expect(engine).not.toBeNull();
  engine.init(undefined, 1920, 1080, canvas, context);
  const factory = new MeshFactory();
  const mesh = await factory.createSolidMesh(
    'http://localhost:8081/api/stls/cast.stl',
    GeometryDataType.STLMesh,
    'pink'
  );
  expect(mesh).not.toBeUndefined();
  if (mesh) {
    engine.addMesh(mesh);
  }

  const newScene = PositionDetectHelper.createDetectScene(engine.scene);

  const ret = engine.exportImage(1920, 1080, newScene.scene);

  expect(ret).not.toBeNull();

  if (!fs.existsSync('test_result')) {
    fs.mkdirSync('test_result');
  }
  fs.writeFileSync('test_result/cast.jpg', ret);
});
