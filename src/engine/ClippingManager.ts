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
import { MeshBasicMaterial } from 'three/src/materials/MeshBasicMaterial';
import { Box3 } from 'three/src/math/Box3';
import { Matrix4 } from 'three/src/math/Matrix4';
import { Plane } from 'three/src/math/Plane';
import { Vector3 } from 'three/src/math/Vector3';
import { Group } from 'three/src/objects/Group';
import { Mesh } from 'three/src/objects/Mesh';
import { Points } from 'three/src/objects/Points';
import { normals } from './Geometry/boxConstants';
import IdentityPlaneBufferGeometry from './Geometry/IdentityPlaneBufferGeometry';
import { Direction, renderingModelName } from './interfaces';
import RenderingEngine from './RenderingEngine';

export default class ClippingManager {
  private static clippingGroupName = '#clipping#';

  // the position cut on all directions.
  private clipPositions = [0, 0, 0, 0, 0, 0];

  // to indicate if the objects clipped on specified direction.
  private cliped = [false, false, false, false, false, false];

  // the group for meshes rendering the clipping surface.
  private clipGroup = new Group();

  // the clip box, same sequence to the directions
  private limitBox: number[] = [];

  private minFragment = 1;

  private seed = 0;

  // the planes used to cut the objects, all the object to cut must apply this plane,
  // these plane is updating according to the object move/relation.
  private transformedPlanes: Plane[] = [];

  // the identity plane for rendering clipping surface. they are shared for all clipped object.
  private planeGeoms: IdentityPlaneBufferGeometry[] = [];

  private engine: RenderingEngine | undefined;

  constructor() {
    this.clipGroup.name = ClippingManager.clippingGroupName;
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
      this.seed = 0;
      this.limitBox.splice(0, this.limitBox.length);
      const index = this.engine.root.children.indexOf(this.clipGroup);
      this.engine.root.children.splice(index, 1);
      this.clipGroup.clear();
      this.transformedPlanes.splice(0, this.transformedPlanes.length);
      this.planeGeoms.splice(0, this.planeGeoms.length);
    }

