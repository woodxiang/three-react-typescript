import { FrontSide } from 'three/src/constants';
import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { Color } from 'three/src/math/Color';
import ActionHandlerBase from './ActionHandlerBase';
import { IActionCallback, IFlat, IHitTestResult, STATE } from './interfaces';
import IAfterProject from './Materials/IAfterProject';
import MeshLambertExMaterial from './Materials/MeshLambertExMaterial';
import RenderingEngine from './RenderingEngine';
import SelectionHelper from './SelectionHelper';

export interface IFlatInfo {
  name: string;
  indexes: number[];
  normal: number[];
  area: number;
  key: string;
  // optimizeCurve: string;
}

type CallbackHit = (flat: IFlatInfo) => void;

export default class FlatManager extends ActionHandlerBase {
  private wrappedIsMultipleSelection = false;

  private selectedFlats: IFlatInfo[] = [];

  private engine: RenderingEngine | undefined;

  private selectionHelper = new SelectionHelper();

  private inactiveFlatMaterial = new MeshLambertExMaterial({
    diffuse: new Color('#00FF00'),
    side: FrontSide,
    clipping: true,
    lights: true,
  });

  private activeFlatMaterial = new MeshLambertExMaterial({
    diffuse: new Color('#FF0000'),
    side: FrontSide,
    clipping: true,
    lights: true,
  });

  private callbackHit: CallbackHit | undefined = undefined;

  public bind(engine: RenderingEngine | undefined, _callbackHit: CallbackHit): void {
    if (this.engine === engine) return;
    if (this.engine !== undefined) {
      this.engine.domainRangeChangedEvent.remove(this.onDomainRangeChanged);
      this.engine.removeActionHandler(this);
      this.engine = undefined;
    }
    this.engine = engine;
    if (this.engine !== undefined) {
      this.engine.addActionHandler(this);
      this.engine.domainRangeChangedEvent.add(this.onDomainRangeChanged);

      this.activeFlatMaterial.ReplaceAfterProjectMatrix(this.engine.afterProjectMatrix);
      this.inactiveFlatMaterial.ReplaceAfterProjectMatrix(this.engine.afterProjectMatrix);
    }
    this.callbackHit = _callbackHit;
  }

  public onHit(res: IHitTestResult): boolean {
    if (!this.engine) {
      throw Error('bind engine before invoke.');
    }

    const index = this.selectedFlats.findIndex((v) => v.name === res.name && v.indexes.indexOf(res.index) >= 0);
    if (index >= 0) {
      const { name } = this.selectedFlats[index];
      const selectedFlat = this.selectedFlats[index];
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
      } else {
        this.selectedFlats.splice(index, 1);
        this.updateFlats(name);
      }

      selectedFlat.key = 'del_' + index;
      this.callbackHit?.(selectedFlat);
      return true;
    }

    const flat = this.findFlat(res.name, res.index);
    if (!flat) return false;

    if (!this.wrappedIsMultipleSelection) {
      this.clearAllFlats();
    }
    const selectedFlat = {
      name: res.name,
      indexes: flat.faceIndexes,
      normal: [flat.normal.x, flat.normal.y, flat.normal.z],
      area: flat.area,
      key: 'add_' + this.selectedFlats.length + '_' + new Date().getTime(),
    };
    if (this.wrappedIsMultipleSelection) {
      const lastActiveObjectName =
        this.selectedFlats.length > 0 ? this.selectedFlats[this.selectedFlats.length - 1].name : undefined;
      this.selectedFlats = this.selectedFlats.concat([selectedFlat]);
      if (lastActiveObjectName && lastActiveObjectName !== res.name) {
        this.updateFlats(lastActiveObjectName);
      }
      this.updateFlats(res.name);
    } else {
      this.selectedFlats = [selectedFlat];
      this.updateFlats(res.name);
    }
    this.callbackHit?.(selectedFlat);
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

  /**
   * find all connected faces with same normal with specified face.
   * @param name the name of the target object.
   * @param index the index of the source face.
   */
  private findFlat(name: string, index: number): IFlat | undefined {
    if (!this.engine) {
      throw Error('invalid engine.');
    }

    const geometry = this.engine.findGeometry(name);
    if (geometry) {
      return this.selectionHelper.findFlatByFace(geometry, index);
    }
    return undefined;
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

    this.updateFlatsImpl(name, inactiveFaces, activeFaces);
  }

  public getSelectedFlats(): IFlatInfo[] {
    return this.selectedFlats;
  }

  public addFlats(flat: IFlatInfo): void {
    this.selectedFlats.push(flat);
  }

  public deleteFlat(flat: IFlatInfo): void {
    // this.selectedFlats = this.selectedFlats.filter((item) => {
    //   return item.key !== flat.key;
    // });

    const delIdx = this.selectedFlats.findIndex((item) => item.key === flat.key);
    if (delIdx !== -1) {
      const delName = this.selectedFlats[delIdx].name;
      this.selectedFlats.splice(delIdx, 1);
      this.updateFlats(delName);
    }
  }

  public clearFlats(): void {
    this.selectedFlats = [];
  }

  public clearAndRestore(flatNames: Set<string>): void {
    this.selectedFlats = [];
    if (this.engine) {
      flatNames.forEach((name) => {
        this.updateFlats(name);
      });
    }
  }

  /**
   * Remove all flats.
   */
  public clearAllFlats(): void {
    const { engine } = this;
    if (engine) {
      this.selectedFlats.forEach((v) => {
        const geometry = engine.findGeometry(v.name);
        if (geometry) {
          SelectionHelper.resetGeometryGroups(geometry);
        }
      });
    }
  }

  private onDomainRangeChanged = (): void => {
    if (this.engine) {
      this.selectionHelper.setMaxSize(this.engine.maxDim);
    }
  };

  /**
   * update selected flats on specified object.
   * @param name the name of the object.
   * @param inactiveFaces inactiveFaces
   * @param activeFaces active faces.(last selected)
   */
  private updateFlatsImpl(name: string, inactiveFaces: number[], activeFaces: number[]): void {
    if (this.engine) {
      const mesh = this.engine.findMesh(name);
      if (mesh) {
        if (!mesh.material) {
          throw Error('no default material.');
        }
        if (!Array.isArray(mesh.material)) {
          const inactiveFlatMaterial = this.inactiveFlatMaterial.clone();
          inactiveFlatMaterial.clippingPlanes = mesh.material.clippingPlanes;

          const m1 = (inactiveFlatMaterial as unknown) as IAfterProject;
          if (m1 && m1.ReplaceAfterProjectMatrix) {
            m1.ReplaceAfterProjectMatrix((<IAfterProject>(<unknown>mesh.material)).afterProjectMatrix);
          }

          const activeFlatMaterial = this.activeFlatMaterial.clone();
          activeFlatMaterial.clippingPlanes = mesh.material.clippingPlanes;

          const m2 = (activeFlatMaterial as unknown) as IAfterProject;
          if (m2 && m2.ReplaceAfterProjectMatrix) {
            m2.ReplaceAfterProjectMatrix((<IAfterProject>(<unknown>mesh.material)).afterProjectMatrix);
          }

          mesh.material = [mesh.material, inactiveFlatMaterial, activeFlatMaterial];
        }
        const geo = mesh.geometry as BufferGeometry;
        if (!geo) {
          throw Error('invalid geometry.');
        }

        SelectionHelper.updateGroups(
          geo,
          0,
          { faces: inactiveFaces, materialIndex: 1 },
          { faces: activeFaces, materialIndex: 2 }
        );
      }
    }
  }
}
