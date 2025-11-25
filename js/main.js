import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// =========================================================================
// --- 1. CONFIGURAÇÃO GERAL ---
// =========================================================================
const CONFIG = {
    particleCount: 5000,
    leafCount: 3000,
    ashCount: 2000,
    rainCount: 3000, 
    colors: {
        origin: new THREE.Color('#d4a373'),
        connection: new THREE.Color('#2a9d8f'),
        territory: new THREE.Color('#588157'), 
        night: new THREE.Color('#051014'),     
        resistance: new THREE.Color('#e76f51'),
        fire: new THREE.Color('#ff4500'),
        burnt: new THREE.Color('#1a0500'), 
        celebration: new THREE.Color('#f4a261'),
        future: new THREE.Color('#a8dadc'),
        clay: new THREE.Color('#8b4513'),
        storm: new THREE.Color('#1a1a2e') 
    },
    leafColor: new THREE.Color('#4d9e5f')
};

const chapters = [
    '#chapter-origin', '#chapter-connection', '#chapter-territory', '#chapter-artifacts', 
    '#chapter-resistance', '#chapter-fire', '#knowledge-stack', '#chapter-cosmology', 
    '#chapter-heroes', '#chapter-celebration', '#chapter-future'
];

// Estado Global
let mouseX = 0;
let mouseY = 0;
let isStormActive = false;
let lightningStrength = 0;

// =========================================================================
// --- 2. CENA E CÂMERA ---
// =========================================================================
const canvas = document.querySelector('#bg-canvas');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050505, 0.025);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// =========================================================================
// --- 3. SISTEMAS DE PARTÍCULAS ---
// =========================================================================

// --- A. Partículas Principais (Poeira/Chão) ---
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(CONFIG.particleCount * 3);
const randoms = new Float32Array(CONFIG.particleCount);

for (let i = 0; i < CONFIG.particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 15;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
    randoms[i] = Math.random();
}
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

const material = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uColor: { value: CONFIG.colors.origin },
        uScrollProgress: { value: 0 },
        uFormFactor: { value: 0 },
        uOpacity: { value: 1.0 }
    },
    vertexShader: `
        uniform float uTime;
        uniform float uFormFactor;
        attribute float aRandom;
        varying float vAlpha;
        void main() {
            vec3 pos = position;
            float time = uTime * 0.5;
            float noise = sin(pos.x * 2.0 + time) * cos(pos.z * 1.5 + time) * 0.5;
            float wave = sin(pos.x * 1.0 + time * 2.0) * 1.0;
            float spike = sin(pos.x * 5.0 + time * 5.0) * cos(pos.z * 5.0) * 0.5;
            if (uFormFactor < 1.0) {
                pos.y += mix(noise, wave, uFormFactor);
            } else {
                pos.y += mix(wave, spike, uFormFactor - 1.0);
            }
            pos.x += sin(time + aRandom * 10.0) * 0.2;
            pos.z += cos(time + aRandom * 10.0) * 0.2;
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = (4.0 + aRandom * 2.0) * (10.0 / -mvPosition.z);
            vAlpha = 0.8 - smoothstep(10.0, 20.0, length(pos));
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlpha;
        void main() {
            float r = distance(gl_PointCoord, vec2(0.5));
            if (r > 0.5) discard;
            float glow = 1.0 - (r * 2.0);
            glow = pow(glow, 1.5);
            gl_FragColor = vec4(uColor, vAlpha * glow * uOpacity);
        }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});
const particles = new THREE.Points(geometry, material);
scene.add(particles);

// --- B. Folhas (Leaves) ---
const leafGeometry = new THREE.BufferGeometry();
const leafPositions = new Float32Array(CONFIG.leafCount * 3);
const leafRandoms = new Float32Array(CONFIG.leafCount * 3);

for (let i = 0; i < CONFIG.leafCount; i++) {
    leafPositions[i * 3] = (Math.random() - 0.5) * 20;
    leafPositions[i * 3 + 1] = Math.random() * 10 + 5;
    leafPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    leafRandoms[i * 3] = Math.random();
    leafRandoms[i * 3 + 1] = Math.random();
    leafRandoms[i * 3 + 2] = Math.random();
}
leafGeometry.setAttribute('position', new THREE.BufferAttribute(leafPositions, 3));
leafGeometry.setAttribute('aRandom', new THREE.BufferAttribute(leafRandoms, 3));

const leafMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uColor: { value: CONFIG.leafColor },
        uOpacity: { value: 0.0 }
    },
    vertexShader: `
        uniform float uTime;
        attribute vec3 aRandom;
        varying float vAlpha;
        void main() {
            vec3 pos = position;
            float time = uTime;
            float fallSpeed = 0.5 + aRandom.x * 1.5;
            pos.y -= time * fallSpeed;
            pos.y = mod(pos.y + 5.0, 20.0) - 5.0; 
            pos.x += sin(time * aRandom.y + aRandom.z * 10.0) * 0.5;
            pos.z += cos(time * aRandom.y * 0.8 + aRandom.z * 10.0) * 0.5;
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = (4.0 + aRandom.x * 4.0) * (10.0 / -mvPosition.z);
            vAlpha = 0.8 - smoothstep(10.0, 20.0, length(pos));
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlpha;
        void main() {
            float r = distance(gl_PointCoord, vec2(0.5));
            if (r > 0.5) discard;
            float glow = 1.0 - (r * 2.0);
            glow = pow(glow, 1.5);
            gl_FragColor = vec4(uColor, vAlpha * glow * uOpacity);
        }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});
