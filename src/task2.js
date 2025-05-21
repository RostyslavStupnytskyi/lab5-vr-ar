import './style.css'

import * as THREE from "three"
import { ARButton } from "three/addons/webxr/ARButton.js"
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Глобальні змінні
let camera, scene, renderer;
let loader;
let model;
let controller;
let mixer;
let arButton;
let controls = {
    rotation: {
        enabled: true,
        axis: 'y' // 'x', 'y', або 'z'
    },
    material: {
        type: 'original', // 'original' або 'alternative'
        originalMaterials: [], // збереження оригінальних матеріалів
        alternativeMaterial: null
    },
    sceneLight: {
        enabled: true,
        lights: []
    },
    modelLight: {
        enabled: true,
        type: 'point', // 'point', 'spot', 'directional'
        intensity: 2,
        color: 0xffffff,
        light: null
    }
};

// DOM-елементи
const controlsPanel = document.getElementById('controls-panel');
const toggleControlsBtn = document.getElementById('toggle-controls');
const startARBtn = document.getElementById('start-ar-btn');

// Ініціалізація сцени
init();
animate();

function init() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.set(0, 0, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Додаємо основне освітлення сцени
    const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
    directionalLight.position.set(0, 5, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 1000;
    scene.add(directionalLight);
    controls.sceneLight.lights.push(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 3);
    scene.add(ambientLight);
    controls.sceneLight.lights.push(ambientLight);

    const leftLight = new THREE.DirectionalLight(0xffffff, 3);
    leftLight.position.set(-3, 1, 0);
    scene.add(leftLight);
    controls.sceneLight.lights.push(leftLight);

    const rightLight = new THREE.DirectionalLight(0xffffff, 3);
    rightLight.position.set(3, 1, 0);
    scene.add(rightLight);
    controls.sceneLight.lights.push(rightLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 2);
    backLight.position.set(0, 0, 3);
    scene.add(backLight);
    controls.sceneLight.lights.push(backLight);

    // Створення альтернативного матеріалу
    controls.material.alternativeMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.8,
        emissive: 0x003300,
        emissiveIntensity: 0.2
    });

    // Додаємо GLTF модель на сцену
    const modelUrl = '/phoenix.gltf';

    loader = new GLTFLoader();
    loader.load(
        modelUrl,
        function (gltf) {
            model = gltf.scene;
            
            // Центруємо модель по її boundingBox
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.x = -center.x;
            model.position.y = -center.y;
            model.position.z = -center.z;
            
            // Встановлюємо початкову позицію моделі
            model.position.set(0, -0.2, -10);
            model.scale.set(0.005, 0.005, 0.005);
            scene.add(model);
            
            // Зберігаємо оригінальні матеріали і встановлюємо тіні
            model.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                    
                    // Зберігаємо оригінальні матеріали
                    if (node.material) {
                        // Зберігаємо клон матеріалу, щоб не втратити оригінал
                        controls.material.originalMaterials.push({
                            node: node,
                            material: node.material.clone()
                        });
                        
                        // Налаштування оригінального матеріалу
                        if (node.material.map) {
                            node.material.map.needsUpdate = true;
                        }
                        
                        node.material.roughness = 0.5;
                        node.material.metalness = 0.7;
                        node.material.needsUpdate = true;
                    }
                }
            });
            
            // Додаємо світло до моделі
            addModelLight();
            
            // Перевіряємо наявність анімацій
            if (gltf.animations && gltf.animations.length) {
                mixer = new THREE.AnimationMixer(model);
                const action = mixer.clipAction(gltf.animations[0]);
                action.play();
            }

            console.log("Model loaded and added to scene");
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error("Error loading model:", error);
        }
    );

    // Створюємо AR кнопку (але не додаємо її відразу)
    arButton = ARButton.createButton(renderer, {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
    });

    // Додаємо обробники подій для меню
    setupEventListeners();

    // Додаємо контролер для взаємодії з AR середовищем
    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    window.addEventListener('resize', onWindowResize, false);
}

