import createContext from 'gl';
import { createCanvas } from 'canvas';
import fs from 'fs';
import MeshFactory, { GeometryDataType } from '../MeshFactory';
import PositionDetectHelper from '../PositionDetectHelper';
import RenderingEngine from '../RenderingEngine';

interface IContext {
  canvas: HTMLCanvasElement;
}

interface ICanvas {
  style: { width: number; height: number };
}

test('clone scene for position detect', async () => {
  const width = 1920;
  const height = 1080;
  const context = createContext(width, height);
  const canvas: HTMLCanvasElement = (createCanvas(width, height) as unknown) as HTMLCanvasElement;
  (<ICanvas>(<unknown>canvas)).style = { width, height };

  (<IContext>context).canvas = canvas;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  canvas.addEventListener = () => {};
  const engine = new RenderingEngine();
  expect(engine).not.toBeNull();
  engine.init(undefined, 1920, 1080, canvas, context);
  const mesh = await MeshFactory.createSolidMesh(
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