const leafParticles = new THREE.Points(leafGeometry, leafMaterial);
scene.add(leafParticles);

// --- C. Vagalumes (Fireflies) ---
const fireflyGeometry = new THREE.BufferGeometry();
const fireflyTotal = 100; // Renomeado para evitar conflito
const fireflyPositions = new Float32Array(fireflyTotal * 3);
const fireflyRandoms = new Float32Array(fireflyTotal * 3);
for(let i = 0; i < fireflyTotal; i++) {
    fireflyPositions[i * 3] = (Math.random() - 0.5) * 25;
    fireflyPositions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    fireflyPositions[i * 3 + 2] = (Math.random() - 0.5) * 15;
    fireflyRandoms[i * 3] = Math.random();
    fireflyRandoms[i * 3 + 1] = Math.random();
    fireflyRandoms[i * 3 + 2] = Math.random();
}
fireflyGeometry.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3));
fireflyGeometry.setAttribute('aRandom', new THREE.BufferAttribute(fireflyRandoms, 3));

const fireflyMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xffffaa) }, 
        uOpacity: { value: 0.0 } 
    },
    vertexShader: `
        uniform float uTime;
        attribute vec3 aRandom;
        void main() {
            vec3 pos = position;
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            float pulse = 1.0 + 0.3 * sin(uTime * 3.0 + aRandom.x * 100.0);
            gl_PointSize = (8.0 + aRandom.x * 5.0) * pulse * (10.0 / -mvPosition.z);
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        void main() {
            float r = distance(gl_PointCoord, vec2(0.5));
            if (r > 0.5) discard; 
            float glow = 1.0 - (r * 2.0);
            glow = pow(glow, 2.0); 
            gl_FragColor = vec4(uColor, glow * uOpacity);
        }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});
const fireflies = new THREE.Points(fireflyGeometry, fireflyMaterial);
scene.add(fireflies);

// --- D. Cinzas (Ashes) ---
const ashGeometry = new THREE.BufferGeometry();
const ashPositions = new Float32Array(CONFIG.ashCount * 3);
const ashRandoms = new Float32Array(CONFIG.ashCount * 3);

for(let i=0; i<CONFIG.ashCount; i++) {
    ashPositions[i*3] = (Math.random() - 0.5) * 25;
    ashPositions[i*3+1] = Math.random() * 15;
    ashPositions[i*3+2] = (Math.random() - 0.5) * 25;
    ashRandoms[i*3] = Math.random(); 
    ashRandoms[i*3+1] = Math.random();
    ashRandoms[i*3+2] = Math.random(); 
}
ashGeometry.setAttribute('position', new THREE.BufferAttribute(ashPositions, 3));
ashGeometry.setAttribute('aRandom', new THREE.BufferAttribute(ashRandoms, 3));

const ashMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xaaaaaa) },
        uOpacity: { value: 0.0 }
    },
    vertexShader: `
        uniform float uTime;
        attribute vec3 aRandom;
        varying float vAlpha;
        void main() {
            vec3 pos = position;
            float time = uTime * 0.5;
            float fallSpeed = 0.2 + aRandom.x * 0.5;
            pos.y -= time * fallSpeed;
            pos.y = mod(pos.y + 5.0, 20.0) - 5.0;
            pos.x += sin(time + aRandom.y * 10.0) * 0.05;
            pos.z += cos(time * 0.8 + aRandom.z * 10.0) * 0.05;
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = (3.0 + aRandom.x * 3.0) * (10.0 / -mvPosition.z);
            vAlpha = 0.6 + 0.4 * sin(time + aRandom.x * 10.0);
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlpha;
        void main() {
            float r = distance(gl_PointCoord, vec2(0.5));
            if (r > 0.5) discard;
            gl_FragColor = vec4(uColor, vAlpha * 0.8 * uOpacity);
        }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
});
const ashParticles = new THREE.Points(ashGeometry, ashMaterial);
scene.add(ashParticles);

// =========================================================================
// --- 4. OBJETOS 3D E EFEITOS ---
// =========================================================================

