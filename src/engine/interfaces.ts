import { Camera } from 'three/src/cameras/Camera';
import { Matrix4 } from 'three/src/math/Matrix4';
import { Vector2 } from 'three/src/math/Vector2';
import { Vector3 } from 'three/src/math/Vector3';
import { Vector4 } from 'three/src/math/Vector4';
import { WebGLRenderer } from 'three/src/renderers/WebGLRenderer';
import { Scene } from 'three/src/scenes/Scene';

enum STATE {
  NONE = 0,
  ROTATE,
  DOLLY,
  PAN,
}

enum CURSOR_TYPE {
  NONE,
  HAND,
  ARROW,
  CROSS,
}

enum Direction {
  Undefined = -1,
  XPositive = 0,
  YPositive,
  ZPositive,
  XNegative,
  YNegative,
  ZNegative,
}

interface IActionCallback {
  state: STATE;
  cursorType: CURSOR_TYPE;
  readonly scene: Scene;
  readonly cameraFov: number;
  readonly cameraEye: Vector3;
  readonly cameraAt: Vector3;
  readonly maxDim: number;
  rotationMatrix: Matrix4;
  readonly matrix: Matrix4;
  readonly viewPortSize: Vector2;
  hitTest(xPos: number, yPos: number): IHitTestResult | null;
  capturePointer(pointerId: number): void;
  releasePointer(): void;
  exportImage(
    width: number,
    height: number,
    scene: Scene | undefined,
    camera: Camera | undefined,
    viewPort: Vector4 | undefined
  ): Uint8Array;
  renderTargetAndReadFloat(
    scene: Scene,
    xPos: number,
    yPos: number,
    camera: Camera | undefined,
    viewPort: Vector4 | undefined
  ): Float32Array;
}

interface ITransformed {
  objectTransform: Matrix4 | undefined;
}

interface IActionHandler {
  isEnabled: boolean;
  readonly priority: number;

  handleLeftButtonDown(event: PointerEvent, callback: IActionCallback): boolean;
  handleLeftButtonUp(event: PointerEvent, callback: IActionCallback): boolean;
  handleMouseMove(event: PointerEvent, callback: IActionCallback): boolean;
  handleMouseWheel(event: PointerEvent, callback: IActionCallback): boolean;
  handleKeyDown(event: KeyboardEvent, callback: IActionCallback): boolean;
  handleKeyUp(event: KeyboardEvent, callback: IActionCallback): boolean;
  handleMiddleButtonDown(event: PointerEvent, callback: IActionCallback): boolean;
  handleMiddleButtonUp(event: PointerEvent, callback: IActionCallback): boolean;
  handleRightButtonDown(event: PointerEvent, callback: IActionCallback): boolean;
  handleRightButtonUp(event: PointerEvent, callback: IActionCallback): boolean;
  handleWheel(event: WheelEvent, callback: IActionCallback): boolean;
}

interface IRenderHandler {
  readonly renderOrder: number;
  render(renderer: WebGLRenderer): void;
}

interface IHitTestResult {
  name: string;
  index: number;
  pos: Vector3;
}

interface IObjectRotation {
  rotationMatrix: Matrix4;
}

interface IFlat {
  faceIndexes: number[];
  normal: Vector3;
  area: number;
}

const renderingModelName = '#models#';

export { STATE, CURSORTYPE, Direction, renderingModelName };
export type { IActionCallback, IActionHandler, IRenderHandler, IObjectRotation, IHitTestResult, IFlat, ITransformed };
