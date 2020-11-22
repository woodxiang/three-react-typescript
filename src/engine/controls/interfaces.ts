enum STATE {
  NONE = 0,
  ROTATE,
  DOLLY,
  PAN,
  HITTEST,
}

enum CURSORTYPE {
  HAND,
  ARRAW,
  CROSS,
}

interface IActionCallback {
  state: STATE;
  cursorType: CURSORTYPE;
  capturePointer(pointerId: number): void;
  ReleasePointer(): void;
}

interface IActionHandler {
  isEnabled: boolean;
  priority: number;

  handleLeftButtonDown(event: PointerEvent, callback: IActionCallback): boolean;
  handleLeftButtonUp(event: PointerEvent, callback: IActionCallback): boolean;
  handleMouseMove(event: PointerEvent, callback: IActionCallback): boolean;
  handleMouseWheel(event: PointerEvent, callback: IActionCallback): boolean;
  handleKeyDown(event: KeyboardEvent, callback: IActionCallback): boolean;
  handleMiddleButtonDown(
    event: PointerEvent,
    callback: IActionCallback
  ): boolean;
  handleMiddleButtonUp(event: PointerEvent, callback: IActionCallback): boolean;
  handleRightButtonDown(
    event: PointerEvent,
    callback: IActionCallback
  ): boolean;
  handleRightButtonUp(event: PointerEvent, callback: IActionCallback): boolean;
}

export { STATE, CURSORTYPE, IActionCallback, IActionHandler };
