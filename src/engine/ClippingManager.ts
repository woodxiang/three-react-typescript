import {
  AlwaysStencilFunc,
  BackSide,
  DecrementWrapStencilOp,
  FrontSide,
  IncrementWrapStencilOp,
  NotEqualStencilFunc,
  ReplaceStencilOp,
} from 'three/src/constants';
import { BufferGeometry } from 'three/src/core/BufferGeometry';
import { Material } from 'three/src/materials/Material';
import { Box3 } from 'three/src/math/Box3';
import { Color } from 'three/src/math/Color';
import { Matrix4 } from 'three/src/math/Matrix4';
import { Plane } from 'three/src/math/Plane';
import { Vector3 } from 'three/src/math/Vector3';
import { Group } from 'three/src/objects/Group';
import { Mesh } from 'three/src/objects/Mesh';
import { Points } from 'three/src/objects/Points';
import ClippingActionHandler, { IClippingManager } from './ClippingActionHandler';
import ClippingBoundaryHelper from './ClippingBoundaryHelper';
import { normals } from './Geometry/boxConstants';
import IdentityPlaneBufferGeometry from './Geometry/IdentityPlaneBufferGeometry';
import { Direction, ITransformed, renderingModelName } from './interfaces';
import ISealable from './Materials/ISealable';
import MeshBasicExMaterial from './Materials/MeshBasicExMaterial';
import MeshLambertExMaterial from './Materials/MeshLambertExMaterial';
import RenderingEngine from './RenderingEngine';

export default class ClippingManager implements IClippingManager {
  private static clippingGroupName = '#clipping#';

  // the position cut on all directions.
  private wrappedClipPositions = [0, 0, 0, 0, 0, 0];

  // clip position of negative direction are negative to limit position.
  private static clipPositionMapRatio = [1, 1, 1, -1, -1, -1];

  // to indicate if the objects clipped on specified direction.
  private clipped = [false, false, false, false, false, false];

  // the group for meshes rendering the clipping surface.
  private clipGroup = new Group();

  // the clip box, same sequence to the directions
  private wrappedLimitBox: number[] = [];

  private minFragment = 1;

  private seed = 0;

  // the planes used to cut the objects, all the object to cut must apply this plane,
  // these plane is updating according to the object move/relation.
  private transformedPlanes: Plane[] = [];

  // the identity plane for rendering clipping surface. they are shared for all clipped object.
  private planeGeometries: IdentityPlaneBufferGeometry[] = [];

  private engine: RenderingEngine | undefined;

  private boundaryHelper = new ClippingBoundaryHelper();

  private clippingActionHandler = new ClippingActionHandler(this);

  constructor() {
    this.clipGroup.name = ClippingManager.clippingGroupName;
  }

  public get clipPositions(): number[] {
    return this.wrappedClipPositions;
  }

  public get limitBox(): number[] {
    return this.wrappedLimitBox;
  }

