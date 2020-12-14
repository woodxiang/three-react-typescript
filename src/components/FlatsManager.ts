import { IFaceSelectionResult } from '../engine/interfaces';
import RenderingEngine from '../engine/RenderingEngine';

export default class FlatManager {
  private isMultipleSelectionInternal = false;

  private selectedPlanes: { name: string; indexes: number[] }[] = [];

  private engine: RenderingEngine | undefined;

  public Bind(engine: RenderingEngine | undefined): void {
    this.engine = engine;
  }

  public ClickOnFlat(res: IFaceSelectionResult): void {
    const index = this.selectedPlanes.findIndex((v) => v.name === res.name && v.indexes[0] === res.faceIndexes[0]);
    if (this.isMultipleSelectionInternal) {
      if (index >= 0) {
        const newSelectedPlanes = this.selectedPlanes.filter((v, vindex) => vindex !== index);
        this.selectedPlanes = newSelectedPlanes;
        this.engine?.RemoveFlats(res.name, res.faceIndexes[0]);
      } else {
        this.selectedPlanes = this.selectedPlanes.concat([{ name: res.name, indexes: res.faceIndexes }]);
        this.engine?.AddFlats(res.name, res.faceIndexes);
      }
    } else if (index < 0) {
      this.selectedPlanes = [{ name: res.name, indexes: res.faceIndexes }];
      if (this.engine) {
        this.engine.ClearAllPlanes();
        this.engine.AddFlats(res.name, res.faceIndexes);
      }
    }
  }

  public get isMultipleSelection(): boolean {
    return this.isMultipleSelectionInternal;
  }

  public set isMultipleSelection(newValue: boolean) {
    this.isMultipleSelectionInternal = newValue;
  }
}
