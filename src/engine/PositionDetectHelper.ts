import { Material } from 'three/src/materials/Material';
import { Group } from 'three/src/objects/Group';
import { Mesh } from 'three/src/objects/Mesh';
import { Scene } from 'three/src/scenes/Scene';
import { ITransformed } from './interfaces';
import IAfterProject from './Materials/IAfterProject';
import PositionDetectMaterial from './Materials/PositionDetectMaterial';

export default class PositionDetectHelper {
  public static createDetectScene(srcScene: Scene): { scene: Scene; map: Map<number, string> } {
    const mapList = Array<{ id: number; key: string }>();
    const ret = this.createPositionDetectGroup(srcScene, 1, mapList, ['#stencil#']);

    const objectMap = new Map<number, string>();
    mapList.forEach((v) => {
      objectMap.set(v.id, v.key);
    });

    return { scene: ret as Scene, map: objectMap };
  }

  public static createPositionDetectMaterial(srcMaterial: Material, id: number): PositionDetectMaterial {
    const ap = <IAfterProject>(<unknown>srcMaterial);

    const ret = new PositionDetectMaterial(id, { afterProjectMatrix: ap.afterProjectMatrix, clipping: true });
    ret.clippingPlanes = srcMaterial.clippingPlanes;
    ret.stencilWrite = srcMaterial.stencilWrite;
    ret.stencilRef = srcMaterial.stencilRef;
    ret.stencilFunc = srcMaterial.stencilFunc;
    ret.stencilFail = srcMaterial.stencilFail;
    ret.stencilZFail = srcMaterial.stencilZFail;
    ret.stencilZPass = srcMaterial.stencilZPass;

    ret.name = srcMaterial.name;

    const tmp = <ITransformed>(<unknown>srcMaterial);
    if (tmp && tmp.objectTransform) {
      ret.objectTransform = tmp.objectTransform;
    }

    return ret;
  }

  public static createPositionDetectMesh(srcMesh: Mesh, id: number): Mesh {
    const srcGeo = srcMesh.geometry;
    const srcMaterial = srcMesh.material;
    let targetMaterial: Material | Material[];
    if (srcMaterial instanceof Array) {
      targetMaterial = new Array<PositionDetectMaterial>(srcMaterial.length);
      for (let i = 0; i < srcMaterial.length; i += 1) {
        targetMaterial[i] = PositionDetectHelper.createPositionDetectMaterial(srcMaterial[i], id);
      }
    } else {
      targetMaterial = PositionDetectHelper.createPositionDetectMaterial(srcMaterial, id);
    }
    const ret = new Mesh(srcGeo, targetMaterial);
    ret.name = srcMesh.name;
    ret.matrix = srcMesh.matrix;
    ret.matrixAutoUpdate = false;
    ret.renderOrder = srcMesh.renderOrder;
    ret.onAfterRender = srcMesh.onAfterRender;
    ret.visible = srcMesh.visible;

    return ret;
  }

  public static createPositionDetectGroup(
    srcGroup: Group | Scene,
    seedId: number,
    objIdNumber: Array<{ id: number; key: string }>,
    exclude: string[] | undefined = undefined
  ): Group | Scene {
    if (exclude && exclude.indexOf(srcGroup.name) >= 0) {
      return srcGroup.clone() as Group | Scene;
    }

    const ret = srcGroup instanceof Scene ? new Scene() : new Group();
    ret.name = srcGroup.name;
    ret.visible = srcGroup.visible;

    let nextSeed = seedId;
    srcGroup.children.forEach((v) => {
      if (v instanceof Group || v instanceof Scene) {
        const newGroup = PositionDetectHelper.createPositionDetectGroup(v, nextSeed, objIdNumber, exclude);
        if (newGroup.children.length > 0) {
          newGroup.matrix = v.matrix;
          newGroup.matrixAutoUpdate = false;
          ret.add(newGroup);
          nextSeed = objIdNumber[objIdNumber.length - 1].id + 1;
        }
      } else if (v instanceof Mesh) {
        const newMesh = this.createPositionDetectMesh(v, nextSeed);
        objIdNumber.push({ id: nextSeed, key: v.name });
        ret.add(newMesh);
        nextSeed = objIdNumber[objIdNumber.length - 1].id + 1;
      } else {
        console.log('invalid object type. ignore');
      }
    });

    return ret;
  }
}
