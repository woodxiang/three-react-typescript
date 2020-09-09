import React from 'react';
import * as THREE from 'three';
import { WEBGL } from 'three/examples/jsm/WebGL';

export default class RenderingView extends React.Component {
  private renderDiv: HTMLDivElement | null = null;

  private init(newDiv: HTMLDivElement | null) {
    this.renderDiv = newDiv;
    if (this.renderDiv) {
      const width = this.renderDiv.clientWidth;
      const height = this.renderDiv.clientHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

      const renderer = new THREE.WebGLRenderer();
      renderer.setSize(width, height);
      this.renderDiv.appendChild(renderer.domElement);

      const geometry = new THREE.BoxGeometry();
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);

      camera.position.z = 5;

      const animate = () => {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.02;
        cube.rotation.z += 0.03;

        renderer.render(scene, camera);
      };
      animate();
    }
  }

  render() {
    if (!WEBGL.isWebGL2Available()) {
      return <div ref={(element) => this.init(element)} />;
    }

    return <div ref={(element) => this.init(element)} />;
  }
}
