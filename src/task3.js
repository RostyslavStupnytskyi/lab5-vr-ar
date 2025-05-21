import './style.css'

import * as THREE from "three"
import { ARButton } from "three/addons/webxr/ARButton.js"

// Глобальні змінні для сцени
let container;
let camera, scene, renderer;
let reticle;
let controller;

// Стан UI налаштувань
const objectSettings = {
    color: 0x00ff00,
    size: 0.08,
    rotationEnabled: false,
    scaleAnimationEnabled: false,
    materialType: 'standard', // 'standard', 'emissive', 'transparent'
};

// Масив створених об'єктів для анімації
const createdObjects = [];

init();
animate();

function init() {
    container = document.createElement("div");
    document.body.appendChild(container);

    // Сцена
    scene = new THREE.Scene();
    
    // Камера
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    
    // Рендеринг
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);
    
    // Світло
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);
    
    // Контролер додавання об'єкта на сцену
    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    // Додаємо мітку поверхні на сцену
    addReticleToScene();

    // UI налаштування
    setupUIControls();

    // Тепер для AR-режиму необхідно застосувати режим hit-test
    const button = ARButton.createButton(renderer, {
        requiredFeatures: ["hit-test"],
        domOverlay: { root: document.getElementById('settings-panel') }
    });
    button.id = 'ar-button';
    button.textContent = 'START AR';
    document.body.appendChild(button);
    
    renderer.domElement.style.display = "none";

    window.addEventListener("resize", onWindowResize, false);
}

// Налаштування контролів інтерфейсу
function setupUIControls() {
    // Колір
    const colorPicker = document.getElementById('object-color');
    colorPicker.addEventListener('input', function(event) {
        objectSettings.color = parseInt(event.target.value.substring(1), 16);
    });

    // Розмір
    const sizeSlider = document.getElementById('object-size');
    const sizeValue = document.getElementById('size-value');
    sizeSlider.addEventListener('input', function(event) {
        objectSettings.size = parseFloat(event.target.value);
        sizeValue.textContent = objectSettings.size.toFixed(2);
    });

    // Обертання
    const rotationToggle = document.getElementById('rotation-toggle');
    rotationToggle.addEventListener('click', function() {
        objectSettings.rotationEnabled = !objectSettings.rotationEnabled;
        this.textContent = objectSettings.rotationEnabled ? 
            'Вимкнути обертання' : 'Увімкнути обертання';
    });

    // Анімація пульсації
    const scaleAnimationToggle = document.getElementById('scale-animation-toggle');
    scaleAnimationToggle.addEventListener('click', function() {
        objectSettings.scaleAnimationEnabled = !objectSettings.scaleAnimationEnabled;
        this.textContent = objectSettings.scaleAnimationEnabled ? 
            'Вимкнути пульсацію' : 'Увімкнути пульсацію';
    });

    // Матеріал
    document.getElementById('material-standard').addEventListener('click', function() {
        objectSettings.materialType = 'standard';
        highlightActiveButton('material', this);
    });
    
    document.getElementById('material-emissive').addEventListener('click', function() {
        objectSettings.materialType = 'emissive';
        highlightActiveButton('material', this);
    });
    
    document.getElementById('material-transparent').addEventListener('click', function() {
        objectSettings.materialType = 'transparent';
        highlightActiveButton('material', this);
    });
    
    // Підсвічуємо стандартний матеріал за замовчуванням
    highlightActiveButton('material', document.getElementById('material-standard'));
}

// Допоміжна функція для підсвічування активної кнопки
function highlightActiveButton(group, activeButton) {
    const buttons = document.querySelectorAll(`#material-${group}, #material-standard, #material-emissive, #material-transparent`);
    buttons.forEach(button => {
        button.style.backgroundColor = button === activeButton ? '#2196F3' : '#4CAF50';
    });
}

function addReticleToScene() {
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial();

    reticle = new THREE.Mesh(geometry, material);
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // Додає систему координат для візуалізації
    reticle.add(new THREE.AxesHelper(1));
}

// Створення матеріалу відповідно до обраного типу
function createMaterial() {
    switch (objectSettings.materialType) {
        case 'emissive':
            return new THREE.MeshStandardMaterial({
                color: objectSettings.color,
                emissive: objectSettings.color,
                emissiveIntensity: 0.5,
                metalness: 0.8,
                roughness: 0.2
            });
        case 'transparent':
            return new THREE.MeshStandardMaterial({
                color: objectSettings.color,
                transparent: true,
                opacity: 0.7,
                metalness: 0.2,
                roughness: 0.1
            });
        case 'standard':
        default:
            return new THREE.MeshStandardMaterial({
                color: objectSettings.color,
                metalness: 0.5,
                roughness: 0.3
            });
    }
}

function onSelect() {        
    if (reticle.visible) {
        // Створюємо октаедр з обраними налаштуваннями
        const geometry = new THREE.OctahedronGeometry(objectSettings.size, 0);
        const material = createMaterial();
        const mesh = new THREE.Mesh(geometry, material);
        
        // Зберігаємо налаштування як властивості об'єкта для анімації
        mesh.userData = {
            rotationEnabled: objectSettings.rotationEnabled,
            scaleAnimationEnabled: objectSettings.scaleAnimationEnabled,
            originalScale: objectSettings.size,
            scalePhase: 0
        };
        
        mesh.position.setFromMatrixPosition(reticle.matrix);
        mesh.quaternion.setFromRotationMatrix(reticle.matrix);
    
        scene.add(mesh);
        createdObjects.push(mesh);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
}

// Анімація об'єктів
function animateObjects(deltaTime) {
    createdObjects.forEach(object => {
        // Обертання, якщо увімкнено
        if (object.userData.rotationEnabled) {
            object.rotation.y += 1 * deltaTime;
            object.rotation.x += 0.5 * deltaTime;
        }
        
        // Анімація масштабування (пульсація), якщо увімкнена
        if (object.userData.scaleAnimationEnabled) {
            object.userData.scalePhase += 2 * deltaTime;
            const pulseFactor = Math.sin(object.userData.scalePhase) * 0.2 + 1.0;
            const newScale = object.userData.originalScale * pulseFactor;
            
            object.scale.set(pulseFactor, pulseFactor, pulseFactor);
        }
    });
}

// WebXR Hit Testing
let hitTestSource = null;
let localSpace = null;
let hitTestSourceInitialized = false;
let lastTimestamp = 0;

async function initializeHitTestSource() {
    const session = renderer.xr.getSession();
    const viewerSpace = await session.requestReferenceSpace("viewer");
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    localSpace = await session.requestReferenceSpace("local");
    hitTestSourceInitialized = true;
    
    session.addEventListener("end", () => {
        hitTestSourceInitialized = false;
        hitTestSource = null;
    });
}

function render(timestamp, frame) {
    // Розрахунок дельта-часу для анімації
    const deltaTime = (timestamp - lastTimestamp) / 1000; // у секундах
    lastTimestamp = timestamp;
    
    // Оновлення анімації для всіхs створених об'єктів
    animateObjects(deltaTime);
    
    if (frame) {
        if (!hitTestSourceInitialized) {
            initializeHitTestSource();
        }

        if (hitTestSourceInitialized) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);

            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const pose = hit.getPose(localSpace);

                reticle.visible = true;
                reticle.matrix.fromArray(pose.transform.matrix);
            } else {
                reticle.visible = false;
            }
        }

        renderer.render(scene, camera);
    }
} 