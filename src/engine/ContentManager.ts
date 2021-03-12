import ClippingManager from './ClippingManager';
import FlatManager from './FlatsManager';
import LegendManager from './LegendManager';
import NavigatorHandler from './NavigatorHandler';
import RenderingEngine from './RenderingEngine';
import SensorManager from './SensorManager';

export default class ContentManager {
  private engine: RenderingEngine | undefined;

  private legend: LegendManager = new LegendManager();

  private navigator: NavigatorHandler = new NavigatorHandler();

  public readonly flats: FlatManager = new FlatManager();

  public readonly clipping: ClippingManager = new ClippingManager();

  public readonly sensors: SensorManager = new SensorManager();

  public bind(engine: RenderingEngine | undefined): void {
    if (this.engine === engine) {
      return;
    }

    if (this.engine !== undefined) {
      // unbind engine
      this.legend.bind(undefined);
      this.navigator.bind(undefined);
      this.flats.bind(undefined);
      this.clipping.bind(undefined);
      this.sensors.bind(undefined);
    }

    this.engine = engine;
    if (this.engine) {
      // bind engine;
      this.legend.bind(this.engine);
      this.navigator.bind(this.engine);
      this.flats.bind(this.engine);
      this.clipping.bind(this.engine);
      this.sensors.bind(this.engine);
    }
  }
}
