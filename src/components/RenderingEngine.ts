import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';

/**
 * Rendering Engine
 */
export default class RenderingEngine {
  private scene: THREE.Scene | undefined;

  private camera: THREE.PerspectiveCamera | undefined;

  private renderer: THREE.WebGLRenderer | undefined;

  /**
   * initialize the rendering environment.
   * @param div the div element to rendering in.
   * @param width width of the rendering window
   * @param height height of the rendering window
   */
  public init(div: HTMLDivElement, width: number, height: number): void {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(width, height);

    div.appendChild(this.renderer.domElement);

    this.camera.position.z = 5;
  }

  /**
   * draw a test cube.
   */
  public drawCube(): void {
    if (!this.scene) {
      throw Error('Scene not initialized.');
    }
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    this.scene.add(cube);
  }

  /**
   * to draw a object.
   * @param toDraw object to draw
   */
  public drawObject(toDraw: ArrayBuffer | null): void {
    if (toDraw == null) {
      return;
    }
    const loader = new STLLoader();
    const geometry = loader.parse(toDraw);
    if (this.scene && geometry) {
      const material = new THREE.MeshPhongMaterial({
        color: 0xff5533,
        specular: 0x111111,
        shininess: 200,
      });
      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.set(0, -0.25, 0.6);
      mesh.rotation.set(0, -Math.PI / 2, 0);
      mesh.scale.set(0.5, 0.5, 0.5);

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      this.scene.add(mesh);
    }
  }

  /**
   * start animation.
   */
  public startAnimate(): void {
    if (!(this.renderer && this.scene && this.camera)) {
      throw new Error('Invalid renderer');
    }
    // const cube = this.scene.children[0];

    const update = () => {
      // cube.rotateX(0.01);
      // cube.rotateY(0.02);
      // cube.rotateZ(0.03);
    };

    const animate = () => {
      if (!this) throw new Error('invalid this pointer');
      if (!(this.renderer && this.scene && this.camera)) {
        throw new Error('Invalid renderer');
      }
      requestAnimationFrame(animate);

      update();

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  /**
   * handle window size changed.
   * @param width new width
   * @param height new height
   */
  public resize(width: number, height: number): void {
    if (this.camera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    if (this.renderer) this.renderer.setSize(width, height);
  }
}
