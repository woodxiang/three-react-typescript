import { Group } from 'three/src/objects/Group';

export interface IPlaneInfo {
  name: string;
  indexes: number[];
}

export default class PlaneSelector {
  private isMultipleSelectionInternal = false;

  private planeMap: IPlaneInfo[] = [];

  private parentGroup: Group;

  constructor(parent: Group) {
    this.parentGroup = parent;
  }

  public get isMultipleSelection(): boolean {
    return this.isMultipleSelection;
  }

  public set isMultipleSelection(newValue: boolean) {
    this.isMultipleSelectionInternal = newValue;
  }

  public findPlane(name: string, index: number): IPlaneInfo | undefined {
    return this.planeMap.find((v) => v.name === name && v.indexes.indexOf(index) >= 0);
  }

  public selectPlane(name: string, indexes: number[]): void {
    // togle the plane if multiple plane is allowd.
    const indexOfPlane = this.indexOfPlane(name, indexes[0]);
    if (this.isMultipleSelectionInternal) {
      if (indexOfPlane >= 0) {
        this.planeMap.splice(indexOfPlane, 1);
      } else {
        this.planeMap.push({ name, indexes });
      }
    } else if (indexOfPlane < 0) {
      // Remove the plane if there is no plane.
      this.planeMap = [];
      this.planeMap.push({ name, indexes });
    }
  }

  public removePlane(name: string, index: number | number[]): boolean {
    const indexToFind = Array.isArray(index) ? (<number[]>index)[0] : <number>index;
    const planeIndex = this.indexOfPlane(name, indexToFind);
    if (planeIndex >= 0) {
      this.planeMap.splice(planeIndex, 1);
      return true;
    }
    return false;
  }

  private indexOfPlane(name: string, index: number): number {
    return this.planeMap.findIndex((v) => v.name === name && v.indexes.indexOf(index) >= 0);
  }
}
