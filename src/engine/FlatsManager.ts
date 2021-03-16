import ActionHandlerBase from './ActionHandlerBase';
import { IActionCallback, IHitTestResult, STATE } from './interfaces';
import RenderingEngine from './RenderingEngine';

export default class FlatManager extends ActionHandlerBase {
  private wrappedIsMultipleSelection = false;

  private selectedFlats: { name: string; indexes: number[]; normal: number[] }[] = [];

  private engine: RenderingEngine | undefined;

  public bind(engine: RenderingEngine | undefined): void {
    if (this.engine === engine) return;
    if (this.engine !== undefined) {
      this.engine.removeActionHandler(this);
      this.engine = undefined;
    }
    this.engine = engine;
    if (this.engine !== undefined) {
      this.engine.addActionHandler(this);
    }
  }

  public onHit(res: IHitTestResult): boolean {
    if (!this.engine) {
      throw Error('bind engine before invoke.');
    }

    const index = this.selectedFlats.findIndex((v) => v.name === res.name && v.indexes.indexOf(res.index) >= 0);
    if (index >= 0) {
      const { name } = this.selectedFlats[index];
      if (this.wrappedIsMultipleSelection) {
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

    if (this.wrappedIsMultipleSelection) {
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

  public restore(): void {
    const objectsWithSelectedFlat = new Set<string>();
    this.selectedFlats.forEach((v) => {
      objectsWithSelectedFlat.add(v.name);
    });

    objectsWithSelectedFlat.forEach((name) => {
      this.updateFlats(name);
    });
  }

  public get isMultipleSelection(): boolean {
    return this.wrappedIsMultipleSelection;
  }

  public set isMultipleSelection(newValue: boolean) {
    this.wrappedIsMultipleSelection = newValue;
  }

  handleLeftButtonUp(event: PointerEvent, callback: IActionCallback): boolean {
    if (this.isEnabled) {
      const localCallback = callback;
      if (localCallback.state === STATE.NONE) {
        const hitTestResult = localCallback.hitTest(
          (event.offsetX / localCallback.viewPortSize.x) * 2 - 1,
          -(event.offsetY / localCallback.viewPortSize.y) * 2 + 1
        );

        if (hitTestResult) {
          return this.onHit(hitTestResult);
        }
      }
    }

    return false;
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
