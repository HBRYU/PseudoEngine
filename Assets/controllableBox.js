import * as THREE from 'three';
import { Entity } from '../entity.js';
import { context } from '../init.js';  // import world context.

// Inherit from Entity to create a controllable box
export class ControllableBox extends Entity {
    constructor(name) {
        super(name);
        this.speed = 5;
        this.moveLeft = false;
        this.moveRight = false;
        this.targetPosition = new THREE.Vector3(0, 0.5, 0); // Initial target position
    }

    Init() {
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            roughness: 0.1,
            metalness: 0.1,
        });
        this.object = new THREE.Mesh(geometry, material);
        this.object.castShadow = true;
        this.object.receiveShadow = false;
    }

    Start() {
        // Set up keyboard listeners
        window.addEventListener('mousedown', (e) => {
            if (e.button === 2) { // Right mouse button
                this.SetTargetPosition(e);  // Pass the event object
            }
        });

        // Prevent context menu on right-click
        window.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    Update() {
        if (this.targetPosition) {
            // Move towards target at constant speed
            const direction = new THREE.Vector3();
            direction.subVectors(this.targetPosition, this.position);

            // Don't move if we're very close to the target
            if (direction.length() >= 0.2) {
                direction.normalize();
                direction.multiplyScalar(this.speed * context.time.deltaTime); // Apply speed * deltaTime
                this.position.add(direction);
                console.log('deltaTime:', context.time.deltaTime);
            } else {
                // Snap to target position if close enough
                this.position.copy(this.targetPosition);
            }
        }
    }

    SetTargetPosition(e) {  // Accept the event as parameter
        // Get mouse position in normalized device coordinates (-1 to +1)
        const mouse = new THREE.Vector2();
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        // Create a raycaster from the camera through the mouse position
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, context.camera);

        // Get the ground plane object
        const plane = context.scene.getObjectByName('GroundPlane');
        if (!plane) return;

        // Find intersections with the ground plane
        const intersects = raycaster.intersectObject(plane);

        if (intersects.length > 0) {
            // Move to the intersection point
            this.targetPosition.x = intersects[0].point.x;
            this.targetPosition.z = intersects[0].point.z;
            this.targetPosition.y = 0.5; // Keep the box above the ground
        }
    }
}