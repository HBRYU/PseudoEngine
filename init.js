import * as THREE from 'three';
import { Entity } from './entity.js';

// User configures initial entities here
const entityList = [];

import { ControllableBox } from './Assets/controllableBox.js';

const playerBox = new ControllableBox('PlayerBox');
playerBox.Init(); // Call Init to create the mesh
playerBox.position.set(0, 0.5, 0); // Set initial position

entityList.push(playerBox);


import { Plane } from './Assets/plane.js';
const groundPlane = new Plane('GroundPlane', 20, 20);
groundPlane.Init(); // Call Init to create the mesh
entityList.push(groundPlane);


//----------------------------------
// Scene
const scene = new THREE.Scene();

// Add lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(10, 20, -20);
directionalLight.target.position.set(0, 0, 0);
directionalLight.castShadow = true;

// bigger shadow map for smoother edges
directionalLight.shadow.mapSize.set(1024, 1024);

// orthographic volume that encloses the whole level
const cam = directionalLight.shadow.camera;
cam.left = -20;
cam.right = 20;
cam.top = 20;
cam.bottom = -20;
cam.near = 0.1;
cam.far = 50;
cam.updateProjectionMatrix();

scene.add(directionalLight);

// Camera
const camera = new THREE.OrthographicCamera(
    -10, 10, 10, -10, 0.1, 1000
);
camera.position.set(10, 10, 10); // Set camera position
camera.lookAt(new THREE.Vector3(0, 0, 0)); // Look at the origin


// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;   // soft penumbra
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Time tracking for deltaTime
const time = {
    current: 0,
    previous: 0,
    deltaTime: 0,
    update: function () {
        this.current = performance.now() / 1000; // Convert to seconds
        this.deltaTime = this.current - this.previous;
        this.previous = this.current;
    }
};

// Initialize time
time.current = performance.now() / 1000;
time.previous = time.current;

const context = {
    scene,
    camera,
    renderer,
    entityList,
    time
};

// Export the entity list for main.js to use
export { context };