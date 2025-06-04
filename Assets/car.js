import * as THREE from 'three';
import { Entity } from '../entity.js';
import { context, ui } from '../init.js';  // import world context.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Inherit from Entity to create a controllable box
export class Car extends Entity {
    constructor(name) {
        super(name);
        
        // Physics properties
        this._velocity = new THREE.Vector2(0, 0);
        this._angularVelocity = 0;
        
        // Car performance specs - UPDATED FOR BETTER CONTROL
        this.maxSpeed = 40;
        this.engineForce = 8000;   // Reduced slightly for better control
        this.brakeForce = 8000;
        
        // Physical properties - UPDATED FOR STABILITY
        this.mass = 1200;
        this.momentOfInertia = 2500; // Increased for more stability
        this.dragCoefficient = 0.35;
        
        // Tire properties - UPDATED FOR BETTER GRIP
        this.tireFriction = 0.85;     // Slightly reduced for more realistic sliding
        this.tireGrip = 0.95;         // Reduced from 0.99 for more progressive sliding
        this.corneringStiffness = 30000; // Reduced for less aggressive cornering
        
        // NEW: Stability control properties
        this.stabilityControl = true;  // Enable electronic stability control
        this.maxSlipAngle = 0.3;      // Maximum slip angle before stability kicks in (radians ~17 degrees)
        this.stabilityFactor = 0.2;   // How much stability control reduces forces (0-1)
        this.antiSpinDamping = 0.5;  // Additional angular velocity damping during slides
        
        // Input state
        this.accelPressed = false;
        this.brakePressed = false;
        this.leftPressed = false;
        this.rightPressed = false;
          this.modelLoaded = false;
        this.modelScale = new THREE.Vector3(1, 1, 1); // Default scale
        
        // Create a group to hold the model
        this.object = new THREE.Group();
        this.object.name = name;
        
        // Set up input handlers
        this.setupInputHandlers();
        
        // Debug vectors
        this.velocityArrow = null;
        this.forceArrow = null;
    }

