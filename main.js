// Basic Three.js project skeleton

import * as THREE from 'three';
import { Entity } from './entity.js';
import { context } from './init.js';
import { createPostProcessing } from './postProcessing.js';

// unwrap context for readability
const {
  scene,
  camera,
  renderer,
  entityList,
  time,
} = context;

// Create post-processing composer
const composer = createPostProcessing(scene, camera, renderer);

entityList.forEach(entity => {
  if (entity.object && entity.object.isMesh) {
    scene.add(entity.object);
  }
  entity.Start();
});

// Handle window resize
window.addEventListener('resize', () => {
  const aspect = window.innerWidth / window.innerHeight;
  
  if (camera instanceof THREE.OrthographicCamera) {
    // Orthographic camera resize handling
    const frustumSize = 10; // This is your half-height value from camera creation
    
    if (aspect >= 1) {
      // Width greater than height, adjust horizontal frustum
      camera.left = -frustumSize * aspect;
      camera.right = frustumSize * aspect;
      camera.top = frustumSize;
      camera.bottom = -frustumSize;
    } else {
      // Height greater than width, adjust vertical frustum
      camera.left = -frustumSize;
      camera.right = frustumSize;
      camera.top = frustumSize / aspect;
      camera.bottom = -frustumSize / aspect;
    }
    camera.updateProjectionMatrix();
    
  } else if (camera instanceof THREE.PerspectiveCamera) {
    // Perspective camera resize handling
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }
  
  // Common for both camera types
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Trigger resize once on startup to set the correct aspect ratio
window.dispatchEvent(new Event('resize'));

function animate() {
  requestAnimationFrame(animate);

  // Update deltaTime
  time.update();

  // Update entities
  entityList.forEach(entity => {
    entity.Update();
  });

  // Use composer instead of renderer directly
  composer.render();
}
animate();

