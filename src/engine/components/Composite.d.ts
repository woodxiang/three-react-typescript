import { ICancellableLoader } from '../loaders/ICancellableLoader';
/**
 * Base class for component manager.
 */
export default class Composite implements ICancellableLoader {
  addComponent(
    name: string,
    url: string,
    loadProgress?: (event: ProgressEvent<EventTarget>) => void,
    loadError?: (err: string) => void
  );

  public cancel(): void;
}
