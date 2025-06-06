// Race track entity for the car racing game
import * as THREE from 'three';
import { GLTFModel } from './modelLoader.js';

export class RaceTrack extends GLTFModel {
    constructor(name, options = {}) {
        // Set default options for the race track
        const trackOptions = {
            position: options.position || new THREE.Vector3(0, 0, 0),
            rotation: options.rotation || new THREE.Euler(0, 0, 0),
            scale: new THREE.Vector3(4, 1, 4),
            castShadow: options.castShadow !== undefined ? options.castShadow : false,
            receiveShadow: options.receiveShadow !== undefined ? options.receiveShadow : true,
            onLoad: options.onLoad || null
        };
        
        super(name, './Assets/models/race_track.glb', trackOptions);
        this.tag = 'raceTrack';
        
        // Hitbox properties
        this.hitboxVertices = [];
        this.hitboxBounds = null;
        this.trackSurfaces = [];
        
        // Texture properties
        this.trackConfig = null;
        this.textureLoader = new THREE.TextureLoader();
        this.loadedTextures = new Map();
        
        // Load track configuration
        this.loadTrackConfig();
    }    // Load track configuration from JSON
    async loadTrackConfig() {
        try {
            console.log('Loading track configuration from TrackTexture3.json...');
            const response = await fetch('./Assets/TrackTexture3.json');
            this.trackConfig = await response.json();
            console.log('Track configuration loaded:', this.trackConfig);
            
            // Pre-load textures
            await this.preloadTextures();
            console.log('Textures preloaded, ready to apply to model when loaded');
            
            // If model is already loaded, apply textures immediately
            if (this.isLoaded && this.object) {
                this.applyTextures();
            }
            
        } catch (error) {
            console.error('Error loading track configuration:', error);
        }
    }

    // Pre-load all textures
    async preloadTextures() {
        if (!this.trackConfig?.textures) return;
        
        const texturePromises = Object.entries(this.trackConfig.textures).map(([key, path]) => {
            return new Promise((resolve) => {
                this.textureLoader.load(path, (texture) => {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.flipY = false;
                    this.loadedTextures.set(key, texture);
                    resolve();
                }, undefined, () => resolve()); // Continue even if texture fails
            });
        });
        
        await Promise.all(texturePromises);
    }    // Apply textures to meshes
    applyTextures() {
        if (!this.trackConfig?.meshTextures || !this.object) {
            console.log('Cannot apply textures: missing config or object');
            return;
        }

        console.log('Applying textures to race track meshes...');
        let textureCount = 0;

        this.object.traverse((child) => {
            if (child.isMesh && child.material) {
                const textureConfig = this.trackConfig.meshTextures[child.name];
                if (textureConfig) {
                    console.log(`Applying texture to mesh: ${child.name}`, textureConfig);
                    this.applyTextureToMesh(child, textureConfig);
                    textureCount++;
                } else {
                    console.log(`No texture configuration found for mesh: ${child.name}`);
                }
            }
        });

        console.log(`Applied textures to ${textureCount} meshes`);
    }