// --- Artefatos (Vaso) ---
const artifactGroup = new THREE.Group();
scene.add(artifactGroup);
artifactGroup.visible = true; 
const potteryPoints = [];
for (let i = 0; i < 10; i++) { potteryPoints.push(new THREE.Vector2(Math.sin(i * 0.2) * 1 + 0.5, (i - 5) * 0.5)); }
const potteryGeo = new THREE.LatheGeometry(potteryPoints, 20);
const potteryMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513, wireframe: true, transparent: true, opacity: 0.0 });
const pottery = new THREE.Mesh(potteryGeo, potteryMaterial);
artifactGroup.add(pottery);
pottery.rotation.x = Math.PI / 6;

// --- Chuva Realista (Storm) ---
const rainTotal = CONFIG.rainCount; // Usando variável segura
const rainGeo = new THREE.BufferGeometry();
const rainPos = new Float32Array(rainTotal * 2 * 3); 
const rainVel = new Float32Array(rainTotal);
for(let i=0; i<rainTotal; i++) {
    const x = (Math.random() - 0.5) * 40; 
    const y = Math.random() * 30 + 10; 
    const z = (Math.random() - 0.5) * 20;
    rainPos[i*6] = x; rainPos[i*6+1] = y; rainPos[i*6+2] = z;
    rainPos[i*6+3] = x; rainPos[i*6+4] = y - 0.5; rainPos[i*6+5] = z;
    rainVel[i] = 0.5 + Math.random() * 0.5;
}
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainMaterial = new THREE.LineBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.6 });
const rain = new THREE.LineSegments(rainGeo, rainMaterial);
rain.visible = false;
scene.add(rain);

// --- Céu Tempestade ---
const skyGeo = new THREE.PlaneGeometry(100, 100);
const skyMaterial = new THREE.MeshBasicMaterial({ color: 0x6e7f99, transparent: true, opacity: 0.0, side: THREE.DoubleSide });
const stormSkyPlane = new THREE.Mesh(skyGeo, skyMaterial);
stormSkyPlane.position.z = -20;
scene.add(stormSkyPlane);

// --- Raio (Lightning) ---
const lightningSegmentCount = 25; 
const lightningGeo = new THREE.BufferGeometry();
const lightningPositions = new Float32Array((lightningSegmentCount + 1) * 3);
lightningGeo.setAttribute('position', new THREE.BufferAttribute(lightningPositions, 3));
const lightningMat = new THREE.LineBasicMaterial({ color: 0xe0ffff, linewidth: 2 }); 
const lightningBolt = new THREE.Line(lightningGeo, lightningMat);
lightningBolt.visible = false; 
scene.add(lightningBolt);

function regenerateLightningPath(geo) {
     const posAttribute = geo.attributes.position;
     const array = posAttribute.array;
     let x = (Math.random() - 0.5) * 30; let y = 25; let z = (Math.random() - 0.5) * 15 - 5; 
     const stepY = y / lightningSegmentCount;
     array[0] = x; array[1] = y; array[2] = z;
     for (let i = 1; i <= lightningSegmentCount; i++) {
         x += (Math.random() - 0.5) * 3; y -= stepY; z += (Math.random() - 0.5) * 2; 
         array[i*3] = x; array[i*3+1] = y; array[i*3+2] = z;
     }
     posAttribute.needsUpdate = true;
}

// --- Cocar ---
const cocarGroup = new THREE.Group();
scene.add(cocarGroup);
const featherCount = 20;
const radius = 2;
const featherGeometry = new THREE.ConeGeometry(0.1, 1.5, 8);
const featherMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, wireframe: true });
for (let i = 0; i < featherCount; i++) {
    const angle = (i / (featherCount - 1)) * Math.PI - Math.PI / 2;
    const feather = new THREE.Mesh(featherGeometry, featherMaterial);
    feather.position.x = Math.cos(angle) * radius;
    feather.position.y = Math.sin(angle) * radius;
    feather.position.z = 0;
    feather.rotation.z = angle - Math.PI / 2;
    cocarGroup.add(feather);
}
cocarGroup.position.set(0, 1, -10);
cocarGroup.visible = false;

// --- Floresta ---
const forestGroup = new THREE.Group();
scene.add(forestGroup);
forestGroup.visible = false;
const treeGeometries = [];
for (let i = 0; i < 50; i++) {
    const height = 1 + Math.random() * 2;
    const radius = 0.2 + Math.random() * 0.3;
    const treeGeo = new THREE.ConeGeometry(radius, height, 4, 1, true);
    const x = (Math.random() - 0.5) * 20;
    const z = (Math.random() - 0.5) * 10 - 5;
    treeGeo.translate(x, height / 2, z);
    treeGeometries.push(treeGeo);
}
const forestMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#ff0000') }, uScanHeight: { value: -5.0 } },
    vertexShader: `varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uScanHeight; varying vec3 vPos; void main() { vec3 color = uColor * 0.2; float scanWidth = 0.5; float dist = abs(vPos.y - uScanHeight); if (dist < scanWidth) { float intensity = 1.0 - (dist / scanWidth); color += uColor * intensity * 2.0; } gl_FragColor = vec4(color, 1.0); }`,
    wireframe: true, transparent: true, blending: THREE.AdditiveBlending
});
treeGeometries.forEach(geo => { const edges = new THREE.EdgesGeometry(geo); const line = new THREE.LineSegments(edges, forestMaterial); forestGroup.add(line); });

