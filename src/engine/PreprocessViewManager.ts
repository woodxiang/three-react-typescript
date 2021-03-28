import ContentManager from './ContentManager';
import FlatManager from './FlatsManager';
import SensorManager from './SensorManager';

export default class PreprocessViewManager extends ContentManager {
  private wrappedEnableFlats = false;

  public readonly flats: FlatManager = new FlatManager();

  private wrappedEnableSensors = false;

  private readonly sensors: SensorManager = new SensorManager();

  set enableFlats(enable: boolean) {
    this.wrappedEnableFlats = enable;
    this.flats.bind(enable ? this.engine : undefined);
    if (enable) {
      this.flats.restore();
    }
  }

  get enableFlats(): boolean {
    return this.wrappedEnableFlats;
  }

  set isMultipleSelection(enable: boolean) {
    this.flats.isMultipleSelection = enable;
  }

  get isMultipleSelection(): boolean {
    return this.flats.isMultipleSelection;
  }

  set enableSensors(enable: boolean) {
    this.wrappedEnableSensors = enable;
    this.sensors.bind(enable ? this.engine : undefined);
  }

  get enableSensors(): boolean {
    return this.wrappedEnableSensors;
  }

  protected onBind(): void {
    super.onBind();
    if (this.wrappedEnableFlats) this.flats.bind(this.engine);
    if (this.wrappedEnableSensors) this.sensors.bind(this.engine);
  }

  protected onUnbind(): void {
    this.flats.bind(undefined);
    this.sensors.bind(undefined);
    super.onUnbind();
  }
}
