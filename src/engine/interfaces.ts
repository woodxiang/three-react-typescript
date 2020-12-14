import { Matrix4 } from 'three/src/math/Matrix4';
import { Vector2 } from 'three/src/math/Vector2';

enum STATE {
  NONE = 0,
  ROTATE,
  DOLLY,
  PAN,
  HITTEST,
}

enum SELECTIONMODE {
  Disabled,
  Plane,
  Point,
}

enum CURSORTYPE {
  NONE,
  HAND,
  ARRAW,
  CROSS,
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
}
interface IHitTestResult {
  name: string;
  index: number;
}
interface IHitTest {
  testTriangle(xPos: number, yPos: number): IHitTestResult | null;
}

interface IFaceSelection {
  clickOnFace(name: string, index: number): void;
}

interface IFaceSelectionResult {
  name: string;
  faceIndexes: number[];
  normal: number[];
}

interface IObjectRotation {
  getRotationMatrix(): Matrix4;
  setRotationMatrix(mat: Matrix4): void;
}

export { STATE, CURSORTYPE, SELECTIONMODE };
export type {
  IActionCallback,
  IActionHandler,
  IObjectRotation,
  IFaceSelection,
  IFaceSelectionResult,
  IHitTest,
  IHitTestResult,
};