// --- Brasas (Sparks) ---
const sparkTotal = 1000;
const sparkGeo = new THREE.BufferGeometry();
const sparkPos = new Float32Array(sparkTotal * 3);
const sparkSpeed = new Float32Array(sparkTotal);
for(let i=0; i<sparkTotal; i++) {
    sparkPos[i*3] = (Math.random() - 0.5) * 20;
    sparkPos[i*3+1] = Math.random() * 10;
    sparkPos[i*3+2] = (Math.random() - 0.5) * 10;
    sparkSpeed[i] = 0.02 + Math.random() * 0.05;
}
sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
const sparkMaterial = new THREE.PointsMaterial({ color: 0xff4500, size: 0.1, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, sizeAttenuation: true });
const sparks = new THREE.Points(sparkGeo, sparkMaterial);
scene.add(sparks);
sparks.visible = false;

// --- Cursor ---
const cursorDot = document.querySelector('.cursor-dot');
const cursorOutline = document.querySelector('.cursor-outline');
window.addEventListener('mousemove', (e) => {
    const posX = e.clientX;
    const posY = e.clientY;
    if(cursorDot) { cursorDot.style.left = `${posX}px`; cursorDot.style.top = `${posY}px`; }
    if(cursorOutline) cursorOutline.animate({ left: `${posX}px`, top: `${posY}px` }, { duration: 500, fill: "forwards" });
    mouseX = e.clientX / window.innerWidth - 0.5;
    mouseY = e.clientY / window.innerHeight - 0.5;
    gsap.to(particles.rotation, { x: mouseY * 0.2, y: mouseX * 0.2 + (clock.getElapsedTime() * 0.05), duration: 1 });
});

// --- Constelação ---
const constellationGroup = new THREE.Group();
scene.add(constellationGroup);
constellationGroup.visible = false;
const starTotal = 200;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starTotal * 3);
for(let i=0; i<starTotal; i++) {
    starPos[i*3] = (Math.random() - 0.5) * 50;
    starPos[i*3+1] = (Math.random() - 0.5) * 30 + 10;
    starPos[i*3+2] = (Math.random() - 0.5) * 20 - 10;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true });
const stars = new THREE.Points(starGeo, starMaterial);
constellationGroup.add(stars);
const jaguarPoints = [ new THREE.Vector3(-5, 12, -15), new THREE.Vector3(-2, 14, -15), new THREE.Vector3(2, 13, -15), new THREE.Vector3(5, 10, -15), new THREE.Vector3(3, 8, -15), new THREE.Vector3(-1, 9, -15), new THREE.Vector3(-4, 7, -15) ];
const jaguarGeo = new THREE.BufferGeometry().setFromPoints(jaguarPoints);
const jaguarLine = new THREE.Line(jaguarGeo, new THREE.LineBasicMaterial({ color: 0xa8dadc, transparent: true, opacity: 0.5 }));
constellationGroup.add(jaguarLine);

