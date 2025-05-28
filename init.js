import * as THREE from 'three';
import { Entity } from './entity.js';

// User configures initial entities here
const entityList = [];

//----------------------------------
// Scene - moved up before any scene.add() calls
const scene = new THREE.Scene();

import { ControllableBox } from './Assets/controllableBox.js';

const playerBox = new ControllableBox('PlayerBox');
playerBox.Init(); // Call Init to create the mesh
playerBox.position.set(0, 0.5, 0); // Set initial position

entityList.push(playerBox);


import { Plane } from './Assets/plane.js';
const groundPlane = new Plane('GroundPlane', 2000, 2000);
groundPlane.Init(); // Call Init to create the mesh
entityList.push(groundPlane);



import { Pillar } from './Assets/pillar.js';
for (let i = 0; i < 5; i++) {
    const pillar = new Pillar(`Pillar${i + 1}`, 0.5, 5);
    pillar.Init(); // Call Init to create the mesh
    pillar.position.set(Math.random() * 20 - 10, pillar.height / 2, Math.random() * 10 - 5); // Random position
    entityList.push(pillar);
}

// In init.js
import { TileMap, TileType } from './Assets/road.js';

// Create a 20x20 tilemap with 1-unit sized tiles
const tileMap = new TileMap('WorldMap', 20, 20, 1);

// Fill the world with grass
tileMap.fillGrid(TileType.GRASS);

// Create some water
tileMap.fillArea(5, 5, 10, 8, TileType.WATER);

// Create roads
tileMap.createPath(0, 3, 19, 3, TileType.ROAD);  // Horizontal road
tileMap.createPath(10, 0, 10, 19, TileType.ROAD); // Vertical road

// Add to scene
scene.add(tileMap.object);

import { CameraControl } from './Assets/cameraControl.js';
const cameraControl = new CameraControl('CameraControl', 5);
cameraControl.Init(); // Call Init to create the mesh
cameraControl.target = playerBox; // Set the target to the player box
entityList.push(cameraControl);

const lights = {
    noon: {
        ambient: {color: 0xa3d3ff, intensity: 1},
        directional: {
            color: 0xfff5cc, 
            intensity: 4,
            position: new THREE.Vector3(-10, 20, 10)
        }
    },
    sunset: {
        ambient: {color: 0xa3d3ff, intensity: 1},
        directional: {
            color: 0xffd6b0, 
            intensity: 5,   
            position: new THREE.Vector3(10, 5, -20)
        }
    },
    night: {
        ambient: {color: 0x0a1929, intensity: 50},
        directional: {
            color: 0xc7ebff, 
            intensity: 1,
            position: new THREE.Vector3(-5, 15, 5)
        }
    }
};

// Current lighting mode
let currentLightingMode = 'noon';

// Add lighting
const ambientLight = new THREE.AmbientLight(
    lights[currentLightingMode].ambient.color, 
    lights[currentLightingMode].ambient.intensity
);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(
    lights[currentLightingMode].directional.color, 
    lights[currentLightingMode].directional.intensity
);
directionalLight.position.copy(lights[currentLightingMode].directional.position);
directionalLight.target.position.set(0, 0, 0);
directionalLight.castShadow = true;
directionalLight.shadow.radius = 8; // Soft shadow edge blur
directionalLight.shadow.bias = -0.0005; // Reduce shadow acne

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
// const camera = new THREE.PerspectiveCamera(
//     75, // Field of view
//     window.innerWidth / window.innerHeight, // Aspect ratio
//     0.1, // Near clipping plane
//     1000 // Far clipping plane
// );
camera.position.set(10, 10, 10); // Set camera position
camera.lookAt(new THREE.Vector3(0, 0, 0)); // Look at the origin


// Renderer
const renderer = new THREE.WebGLRenderer({
    antialias: false // Disable antialiasing for pixelated look
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;   // soft penumbra
renderer.setSize(window.innerWidth, window.innerHeight);

// Set texture filtering to nearest for sharp pixels
// renderer.outputEncoding = THREE.LinearEncoding;
// THREE.defaultTextureFilter = THREE.NearestFilter;

document.body.appendChild(renderer.domElement);

// Time tracking for deltaTime
const clock = new THREE.Clock();

// Initialize time
clock.current = performance.now() / 1000;
clock.previous = clock.current;

const context = {
    scene,
    camera,
    renderer,
    entityList,
    clock
};

// Export the entity list for main.js to use
export { context };