// Функція додавання світла до моделі
function addModelLight() {
    if (!model) return;
    
    // Видаляємо попереднє світло, якщо воно є
    if (controls.modelLight.light) {
        model.remove(controls.modelLight.light);
    }
    
    let light;
    const color = controls.modelLight.color;
    const intensity = controls.modelLight.intensity;
    
    // Вибір типу світла
    switch (controls.modelLight.type) {
        case 'point':
            light = new THREE.PointLight(color, intensity, 50);
            light.position.set(0, 5, 0);
            break;
        case 'spot':
            light = new THREE.SpotLight(color, intensity);
            light.position.set(0, 10, 0);
            light.angle = Math.PI / 4;
            light.penumbra = 0.1;
            light.decay = 2;
            light.distance = 200;
            break;
        case 'directional':
            light = new THREE.DirectionalLight(color, intensity);
            light.position.set(0, 5, 5);
            break;
    }
    
    // Налаштовуємо тіні для світла
    light.castShadow = true;
    
    // Додаємо світло до моделі
    model.add(light);
    controls.modelLight.light = light;
    
    // Показуємо/приховуємо світло залежно від налаштувань
    light.visible = controls.modelLight.enabled;
}

// Функція обробки вибору в AR
function onSelect() {
    if (model) {
        model.position.set(0, -0.2, -10).applyMatrix4(controller.matrixWorld);
        model.quaternion.setFromRotationMatrix(controller.matrixWorld);
        // Повертаємо модель лицем до користувача
        model.rotateY(Math.PI);
    }
}

// Функція налаштування обробників подій для меню
function setupEventListeners() {
    // Кнопка показу/приховування меню
    toggleControlsBtn.addEventListener('click', () => {
        controlsPanel.classList.toggle('hidden');
    });
    
    // Кнопка запуску AR
    startARBtn.addEventListener('click', () => {
        document.body.appendChild(arButton);
        controlsPanel.classList.add('hidden');
    });
    
    // Обертання моделі
    document.getElementById('rotation-on').addEventListener('click', () => {
        toggleButton('rotation-on', 'rotation-off');
        controls.rotation.enabled = true;
    });
    
    document.getElementById('rotation-off').addEventListener('click', () => {
        toggleButton('rotation-off', 'rotation-on');
        controls.rotation.enabled = false;
    });
    
    // Вісь обертання
    document.getElementById('axis-x').addEventListener('click', () => {
        toggleButton('axis-x', ['axis-y', 'axis-z']);
        controls.rotation.axis = 'x';
    });
    
    document.getElementById('axis-y').addEventListener('click', () => {
        toggleButton('axis-y', ['axis-x', 'axis-z']);
        controls.rotation.axis = 'y';
    });
    
    document.getElementById('axis-z').addEventListener('click', () => {
        toggleButton('axis-z', ['axis-x', 'axis-y']);
        controls.rotation.axis = 'z';
    });
    
    // Матеріал моделі
    document.getElementById('material-original').addEventListener('click', () => {
        toggleButton('material-original', 'material-alternative');
        controls.material.type = 'original';
        applyMaterial();
    });
    
    document.getElementById('material-alternative').addEventListener('click', () => {
        toggleButton('material-alternative', 'material-original');
        controls.material.type = 'alternative';
        applyMaterial();
    });
    
    // Освітлення сцени
    document.getElementById('scene-light-on').addEventListener('click', () => {
        toggleButton('scene-light-on', 'scene-light-off');
        controls.sceneLight.enabled = true;
        toggleSceneLight();
    });
    
    document.getElementById('scene-light-off').addEventListener('click', () => {
        toggleButton('scene-light-off', 'scene-light-on');
        controls.sceneLight.enabled = false;
        toggleSceneLight();
    });
    
    // Освітлення моделі
    document.getElementById('model-light-on').addEventListener('click', () => {
        toggleButton('model-light-on', 'model-light-off');
        controls.modelLight.enabled = true;
        if (controls.modelLight.light) {
            controls.modelLight.light.visible = true;
        } else {
            addModelLight();
        }
    });
    
    document.getElementById('model-light-off').addEventListener('click', () => {
        toggleButton('model-light-off', 'model-light-on');
        controls.modelLight.enabled = false;
        if (controls.modelLight.light) {
            controls.modelLight.light.visible = false;
        }
    });
    
    // Тип світла моделі
    document.getElementById('light-point').addEventListener('click', () => {
        toggleButton('light-point', ['light-spot', 'light-directional']);
        controls.modelLight.type = 'point';
        addModelLight();
    });
    
    document.getElementById('light-spot').addEventListener('click', () => {
        toggleButton('light-spot', ['light-point', 'light-directional']);
        controls.modelLight.type = 'spot';
        addModelLight();
    });
    
    document.getElementById('light-directional').addEventListener('click', () => {
        toggleButton('light-directional', ['light-point', 'light-spot']);
        controls.modelLight.type = 'directional';
        addModelLight();
    });
    
    // Інтенсивність освітлення моделі
    document.getElementById('light-intensity').addEventListener('input', (event) => {
        controls.modelLight.intensity = parseFloat(event.target.value);
        if (controls.modelLight.light) {
            controls.modelLight.light.intensity = controls.modelLight.intensity;
        }
    });
    
    // Колір освітлення моделі
    document.getElementById('light-color').addEventListener('input', (event) => {
        controls.modelLight.color = new THREE.Color(event.target.value);
        if (controls.modelLight.light) {
            controls.modelLight.light.color.set(controls.modelLight.color);
        }
    });
}