// =========================================================================
// --- 5. LOOP DE ANIMAÇÃO ---
// =========================================================================
const clock = new THREE.Clock();
function animate() {
    const elapsedTime = clock.getElapsedTime();
    
    // Atualiza Shaders
    if (material.uniforms) material.uniforms.uTime.value = elapsedTime;
    if (leafMaterial.uniforms) leafMaterial.uniforms.uTime.value = elapsedTime;
    if (fireflyMaterial.uniforms) fireflyMaterial.uniforms.uTime.value = elapsedTime;
    if (ashMaterial.uniforms) ashMaterial.uniforms.uTime.value = elapsedTime;

    // Rotações
    if (particles) particles.rotation.y = elapsedTime * 0.05;
    if (leafParticles) leafParticles.rotation.y = elapsedTime * 0.02;

    // Vagalumes
    if (fireflies) {
        const fPositions = fireflies.geometry.attributes.position.array;
        const fRandoms = fireflies.geometry.attributes.aRandom.array;
        for(let i = 0; i < fireflyTotal; i++) {
            fPositions[i*3] += Math.sin(elapsedTime + fRandoms[i*3] * 10) * 0.01;
            fPositions[i*3+1] += Math.cos(elapsedTime * 0.8 + fRandoms[i*3+1] * 10) * 0.01;
            fPositions[i*3+2] += Math.sin(elapsedTime * 0.5 + fRandoms[i*3+2] * 10) * 0.01;
        }
        fireflies.geometry.attributes.position.needsUpdate = true;
    }

    // Tempestade
    if (isStormActive) {
        const rPos = rain.geometry.attributes.position.array;
        for(let i=0; i<rainTotal; i++) {
            const speed = rainVel[i];
            rPos[i*6+1] -= speed; rPos[i*6+4] -= speed;
            if(rPos[i*6+1] < -10) {
                const newY = 20 + Math.random() * 5; const newX = (Math.random() - 0.5) * 40; const newZ = (Math.random() - 0.5) * 20;
                rPos[i*6] = newX; rPos[i*6+1] = newY; rPos[i*6+2] = newZ;
                rPos[i*6+3] = newX; rPos[i*6+4] = newY - 0.5; rPos[i*6+5] = newZ;
            }
        }
        rain.geometry.attributes.position.needsUpdate = true;

        if (Math.random() > 0.993) { 
            lightningStrength = 1.0;
            regenerateLightningPath(lightningBolt.geometry);
            lightningBolt.visible = true;
        }
        if (lightningStrength > 0) {
            lightningStrength -= 0.1; 
            if (lightningStrength < 0) lightningStrength = 0;
            skyMaterial.opacity = lightningStrength * 0.6; 
            scene.fog.color.setHex(0x333344); 
        } else {
             scene.fog.color.setHex(0x050505); 
             lightningBolt.visible = false; 
        }
    } else {
        skyMaterial.opacity = 0;
        lightningBolt.visible = false;
    }

    // Outros
    if (typeof cocarGroup !== 'undefined' && cocarGroup.visible) { cocarGroup.rotation.y = Math.sin(elapsedTime * 0.5) * 0.2; cocarGroup.position.y = 1 + Math.sin(elapsedTime) * 0.1; }
    if (typeof forestGroup !== 'undefined' && forestGroup.visible) forestMaterial.uniforms.uScanHeight.value = Math.sin(elapsedTime) * 2 + 1;
    
    // Brasas (Sparks)
    if (typeof sparks !== 'undefined' && sparks.visible) {
        const positions = sparks.geometry.attributes.position.array;
        for(let i=0; i<sparkTotal; i++) { 
            positions[i*3+1] += sparkSpeed[i]; 
            if(positions[i*3+1] > 10) { 
                positions[i*3+1] = 0; 
                positions[i*3] = (Math.random() - 0.5) * 20; 
            } 
        }
        sparks.geometry.attributes.position.needsUpdate = true;
    }

    if (typeof artifactGroup !== 'undefined' && artifactGroup.visible) { artifactGroup.rotation.y += 0.005; pottery.rotation.z = Math.sin(elapsedTime * 0.5) * 0.1; }
    if (typeof constellationGroup !== 'undefined' && constellationGroup.visible) { constellationGroup.rotation.z = Math.sin(elapsedTime * 0.1) * 0.05; }
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// =========================================================================
// --- 6. LOGICA DO SITE (GSAP, TEXTOS, UI) ---
// =========================================================================
function scrambleText(element, text, duration) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    const originalText = text || element.innerText;
    const length = originalText.length;
    let progress = 0;
    const interval = setInterval(() => {
        progress += 1 / (duration * 30);
        if (progress >= 1) { element.innerText = originalText; clearInterval(interval); return; }
        let result = ""; for (let i = 0; i < length; i++) { if (i < length * progress) result += originalText[i]; else result += chars[Math.floor(Math.random() * chars.length)]; }
        element.innerText = result;
    }, 33);
}
const titles = document.querySelectorAll('.chapter-title');
titles.forEach(title => {
    title.dataset.originalText = title.innerText;
    ScrollTrigger.create({ trigger: title, start: "top 80%", onEnter: () => { gsap.fromTo(title, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1 }); scrambleText(title, title.dataset.originalText, 1.5); } });
});
const textBlocks = document.querySelectorAll('.text-block');
textBlocks.forEach(block => {
    gsap.to(block, { opacity: 1, y: 0, duration: 1, scrollTrigger: { trigger: block, start: "top 85%", end: "top 65%", scrub: true, toggleActions: "play none none reverse" } });
});

const knowledgeSection = document.querySelector('.knowledge-section');
const knowledgeContainer = document.querySelector('.knowledge-container');
if (knowledgeSection && knowledgeContainer) {
    gsap.to(knowledgeContainer, { x: () => -(knowledgeContainer.scrollWidth - window.innerWidth), ease: "none", scrollTrigger: { trigger: knowledgeSection, pin: true, scrub: 1, start: "top top", end: () => "+=" + (knowledgeContainer.scrollWidth - window.innerWidth), invalidateOnRefresh: true, onEnter: () => { cocarGroup.visible = true; gsap.to(cocarGroup.position, { z: 0, duration: 1 }); }, onLeave: () => { gsap.to(cocarGroup.position, { z: -10, duration: 1, onComplete: () => cocarGroup.visible = false }); }, onEnterBack: () => { cocarGroup.visible = true; gsap.to(cocarGroup.position, { z: 0, duration: 1 }); }, onLeaveBack: () => { gsap.to(cocarGroup.position, { z: -10, duration: 1, onComplete: () => cocarGroup.visible = false }); } } });
}

