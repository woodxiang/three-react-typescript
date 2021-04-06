export default class CancelError extends Error {
  public readonly isCancel = true;
}

export function isCancel(err: unknown): boolean {
  const e = <CancelError>err;
  return e.isCancel !== undefined && e.isCancel;
}
