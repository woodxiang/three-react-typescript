import React from 'react';
import * as THREE from 'three';

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
        renderer.render(scene, camera);
      };
      animate();
    }
  }

  render() {
    return <div ref={(element) => this.init(element)} />;
  }
}