  /**
   * bind these object to rendering engine to enable clipping function
   * @param root the root group for all rendering objects in the scene. share rotation and translate action.
   */
  public bind(engine: RenderingEngine | undefined): void {
    if (this.engine === engine) {
      return;
    }

    if (this.engine) {
      this.unbindEvents();
      this.engine.enableClipping = false;
      // clear
      const { root } = this.engine;
      const modelsGroup = root.children.find((v) => v.name === renderingModelName);
      if (!modelsGroup) {
        throw Error('model group not exists.');
      }

      modelsGroup.children.forEach((v) => {
        const m = v as Mesh;
        if (m) {
          this.unApplyClip(m);
        }
      });

      this.seed = 0;
      this.wrappedLimitBox.splice(0, this.wrappedLimitBox.length);
      const index = this.engine.root.children.indexOf(this.clipGroup);
      this.engine.root.children.splice(index, 1);
      this.clipGroup.clear();
      this.transformedPlanes.splice(0, this.transformedPlanes.length);
      this.planeGeometries.splice(0, this.planeGeometries.length);

      this.boundaryHelper.bind(undefined);
      this.engine.removeActionHandler(this.clippingActionHandler);
    }

    this.engine = engine;
    if (this.engine) {
      const { root } = this.engine;

      if (!root) {
        throw Error('invalid root');
      }

      this.bindEvents();

      this.engine.enableClipping = true;

      for (let i = 0; i < this.wrappedClipPositions.length; i += 1) {
        this.transformedPlanes.push(
          new Plane(
            new Vector3(...normals[i]).multiplyScalar(-1),
            this.wrappedClipPositions[i] * ClippingManager.clipPositionMapRatio[i]
          )
        );
      }

      for (let dir = 0; dir < 6; dir += 1) {
        this.planeGeometries.push(new IdentityPlaneBufferGeometry(dir));
      }

      // there is an clipping manager bound.
      if (root.children.findIndex((v) => v.name === ClippingManager.clippingGroupName) >= 0) {
        throw Error('clipping group already. exists.');
      }

      root.add(this.clipGroup);

      const modelsGroup = root.children.find((v) => v.name === renderingModelName);
      if (!modelsGroup) {
        throw Error('model group not exists.');
      }

      // add the clipping surfaces for each object to clip
      for (let iMesh = 0; iMesh < modelsGroup.children.length; iMesh += 1) {
        const mesh = <Mesh>modelsGroup.children[iMesh];
        this.applyClip(mesh);
      }

      if (this.engine.boundingBox) {
        this.updateClippingRange(this.engine.boundingBox);
      }

      this.updateAllPlaneMesh();

      this.updatePlaneTransformMatrix(this.engine.matrix);

      this.boundaryHelper.bind(this.engine);
      this.boundaryHelper.update(this.wrappedClipPositions);

      this.engine.addActionHandler(this.clippingActionHandler);
    }
  }

  private bindEvents() {
    if (this.engine) {
      this.engine.meshAddedEvent.add(this.applyClip);
      this.engine.meshRemovedEvent.add(this.remove);
      this.engine.meshVisibleChangedEvent.add(this.onVisibleChanged);
      this.engine.domainRangeChangedEvent.add(this.updateClippingRange);
      this.engine.objectTransformChangedEvent.add(this.applyTransform);
    }
  }

  private unbindEvents() {
    if (this.engine) {
      this.engine.meshAddedEvent.remove(this.applyClip);
      this.engine.meshRemovedEvent.remove(this.remove);
      this.engine.meshVisibleChangedEvent.remove(this.onVisibleChanged);
      this.engine.domainRangeChangedEvent.remove(this.updateClippingRange);
      this.engine.objectTransformChangedEvent.remove(this.applyTransform);
    }
  }

  private onVisibleChanged = (args: { target: string; visible: boolean } | undefined): void => {
    if (args !== undefined) {
      const { target, visible } = args;
      const t = this.clipGroup.children.find((v) => v.name === target);
      if (t) {
        t.visible = visible;
      }
    }
  };

  public set enableAction(enable: boolean) {
    this.clippingActionHandler.isEnabled = enable;
    this.boundaryHelper.visible = enable;
  }

  public get enableAction(): boolean {
    return this.clippingActionHandler.isEnabled;
  }

