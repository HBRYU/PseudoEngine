import * as THREE from 'three';
import { Entity } from './entity.js';

// User configures initial entities here
const entityList = [];

//----------------------------------
// Scene - moved up before any scene.add() calls
const scene = new THREE.Scene();

// import { ControllableBox } from './Assets/controllableBox.js';

// const playerBox = new ControllableBox('PlayerBox');
// playerBox.Init(); // Call Init to create the mesh
// playerBox.position.set(0, 0.5, 0); // Set initial position

// entityList.push(playerBox);

import { Car } from './Assets/car.js';
const car = new Car('Car');
car.Init(); // Call Init to create the mesh
car.setScale(0.01, 0.01, 0.01); // Scale the car to be 2x larger in all dimensions
car.position.set(0, -0.2, 0); // Set initial position
entityList.push(car);


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

// // In init.js
// import { TileMap, TileType } from './Assets/road.js';

// // Create a 20x20 tilemap with 1-unit sized tiles
// const tileMap = new TileMap('WorldMap', 200, 200, 1);

// // Fill the world with grass
// tileMap.fillCheckerBoard(-100, -100, 100, 100, TileType.GRASS, TileType.SAND);

// // Create some water
// tileMap.fillArea(5, 5, 10, 8, TileType.WATER);

// // Create roads
// tileMap.createPath(0, 3, 19, 3, TileType.ROAD);  // Horizontal road
// tileMap.createPath(10, 0, 10, 19, TileType.ROAD); // Vertical road

// // Add to scene
// scene.add(tileMap.object);


import { CameraControl } from './Assets/cameraControl.js';
const cameraControl = new CameraControl('CameraControl', 5);
cameraControl.Init(); // Call Init to create the mesh
cameraControl.target = car; 
entityList.push(cameraControl);

const lights = {
    noon: {
        ambient: {color: 0xa3d3ff, intensity: 1.5},
        directional: {
            color: 0xfff5cc, 
            intensity: 4,
            position: new THREE.Vector3(-10, 20, 10)
        }
    },
    sunset: {
        ambient: {color: 0xdf95e6, intensity: 1.5},
        directional: {
            color: 0xfcba03, 
            intensity: 9,   
            position: new THREE.Vector3(10, 5, -20)
        }
    },
    night: {
        ambient: {color: 0x0a1929, intensity: 50},
        directional: {
            color: 0xc7ebff, 
            intensity: 2,
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
directionalLight.shadow.mapSize.set(2048, 2048); // Increased for better quality

// orthographic volume that encloses a large area around the scene
const cam = directionalLight.shadow.camera;
cam.left = -50;
cam.right = 50;
cam.top = 50;
cam.bottom = -50;
cam.near = 0.1;
cam.far = 100; // Increased far distance
cam.updateProjectionMatrix();

scene.add(directionalLight);

// Camera
// const camera = new THREE.OrthographicCamera(
//     -10, 10, 10, -10, 0.1, 1000
// );
const camera = new THREE.PerspectiveCamera(
    45, // Field of view
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1, // Near clipping plane
    1000 // Far clipping plane
);
camera.position.set(20, 20, 20); // Set camera position
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

// Add this to your main.js after renderer setup
function createUI() {
    // Create UI container
    const uiContainer = document.createElement('div');
    uiContainer.style.position = 'absolute';
    uiContainer.style.top = '0';
    uiContainer.style.left = '0';
    uiContainer.style.width = '100%';
    uiContainer.style.pointerEvents = 'none'; // Let clicks pass through to canvas
    document.body.appendChild(uiContainer);
    
    // Create a status panel
    const statusPanel = document.createElement('div');
    statusPanel.style.background = 'rgba(0,0,0,0.5)';
    statusPanel.style.color = 'white';
    statusPanel.style.padding = '10px';
    statusPanel.style.margin = '10px';
    statusPanel.style.borderRadius = '5px';
    statusPanel.style.fontFamily = 'monospace';
    statusPanel.style.pointerEvents = 'auto'; // This element captures clicks
    uiContainer.appendChild(statusPanel);    // Add content
    statusPanel.innerHTML = `
    <h3>Game Controls</h3>
    <p>WASD - Move car</p>
    <p>Space - Brake</p>
    <p>Click & Drag - Orbit camera (horizontal & vertical)</p>
    <p>Mouse Wheel - Zoom in/out</p>
    <p>C - Toggle stability control</p>
    <p>1/2/3 - Drift sensitivity (stable/balanced/drifty)</p>
    <div id="speed">Speed: 0 km/h</div>
    <div id="steering">Steering: 100%</div>
`;

// Return references for updating
return {
    updateSpeed: (speed) => {
        document.getElementById('speed').textContent = `Speed: ${Math.round(speed)} km/h`;
        
        // Update steering effectiveness display
        const speedInKmh = speed;
        let steeringEffectiveness;
        if (speedInKmh < 30) {
            steeringEffectiveness = 100;
        } else if (speedInKmh < 80) {
            steeringEffectiveness = 100 - ((speedInKmh - 30) / 50) * 40;
        } else {
            steeringEffectiveness = 60 - ((speedInKmh - 80) / 40) * 30;
            steeringEffectiveness = Math.max(30, steeringEffectiveness);
        }
        
        const steeringElement = document.getElementById('steering');
        if (steeringElement) {
            steeringElement.textContent = `Steering: ${Math.round(steeringEffectiveness)}%`;
        }
    },
    toggleUI: (enable) => {
        uiContainer.style.display = enable ? 'block' : 'none';
    }
};
}

// Use it in your main loop
export const ui = createUI();
ui.toggleUI(true); // Show UI on startup


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

// Export the context for main.js to use
export { context };


// Then make sure to update the helper in your animation loop:
function updateLightingForCamera(cameraPosition) {
    // Update directional light position to be relative to camera
    directionalLight.position.set(
        cameraPosition.x + lights[currentLightingMode].directional.position.x,
        lights[currentLightingMode].directional.position.y,
        cameraPosition.z + lights[currentLightingMode].directional.position.z
    );
    
    // Update light target to follow camera XZ
    directionalLight.target.position.set(cameraPosition.x, 0, cameraPosition.z);
    directionalLight.target.updateMatrixWorld();
    
    // Scale shadow area based on camera height/zoom - much larger coverage
    const cameraHeight = Math.abs(cameraPosition.y);
    const shadowSize = Math.max(50, cameraHeight * 3); // Increased minimum and multiplier
    
    // Update shadow camera - center on camera position for better coverage
    const cam = directionalLight.shadow.camera;
    cam.left = -shadowSize;
    cam.right = shadowSize;
    cam.top = shadowSize;
    cam.bottom = -shadowSize;
    
    // Position shadow camera to center on the target area
    cam.position.set(
        cameraPosition.x + lights[currentLightingMode].directional.position.x,
        lights[currentLightingMode].directional.position.y,
        cameraPosition.z + lights[currentLightingMode].directional.position.z
    );
    
    // Increase shadow distance based on scene size
    cam.near = 0.1;
    cam.far = shadowSize * 2; // Dynamic far plane
    
    cam.updateProjectionMatrix();
}

// Export the function so it can be used in main.js
export { updateLightingForCamera };