// import axios from '@/common/utils/Axios';
// import {
//   apiProjectModelDownloadModel,
//   apiProjectModelGetEntityList,
//   apiTaskGateGetList,
//   apiTaskParamFillingQuery,
// } from '@/common/utils/api';
// import { IPhysicalExra } from '@/workbench/components/cardPanel/process/FillingConfig/FillingUtil';
import ContentManager, { GateInterface } from './ContentManager';
import FlatManager, { IFlatInfo } from './FlatsManager';
import MeasurementHandler from './MeasurementHandler';
import SensorManager, { ISensorInfo } from './SensorManager';
import { CURSOR_TYPE } from './interfaces';

interface IStlInfo {
  taskEntityId: string;
  url: string;
  color: string;
  source: string;
}
export default class PreprocessViewManager extends ContentManager {
  private wrappedEnableFlats = false;

  public readonly flats: FlatManager = new FlatManager();

  private wrappedEnableSensors = false;

  public readonly sensors: SensorManager = new SensorManager();

  private wrappedEnableMeasurement = false;

  public readonly measurement: MeasurementHandler = new MeasurementHandler();

  // private wrappedPhysicalExra: IPhysicalExra = null;

  set enableFlats(enable: boolean) {
    this.wrappedEnableFlats = enable;
    this.flats.bind(enable ? this.engine : undefined, undefined);
    if (enable) {
      this.flats.restore();
    }
  }

  get enableFlats(): boolean {
    return this.wrappedEnableFlats;
  }

  public changeFlatsStatus(enable: boolean, callback: (sensor: IFlatInfo) => void): void {
    this.wrappedEnableFlats = enable;
    if (enable) this.flats.bind(enable ? this.engine : undefined, callback);
  }

  set isMultipleSelection(enable: boolean) {
    this.flats.isMultipleSelection = enable;
  }

  get isMultipleSelection(): boolean {
    return this.flats.isMultipleSelection;
  }

  set cursorType(cursorType: CURSOR_TYPE) {
    this.engine.cursorType = cursorType;
  }

  get cursorType(): CURSOR_TYPE {
    return this.engine.cursorType;
  }

  set enableSensors(enable: boolean) {
    this.wrappedEnableSensors = enable;
    this.sensors.bind(enable ? this.engine : undefined, undefined);
  }

  get enableSensors(): boolean {
    return this.wrappedEnableSensors;
  }

  public changeSensorsStatus(enable: boolean, callback: (sensor: ISensorInfo, optType: string) => void): void {
    this.wrappedEnableSensors = enable;
    if (enable) this.sensors.bind(this.engine, callback);
    else this.sensors.bind(undefined, undefined);
  }

  public addSensors(sensor: ISensorInfo): void {
    if (this.sensors) this.sensors.addSensor(sensor);
  }

  public deleteSensor(sensor: ISensorInfo): void {
    if (this.sensors) this.sensors.deleteSensor(sensor);
  }

  // public clearSensors() {
  //   if (this.sensors) this.sensors.addSensor();
  // }

  set enableMeasurement(enable: boolean) {
    this.wrappedEnableMeasurement = enable;
    this.measurement.bind(enable ? this.engine : undefined);
  }

  get enableMeasurement(): boolean {
    return this.wrappedEnableMeasurement;
  }

  protected onBind(): void {
    super.onBind();
    if (this.wrappedEnableFlats) this.flats.bind(this.engine, undefined);
    if (this.wrappedEnableSensors) this.sensors.bind(this.engine, undefined);
    if (this.wrappedEnableMeasurement) this.measurement.bind(this.engine);
  }

  protected onUnbind(): void {
    this.flats.bind(undefined, undefined);
    this.sensors.bind(undefined, undefined);
    this.measurement.bind(undefined);
    super.onUnbind();
  }

  // set physicalExra(physical: IPhysicalExra) {
  //   this.wrappedPhysicalExra = physical;
  // }

  // get physicalExra(): IPhysicalExra {
  //   return this.wrappedPhysicalExra;
  // }

  // refresh 3D:beg
  private loadGates(gateList: Array<any>, stlInfoList: Array<IStlInfo>) {
    const theFlatManger = this.flats;
    theFlatManger.clearFlats();
    if (gateList && gateList.length > 0) {
      theFlatManger.bind(this.getEngine(), undefined);
      gateList.forEach((item) => {
        const entry = stlInfoList.find((itemInner) => itemInner.taskEntityId === item.taskEntityId);
        if (entry) {
          const gateFace = JSON.parse(item.faceGroup);
          // engine.updateFlats(name, [], gateFace);
          const flat = {
            name: entry.url,
            indexes: gateFace,
            normal: [item.normalX, item.normalY, item.normalZ],
            area: item.area,
            key: item.id,
            // optimizeCurve: item.optimizeCurve,
          };
          theFlatManger.isMultipleSelection = item.typeId === 2;
          theFlatManger.addFlats(flat);
        }
      });
      theFlatManger.restore();
      theFlatManger.bind(undefined, undefined);
    }
  }

  private async loadAllStl(stlInfoList: Array<IStlInfo>, gateList: Array<any>) {
    try {
      this.clearMeshes();
      const promises = stlInfoList.map((item) => this.LoadStl(item.url, item.color, 1));
      await Promise.all(promises);
      this.loadGates(gateList, stlInfoList);
    } catch (error) {
      throw new Error(error.message || '导入stl文件失败');
    }
  }

  public async refresh3D(taskId: string): Promise<void> {
    if (!taskId) return;
  //   if (this.flats) this.flats.bind(undefined, undefined);
  //   try {
  //     const { data: entitys } = await axios.get(`${apiProjectModelGetEntityList}?projectTaskId=${taskId}`);
  //     const { data: gates } = await axios.get(`${apiTaskGateGetList}?taskId=${taskId}`);
  //     const { data: filling } = await axios.get(`${apiTaskParamFillingQuery}?projectTaskId=${taskId}`);
  //     if (filling) {
  //       this.gravityDirection = filling.gravityDirectionId as number;
  //     }
  //     if (entitys.length > 0) {
  //       const sources = entitys.map((item: any) => item.source);
  //       const params = { fileNames: sources };
  //       const temp = await axios.post(`${apiProjectModelDownloadModel}`, params);

  //       const stlInfoList: Array<IStlInfo> = entitys.map((enti, j) => {
  //         const newStl: IStlInfo = {
  //           taskEntityId: enti.id,
  //           url: temp.data[j].ossUrl + '&taskEntityId=' + enti.id,
  //           color: enti.color,
  //           source: enti.source,
  //         };
  //         const ossUrl2 = temp.data[j].ossUrl.split('?');
  //         window.localStorage.setItem(enti.source, ossUrl2[1]);
  //         return newStl;
  //       });

  //       await this.loadAllStl(stlInfoList, gates);
  //     } else this.clearMeshes();
  //     if (gates.length > 0) {
  //       this.gate = {
  //         normalX: gates[0].normalX,
  //         normalY: gates[0].normalY,
  //         normalZ: gates[0].normalZ,
  //       } as GateInterface;
  //     }
  //   } catch (err) {
  //     console.log(err.message || err.msg || '运行异常，请稍后再试');
  //   }
  }
  // refresh 3D:end
}