  /**
   * update the clipping position
   * @param dir the direction of clipping.
   * @param newValue the clipping position on this direction.
   */
  public updateClip(dir: Direction, newValue: number): void {
    if (dir <= Direction.ZPositive) {
      // positive direction
      if (newValue === this.wrappedClipPositions[dir]) {
        // No change.
        return;
      }

      const otherDir = dir + 3;

      if (newValue > this.limitBox[dir]) {
        // too large;
        this.wrappedClipPositions[dir] = this.limitBox[dir];
      } else if (newValue < this.wrappedClipPositions[otherDir] + this.minFragment) {
        // smaller than negative clip position. move other side at the same time.
        let newOtherClippingPosition = newValue - this.minFragment;
        let newThisClippingPosition = newValue;
        if (newOtherClippingPosition < this.limitBox[otherDir]) {
          // out of range from other side. update these two values.
          newOtherClippingPosition = this.limitBox[otherDir];
          newThisClippingPosition = this.limitBox[otherDir] + this.minFragment;
        }
        this.wrappedClipPositions[otherDir] = newOtherClippingPosition;
        this.wrappedClipPositions[dir] = newThisClippingPosition;

        this.clipped[otherDir] = this.wrappedClipPositions[otherDir] !== this.limitBox[otherDir];
      } else {
        // just in range
        this.wrappedClipPositions[dir] = newValue;
      }
      this.clipped[dir] = this.wrappedClipPositions[dir] !== this.limitBox[dir];
    } else {
      // negative direction
      if (newValue === this.wrappedClipPositions[dir]) {
        // No change.
        return;
      }

      const otherDir = dir - 3;

      if (newValue < this.limitBox[dir]) {
        // too small;
        this.wrappedClipPositions[dir] = this.limitBox[dir];
      } else if (newValue > this.wrappedClipPositions[otherDir] - this.minFragment) {
        // larger than position clip position. move other side at the same time.
        let newOtherClippingPosition = newValue + this.minFragment;
        let newThisClippingPosition = newValue;
        if (newOtherClippingPosition > this.limitBox[otherDir]) {
          // out of range from other side. update these two values.
          newOtherClippingPosition = this.limitBox[otherDir];
          newThisClippingPosition = this.limitBox[otherDir] - this.minFragment;
        }
        this.wrappedClipPositions[otherDir] = newOtherClippingPosition;
        this.wrappedClipPositions[dir] = newThisClippingPosition;

        this.clipped[dir] = this.wrappedClipPositions[dir] !== this.limitBox[dir];
      } else {
        // just in range
        this.wrappedClipPositions[dir] = newValue;
      }

      this.clipped[dir] = this.wrappedClipPositions[dir] !== this.limitBox[dir];
    }

    this.updateAllPlaneMesh();
    if (this.engine) this.updatePlaneTransformMatrix(this.engine.matrix);
    this.boundaryHelper.update(this.wrappedClipPositions);
  }

  /**
   * apply clipping to specified object.
   * @param mesh the specified object to clip
   */
  private applyClip = (mesh: Mesh | Points | undefined): void => {
    if (mesh !== undefined) {
      const id = this.seed;
      this.seed += 1;
      const { material } = mesh;
      if (material instanceof Array) {
        const materials = material as Array<Material>;
        materials.forEach((mat) => {
          const m = mat;
          m.clippingPlanes = this.transformedPlanes;
        });
      } else {
        material.clippingPlanes = this.transformedPlanes;
      }

      this.clipGroup.add(this.createClippingSurfaces(mesh, id));
      this.updateClippingPlane(mesh);
    }
  };

  /**
   * remove clipping objects related to the specified mesh.
   * @param mesh the specified mesh.
   */
  private unApplyClip = (mesh: Mesh | Points | undefined): void => {
    if (mesh !== undefined) {
      const { material } = mesh;
      if (material instanceof Array) {
        const materials = material as Array<Material>;
        materials.forEach((mat) => {
          const m = mat;
          m.clippingPlanes = null;
        });
      } else {
        material.clippingPlanes = null;
      }
      const index = this.clipGroup.children.findIndex((v) => v.name === mesh.name);
      this.clipGroup.children.splice(index, 1);
    }
  };

  /**
   * invoke when mesh was removed.
   * @param name the name of the mesh to remove
   */
  private remove = (name: string | string[] | undefined): void => {
    if (name !== undefined) {
      const nameList: string[] = [];
      if (name instanceof Array) {
        nameList.push(...name);
      } else {
        nameList.push(name);
      }

      nameList.forEach((objectName) => {
        const index = this.clipGroup.children.findIndex((v) => v.name === objectName);
        if (index >= 0) {
          this.clipGroup.children.splice(index, 1);
        }
      });
    }
  };

