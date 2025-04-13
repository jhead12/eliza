import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ThreeJsBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (containerRef.current) {
      containerRef.current.appendChild(renderer.domElement);
    }

    const blocks: THREE.Mesh[] = [];
    const blockGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const blockMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.7,
    });

    const createBlock = () => {
      const block = new THREE.Mesh(blockGeometry, blockMaterial);
      block.position.x = (Math.random() - 0.5) * 20;
      block.position.y = 15;
      block.position.z = (Math.random() - 0.5) * 10;
      scene.add(block);
      blocks.push(block);
    };

    for (let i = 0; i < 20; i++) {
      createBlock();
    }

    camera.position.z = 10;

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      blocks.forEach((block, index) => {
        block.position.y -= 0.1;
        block.rotation.x += 0.05;
        block.rotation.y += 0.05;

        if (block.position.y < -15) {
          scene.remove(block);
          blocks.splice(index, 1);
          createBlock();
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return <div id="threejs-container" ref={containerRef} />;
};

export default ThreeJsBackground;