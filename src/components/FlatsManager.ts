import { IHitTestHandler, IHitTestResult } from '../engine/interfaces';
import RenderingEngine from '../engine/RenderingEngine';

export default class FlatManager implements IHitTestHandler {
  private isMultipleSelectionInternal = false;

  private selectedFlats: { name: string; indexes: number[]; normal: number[] }[] = [];

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

    const index = this.selectedFlats.findIndex((v) => v.name === res.name && v.indexes.indexOf(res.index) >= 0);
    if (index >= 0) {
      const { name } = this.selectedFlats[index];
      if (this.isMultipleSelectionInternal) {
        // remove the selected
        const previousActiveFlatName = this.selectedFlats[this.selectedFlats.length - 1].name;
        this.selectedFlats.splice(index, 1);
        const newSelectedObjectName =
          this.selectedFlats.length > 0 ? this.selectedFlats[this.selectedFlats.length - 1].name : undefined;
        this.updateFlats(name);
        if (previousActiveFlatName !== name) {
          this.updateFlats(previousActiveFlatName);
        }
        if (newSelectedObjectName !== undefined && name !== newSelectedObjectName) {
          this.updateFlats(newSelectedObjectName);
        }
      }
      return true;
    }

    const flat = this.engine.findFlat(res.name, res.index);
    if (!flat) return false;

    if (this.isMultipleSelectionInternal) {
      const lastActiveObjectName =
        this.selectedFlats.length > 0 ? this.selectedFlats[this.selectedFlats.length - 1].name : undefined;
      this.selectedFlats = this.selectedFlats.concat([
        { name: res.name, indexes: flat.faceIndexes, normal: [flat.normal.x, flat.normal.y, flat.normal.z] },
      ]);
      if (lastActiveObjectName && lastActiveObjectName !== res.name) {
        this.updateFlats(lastActiveObjectName);
      }
      this.updateFlats(res.name);
    } else {
      this.selectedFlats = [
        { name: res.name, indexes: flat.faceIndexes, normal: [flat.normal.x, flat.normal.y, flat.normal.z] },
      ];
      if (this.engine) {
        this.engine.clearAllFlats();
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
    for (let i = 0; i < this.selectedFlats.length; i += 1) {
      if (this.selectedFlats[i].name === name) {
        if (i < this.selectedFlats.length - 1) {
          inactiveFaces = inactiveFaces.concat(this.selectedFlats[i].indexes);
        } else {
          activeFaces = this.selectedFlats[i].indexes;
        }
      }
    }

    this.engine?.updateFlats(name, inactiveFaces, activeFaces);
  }
}