// --- TIMELINE PRINCIPAL ---
const smoothEase = "sine.inOut"; 
const tl = gsap.timeline({
    scrollTrigger: { trigger: "body", start: "top top", end: "bottom bottom", scrub: 2.5 }
});

// 1. Origem
tl.to(material.uniforms.uColor.value, { r: CONFIG.colors.origin.r, g: CONFIG.colors.origin.g, b: CONFIG.colors.origin.b, duration: 1, ease: smoothEase }, "step0")
.to(material.uniforms.uFormFactor, { value: 0.0, duration: 1, ease: smoothEase }, "step0")
.to(camera.position, { z: 5, y: 2, duration: 1, ease: smoothEase }, "step0");

// 2. Sangue e Seiva
tl.to(material.uniforms.uOpacity, { value: 0.0, duration: 0.5, ease: smoothEase }, "step1") 
.to(leafMaterial.uniforms.uOpacity, { value: 1.0, duration: 0.5, ease: smoothEase }, "step1")
.to(camera.position, { z: 4, y: 1, duration: 1, ease: smoothEase }, "step1");

// 3. Território Sagrado
tl.to(leafMaterial.uniforms.uOpacity, { value: 0.0, duration: 0.5, ease: smoothEase }, "step2")
.to(material.uniforms.uColor.value, { r: CONFIG.colors.night.r, g: CONFIG.colors.night.g, b: CONFIG.colors.night.b, duration: 0.5, ease: smoothEase }, "step2") 
.to(material.uniforms.uOpacity, { value: 0.3, duration: 0.5, ease: smoothEase }, "step2") 
.to(material.uniforms.uFormFactor, { value: 0.5, duration: 1, ease: smoothEase }, "step2")
.to(fireflyMaterial.uniforms.uOpacity, { value: 1.0, duration: 1, ease: smoothEase }, "step2") 
.to(camera.position, { z: 3.5, y: 0.8, duration: 1, ease: smoothEase }, "step2");

// 4. Artefatos
tl.to(fireflyMaterial.uniforms.uOpacity, { value: 0.0, duration: 0.5, ease: smoothEase }, "step_artifacts")
.to(material.uniforms.uColor.value, { r: CONFIG.colors.clay.r, g: CONFIG.colors.clay.g, b: CONFIG.colors.clay.b, duration: 0.5, ease: smoothEase }, "step_artifacts") 
.to(material.uniforms.uOpacity, { value: 0.15, duration: 0.5, ease: smoothEase }, "step_artifacts") 
.to(potteryMaterial, { opacity: 1.0, duration: 1, ease: smoothEase }, "step_artifacts") 
.fromTo(artifactGroup.scale, { x: 0.5, y: 0.5, z: 0.5 }, { x: 1, y: 1, z: 1, duration: 1, ease: smoothEase }, "step_artifacts")
.to(camera.position, { z: 3, y: 0.5, duration: 1, ease: smoothEase }, "step_artifacts");

// 5. Tempestade / Resistência
tl.to(potteryMaterial, { opacity: 0.0, duration: 0.5, ease: smoothEase }, "step3") 
.to(material.uniforms.uOpacity, { value: 0.0, duration: 0.5, ease: smoothEase }, "step3") 
.call(() => { isStormActive = true; rain.visible = true; }, null, "step3") 
.to(camera.position, { z: 3, y: 0.5, duration: 1, ease: smoothEase }, "step3");

// 6. Cinzas e Brasas
tl.call(() => { 
    isStormActive = false; 
    rain.visible = false; 
    lightningBolt.visible = false; 
    scene.fog.color.setHex(0x050505); 
}, null, "step_fire")
.to(material.uniforms.uColor.value, { r: CONFIG.colors.burnt.r, g: CONFIG.colors.burnt.g, b: CONFIG.colors.burnt.b, duration: 1, ease: smoothEase }, "step_fire")
.to(material.uniforms.uOpacity, { value: 1.0, duration: 1, ease: smoothEase }, "step_fire") 
.to(ashMaterial.uniforms.uOpacity, { value: 1.0, duration: 1, ease: smoothEase }, "step_fire") 
.to(material.uniforms.uFormFactor, { value: 1.0, duration: 1, ease: smoothEase }, "step_fire") 
.to(camera.position, { z: 2, y: 0.2, duration: 1, ease: smoothEase }, "step_fire");

