import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer;
let carModel, roadModel, treeModel, destinationObj;
const keys = {};
let timer = 0, timerRunning = true, lastTime = 0;
let visited = false;

const roadWidth = 12; // 도로 폭(실제 모델에 맞게 조정)
const treeCount = 60;
const destinationRadius = 5;

function $(id) { return document.getElementById(id); }

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
  camera.position.set(0, 50, 120);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  // 조명
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(100, 200, 100);
  dirLight.castShadow = true;
  scene.add(dirLight);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  // 바닥(초원)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshStandardMaterial({ color: 0x88cc88 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  loadAndPlaceModels();
  window.addEventListener('keydown', (e) => keys[e.code] = true);
  window.addEventListener('keyup', (e) => keys[e.code] = false);

  timer = 0;
  timerRunning = true;
  lastTime = performance.now();
}

function loadAndPlaceModels() {
  const loader = new GLTFLoader();

  // 1. 도로 불러오기
  loader.load('assets/models/american_road/scene.gltf', function(gltf) {
    roadModel = gltf.scene;
    roadModel.position.set(0, 0, 0);
    roadModel.scale.set(20, 20, 20); // 필요시 조정
    scene.add(roadModel);

    // 2. 나무 여러 개
    loader.load('assets/models/tree/scene.gltf', function(gltf2) {
      treeModel = gltf2.scene;
      for (let i = 0; i < treeCount; i++) {
        const tree = treeModel.clone();
        const angle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 220;
        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;
        tree.position.set(x, 0, z);
        tree.scale.set(15, 15, 15);
        tree.rotation.y = Math.random() * Math.PI * 2;
        scene.add(tree);
      }

      // 3. 자동차
      loader.load('assets/models/car/scene.gltf', function(gltf3) {
        carModel = gltf3.scene;
        carModel.position.set(0, 2, 0);
        carModel.scale.set(10, 10, 10);
        carModel.rotation.y = Math.PI / 2;
        scene.add(carModel);

        // 4. 목적지(도로 끝에 구체로 표시)
        const dest = new THREE.Mesh(
          new THREE.SphereGeometry(5, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00 })
        );
        dest.position.set(0, 5, 400); // 도로 끝 쯤에 배치 (z=400은 예시, 도로 모델에 맞게 조정)
        scene.add(dest);
        destinationObj = dest;

        animate();
      });
    });
  });
}

// 도로 이탈 감지 (도로 중앙 z축 기준, 폭 12)
function isCarOnRoad() {
  if (!carModel) return true;
  // 도로가 z축 방향 직선이라고 가정
  // roadModel이 (0,0,0)에 있고, 도로의 중심선이 z축 방향이면
  // 도로 중앙에서 x축 거리만 체크
  const carX = carModel.position.x;
  return Math.abs(carX) < roadWidth * 0.5 + 2; // 여유값 2
}

// 자동차 이동(방향키)
function updateCar() {
  if (!carModel) return;
  const moveSpeed = 2.5;
  const turnSpeed = 0.03;
  if (!carModel.userData.direction) carModel.userData.direction = Math.PI / 2;
  let direction = carModel.userData.direction;
  let speed = 0;

  if (keys['ArrowUp'] || keys['KeyW']) speed = moveSpeed;
  else if (keys['ArrowDown'] || keys['KeyS']) speed = -moveSpeed;
  if (keys['ArrowLeft'] || keys['KeyA']) direction += turnSpeed;
  if (keys['ArrowRight'] || keys['KeyD']) direction -= turnSpeed;

  carModel.userData.direction = direction;
  carModel.rotation.y = direction;

  carModel.position.x += Math.cos(direction) * speed;
  carModel.position.z += Math.sin(direction) * speed;
}

// 카메라 자동차 따라가기
function updateCamera() {
  if (!carModel) return;
  const offset = new THREE.Vector3(0, 20, -50);
  offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), carModel.userData.direction || 0);
  camera.position.copy(carModel.position.clone().add(offset));
  camera.lookAt(carModel.position);
}

// 목적지 도달 체크
function checkDestination() {
  if (!carModel || !destinationObj || visited) return;
  if (carModel.position.distanceTo(destinationObj.position) < destinationRadius) {
    visited = true;
    destinationObj.material.color.set(0x00ff00);
    timerRunning = false;
    updateUI();
  }
}

// UI/경고 갱신
function updateUI() {
  const ui = document.getElementById('ui');
  const timerDiv = document.getElementById('timer');
  const warningDiv = document.getElementById('warning');
  ui.textContent = `목적지: ${visited ? '도착!' : '주행 중'}`;
  timerDiv.textContent = `타이머: ${timer.toFixed(2)}초`;
  if (!isCarOnRoad() && !visited) {
    warningDiv.style.display = 'block';
    document.body.classList.add('shake');
  } else {
    warningDiv.style.display = 'none';
    document.body.classList.remove('shake');
  }
}

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = (now - lastTime) / 1000;
  lastTime = now;

  if (timerRunning) {
    timer += isCarOnRoad() ? delta : delta * 3; // 도로 밖이면 3배
  }

  updateCar();
  updateCamera();
  checkDestination();
  updateUI();

  renderer.render(scene, camera);
}

init();
