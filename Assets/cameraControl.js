import * as THREE from 'three';
import { Entity } from '../entity.js';
import { context } from '../init.js';

// Inherit from Entity to create a controllable box
export class CameraControl extends Entity {
    constructor(name, speed = 1000) {
        // Pass null for object - we'll create it in Init()
        super(name);
        this.tag = 'cameraControl';
        this.speed = speed; // Speed of camera movement
        this.target = null;  // should be set in init.js
        this.offset = new THREE.Vector3(20, 20, 20); // Offset from the target position
        this.cameraPosition = new THREE.Vector3(0, 0, 0); // Current camera position          // Orbit controls
        this.orbitAngle = 0; // Current horizontal orbit angle in radians
        this.elevationAngle = 0; // Current vertical elevation angle in radians
        this.orbitRadius = Math.sqrt(this.offset.x * this.offset.x + this.offset.z * this.offset.z); // Distance from target
        this.orbitHeight = this.offset.y; // Base height above target
        this.mouseSensitivity = 0.005; // Mouse sensitivity for orbiting
        this.minRadius = 3; // Minimum orbit radius
        this.maxRadius = 20; // Maximum orbit radius
        this.minElevation = -Math.PI * 0.4; // Minimum elevation angle (looking down)
        this.maxElevation = Math.PI * 0.4; // Maximum elevation angle (looking up)
        
        // Mouse tracking
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.isMouseDown = false;
        
        // Bind mouse events
        this.setupMouseControls();
    }    Init() {
        // this.object = context.camera;
    }    setupMouseControls() {
        // Choose orbit control method:
        // Method 1: Click and drag to orbit
        // Method 2: Mouse X position continuously controls orbit (uncomment the section below)
          // Method 1: Click and drag orbiting
        window.addEventListener('mousemove', (event) => {
            this.mouseX = event.clientX;
            this.mouseY = event.clientY;
            
            if (this.isMouseDown) {
                this.updateOrbitFromMouse();
            }
        });

        window.addEventListener('mousedown', (event) => {
            this.isMouseDown = true;
            this.lastMouseX = event.clientX;
            this.lastMouseY = event.clientY;
        });window.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });

        // Method 2: Continuous mouse X position orbiting (uncomment to use instead of click-drag)
        /*
        window.addEventListener('mousemove', (event) => {
            // Map mouse X position (0 to window width) to orbit angle (0 to 2π)
            const normalizedX = event.clientX / window.innerWidth;
            this.orbitAngle = normalizedX * Math.PI * 2;
        });
        */
    }    updateOrbitFromMouse() {
        const deltaX = this.mouseX - this.lastMouseX;
        const deltaY = this.mouseY - this.lastMouseY;
        
        // Update horizontal orbit angle
        this.orbitAngle += deltaX * this.mouseSensitivity;
        
        // Update vertical elevation angle
        this.elevationAngle += deltaY * this.mouseSensitivity;
        
        // Clamp elevation angle to prevent camera from flipping
        this.elevationAngle = Math.max(this.minElevation, Math.min(this.maxElevation, this.elevationAngle));
        
        this.lastMouseX = this.mouseX;
        this.lastMouseY = this.mouseY;
    }    Start() {
        // Initialize orbit angle based on initial offset
        this.orbitAngle = Math.atan2(this.offset.x, this.offset.z);
        // Initialize elevation angle based on initial height
        this.elevationAngle = Math.atan2(this.offset.y, this.orbitRadius);
        this.updateCameraPosition();
    }
    
    updateCameraPosition() {
        if (!this.target) return;
        
        // Calculate orbital position around target with both horizontal and vertical angles
        const horizontalDistance = this.orbitRadius * Math.cos(this.elevationAngle);
        const x = Math.sin(this.orbitAngle) * horizontalDistance;
        const z = Math.cos(this.orbitAngle) * horizontalDistance;
        const y = this.orbitRadius * Math.sin(this.elevationAngle);
        
        // Set camera target position based on orbit
        this.cameraTargetPosition = new THREE.Vector3(
            this.target.position.x + x,
            this.target.position.y + this.orbitHeight + y,
            this.target.position.z + z
        );
    }
    
    Update(deltaTime) {
        this.updateCameraPosition();
        
        // Smoothly move camera to target position
        this.cameraPosition.lerp(this.cameraTargetPosition, this.speed * deltaTime);
        context.camera.position.copy(this.cameraPosition);
        
        // Always look at the target
        if (this.target) {
            context.camera.lookAt(this.target.position);
        }
    }
}