ScrollTrigger.create({ 
    trigger: "#chapter-fire", 
    start: "top center", 
    end: "bottom center", 
    onEnter: () => { sparks.visible = true; gsap.to(scene.fog, { density: 0.08, duration: 1 }); }, 
    onLeave: () => { sparks.visible = false; gsap.to(ashMaterial.uniforms.uOpacity, { value: 0.0, duration: 0.5 }); gsap.to(scene.fog, { density: 0.02, duration: 1 }); }, 
    onEnterBack: () => { sparks.visible = true; gsap.to(ashMaterial.uniforms.uOpacity, { value: 1.0, duration: 0.5 }); gsap.to(scene.fog, { density: 0.08, duration: 1 }); }, 
    onLeaveBack: () => { sparks.visible = false; gsap.to(ashMaterial.uniforms.uOpacity, { value: 0.0, duration: 0.5 }); gsap.to(scene.fog, { density: 0.02, duration: 1 }); } 
});

// Cosmologia e Outros
tl.to(material.uniforms.uColor.value, { r: 0.0, g: 0.0, b: 0.2, duration: 1, ease: smoothEase }, "step_cosmology")
.to(material.uniforms.uFormFactor, { value: 0.0, duration: 1, ease: smoothEase }, "step_cosmology")
.to(camera.position, { z: 2, y: 5, duration: 1, ease: smoothEase }, "step_cosmology")
.to(camera.rotation, { x: 0.5, duration: 1, ease: smoothEase }, "step_cosmology");
ScrollTrigger.create({ trigger: "#chapter-cosmology", start: "top center", end: "bottom center", onEnter: () => { if(constellationGroup) constellationGroup.visible = true; gsap.to(scene.fog, { density: 0.0, duration: 1 }); }, onLeave: () => { if(constellationGroup) constellationGroup.visible = false; gsap.to(scene.fog, { density: 0.02, duration: 1 }); }, onEnterBack: () => { if(constellationGroup) constellationGroup.visible = true; gsap.to(scene.fog, { density: 0.0, duration: 1 }); }, onLeaveBack: () => { if(constellationGroup) constellationGroup.visible = false; gsap.to(scene.fog, { density: 0.02, duration: 1 }); } });

tl.to(camera.rotation, { x: 0, duration: 1, ease: smoothEase }, "step_reset_cam");

tl.to(material.uniforms.uColor.value, { r: 0.2, g: 0.1, b: 0.05, duration: 1, ease: smoothEase }, "step_heroes")
.to(material.uniforms.uFormFactor, { value: 1.0, duration: 1, ease: smoothEase }, "step_heroes")
.to(camera.position, { z: 4, y: 1, duration: 1, ease: smoothEase }, "step_heroes");

tl.to(material.uniforms.uColor.value, { r: CONFIG.colors.celebration.r, g: CONFIG.colors.celebration.g, b: CONFIG.colors.celebration.b, duration: 1, ease: smoothEase }, "step4")
.to(material.uniforms.uFormFactor, { value: 1.5, duration: 1, ease: smoothEase }, "step4")
.to(camera.position, { z: 5, y: 2, duration: 1, ease: smoothEase }, "step4");

tl.to(material.uniforms.uColor.value, { r: CONFIG.colors.future.r, g: CONFIG.colors.future.g, b: CONFIG.colors.future.b, duration: 1, ease: smoothEase }, "step5")
.to(material.uniforms.uFormFactor, { value: 0.5, duration: 1, ease: smoothEase }, "step5")
.to(camera.position, { z: 6, y: 3, duration: 1, ease: smoothEase }, "step5");

