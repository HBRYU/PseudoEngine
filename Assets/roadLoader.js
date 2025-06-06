// Road loader for PseudoEngine - loads Road.json scene
import * as THREE from 'three';
import { Entity } from '../entity.js';

export class RoadLoader extends Entity {
    constructor(name, jsonPath, scene = null) {
        super(name);
        this.jsonPath = jsonPath;
        this.isLoaded = false;
        this.startPosition = null;
        this.finishPosition = null;
        this.scene = scene; // Reference to scene for immediate adding
        
        // Texture loading properties
        this.trackConfig = null;
        this.textureLoader = new THREE.TextureLoader();
        this.loadedTextures = new Map();
        
        // Load track configuration for textures
        this.loadTrackConfig();
    }    Init() {
        // Load the JSON file
        fetch(this.jsonPath)
            .then(response => response.json())
            .then(data => {
                this.loadScene(data);
            })
            .catch(error => {
                console.error(`Error loading road JSON: ${error}`);
            });
    }
    
    // Load track configuration from TrackTexture3.json for texture support
    async loadTrackConfig() {
        try {
            console.log('RoadLoader: Loading track configuration from TrackTexture3.json...');
            const response = await fetch('./Assets/TrackTexture3.json');
            this.trackConfig = await response.json();
            console.log('RoadLoader: Track configuration loaded:', this.trackConfig);
            
            // Pre-load textures from the new format
            await this.preloadTexturesFromConfig();
            console.log('RoadLoader: Textures preloaded from embedded config');
            
            // If road is already loaded, apply textures immediately
            if (this.isLoaded && this.object) {
                this.applyTexturesFromConfig();
            }
            
        } catch (error) {
            console.error('RoadLoader: Error loading track configuration:', error);
        }
    }
    
    // Pre-load textures from the new TrackTexture3.json format
    async preloadTexturesFromConfig() {
        if (!this.trackConfig?.textures) return;
        
        const texturePromises = this.trackConfig.textures.map((textureData) => {
            return new Promise((resolve) => {
                // Find corresponding image data
                const imageData = this.trackConfig.images?.find(img => img.uuid === textureData.image);
                
                if (imageData && imageData.url) {
                    this.textureLoader.load(imageData.url, (texture) => {
                        // Apply texture properties from config
                        texture.wrapS = textureData.wrap ? textureData.wrap[0] : THREE.RepeatWrapping;
                        texture.wrapT = textureData.wrap ? textureData.wrap[1] : THREE.RepeatWrapping;
                        texture.repeat.set(textureData.repeat[0], textureData.repeat[1]);
                        texture.offset.set(textureData.offset[0], textureData.offset[1]);
                        texture.rotation = textureData.rotation;
                        texture.flipY = textureData.flipY;
                        texture.generateMipmaps = textureData.generateMipmaps;
                        texture.minFilter = textureData.minFilter;
                        texture.magFilter = textureData.magFilter;
                        texture.anisotropy = textureData.anisotropy;
                        
                        this.loadedTextures.set(textureData.uuid, texture);
                        console.log(`Loaded texture: ${textureData.name || textureData.uuid}`);
                        resolve();
                    }, undefined, () => {
                        console.warn(`Failed to load texture: ${textureData.name || textureData.uuid}`);
                        resolve();
                    });
                } else {
                    console.warn(`No image data found for texture: ${textureData.uuid}`);
                    resolve();
                }
            });
        });
        
        await Promise.all(texturePromises);
    }
    
    // Apply textures using the new configuration format
    applyTexturesFromConfig() {
        if (!this.trackConfig?.materials || !this.object) {
            console.log('RoadLoader: Cannot apply textures: missing materials config or object');
            return;
        }

        console.log('RoadLoader: Applying textures from TrackTexture3.json...');
        let textureCount = 0;

        this.object.traverse((child) => {
            if (child.isMesh && child.material) {
                // Find material configuration by matching material properties or mesh name
                const materialConfig = this.findMaterialConfigForMesh(child);
                if (materialConfig) {
                    console.log(`RoadLoader: Applying material config to mesh: ${child.name}`, materialConfig);
                    this.applyMaterialConfig(child, materialConfig);
                    textureCount++;
                } else {
                    console.log(`RoadLoader: No material configuration found for mesh: ${child.name}`);
                }
            }
        });

        console.log(`RoadLoader: Applied material configurations to ${textureCount} meshes`);
    }
    