    // Apply texture to a specific mesh
    applyTextureToMesh(mesh, config) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        
        materials.forEach((material) => {
            // Apply diffuse texture
            if (config.diffuse && this.loadedTextures.has(config.diffuse)) {
                const texture = this.loadedTextures.get(config.diffuse);
                material.map = texture;
                
                if (config.repeat) {
                    texture.repeat.set(config.repeat.u || 1, config.repeat.v || 1);
                }
            }
            
            // Apply normal map
            if (config.normal && this.loadedTextures.has(config.normal)) {
                material.normalMap = this.loadedTextures.get(config.normal);
            }
            
            // Apply material properties
            if (config.properties) {
                Object.assign(material, config.properties);
            }
            
            material.needsUpdate = true;
        });
    }    // Override onModelLoaded to apply textures
    onModelLoaded() {
        super.onModelLoaded();
        console.log('RaceTrack model loaded, applying textures...');
        this.applyTextures();
        console.log(`Applied textures from TrackTexture3.json to race track meshes`);
        setTimeout(() => this.generateHitbox(), 100);
    }

    Init() {
        // Call parent Init to load the model
        super.Init();
        console.log(`RaceTrack ${this.name} Init() called, starting GLB load...`);
    }

    Start() {
        // Called after the entity is added to the scene
        if (this.isLoaded && this.object) {
            console.log(`Race track ${this.name} is ready`);
            // Generate hitbox after model is loaded
            this.generateHitbox();
        }
    }

    // Extract vertices from all meshes in the track model
    extractVertices() {
        const vertices = [];
        const worldMatrix = this.object.matrixWorld;
        
        this.object.traverse((child) => {
            if (child.isMesh && child.geometry) {
                const geometry = child.geometry;
                const positionAttribute = geometry.attributes.position;
                
                if (positionAttribute) {
                    // Get mesh world matrix
                    child.updateMatrixWorld(true);
                    const meshWorldMatrix = child.matrixWorld;
                    
                    // Extract vertices and transform to world coordinates
                    for (let i = 0; i < positionAttribute.count; i++) {
                        const vertex = new THREE.Vector3(
                            positionAttribute.getX(i),
                            positionAttribute.getY(i),
                            positionAttribute.getZ(i)
                        );
                        
                        // Apply mesh and parent transformations
                        vertex.applyMatrix4(meshWorldMatrix);
                        
                        vertices.push({
                            position: vertex.clone(),
                            meshName: child.name || 'unnamed',
                            mesh: child
                        });
                    }
                    
                    // Store surface meshes for collision detection
                    this.trackSurfaces.push({
                        mesh: child,
                        geometry: geometry,
                        worldMatrix: meshWorldMatrix.clone()
                    });
                }
            }
        });
        
        this.hitboxVertices = vertices;
        console.log(`Extracted ${vertices.length} vertices from race track`);
        return vertices;
    }

    // Generate hitbox bounds and collision data
    generateHitbox() {
        if (!this.isLoaded || !this.object) {
            console.warn('Cannot generate hitbox - track not loaded');
            return;
        }

        // Extract all vertices
        const vertices = this.extractVertices();
        
        if (vertices.length === 0) {
            console.warn('No vertices found in race track');
            return;
        }

        // Calculate bounding box from vertices
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        
        vertices.forEach(vertex => {
            const pos = vertex.position;
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            minZ = Math.min(minZ, pos.z);
            maxX = Math.max(maxX, pos.x);
            maxY = Math.max(maxY, pos.y);
            maxZ = Math.max(maxZ, pos.z);
        });

        this.hitboxBounds = {
            min: new THREE.Vector3(minX, minY, minZ),
            max: new THREE.Vector3(maxX, maxY, maxZ),
            center: new THREE.Vector3(
                (minX + maxX) / 2,
                (minY + maxY) / 2,
                (minZ + maxZ) / 2
            ),
            size: new THREE.Vector3(
                maxX - minX,
                maxY - minY,
                maxZ - minZ
            )
        };

        console.log('Race track hitbox generated:', this.hitboxBounds);
        console.log(`Track surfaces: ${this.trackSurfaces.length}`);
    }

    // Check if a point is within the track bounds
    isPointInBounds(point) {
        if (!this.hitboxBounds) return false;
        
        return point.x >= this.hitboxBounds.min.x &&
               point.x <= this.hitboxBounds.max.x &&
               point.y >= this.hitboxBounds.min.y &&
               point.y <= this.hitboxBounds.max.y &&
               point.z >= this.hitboxBounds.min.z &&
               point.z <= this.hitboxBounds.max.z;
    }

    // Get height at a specific X,Z position using raycasting
    getHeightAt(x, z) {
        if (!this.isLoaded || this.trackSurfaces.length === 0) {
            return 0; // Default ground level
        }

        // Create a ray pointing downward from above the track
        const rayOrigin = new THREE.Vector3(x, this.hitboxBounds.max.y + 10, z);
        const rayDirection = new THREE.Vector3(0, -1, 0);
        const raycaster = new THREE.Raycaster(rayOrigin, rayDirection);

        // Test intersection with all track surfaces
        const meshes = this.trackSurfaces.map(surface => surface.mesh);
        const intersections = raycaster.intersectObjects(meshes, false);

        if (intersections.length > 0) {
            // Return the highest intersection point (closest to ray origin)
            return intersections[0].point.y;
        }

        return 0; // No intersection found, return ground level
    }

    // Check collision with a sphere (for car collision)
    checkSphereCollision(center, radius) {
        if (!this.isLoaded || this.trackSurfaces.length === 0) {
            return null;
        }

        // Simple bounding sphere check first
        if (!this.isPointInBounds(center)) {
            return null;
        }

        // Create a sphere for collision testing
        const sphere = new THREE.Sphere(center, radius);
        
        // Test against each surface
        for (const surface of this.trackSurfaces) {
            const geometry = surface.geometry;
            const mesh = surface.mesh;
            
            // Update world matrix
            mesh.updateMatrixWorld(true);
            
            // Simple distance check - more detailed collision would require face-by-face testing
            const meshBounds = new THREE.Box3().setFromObject(mesh);
            if (meshBounds.intersectsSphere(sphere)) {
                return {
                    intersected: true,
                    mesh: mesh,
                    meshName: mesh.name,
                    distance: meshBounds.distanceToPoint(center)
                };
            }
        }

        return null;
    }

    // Get debug visualization of hitbox
    createHitboxVisualization() {
        if (!this.hitboxBounds) {
            console.warn('No hitbox bounds available for visualization');
            return null;
        }

        // Create wireframe box for bounds visualization
        const boxGeometry = new THREE.BoxGeometry(
            this.hitboxBounds.size.x,
            this.hitboxBounds.size.y,
            this.hitboxBounds.size.z
        );
        
        const boxMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true,
            transparent: true,
            opacity: 0.5
        });
        
        const hitboxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
        hitboxMesh.position.copy(this.hitboxBounds.center);
        hitboxMesh.name = 'TrackHitboxVisualization';
        
        return hitboxMesh;
    }

    Update() {
        // Race track is static, no updates needed
    }

    // Get starting position for the car on the track
    getStartingPosition() {
        // Return a reasonable starting position on the track
        // This can be adjusted based on the actual track model
        return new THREE.Vector3(0, 0.1, 0);
    }    // Get track bounds for camera positioning
    getTrackBounds() {
        if (!this.isLoaded || !this.object) {
            return null;
        }

        // Use hitbox bounds if available (more accurate)
        if (this.hitboxBounds) {
            return this.hitboxBounds;
        }

        // Fallback to object bounds
        const box = new THREE.Box3().setFromObject(this.object);
        return {
            min: box.min.clone(),
            max: box.max.clone(),
            center: box.getCenter(new THREE.Vector3()),
            size: box.getSize(new THREE.Vector3())
        };
    }

    // Get all vertices (for external use)
    getVertices() {
        return this.hitboxVertices;
    }

    // Get surface meshes (for external collision systems)
    getSurfaces() {
        return this.trackSurfaces;
    }
}
