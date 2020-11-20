interface ILiteEvent<T> {
  add(handler: { (data?: T): void }): void;
  remove(handler: { (data?: T): void }): void;
}

export default class LiteEvent<T> implements ILiteEvent<T> {
  private handlers: { (data?: T): void }[] = [];

  public add(handler: { (data?: T): void }): void {
    this.handlers.push(handler);
  }

  public remove(handler: { (data?: T): void }): void {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }

  public trigger(data?: T): void {
    this.handlers.slice(0).forEach((h) => h(data));
  }
}