    // Find appropriate material configuration for a mesh
    findMaterialConfigForMesh(mesh) {
        if (!this.trackConfig?.materials) return null;
        
        // Try to match by mesh name first
        if (mesh.name === 'Plane') {
            // Look for materials with texture maps (likely the road surface)
            return this.trackConfig.materials.find(mat => mat.map);
        }
        
        // For Start/Finish markers, use materials without textures
        if (mesh.name === 'Start' || mesh.name === 'Finish') {
            return this.trackConfig.materials.find(mat => !mat.map);
        }
        
        // Default fallback
        return this.trackConfig.materials[0];
    }
    
    // Apply material configuration to a mesh
    applyMaterialConfig(mesh, materialConfig) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        
        materials.forEach((material) => {
            // Apply basic material properties
            if (materialConfig.color !== undefined) {
                material.color.setHex(materialConfig.color);
            }
            if (materialConfig.roughness !== undefined) {
                material.roughness = materialConfig.roughness;
            }
            if (materialConfig.metalness !== undefined) {
                material.metalness = materialConfig.metalness;
            }
            if (materialConfig.emissive !== undefined) {
                material.emissive.setHex(materialConfig.emissive);
            }
            
            // Apply texture map if specified
            if (materialConfig.map && this.loadedTextures.has(materialConfig.map)) {
                material.map = this.loadedTextures.get(materialConfig.map);
                console.log(`Applied texture map to material: ${materialConfig.name || 'unnamed'}`);
            }
            
            // Apply side rendering if specified
            if (materialConfig.side !== undefined) {
                material.side = materialConfig.side;
            }
            
            material.needsUpdate = true;
        });
    }loadScene(data) {
        const loader = new THREE.ObjectLoader();
        
        try {
            // Load the scene from JSON data
            const loadedScene = loader.parse(data);
              // Create a group to hold all road elements
            this.object = new THREE.Group();
            this.object.name = this.name;
            
            // Scale the entire road system by 3x
            this.object.scale.set(3, 1, 3);
            
            let meshCount = 0;
            
            // Process all children from the loaded scene
            loadedScene.traverse((child) => {
                if (child.isMesh) {
                    // Clone the mesh to avoid issues
                    const mesh = child.clone();
                    meshCount++;
                    
                    // Check if this is the start or finish marker
                    if (child.name === 'Start') {
                        // Align start marker to ground
                        this.alignMeshToGround(mesh);
                        
                        this.startPosition = mesh.position.clone();
                        this.startPosition.y = 0; // Ensure start position is at ground level
                        console.log(`Found Start marker at position:`, this.startPosition);
                        // Make start marker invisible
                        mesh.visible = false;
                    } else if (child.name === 'Finish') {
                        // Align finish marker to ground
                        this.alignMeshToGround(mesh);
                        
                        this.finishPosition = mesh.position.clone();
                        this.finishPosition.y = 0; // Ensure finish position is at ground level
                        console.log(`Found Finish marker at position:`, this.finishPosition);
                        // Keep finish marker visible but make it more prominent
                        mesh.visible = true;
                        
                        // Make finish marker green
                        if (mesh.material) {
                            mesh.material = mesh.material.clone();
                            mesh.material.color.setHex(0x00ff00);
                            mesh.material.emissive.setHex(0x004400);
                        }                    } else {
                        // Regular road piece
                        mesh.visible = true;
                        
                        // Manually align vertices to y=0
                        this.alignMeshToGround(mesh);
                        
                        // Ensure road pieces have visible materials
                        if (mesh.material) {
                            // Clone material to avoid sharing issues
                            mesh.material = mesh.material.clone();
                            
                            // Set all road pieces to dark gray for visibility against white background
                            mesh.material.color.setHex(0x404040); // Dark gray for road
                            
                            // Ensure material is opaque
                            mesh.material.transparent = false;
                            mesh.material.opacity = 1.0;
                            
                            // Add some basic lighting response
                            if (mesh.material.type === 'MeshStandardMaterial') {
                                mesh.material.roughness = 0.8;
                                mesh.material.metalness = 0.1;
                            }
                        } else {
                            // Create a default material if none exists
                            mesh.material = new THREE.MeshStandardMaterial({
                                color: 0x404040,
                                roughness: 0.8,
                                metalness: 0.1
                            });
                        }
                        
                        // Ensure road pieces receive shadows
                        mesh.receiveShadow = true;
                        mesh.castShadow = false; // Roads don't cast shadows
                        
                        console.log(`Road piece ${mesh.name || 'unnamed'}: position(${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(2)}), material:`, mesh.material.type);
                    }
                    
                    // Add mesh to our road group
                    this.object.add(mesh);
                }
            });            this.isLoaded = true;
            console.log(`Road loaded successfully with ${meshCount} elements`);
            
            // Apply textures after loading using new config format
            this.applyTexturesFromConfig();
            
            // If we have a scene reference, add the road immediately
            if (this.scene && this.object) {
                this.scene.add(this.object);
                console.log('Road added to scene immediately');
                
                // Calculate and log bounding box for debugging
                const box = new THREE.Box3().setFromObject(this.object);
                console.log('Road bounding box:', {
                    min: { x: box.min.x.toFixed(2), y: box.min.y.toFixed(2), z: box.min.z.toFixed(2) },
                    max: { x: box.max.x.toFixed(2), y: box.max.y.toFixed(2), z: box.max.z.toFixed(2) }
                });
            }
            
            if (!this.startPosition) {
                console.warn('Start position not found in road data, using default');
                this.startPosition = new THREE.Vector3(0, 0, 0);
            }
            if (!this.finishPosition) {
                console.warn('Finish position not found in road data');
            }
            
        } catch (error) {
            console.error(`Error parsing road scene: ${error}`);
            // Create a fallback simple road if loading fails
            this.createFallbackRoad();
        }
    }

    createFallbackRoad() {
        console.log('Creating fallback road due to loading error');
        this.object = new THREE.Group();
        this.object.name = this.name + '_Fallback';
        
        // Create a simple plane as fallback
        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshStandardMaterial({ color: 0x404040 });
        const plane = new THREE.Mesh(geometry, material);
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        
        this.object.add(plane);
        this.startPosition = new THREE.Vector3(0, 0, 0);
        this.isLoaded = true;
    }

    // Method to align mesh vertices to y=0
    alignMeshToGround(mesh) {
        if (!mesh.geometry) return;
        
        const geometry = mesh.geometry;
        
        // Handle BufferGeometry
        if (geometry.isBufferGeometry) {
            const positionAttribute = geometry.getAttribute('position');
            if (positionAttribute) {
                console.log(`Aligning ${positionAttribute.count} vertices to y=0 for mesh: ${mesh.name}`);
                
                // Get the position array
                const positions = positionAttribute.array;
                
                // Set all Y coordinates to 0 (every 3rd element starting from index 1)
                for (let i = 1; i < positions.length; i += 3) {
                    positions[i] = 0;
                }
                
                // Mark the attribute as needing update
                positionAttribute.needsUpdate = true;
                
                // Recompute normals and bounding sphere
                geometry.computeVertexNormals();
                geometry.computeBoundingSphere();
                
                console.log(`Aligned mesh ${mesh.name} to ground plane`);
            }
        }
        // Handle legacy Geometry (if any)
        else if (geometry.vertices) {
            console.log(`Aligning ${geometry.vertices.length} vertices to y=0 for legacy geometry: ${mesh.name}`);
            
            geometry.vertices.forEach(vertex => {
                vertex.y = 0;
            });
            
            geometry.verticesNeedUpdate = true;
            geometry.computeFaceNormals();
            geometry.computeVertexNormals();
            geometry.computeBoundingSphere();
        }
        
        // Also align the mesh position to ensure it's on the ground
        mesh.position.y = 0;
    }

    getStartPosition() {
        return this.startPosition ? this.startPosition.clone() : new THREE.Vector3(0, 0, 0);
    }

    getFinishPosition() {
        return this.finishPosition ? this.finishPosition.clone() : new THREE.Vector3(0, 0, 0);
    }
}