  /**
   * invoke whenever the domain range changed.
   * @param boundingBox the bounding box of all the objects. to limit the clipping boundary.
   * @param maxDim maximum length in all dimension.
   */
  private updateClippingRange = (boundingBox: Box3 | undefined): void => {
    if (boundingBox !== undefined) {
      const limitBox = boundingBox.clone();

      const sz = new Vector3();
      limitBox.getSize(sz);
      const maxDim = Math.max(sz.x, Math.max(sz.y, sz.z));

      this.minFragment = maxDim * 0.1;

      // expend default limit to avoid z 1% fight
      limitBox.expandByScalar(this.minFragment);
      this.wrappedLimitBox = [
        limitBox.max.x,
        limitBox.max.y,
        limitBox.max.z,
        limitBox.min.x,
        limitBox.min.y,
        limitBox.min.z,
      ];

      // the constant is the distance to origin
      for (let i = 0; i < this.wrappedClipPositions.length; i += 1) {
        if (!this.clipped[i]) {
          this.wrappedClipPositions[i] = this.wrappedLimitBox[i];
        }
      }
    } else {
      this.wrappedClipPositions = [0, 0, 0, 0, 0, 0];
    }

    this.boundaryHelper.update(this.wrappedClipPositions);
  };

  /**
   * invoke whenever object moved.
   * @param matrix the matrix to rotate or translate objects.
   */
  private applyTransform = (matrix: Matrix4 | undefined): void => {
    if (matrix !== undefined) {
      this.updatePlaneTransformMatrix(matrix);
    }
  };

  /**
   * The clipping planes will not transform with the matrix of their
   * related mesh.
   * update the transform matrix for clipping planes.
   * @param matrix the matrix to apply to clipping planes
   */
  private updatePlaneTransformMatrix(matrix: Matrix4) {
    if (this.wrappedClipPositions) {
      for (let i = 0; i < this.wrappedClipPositions.length; i += 1) {
        const v = this.wrappedClipPositions[i] * ClippingManager.clipPositionMapRatio[i];
        const t = this.transformedPlanes[i];
        t.copy(new Plane(new Vector3(...normals[i]).multiplyScalar(-1), v).applyMatrix4(matrix));
      }
    }
  }

  /**
   * to create the meshes to render the clipping surface.
   * @param mesh the mesh to clip
   * @param iMesh the index of the mesh.
   */
  private createClippingSurfaces(mesh: Mesh | Points, iMesh: number): Group {
    const targetGroup = new Group();
    targetGroup.name = mesh.name;
    targetGroup.visible = mesh.visible;
    const stencilGroup = new Group();
    stencilGroup.name = '#stencil#';
    targetGroup.add(stencilGroup);
    const planeMeshGroup = new Group();
    planeMeshGroup.name = '#planes#';
    targetGroup.add(planeMeshGroup);

    for (let i = 0; i < this.wrappedClipPositions.length; i += 1) {
      const plane = this.transformedPlanes[i];
      const stencilPlaneGroup = this.createPlaneStencilGroup(mesh.geometry, plane, iMesh * 6 + i + 1);

      const mat = mesh.material instanceof Array ? mesh.material[0] : mesh.material;

      const v = (mat as unknown) as ISealable;

      const planeMat =
        v.isSealable === undefined || v.isSealable
          ? mat.clone()
          : new MeshLambertExMaterial({
              diffuse: new Color('blue'),
              clipping: true,
              lights: true,
              afterProjectMatrix: this.engine?.afterProjectMatrix,
            });

      const planeGeom = this.planeGeometries[i];

      planeMat.clippingPlanes = this.transformedPlanes.filter((p) => p !== plane);
      planeMat.stencilWrite = true;
      planeMat.stencilRef = 0;
      planeMat.stencilFunc = NotEqualStencilFunc;
      planeMat.stencilFail = ReplaceStencilOp;
      planeMat.stencilZFail = ReplaceStencilOp;
      planeMat.stencilZPass = ReplaceStencilOp;

      const po = new Mesh(planeGeom, planeMat);
      po.name = mesh.name;
      po.onAfterRender = (renderer) => {
        renderer.clearStencil();
      };

      po.renderOrder = iMesh * 6 + i + 1.1;
      stencilGroup.add(stencilPlaneGroup);
      planeMeshGroup.add(po);
    }

    return targetGroup;
  }

