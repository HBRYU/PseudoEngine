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
        this.offset = new THREE.Vector3(10, 10, 10); // Offset from the target position
        this.cameraPosition = new THREE.Vector3(0, 0, 0); // Current camera position
    }

    Init() {
        // this.object = context.camera;
    }

    Start() {
        this.cameraTargetPosition = this.target.position.clone().add(this.offset);
        this.cameraPosition.copy(this.cameraTargetPosition);
    }
    
    Update(deltaTime) {
        this.cameraTargetPosition = this.target.position.clone().add(this.offset);
        this.cameraPosition.lerp(this.cameraTargetPosition, this.speed * deltaTime);
        context.camera.position.copy(this.cameraPosition);
    }
}