import { IHitTestHandler, IHitTestResult } from '../engine/interfaces';
import RenderingEngine from '../engine/RenderingEngine';

export default class FlatManager implements IHitTestHandler {
  private isMultipleSelectionInternal = false;

  private selectedPlanes: { name: string; indexes: number[]; normal: number[] }[] = [];

  private engine: RenderingEngine | undefined;

  public Bind(engine: RenderingEngine | undefined): void {
    if (this.engine === engine) return;
    if (this.engine !== undefined) {
      this.engine.hitTestHandler = undefined;
    }
    this.engine = engine;
    if (this.engine !== undefined) {
      this.engine.hitTestHandler = <IHitTestHandler>this;
    }
  }

  public onHit(res: IHitTestResult): boolean {
    if (!this.engine) {
      throw Error('not engine');
    }

    const index = this.selectedPlanes.findIndex((v) => v.name === res.name && v.indexes.indexOf(res.index) >= 0);
    if (index >= 0) {
      const { name } = this.selectedPlanes[index];
      if (this.isMultipleSelectionInternal) {
        // remove the selected
        this.selectedPlanes = this.selectedPlanes.splice(index, 1);
        this.updateFlats(name);
      } else {
        return true;
      }
    }

    const flat = this.engine.findFlat(res.name, res.index);
    if (!flat) return false;

    if (this.isMultipleSelectionInternal) {
      this.selectedPlanes = this.selectedPlanes.concat([
        { name: res.name, indexes: flat.faceIndexes, normal: [flat.normal.x, flat.normal.y, flat.normal.z] },
      ]);
      this.updateFlats(res.name);
    } else {
      this.selectedPlanes = [
        { name: res.name, indexes: flat.faceIndexes, normal: [flat.normal.x, flat.normal.y, flat.normal.z] },
      ];
      if (this.engine) {
        this.engine.ClearAllPlanes();
        this.updateFlats(res.name);
      }
    }
    return true;
  }

  public get isMultipleSelection(): boolean {
    return this.isMultipleSelectionInternal;
  }

  public set isMultipleSelection(newValue: boolean) {
    this.isMultipleSelectionInternal = newValue;
  }

  private updateFlats(name: string): void {
    let inactiveFaces: number[] = [];
    let activeFaces: number[] = [];
    for (let i = 0; i < this.selectedPlanes.length; i += 1) {
      if (this.selectedPlanes[i].name === name) {
        if (i < this.selectedPlanes.length - 1) {
          inactiveFaces = inactiveFaces.concat(this.selectedPlanes[i].indexes);
        } else {
          activeFaces = this.selectedPlanes[i].indexes;
        }
      }
    }

    this.engine?.UpdateFlats(name, inactiveFaces, activeFaces);
  }
}