  /**
   * apply transform matrix to surfaces.
   */
  private updateAllPlaneMesh(): void {
    const planeMatrix = this.generatePlaneMatrix();

    this.clipGroup.children.forEach((v) => {
      const g = v as Group;
      if (g) {
        ClippingManager.applyPlaneGroupMatrix(g, planeMatrix);
      }
    });
  }

  private updateClippingPlane(mesh: Mesh | Points): void {
    const { name } = mesh;
    const group = this.clipGroup.children.find((v) => v.name === name) as Group;
    if (group) {
      ClippingManager.applyPlaneGroupMatrix(group, this.generatePlaneMatrix());
    }
  }

  private static applyPlaneGroupMatrix(v: Group, planeMatrix: Matrix4): void {
    const planeGroup = v.children.find((v1) => v1.name === '#planes#');

    if (planeGroup) {
      planeGroup.matrix = planeMatrix;
      planeGroup.matrixAutoUpdate = false;
      planeGroup?.children.forEach((v1) => {
        const m = v1 as Mesh;
        if (m) {
          if (m.material instanceof Array) {
            m.material.forEach((m1) => {
              const tmp = <ITransformed>(<unknown>m1);
              tmp.objectTransform = planeMatrix;
            });
          } else {
            (<ITransformed>(<unknown>m.material)).objectTransform = planeMatrix;
          }
        }
      });
    }
  }

  private generatePlaneMatrix() {
    const planeMatrix = new Matrix4();
    planeMatrix.scale(
      new Vector3(
        this.wrappedClipPositions[0] - this.wrappedClipPositions[3],
        this.wrappedClipPositions[1] - this.wrappedClipPositions[4],
        this.wrappedClipPositions[2] - this.wrappedClipPositions[5]
      )
    );

    planeMatrix.setPosition(
      new Vector3(this.wrappedClipPositions[3], this.wrappedClipPositions[4], this.wrappedClipPositions[5])
    );
    return planeMatrix;
  }

  private createPlaneStencilGroup(geometry: BufferGeometry, plane: Plane, renderOrder: number): Group {
    if (!this.engine) {
      throw Error('none engine.');
    }
    const group = new Group();
    const baseMat = new MeshBasicExMaterial({ afterProjectMatrix: this.engine.afterProjectMatrix, clipping: true });
    baseMat.depthWrite = false;
    baseMat.depthTest = false;
    baseMat.colorWrite = false;
    baseMat.stencilWrite = true;
    baseMat.stencilFunc = AlwaysStencilFunc;

    // back faces
    const mat0 = baseMat.clone();
    mat0.side = BackSide;
    mat0.clippingPlanes = [plane];
    mat0.stencilFail = IncrementWrapStencilOp;
    mat0.stencilZFail = IncrementWrapStencilOp;
    mat0.stencilZPass = IncrementWrapStencilOp;

    const mesh0 = new Mesh(geometry, mat0);
    mesh0.renderOrder = renderOrder;
    group.add(mesh0);

    // front faces
    const mat1 = baseMat.clone();
    mat1.side = FrontSide;
    mat1.clippingPlanes = [plane];
    mat1.stencilFail = DecrementWrapStencilOp;
    mat1.stencilZFail = DecrementWrapStencilOp;
    mat1.stencilZPass = DecrementWrapStencilOp;

    const mesh1 = new Mesh(geometry, mat1);
    mesh1.renderOrder = renderOrder;

    group.add(mesh1);

    return group;
  }
}
