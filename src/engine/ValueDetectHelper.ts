import { Material } from 'three/src/materials/Material';
import { Group } from 'three/src/objects/Group';
import { Mesh } from 'three/src/objects/Mesh';
import { Scene } from 'three/src/scenes/Scene';
import IAfterProject from './Materials/IAfterProject';
import ValueDetectMaterial from './Materials/ValueDetectMaterial';

export default class ValueDetectHelper {
  public static createDetectScene(srcScene: Scene): Scene {
    const ret = this.createValueDetectGroup(srcScene, ['#stencil#']);
    return ret as Scene;
  }

  public static createValueDetectMaterial(srcMaterial: Material): ValueDetectMaterial {
    const ap = <IAfterProject>(<unknown>srcMaterial);

    const ret = new ValueDetectMaterial({ afterProjectMatrix: ap.afterProjectMatrix, clipping: true });
    ret.clippingPlanes = srcMaterial.clippingPlanes;
    ret.stencilWrite = srcMaterial.stencilWrite;
    ret.stencilRef = srcMaterial.stencilRef;
    ret.stencilFunc = srcMaterial.stencilFunc;
    ret.stencilFail = srcMaterial.stencilFail;
    ret.stencilZFail = srcMaterial.stencilZFail;
    ret.stencilZPass = srcMaterial.stencilZPass;

    ret.name = srcMaterial.name;

    return ret;
  }

  public static createValueDetectMesh(srcMesh: Mesh): Mesh | undefined {
    const srcGeo = srcMesh.geometry;
    if (!srcGeo.hasAttribute('generic')) {
      return undefined;
    }
    const srcMaterial = srcMesh.material;
    let targetMaterial: Material | Material[];
    if (srcMaterial instanceof Array) {
      targetMaterial = new Array<ValueDetectMaterial>(srcMaterial.length);
      for (let i = 0; i < srcMaterial.length; i += 1) {
        targetMaterial[i] = ValueDetectHelper.createValueDetectMaterial(srcMaterial[i]);
      }
    } else {
      targetMaterial = ValueDetectHelper.createValueDetectMaterial(srcMaterial);
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

  public static createValueDetectGroup(
    srcGroup: Group | Scene,
    exclude: string[] | undefined = undefined
  ): Group | Scene {
    if (exclude && exclude.indexOf(srcGroup.name) >= 0) {
      return srcGroup.clone() as Group | Scene;
    }

    const ret = srcGroup instanceof Scene ? new Scene() : new Group();
    ret.name = srcGroup.name;
    ret.visible = srcGroup.visible;

    srcGroup.children.forEach((v) => {
      if (v instanceof Group || v instanceof Scene) {
        const newGroup = ValueDetectHelper.createValueDetectGroup(v, exclude);
        if (newGroup.children.length > 0) {
          newGroup.matrix = v.matrix;
          newGroup.matrixAutoUpdate = false;
          ret.add(newGroup);
        }
      } else if (v instanceof Mesh) {
        const newMesh = this.createValueDetectMesh(v);
        if (newMesh) {
          ret.add(newMesh);
        }
      }
    });

    return ret;
  }
}
