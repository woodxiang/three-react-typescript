import { Matrix4 } from 'three/src/math/Matrix4';
import { Vector2 } from 'three/src/math/Vector2';
import { Vector3 } from 'three/src/math/Vector3';

enum STATE {
  NONE = 0,
  ROTATE,
  DOLLY,
  PAN,
}

enum CURSORTYPE {
  NONE,
  HAND,
  ARRAW,
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
  cursorType: CURSORTYPE;
  capturePointer(pointerId: number): void;
  releasePointer(): void;
  viewPortSize: Vector2;
}

interface IActionHandler {
  isEnabled: boolean;
  priority: number;

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
  handleWhell(event: WheelEvent, callback: IActionCallback): boolean;
}

interface IHitTestResult {
  name: string;
  index: number;
  pos: Vector3;
}
interface IHitTest {
  hit(xPos: number, yPos: number): boolean;
}

interface IHitTestHandler {
  onHit(res: IHitTestResult): boolean;
}

interface IObjectRotation {
  getRotationMatrix(): Matrix4;
  setRotationMatrix(mat: Matrix4): void;
}

interface IFlat {
  faceIndexes: number[];
  normal: Vector3;
  area: number;
}

const renderingModelName = '#models#';

export { STATE, CURSORTYPE, Direction, renderingModelName };
export type { IActionCallback, IActionHandler, IObjectRotation, IHitTest, IHitTestResult, IHitTestHandler, IFlat };