// UI e Controles Extras
const modalOverlay = document.querySelector('.modal-overlay'); const closeBtn = document.querySelector('.close-modal'); const knowledgeCards = document.querySelectorAll('.knowledge-card'); const slides = document.querySelectorAll('.custom-slide'); const prevBtn = document.querySelector('.prev-btn'); const nextBtn = document.querySelector('.next-btn'); const dotsContainer = document.querySelector('.slider-dots'); let currentSlideIndex = 0;
slides.forEach((_, index) => { const dot = document.createElement('div'); dot.classList.add('dot'); if (index === 0) dot.classList.add('active'); dot.addEventListener('click', () => goToSlide(index)); dotsContainer.appendChild(dot); }); const dots = document.querySelectorAll('.dot');
function updateDots(index) { dots.forEach(dot => dot.classList.remove('active')); dots[index].classList.add('active'); }
function goToSlide(index) { if (index < 0) index = slides.length - 1; if (index >= slides.length) index = 0; const currentSlide = slides[currentSlideIndex]; const nextSlide = slides[index]; const direction = index > currentSlideIndex ? 1 : -1; gsap.to(currentSlide, { autoAlpha: 0, x: -100 * direction, duration: 0.5, ease: "power2.inOut", onComplete: () => { currentSlide.classList.remove('active'); gsap.set(currentSlide, { x: 0 }); } }); nextSlide.classList.add('active'); gsap.fromTo(nextSlide, { autoAlpha: 0, x: 100 * direction }, { autoAlpha: 1, x: 0, duration: 0.5, ease: "power2.inOut" }); const content = nextSlide.querySelector('.slide-content'); gsap.fromTo(content, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, delay: 0.2, ease: "back.out(1.7)" }); currentSlideIndex = index; updateDots(index); }
prevBtn.addEventListener('click', () => goToSlide(currentSlideIndex - 1)); nextBtn.addEventListener('click', () => goToSlide(currentSlideIndex + 1));
knowledgeCards.forEach((card, index) => { card.addEventListener('click', () => { currentSlideIndex = index; slides.forEach(s => { s.classList.remove('active'); gsap.set(s, { autoAlpha: 0 }); }); const targetSlide = slides[currentSlideIndex]; targetSlide.classList.add('active'); gsap.set(targetSlide, { autoAlpha: 1 }); updateDots(currentSlideIndex); document.body.style.overflow = 'hidden'; gsap.to(modalOverlay, { autoAlpha: 1, duration: 0.5, ease: "power2.out" }); const content = targetSlide.querySelector('.slide-content'); gsap.fromTo(content, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, delay: 0.2, ease: "back.out(1.7)" }); }); });
function closeModal() { gsap.to(modalOverlay, { autoAlpha: 0, duration: 0.4, ease: "power2.in", onComplete: () => { document.body.style.overflow = ''; } }); } closeBtn.addEventListener('click', closeModal); document.addEventListener('keydown', (e) => { if (modalOverlay.style.visibility !== 'hidden') { if (e.key === 'Escape') closeModal(); if (e.key === 'ArrowRight') goToSlide(currentSlideIndex + 1); if (e.key === 'ArrowLeft') goToSlide(currentSlideIndex - 1); } });
const bgAudio = document.getElementById('bg-audio'); bgAudio.volume = 0; let isMuted = true; const soundBtn = document.getElementById('sound-toggle'); const soundIcon = soundBtn.querySelector('.sound-icon');
function toggleSound() { isMuted = !isMuted; if (isMuted) { soundIcon.textContent = "OFF"; soundBtn.classList.remove('playing'); gsap.to(bgAudio, { volume: 0, duration: 1, onComplete: () => bgAudio.pause() }); } else { soundIcon.textContent = "ON"; soundBtn.classList.add('playing'); bgAudio.play().then(() => { gsap.to(bgAudio, { volume: 0.5, duration: 1 }); }).catch(e => console.error("Audio play failed:", e)); } } soundBtn.addEventListener('click', toggleSound);
const timelineItems = document.querySelectorAll('.timeline-item'); const timelineProgress = document.querySelector('.timeline-progress');
chapters.forEach((id, index) => { const section = document.querySelector(id); if (section) { ScrollTrigger.create({ trigger: section, start: "top center", end: "bottom center", onEnter: () => updateTimeline(index), onEnterBack: () => updateTimeline(index) }); } });
function updateTimeline(index) { timelineItems.forEach((item, i) => { if (i === index) item.classList.add('active'); else item.classList.remove('active'); }); const progress = (index / (chapters.length - 1)) * 100; gsap.to(timelineProgress, { height: `${progress}%`, duration: 0.5, ease: "power2.out" }); }
timelineItems.forEach((item) => { item.addEventListener('click', (e) => { const targetId = item.getAttribute('data-target'); const targetSection = document.querySelector(targetId); if (targetSection) { gsap.to(window, { duration: 1.5, scrollTo: { y: targetSection, autoKill: false }, ease: "power3.inOut" }); } }); });
const heroCards = document.querySelectorAll('.hero-card'); heroCards.forEach(card => { card.addEventListener('click', () => { heroCards.forEach(c => c.classList.remove('active')); card.classList.add('active'); }); card.addEventListener('mouseenter', () => { if (!card.classList.contains('active') && window.innerWidth > 768) { gsap.to(card, { filter: "grayscale(0%) brightness(0.9)", duration: 0.3 }); } }); card.addEventListener('mouseleave', () => { if (!card.classList.contains('active') && window.innerWidth > 768) { gsap.to(card, { filter: "grayscale(100%) brightness(0.7)", duration: 0.3 }); } }); });

// --- INIT COM SEGURANÇA ---
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        window.scrollTo(0, 0);
        // Função para esconder
        const hidePreloader = () => {
            gsap.to(preloader, {
                opacity: 0,
                duration: 1,
                onComplete: () => {
                    preloader.style.visibility = 'hidden';
                    ScrollTrigger.refresh();
                }
            });
        };
        
        // Tenta esconder normalmente
        setTimeout(hidePreloader, 500);
        
        // SEGURANÇA: Se travar, esconde à força depois de 4 segundos
        setTimeout(() => {
            if(preloader.style.visibility !== 'hidden') hidePreloader();
        }, 4000);
    }
});