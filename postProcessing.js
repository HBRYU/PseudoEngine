import * as THREE from 'https://unpkg.com/three@0.149.0/build/three.module.js'; // Specific version
import { EffectComposer } from 'https://unpkg.com/three@0.149.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.149.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://unpkg.com/three@0.149.0/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.149.0/examples/jsm/postprocessing/UnrealBloomPass.js';

// Create and configure the post-processing composer
export function createPostProcessing(scene, camera, renderer) {
    // Create composer with the same size as renderer
    const composer = new EffectComposer(renderer);
    
    // Just add the basic render pass - no special effects
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // Custom shader for color adjustment
    const colorShader = {
        uniforms: {
            "tDiffuse": { value: null },
            "brightness": { value: 1.1 },
            "contrast": { value: 1.1 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float brightness;
            uniform float contrast;
            varying vec2 vUv;
            
            void main() {
                vec4 color = texture2D(tDiffuse, vUv);
                color.rgb = (color.rgb - 0.5) * contrast + 0.5;
                color.rgb *= brightness;
                gl_FragColor = color;
            }
        `
    };
    
    const colorPass = new ShaderPass(colorShader);
    composer.addPass(colorPass);
    
    // Add bloom effect (more compatible with older Three.js)
    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.25,  // strength 
        0.6,  // radius
        0.4  // threshold
    );
    composer.addPass(bloomPass);
    
    // Update composer size when window resizes
    window.addEventListener('resize', () => {
        composer.setSize(window.innerWidth, window.innerHeight);
    });
    
    return composer;
}