// Функція зміни стану кнопки
function toggleButton(activeId, inactiveIds) {
    // Конвертуємо inactiveIds в масив, якщо це не масив
    if (!Array.isArray(inactiveIds)) {
        inactiveIds = [inactiveIds];
    }
    
    // Активуємо обрану кнопку
    document.getElementById(activeId).classList.add('active');
    
    // Деактивуємо інші кнопки
    inactiveIds.forEach((id) => {
        document.getElementById(id).classList.remove('active');
    });
}

// Функція застосування матеріалу
function applyMaterial() {
    if (!model) return;
    
    model.traverse((node) => {
        if (node.isMesh) {
            if (controls.material.type === 'original') {
                // Повертаємо оригінальний матеріал
                const original = controls.material.originalMaterials.find(item => item.node === node);
                if (original) {
                    node.material = original.material.clone();
                    node.material.needsUpdate = true;
                }
            } else {
                // Застосовуємо альтернативний матеріал
                node.material = controls.material.alternativeMaterial.clone();
                node.material.needsUpdate = true;
            }
        }
    });
}

// Функція вмикання/вимикання світла сцени
function toggleSceneLight() {
    controls.sceneLight.lights.forEach(light => {
        light.visible = controls.sceneLight.enabled;
    });
}

// Функція зміни розміру вікна
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Функція анімації
function animate() {
    renderer.setAnimationLoop(render);
}

// Функція обертання моделі
function rotateModel() {
    if (model && controls.rotation.enabled) {
        const rotationSpeed = 0.01;
        
        switch (controls.rotation.axis) {
            case 'x':
                model.rotation.x += rotationSpeed;
                break;
            case 'y':
                model.rotation.y += rotationSpeed;
                break;
            case 'z':
                model.rotation.z += rotationSpeed;
                break;
        }
    }
}

// Функція рендерингу
function render(time) {
    // Оновлюємо міксер анімацій, якщо він існує
    if (mixer) {
        mixer.update(0.01);
    }
    
    rotateModel();
    renderer.render(scene, camera);
}