    setupInputHandlers() {
        // Key down handler
        window.addEventListener('keydown', (event) => {
            switch(event.key) {
                case 'ArrowUp':
                case 'w':
                    this.accelPressed = true;
                    break;
                case 'ArrowDown':
                case 's':
                    this.brakePressed = true;
                    break;
                case 'ArrowLeft':
                case 'a':
                    this.leftPressed = true;
                    break;
                case 'ArrowRight':
                case 'd':
                    this.rightPressed = true;
                    break;
                case 'c': // Toggle stability control
                    this.toggleStabilityControl();
                    break;
                case '1': // Stable setup
                    this.setDriftSensitivity(0.2);
                    break;
                case '2': // Balanced setup
                    this.setDriftSensitivity(0.5);
                    break;
                case '3': // Drift setup
                    this.setDriftSensitivity(0.8);
                    break;
            }
        });

        // Key up handler
        window.addEventListener('keyup', (event) => {
            switch(event.key) {
                case 'ArrowUp':
                case 'w':
                    this.accelPressed = false;
                    break;
                case 'ArrowDown':
                case 's':
                    this.brakePressed = false;
                    break;
                case 'ArrowLeft':
                case 'a':
                    this.leftPressed = false;
                    break;
                case 'ArrowRight':
                case 'd':
                    this.rightPressed = false;
                    break;
            }
        });
    }    Init() {
        // Load the 3D car model from JSON
        const loader = new THREE.ObjectLoader();
        
        loader.load(
            './Assets/_car.json',
            (carModel) => {
                console.log("Car model loaded successfully");
                
                // Apply the stored scale to the loaded model
                carModel.scale.copy(this.modelScale);
                
                // Find Object001 specifically for shadow/collision purposes
                let object001 = null;
                carModel.traverse((child) => {
                    // Look specifically for Object001 or its mesh child
                    if (child.name === 'Object001' || child.name === 'Object001_Material_#37_0') {
                        object001 = child;
                        console.log("Found Object001:", child.name);
                    }
                    
                    // Set up all meshes for rendering but we'll handle shadows separately
                    if (child.isMesh) {
                        // Enhanced material properties
                        if (child.material) {
                            child.material.metalness = 0.3;
                            child.material.roughness = 0.7;
                        }
                        
                        // Only enable shadows for Object001 (main car body)
                        if (child.name === 'Object001_Material_#37_0' || 
                            (child.parent && child.parent.name === 'Object001')) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            console.log("Enabled shadows for main car body:", child.name);
                        } else {
                            // Disable shadows for other parts (like windows, details)
                            child.castShadow = false;
                            child.receiveShadow = false;
                        }
                    }
                });
                
                // Store reference to Object001 for collision/physics calculations
                this.mainBodyMesh = object001;
                
                // If we found Object001, use it for physics bounds
                if (this.mainBodyMesh) {
                    // Calculate bounding box for Object001 specifically
                    const box = new THREE.Box3().setFromObject(this.mainBodyMesh);
                    this.physicsSize = {
                        width: box.max.x - box.min.x,
                        height: box.max.y - box.min.y,
                        length: box.max.z - box.min.z
                    };
                    console.log("Physics bounds from Object001:", this.physicsSize);
                }
                
                // Add the entire model to our group
                this.object.add(carModel);
                
                // Add simple indicators for front/back (positioned relative to Object001 if available)
                const frontIndicator = new THREE.Mesh(
                    new THREE.BoxGeometry(0.1, 0.05, 0.02),
                    new THREE.MeshBasicMaterial({ color: 0xff0000 })
                );
                
                // Position indicator at front of Object001 if available, otherwise use default
                if (this.mainBodyMesh) {
                    const box = new THREE.Box3().setFromObject(this.mainBodyMesh);
                    frontIndicator.position.z = box.max.z + 0.1; // Slightly in front
                    frontIndicator.position.y = box.max.y * 0.8; // Near top
                } else {
                    frontIndicator.position.z = 1;
                    frontIndicator.position.y = 0.3;
                }
                
                this.object.add(frontIndicator);
                
                // Create debug arrows
                this.createDebugArrows();
                
                // Flag the model as loaded
                this.modelLoaded = true;
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.error('Error loading car model:', error);
                console.log('Falling back to simple box geometry');
                
                // Fallback: create the original simple box
                const geometry = new THREE.BoxGeometry(1, 0.5, 2);
                const material = new THREE.MeshStandardMaterial({
                    color: 0x3366cc,
                    metalness: 0.5,
                    roughness: 0.5
                });
                
                const boxMesh = new THREE.Mesh(geometry, material);
                boxMesh.castShadow = true;
                boxMesh.receiveShadow = true;
                
                // Store fallback mesh as main body
                this.mainBodyMesh = boxMesh;
                this.physicsSize = { width: 1, height: 0.5, length: 2 };
                
                this.object.add(boxMesh);
                this.object.position.y = 0.0;
                
                // Add front indicator
                const frontIndicator = new THREE.Mesh(
                    new THREE.BoxGeometry(0.5, 0.1, 0.1),
                    new THREE.MeshBasicMaterial({ color: 0xff0000 })
                );
                frontIndicator.position.z = 1;
                frontIndicator.position.y = 0.3;
                this.object.add(frontIndicator);
                
                this.createDebugArrows();
                this.modelLoaded = true;
            }
        );
    }
    
    // Fallback method to create simple box geometry if model loading fails
    createFallbackGeometry() {
        const geometry = new THREE.BoxGeometry(1, 0.5, 2);
        const material = new THREE.MeshStandardMaterial({
            color: 0x3366cc,
            metalness: 0.5,
            roughness: 0.5
        });
        
        const boxMesh = new THREE.Mesh(geometry, material);
        boxMesh.castShadow = true;
        boxMesh.receiveShadow = true;
        
        this.object.add(boxMesh);
        
        // Position and add front indicator
        this.object.position.y = 0.0;
        
        const frontIndicator = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.1, 0.1),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        frontIndicator.position.z = 1;
        frontIndicator.position.y = 0.3;
        this.object.add(frontIndicator);
        
        this.createDebugArrows();
        this.modelLoaded = true;
    }
    
    // Method to set the scale of the car model
    setScale(x, y, z) {
        // If only one parameter is provided, use it for all axes (uniform scaling)
        if (typeof y === 'undefined' && typeof z === 'undefined') {
            this.modelScale.set(x, x, x);
        } else {
            this.modelScale.set(x, y || x, z || x);
        }
        
        // If model is already loaded, apply the scale immediately
        if (this.modelLoaded && this.object.children.length > 0) {
            // Find the car model child (first non-arrow object)
            this.object.children.forEach((child) => {
                // Skip arrows and indicators
                if (!child.isArrowHelper && child.type !== 'Mesh') {
                    child.scale.copy(this.modelScale);
                }
            });
        }
    }
    
    // Method to get the current scale
    getScale() {
        return this.modelScale.clone();
    }
    
    createDebugArrows() {
        // Velocity arrow (blue)
        const velocityArrowHelper = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0.5, 0),
            1,
            0x0000ff
        );
        this.object.add(velocityArrowHelper);
        this.velocityArrow = velocityArrowHelper;
        
        // Force arrow (red)
        const forceArrowHelper = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0.5, 0),
            1,
            0xff0000
        );
        this.object.add(forceArrowHelper);
        this.forceArrow = forceArrowHelper;
    }

    Start() {
        // Initialize any state when the car is added to the scene
        console.log("Car controls: WASD or Arrow keys to drive");
    }

    Update(deltaTime) {
        if (!this.modelLoaded) return; // Wait until model is loaded
        
        // Apply time step constraints to prevent instability
        const maxDeltaTime = 0.05; // Cap at 20 FPS for physics stability
        const constrainedDeltaTime = Math.min(deltaTime, maxDeltaTime);

        // Calculate forces in local car space
        const forces = this.calculateForces(constrainedDeltaTime);
        
        // Convert to world space and update velocities
        this.applyForces(forces, constrainedDeltaTime);
        
        // Apply velocity constraints to prevent numerical instability
        this.constrainVelocities();
        
        // Apply velocities to update position and orientation
        this.updatePosition(constrainedDeltaTime);
        
        // Update debug visualization
        this.updateDebugArrows();
        
        // Update UI
        if (ui && ui.updateSpeed) {
            ui.updateSpeed(this.getSpeed() * 3.6); // m/s to km/h
        }
    }
    
    calculateForces(deltaTime) {
        const forces = {
            longitudinal: 0,
            lateral: 0,
            torque: 0
        };
        
        const localVelocity = this.getLocalVelocity();
        const forwardVelocity = localVelocity.y;
        const lateralVelocity = localVelocity.x;
        const speed = this.getSpeed();
        
        // Calculate slip angle for stability control
        const slipAngle = Math.abs(forwardVelocity) > 0.1 ? 
            Math.atan2(Math.abs(lateralVelocity), Math.abs(forwardVelocity)) : 0;
        
        // Stability control factor - reduces forces when sliding too much
        let stabilityFactor = 1.0;
        if (this.stabilityControl && slipAngle > this.maxSlipAngle) {
            stabilityFactor = this.stabilityFactor;
            console.log("Stability control active - slip angle:", slipAngle.toFixed(2));
        }
        
        // Engine forces with stability control
        if (this.accelPressed) {
            const speedFactor = Math.max(0.2, 1.0 - Math.pow(forwardVelocity / this.maxSpeed, 2));
            forces.longitudinal += this.engineForce * speedFactor * stabilityFactor;
        }
        
        // Braking forces
        if (this.brakePressed) {
            const brakeEfficiency = Math.min(1.0, Math.max(0.2, Math.abs(forwardVelocity) / 5.0));
            forces.longitudinal -= Math.sign(forwardVelocity) * this.brakeForce * brakeEfficiency;
        }
        
        // Air resistance
        const dragCoefficient = 0.5 * this.dragCoefficient * 1.225;
        const frontalArea = 2.2;
        const dragForce = dragCoefficient * frontalArea * speed * speed;
        
        if (speed > 0.01) {
            forces.longitudinal -= (forwardVelocity / speed) * dragForce;
            forces.lateral -= (lateralVelocity / speed) * dragForce;
        }
        
        // Rolling resistance
        const rollingResistanceCoefficient = 0.015;
        const normalForce = this.mass * 9.81;
        const rollingResistance = rollingResistanceCoefficient * normalForce;
        
        if (Math.abs(forwardVelocity) > 0.1) {
            forces.longitudinal -= Math.sign(forwardVelocity) * rollingResistance;
        } else if (Math.abs(forwardVelocity) <= 0.1 && !this.accelPressed) {
            forces.longitudinal = -forwardVelocity * this.mass / deltaTime;
        }
        
        // IMPROVED: Progressive lateral friction with drift control
        if (Math.abs(lateralVelocity) > 0.05) {
            // Progressive friction that allows controlled sliding
            const maxLateralFriction = this.tireFriction * normalForce;
            
            // Calculate friction based on lateral velocity - allows for controlled drifts
            const lateralSpeedFactor = Math.min(1.0, Math.abs(lateralVelocity) / 3.0); // Normalize to 3 m/s max lateral speed
            const progressiveFriction = maxLateralFriction * (0.3 + 0.7 * (1.0 - lateralSpeedFactor));
            
            forces.lateral += -Math.sign(lateralVelocity) * progressiveFriction;
        }
        
        // FIXED: Improved steering that works at all speeds
        const steeringInput = this.leftPressed ? 1 : (this.rightPressed ? -1 : 0);
    
        if (Math.abs(forwardVelocity) > 0.5 && steeringInput !== 0) {
            // NEW: More realistic speed-dependent steering curve
            // Instead of cutting off steering, reduce it progressively
            const speedInKmh = Math.abs(forwardVelocity) * 3.6; // Convert to km/h for easier tuning
            
            // Steering effectiveness curve - maintains steering at high speeds
            let steeringEffectiveness;
            if (speedInKmh < 30) {
                // Full steering at low speeds (0-30 km/h)
                steeringEffectiveness = 1.0;
            } else if (speedInKmh < 80) {
                // Gradual reduction from 30-80 km/h
                steeringEffectiveness = 1.0 - ((speedInKmh - 30) / 50) * 0.4; // Reduce to 60% at 80 km/h
            } else {
                // Minimum steering at very high speeds (80+ km/h) - but never zero
                steeringEffectiveness = 0.6 - ((speedInKmh - 80) / 40) * 0.3; // Reduce to 30% at 120 km/h
                steeringEffectiveness = Math.max(0.3, steeringEffectiveness); // Never go below 30%
            }
            
            // Maximum steering angle based on speed
            const maxSteeringAngle = 0.5 * steeringEffectiveness; // Up to 0.5 radians (~29 degrees)
            const steeringAngle = steeringInput * maxSteeringAngle;
            
            // IMPROVED: Better cornering force calculation
            // Use a more sophisticated tire model that accounts for speed
            const baseCorneringStiffness = this.corneringStiffness;
            
            // Cornering stiffness decreases slightly with speed (tire load sensitivity)
            const speedFactor = 1.0 / (1.0 + Math.pow(speedInKmh / 100, 2) * 0.2); // Slight reduction at very high speeds
            const adjustedCorneringStiffness = baseCorneringStiffness * speedFactor;
            
            // Calculate slip angle and cornering force
            const currentSlipAngle = Math.atan2(lateralVelocity, Math.abs(forwardVelocity));
            const targetSlipAngle = currentSlipAngle - steeringAngle;
            
            // Progressive cornering force
            let corneringForce = -adjustedCorneringStiffness * targetSlipAngle;
            
            // Limit cornering force but scale with speed for realism
            const maxCorneringForce = 8000 + (speedInKmh * 20); // Slightly more force available at higher speeds
            corneringForce = Math.max(-maxCorneringForce, Math.min(corneringForce, maxCorneringForce));
            
            // Apply stability control to cornering
            corneringForce *= stabilityFactor;
            
            forces.lateral += corneringForce;
            
            // IMPROVED: Torque calculation with better high-speed handling
            const wheelbase = 2.5;
            let torqueFromSteering = corneringForce * (wheelbase / 2) * Math.sign(forwardVelocity);
            
            // Scale torque with steering effectiveness instead of cutting it off
            torqueFromSteering *= steeringEffectiveness;
            
            // Reduce torque when sliding to prevent spin-outs
            if (slipAngle > this.maxSlipAngle * 0.5) {
                torqueFromSteering *= 0.7; // Less aggressive reduction
            }
            
            forces.torque += torqueFromSteering;
            
            // Debug output for high-speed steering
            if (speedInKmh > 50) {
                console.log(`High speed steering - Speed: ${speedInKmh.toFixed(1)} km/h, Effectiveness: ${(steeringEffectiveness * 100).toFixed(1)}%`);
            }
        }
        
        // NEW: Counter-steering assistance when sliding
        if (slipAngle > this.maxSlipAngle * 0.3 && Math.abs(this._angularVelocity) > 0.5) {
            // Apply counter-torque to reduce spinning
            const counterTorque = -Math.sign(this._angularVelocity) * 2000 * Math.min(slipAngle / this.maxSlipAngle, 1.0);
            forces.torque += counterTorque;
        }
        
        return forces;
    }
    
    applyForces(forces, deltaTime) {
        // Get car's rotation
        const carRotation = this.object.rotation.y;
        
        // Convert local forces to world space using rotation matrix
        const worldForceX = forces.longitudinal * Math.sin(carRotation) + forces.lateral * Math.cos(carRotation);
        const worldForceZ = forces.longitudinal * Math.cos(carRotation) - forces.lateral * Math.sin(carRotation);
        
        // Apply forces to velocity (F = ma, so a = F/m)
        const accelerationX = worldForceX / this.mass;
        const accelerationZ = worldForceZ / this.mass;
        
        // Update velocities
        this._velocity.x += accelerationX * deltaTime;
        this._velocity.y += accelerationZ * deltaTime;
        
        // Apply torque to angular velocity
        const angularAcceleration = forces.torque / this.momentOfInertia;
        this._angularVelocity += angularAcceleration * deltaTime;
    }
    
    constrainVelocities() {
        // Constrain linear velocity
        const speed = this.getSpeed();
        if (speed > this.maxSpeed) {
            this._velocity.x = (this._velocity.x / speed) * this.maxSpeed;
            this._velocity.y = (this._velocity.y / speed) * this.maxSpeed;
        }
        
        // Stop creeping at very low speeds
        if (speed < 0.1 && !this.accelPressed && !this.brakePressed) {
            this._velocity.x = 0;
            this._velocity.y = 0;
        }
        
        // IMPROVED: Angular velocity constraints with drift consideration
        const maxAngularVelocity = 2.5; // Reduced from 3.0 for more control
        if (Math.abs(this._angularVelocity) > maxAngularVelocity) {
            this._angularVelocity = Math.sign(this._angularVelocity) * maxAngularVelocity;
        }
        
        // Calculate current slip for adaptive damping
        const localVelocity = this.getLocalVelocity();
        const slipAngle = Math.abs(localVelocity.y) > 0.1 ? 
            Math.atan2(Math.abs(localVelocity.x), Math.abs(localVelocity.y)) : 0;
        
        // Adaptive angular damping - more damping when sliding
        let angularDamping = 0.95;
        if (slipAngle > this.maxSlipAngle * 0.5) {
            angularDamping = this.antiSpinDamping; // More aggressive damping during slides
        }
        
        this._angularVelocity *= angularDamping;
        
        // Stop small oscillations
        if (Math.abs(this._angularVelocity) < 0.01) {
            this._angularVelocity = 0;
        }
    }
    
    updatePosition(deltaTime) {
        // Update position based on velocity
        this.object.position.x += this._velocity.x * deltaTime;
        this.object.position.z += this._velocity.y * deltaTime;
        
        // Update rotation based on angular velocity
        this.object.rotation.y += this._angularVelocity * deltaTime;
        
        // Normalize rotation to prevent accumulation errors
        this.object.rotation.y = this.object.rotation.y % (2 * Math.PI);
    }
    
    updateDebugArrows() {
        if (this.velocityArrow) {
            // Update velocity arrow
            const speed = this.getSpeed();
            if (speed > 0.1) {
                const velocityDirection = new THREE.Vector3(
                    this._velocity.x / speed,
                    0,
                    this._velocity.y / speed
                );
                this.velocityArrow.setDirection(velocityDirection);
                this.velocityArrow.setLength(Math.min(speed, 5));
                this.velocityArrow.visible = true;
            } else {
                this.velocityArrow.visible = false;
            }
        }
        
        if (this.forceArrow) {
            // We can visualize engine/brake force
            const forceDirection = this.accelPressed ? 
                new THREE.Vector3(0, 0, 1) : 
                (this.brakePressed ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 0, 0));
            
            const forceMagnitude = this.accelPressed ? 
                this.engineForce / this.mass : 
                (this.brakePressed ? this.brakeForce / this.mass : 0);
                
            this.forceArrow.setDirection(forceDirection);
            this.forceArrow.setLength(Math.min(forceMagnitude, 5));
            this.forceArrow.visible = forceMagnitude > 0.1;
        }
    }
    
    getSpeed() {
        // Calculate total speed from velocity components
        return Math.sqrt(this._velocity.x * this._velocity.x + this._velocity.y * this._velocity.y);
    }
    
    // Helper method to get velocity in local car space
    getLocalVelocity() {
        const carRotation = this.object.rotation.y;
        const cosRot = Math.cos(carRotation);
        const sinRot = Math.sin(carRotation);
        
        // Convert world velocity to local car space (rotation matrix)
        const localVelocityX = this._velocity.x * cosRot - this._velocity.y * sinRot; // Lateral
        const localVelocityZ = this._velocity.x * sinRot + this._velocity.y * cosRot; // Longitudinal
        
        return new THREE.Vector2(localVelocityX, localVelocityZ);
    }
    
    // Add method to get the main body mesh for collision detection
    getMainBodyMesh() {
        return this.mainBodyMesh;
    }

    // Add method to get physics bounds based on Object001
    getPhysicsBounds() {
        if (this.mainBodyMesh) {
            const box = new THREE.Box3().setFromObject(this.mainBodyMesh);
            return {
                min: box.min,
                max: box.max,
                size: {
                    width: box.max.x - box.min.x,
                    height: box.max.y - box.min.y,
                    length: box.max.z - box.min.z
                }
            };
        }
        return null;
    }

    // Update collision detection method
    checkCollisionWith(otherObject) {
        if (!this.mainBodyMesh) return false;
        
        // Use Object001's bounding box for collision detection
        const thisBox = new THREE.Box3().setFromObject(this.mainBodyMesh);
        const otherBox = new THREE.Box3().setFromObject(otherObject);
        
        return thisBox.intersectsBox(otherBox);
    }

    // NEW: Method to toggle stability control
    toggleStabilityControl() {
        this.stabilityControl = !this.stabilityControl;
        console.log("Stability control:", this.stabilityControl ? "ON" : "OFF");
    }

    // NEW: Method to adjust drift sensitivity
    setDriftSensitivity(sensitivity) {
        // sensitivity: 0 = very stable, 1 = very drifty
        this.maxSlipAngle = 0.2 + (sensitivity * 0.3); // 0.2 to 0.5 radians
        this.stabilityFactor = 0.9 - (sensitivity * 0.4); // 0.9 to 0.5
        this.antiSpinDamping = 0.95 - (sensitivity * 0.1); // 0.95 to 0.85
        console.log(`Drift sensitivity set to ${sensitivity} (slip angle: ${this.maxSlipAngle.toFixed(2)})`);
    }
}

