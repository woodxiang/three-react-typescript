import { createCanvas } from 'canvas';
import createContext from 'gl';

interface IContext {
  canvas: HTMLCanvasElement;
}

interface ICanvas {
  style: { width: number; height: number };
}

export default class NodeEnvironmentHelper {
  public static createContext(
    width: number,
    height: number
  ): { canvas: HTMLCanvasElement; context: WebGLRenderingContext } {
    const context = createContext(width, height);
    const canvas: HTMLCanvasElement = createCanvas(width, height) as unknown as HTMLCanvasElement;
    (<ICanvas>(<unknown>canvas)).style = { width, height };

    (<IContext>context).canvas = canvas;

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    canvas.addEventListener = () => {};

    return { canvas, context };
  }
}