    this.engine = engine;
    if (this.engine) {
      const { root } = this.engine;

      if (!root) {
        throw Error('invalid root');
      }

      this.bindEvents();

      this.engine.enableClipping = true;

      for (let i = 0; i < this.clipPositions.length; i += 1) {
        this.transformedPlanes.push(new Plane(new Vector3(...normals[i]).multiplyScalar(-1), this.clipPositions[i]));
      }

      for (let dir = 0; dir < 6; dir += 1) {
        this.planeGeoms.push(new IdentityPlaneBufferGeometry(dir));
      }

      // there is an clipping manager binded.
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
        if (mesh) {
          this.clipGroup.add(this.createClippingSurfaces(mesh, iMesh));
        }
      }
    }
  }

  private bindEvents() {
    if (this.engine) {
      this.engine.meshAddedEvent.add(this.applyClip);
      this.engine.meshRemovingEvent.add(this.remove);
      this.engine.meshVisibleChangedEvent.add(this.onVisibleChanged);
      this.engine.domainRangeChangedEvent.add(this.updateClippingRange);
      this.engine.objectTransformChangedEvent.add(this.applyTransform);
    }
  }

  private unbindEvents() {
    if (this.engine) {
      this.engine.meshAddedEvent.remove(this.applyClip);
      this.engine.meshRemovingEvent.remove(this.remove);
      this.engine.meshVisibleChangedEvent.remove(this.onVisibleChanged);
      this.engine.domainRangeChangedEvent.remove(this.updateClippingRange);
      this.engine.objectTransformChangedEvent.remove(this.applyTransform);
    }
  }

  private onVisibleChanged(args: { target: string; visible: boolean } | undefined): void {
    if (args !== undefined) {
      const { target, visible } = args;
      const t = this.clipGroup.children.find((v) => v.name === target);
      if (t) {
        t.visible = visible;
      }
    }
  }

  /**
   * update the clipping position
   * @param dir the direction of clipping.
   * @param newValue the clipping position on this direction.
   */
  public updateClip(dir: Direction, newValue: number): void {
    if (dir <= Direction.ZPositive) {
      if (newValue > this.limitBox[dir]) {
        this.clipPositions[dir] = this.limitBox[dir];
      } else if (newValue < -this.limitBox[dir + 3] + this.minFragment) {
        this.clipPositions[dir] = -this.limitBox[dir + 3] + this.minFragment;
        this.clipPositions[dir + 3] = this.limitBox[dir + 3];
      } else {
        if (newValue < this.clipPositions[dir + 3] - this.minFragment) {
          this.clipPositions[dir + 3] = -newValue + this.minFragment;
        }

        this.clipPositions[dir] = newValue;
      }
    } else {
      const corrected = -newValue;
      if (corrected > this.limitBox[dir]) {
        this.clipPositions[dir] = this.limitBox[dir];
      } else if (corrected < -this.limitBox[dir - 3] + this.minFragment) {
        this.clipPositions[dir] = -this.limitBox[dir - 3] + this.minFragment;
        this.clipPositions[dir - 3] = this.limitBox[dir - 3];
      } else {
        if (corrected < this.clipPositions[dir - 3] - this.minFragment) {
          this.clipPositions[dir - 3] = -corrected + this.minFragment;
        }

        this.clipPositions[dir] = corrected;
      }
    }
  }

  /**
   * apply clipping to specified object.
   * @param mesh the specifed object to clip
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

      this.updateAllPlaneMesh();
    }
  };

  /**
   * invoke when mesh was removed.
   * @param name the name of the mesh to remove
   */
  private remove = (name: string | undefined): void => {
    if (name !== undefined) {
      const index = this.clipGroup.children.findIndex((v) => v.name === name);
      if (index >= 0) {
        this.clipGroup.children.splice(index, 1);
      }
    }
  };

  /**
   * invoke whenever the domain range changed.
   * @param boundingBox the bounding box of all the objects. to limit the clipping boundary.
   * @param maxDim maximum length in all dimension.
   */
  private updateClippingRange = (range: { boundingBox: Box3; maxDim: number } | undefined): void => {
    if (range !== undefined) {
      const { boundingBox, maxDim } = range;
      const limitBox = boundingBox.clone();

      this.minFragment = maxDim * 0.1;

      // expend default limit to avoid z 1% fight
      limitBox.expandByScalar(-this.minFragment);
      this.limitBox = [limitBox.max.x, limitBox.max.y, limitBox.max.z, limitBox.min.x, limitBox.min.y, limitBox.min.z];

      // the constant is the distance to origin
      for (let i = 0; i < this.clipPositions.length; i += 1) {
        if (!this.cliped[i]) this.clipPositions[i] = i < 3 ? this.limitBox[i] : -this.limitBox[i];
      }
    }
  };

  /**
   * invoke whenever object moved.
   * @param matrix the matrix to rotate or translate objects.
   */
  private applyTransform = (matrix: Matrix4 | undefined): void => {
    if (matrix !== undefined) {
      if (this.clipPositions) {
        for (let i = 0; i < this.clipPositions.length; i += 1) {
          const v = this.clipPositions[i];
          const t = this.transformedPlanes[i];
          t.copy(new Plane(new Vector3(...normals[i]).multiplyScalar(-1), v).applyMatrix4(matrix));
        }
      }
    }
  };

  /**
   * to create the meshes to render the clipping surface.
   * @param mesh the mesh to clip
   * @param iMesh the index of the mesh.
   */
  private createClippingSurfaces(mesh: Mesh | Points, iMesh: number): Group {
    const targetGroup = new Group();
    targetGroup.name = mesh.name;
    const stencilGroup = new Group();
    stencilGroup.name = '#stencil#';
    targetGroup.add(stencilGroup);
    const planeMeshGroup = new Group();
    planeMeshGroup.name = '#planes#';
    targetGroup.add(planeMeshGroup);

    for (let i = 0; i < this.clipPositions.length; i += 1) {
      const plane = this.transformedPlanes[i];
      const stencilPlaneGroup = ClippingManager.createPlaneStencilGroup(mesh.geometry, plane, iMesh * 6 + i + 1);

      const mat = mesh.material instanceof Array ? mesh.material[0] : mesh.material;

      const planeMat = mat.clone();

      const planeGeom = this.planeGeoms[i];

      planeMat.clippingPlanes = this.transformedPlanes.filter((p) => p !== plane);
      planeMat.stencilWrite = true;
      planeMat.stencilRef = 0;
      planeMat.stencilFunc = NotEqualStencilFunc;
      planeMat.stencilFail = ReplaceStencilOp;
      planeMat.stencilZFail = ReplaceStencilOp;
      planeMat.stencilZPass = ReplaceStencilOp;

      const po = new Mesh(planeGeom, planeMat);
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
    this.clipGroup.children.forEach((v) => {
      const planeGroup = v.children.find((v1) => v1.name === '#planes#');

      const planeMatrix = new Matrix4();
      planeMatrix.scale(
        new Vector3(
          this.limitBox[0] - this.limitBox[3],
          this.limitBox[1] - this.limitBox[4],
          this.limitBox[2] - this.limitBox[5]
        )
      );

      planeMatrix.setPosition(new Vector3(this.limitBox[3], this.limitBox[4], this.limitBox[5]));
      if (planeGroup) {
        planeGroup.matrix = planeMatrix;
        planeGroup.matrixAutoUpdate = false;
      }
    });
  }

  private static createPlaneStencilGroup(geometry: BufferGeometry, plane: Plane, renderOrder: number): Group {
    const group = new Group();
    const baseMat = new MeshBasicMaterial();
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
