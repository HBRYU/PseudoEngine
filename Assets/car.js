import * as THREE from 'three';
import { Entity } from '../entity.js';
import { context } from '../init.js';  // import world context.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Inherit from Entity to create a controllable box
export class Car extends Entity {
    constructor(name) {
        super(name);
        this._velocity = 0;
        this.maxSpeed = 20;
        this.accelPressed = false;
        this.brakePressed = false;
        this.leftPressed = false;
        this.rightPressed = false;
        this.acceleration = 10;
        this.deceleration = 5; // Deceleration when braking
        this.brakeForce = 15;
        this.turnSpeed = 0.2;  // Rotation speed in radians/second
        this.modelLoaded = false;
        
        // Create a group to hold the model
        this.object = new THREE.Group();
        this.object.name = name;
        
        // Set up input handlers
        this.setupInputHandlers();
    }

    setupInputHandlers() {
        // Key down handler
        window.addEventListener('keydown', (event) => {
            switch(event.key) {
                case 'ArrowUp':
                case 'w':
                    console.log("Accelerate pressed");
                    this.accelPressed = true;
                    break;
                case 'ArrowDown':
                case 's':
                    console.log("Brake pressed");
                    this.brakePressed = true;
                    break;
                case 'ArrowLeft':
                case 'a':
                    console.log("Turn left pressed");
                    this.leftPressed = true;
                    break;
                case 'ArrowRight':
                case 'd':
                    console.log("Turn right pressed");
                    this.rightPressed = true;
                    break;
            }
        });

        // Key up handler
        window.addEventListener('keyup', (event) => {
            switch(event.key) {
                case 'ArrowUp':
                case 'w':
                    console.log("Accelerate released");
                    this.accelPressed = false;
                    break;
                case 'ArrowDown':
                case 's':
                    console.log("Brake released");
                    this.brakePressed = false;
                    break;
                case 'ArrowLeft':
                case 'a':
                    console.log("Turn left released");
                    this.leftPressed = false;
                    break;
                case 'ArrowRight':
                case 'd':
                    console.log("Turn right released");
                    this.rightPressed = false;
                    break;
            }
        });
    }

    Init() {
        // Create a simple box as the car
        const geometry = new THREE.BoxGeometry(1, 0.5, 2);
        const material = new THREE.MeshStandardMaterial({
            color: 0x3366cc,
            metalness: 0.5,
            roughness: 0.5
        });
        
        // Create the mesh
        const boxMesh = new THREE.Mesh(geometry, material);
        boxMesh.castShadow = true;
        boxMesh.receiveShadow = true;
        
        // Add the box to our group
        this.object.add(boxMesh);
        
        // Position the car slightly above the ground to prevent z-fighting
        this.object.position.y = 0.25; // Half the height of the box
        
        // Add simple indicators for front/back
        const frontIndicator = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.1, 0.1),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        frontIndicator.position.z = 1; // Place at the front
        frontIndicator.position.y = 0.3;
        this.object.add(frontIndicator);
        
        // Flag the model as loaded since we're not doing async loading anymore
        this.modelLoaded = true;
    }

    Start() {
        // Initialize any state when the car is added to the scene
        console.log("Car controls: WASD or Arrow keys to drive");
    }

    Update(deltaTime) {
        if (!this.modelLoaded) return; // Wait until model is loaded

        // Handle acceleration and braking
        if (this.accelPressed) {
            this._velocity += this.acceleration * deltaTime;
            if (this._velocity > this.maxSpeed) this._velocity = this.maxSpeed;
        } else if (this.brakePressed) {
            this._velocity -= this.brakeForce * deltaTime;
            if (this._velocity < 0) this._velocity = 0;
        } else {
            // Gradually slow down when no input
            if (this._velocity >= 0.2) {
                // Apply deceleration
                this._velocity = this._velocity - this.deceleration * deltaTime
            }
            else if (this._velocity <= -0.2) {
                // If velocity is negative, apply deceleration in reverse
                this._velocity = this._velocity + this.deceleration * deltaTime;
            }
            else {
                // If velocity is very low, stop it completely
                this._velocity = this._velocity * 0.3;
            }
        }

        // Handle turning (only when moving)
        if (this._velocity > 0.1) {
            const turnAmount = this.turnSpeed * deltaTime;
            if (this.leftPressed) {
                this.object.rotation.y += turnAmount * this._velocity;
            }
            if (this.rightPressed) {
                this.object.rotation.y -= turnAmount * this._velocity;
            }
        }

        // Update car position based on speed and direction
        const direction = new THREE.Vector3(Math.sin(this.object.rotation.y), 0, Math.cos(this.object.rotation.y));
        this.object.position.addScaledVector(direction, this._velocity * deltaTime);
        console.log('speed:', this._velocity);
    }
}