import * as THREE from 'three';

export class Entity {
    constructor(name) {
        this.name = name;
        this.tag = null;
        this.transform = null;
        // this.context = null;  // will be set in main.js -> deprecated
        this.object = null;  // will be set in Init()
    }

    get object() { return this._object;}

    set object(obj) {
        if (!(obj instanceof THREE.Mesh)) {
            // None mesh object
            return;
        }
        this._object = obj;
        this._object.name = this.name; // Set the name for the object
    }

    get position() { return this.object.position; }
    get rotation() { return this.object.rotation; }
    get scale() { return this.object.scale; }
    get transform() {
        // Will create a new object. Don't use it in a loop
        // or it will create a lot of garbage
        return {
            position: this.object.position,
            rotation: this.object.rotation,
            scale: this.object.scale
        };
    }
    set transform(value) {
        if (!value) return; // Ignore null or undefined
        const { position, rotation, scale } = value;
        if (position) {
            this.object.position.set(position.x, position.y, position.z);
        }
        if (rotation) {
            this.object.rotation.set(rotation.x, rotation.y, rotation.z);
        }
        if (scale) {
            this.object.scale.set(scale.x, scale.y, scale.z);
        }
    }

    getName() {
        return this.name;
    }

    Init() {
        // Initialization logic for the entity
        // Create the object and add it to the scene
        // Can either be implemented here or be empty, in which case
        // This is where you would typically set up the mesh, materials, etc.

        // Base implementation: do nothing or throw to enforce override
        // throw new Error('Init() must be implemented by subclass');
    }

    Start() {
        // Start logic for the entity
        // Works with the assumption that the mesh is already added to the scene

        // Base implementation: do nothing or throw to enforce override
        // throw new Error('Start() must be implemented by subclass');
    }

    Update() {
        // Base implementation: do nothing or throw to enforce override
        // throw new Error('Update() must be implemented by subclass');
    }
}