import './style.css'

import * as THREE from "three"
import { ARButton } from "three/addons/webxr/ARButton.js"
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

let camera, scene, renderer;
let circleMesh, torusMesh, icosahedronMesh; 
let controls;
let redPointLight, bluePointLight;
let objectsGroup;
let arButton;

// Параметри анімації та ефектів
let rotationEnabled = true;
let emissiveEnabled = false;
let texturesEnabled = false;
let pulseEnabled = false;
let animationSpeed = 0.01;
let specialEffectEnabled = false;

const textureLoader = new THREE.TextureLoader();
const circleTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/water.jpg');
const torusTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/lavatile.jpg');
const icosahedronTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/metal.jpg');

let glassMaterial, emissiveMaterial, goldMaterial;

init();
createControlPanel();
createOrientationHelper();
animate();

function init() {
    const container = document.createElement('div');
    document.body.appendChild(container);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 40);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
            
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);
            
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2); 
    directionalLight.position.set(3, 5, 3);
    scene.add(directionalLight);

    const secondDirectionalLight = new THREE.DirectionalLight(0xf5e8c0, 1.5);
    secondDirectionalLight.position.set(-3, 1, -3);
    scene.add(secondDirectionalLight);

    redPointLight = new THREE.PointLight(0xff4500, 5, 10); 
    redPointLight.position.set(-2, 2, 2);
    scene.add(redPointLight);

    // Точкове світло синього відтінку
    bluePointLight = new THREE.PointLight(0x4169e1, 5, 10); 
    bluePointLight.position.set(2, -2, -1);
    scene.add(bluePointLight);

    // Зменшимо інтенсивність амбієнтного світла щоб інші світильники краще проявлялись
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
    scene.add(ambientLight);
    
    // Створення групи для всіх об'єктів (для зручності позиціонування в AR)
    objectsGroup = new THREE.Group();
    scene.add(objectsGroup);
    
    // 1. Створюємо об'єкт кола
    const circleGeometry = new THREE.CircleGeometry(0.6, 32);
    // Матеріал для першого об'єкту 
    glassMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x87CEEB, 
        transparent: true,
        opacity: 0.5,
        roughness: 0.4,
        metalness: 0.8,
        reflectivity: 1.0,
        transmission: 0.8,
        side: THREE.DoubleSide // Щоб коло було видно з обох сторін
    });
    // Створюємо меш
    circleMesh = new THREE.Mesh(circleGeometry, glassMaterial);
    circleMesh.position.x = -1.5;
    objectsGroup.add(circleMesh);

    // 2. Створюємо об'єкт Torus
    const torusGeometry = new THREE.TorusGeometry(0.5, 0.2, 16, 100);
    // Матеріал для другого
    emissiveMaterial = new THREE.MeshStandardMaterial({
        color: 0xff4500, 
        emissive: 0xff4500, 
        emissiveIntensity: 0, // Початково випромінювання вимкнено 
        metalness: 0.5,
        roughness: 0.2,
    });
    // Створюємо наступний меш
    torusMesh = new THREE.Mesh(torusGeometry, emissiveMaterial);
    objectsGroup.add(torusMesh);

    // 3. Створюємо об'єкт Icosahedron
    const icosahedronGeometry = new THREE.IcosahedronGeometry(0.6, 0);
    // Матеріал для третього
    goldMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 1,
        roughness: 0.3,
    });
    // Створюємо наступний меш
    icosahedronMesh = new THREE.Mesh(icosahedronGeometry, goldMaterial);
    icosahedronMesh.position.x = 1.5;
    objectsGroup.add(icosahedronMesh);
    
    // Позиція для камери у звичайному режимі
    camera.position.set(0, 0, 10);

    // Контролери для 360 огляду на вебсторінці, але не під час AR-сеансу
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Створюємо кнопку AR з налаштуваннями
    arButton = ARButton.createButton(renderer, {
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: document.body }
    });
    document.body.appendChild(arButton);

    // Обробник події початку AR-сеансу
    renderer.xr.addEventListener('sessionstart', () => {
        // Позиціонування об'єктів перед користувачем у AR режимі
        objectsGroup.position.set(0, 0, -3); // Z=-3 помістить групу об'єктів на відстані 3м від користувача
        objectsGroup.position.y = -0.3; // Трохи нижче рівня камери для кращого огляду
        
        // Приховуємо панель налаштувань, щоб вона не заважала в AR режимі
        const panel = document.querySelector('.control-panel');
        if (panel) panel.classList.add('ar-active');
        
        // Приховуємо підказку орієнтації при старті AR
        const orientationHelper = document.getElementById('orientation-helper');
        if (orientationHelper) orientationHelper.style.display = 'none';
    });

    // Обробник події завершення AR-сеансу
    renderer.xr.addEventListener('sessionend', () => {
        // Повертаємо об'єкти на початкові позиції для звичайного режиму
        objectsGroup.position.set(0, 0, 3);
        
        // Показуємо панель налаштувань
        const panel = document.querySelector('.control-panel');
        if (panel) panel.classList.remove('ar-active');
        
        // Знову показуємо підказку орієнтації, якщо потрібно
        checkOrientationAndShowHelper();
    });

    window.addEventListener('resize', onWindowResize, false);
}

// Створення анімованої підказки для правильної орієнтації телефону
function createOrientationHelper() {
    // Додаємо стилі для підказки
    const style = document.createElement('style');
    style.textContent = `
        #orientation-helper {
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 15px 20px;
            border-radius: 50px;
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 2000;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
            font-family: Arial, sans-serif;
            opacity: 0;
            transition: opacity 0.3s ease;
            backdrop-filter: blur(5px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        #orientation-helper.visible {
            opacity: 1;
        }
        
        #phone-animation {
            width: 40px;
            height: 40px;
            position: relative;
        }
        
        .phone-icon {
            position: absolute;
            width: 30px;
            height: 40px;
            border: 2px solid white;
            border-radius: 4px;
            transition: all 0.5s ease;
        }
        
        @keyframes rotatePhone {
            0% { transform: rotate(0deg); width: 20px; height: 36px; }
            50% { transform: rotate(45deg); }
            100% { transform: rotate(90deg); width: 36px; height: 20px; }
        }
        
        .rotating-phone {
            animation: rotatePhone 1.5s infinite alternate;
        }
        
        #orientation-text {
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
    
    // Створюємо елемент підказки
    const helper = document.createElement('div');
    helper.id = 'orientation-helper';
    helper.innerHTML = `
        <div id="phone-animation">
            <div class="phone-icon rotating-phone"></div>
        </div>
        <div id="orientation-text">Поверніть телефон горизонтально</div>
    `;
    document.body.appendChild(helper);
    
    // Перевіряємо, чи потрібно показувати підказку
    checkOrientationAndShowHelper();
    
    // Додаємо обробник зміни орієнтації
    window.addEventListener('orientationchange', checkOrientationAndShowHelper);
    window.addEventListener('resize', checkOrientationAndShowHelper);
}

// Перевірка орієнтації та показ/приховування підказки
function checkOrientationAndShowHelper() {
    const helper = document.getElementById('orientation-helper');
    if (!helper) return;
    
    // Визначаємо, чи це мобільний пристрій
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Перевіряємо орієнтацію екрану
    const isPortrait = window.innerHeight > window.innerWidth;
    
    // Перевіряємо, чи не активна AR сесія
    const isARActive = renderer.xr.isPresenting;
    
    // Перевіряємо, чи видима кнопка AR
    const isARButtonVisible = arButton && window.getComputedStyle(arButton).display !== 'none';
    
    // Показуємо підказку тільки на мобільних, у портретній орієнтації, якщо видно кнопку AR та не активна сесія AR
    if (isMobile && isPortrait && isARButtonVisible && !isARActive) {
        helper.classList.add('visible');
    } else {
        helper.classList.remove('visible');
    }
}

function createControlPanel() {
    // Додаємо Font Awesome для використання іконок
    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fontAwesome);

    // Створюємо стилі для панелі керування
    const style = document.createElement('style');
    style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&display=swap');
        
        .control-panel {
            position: fixed;
            right: 20px;
            top: 20px;
            background: rgba(15, 23, 42, 0.85);
            color: #e2e8f0;
            padding: 20px;
            border-radius: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            z-index: 1000;
            width: 260px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 140, 255, 0.2);
            backdrop-filter: blur(10px);
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            border: 1px solid rgba(59, 130, 246, 0.3);
            font-family: 'Orbitron', sans-serif;
            overflow: hidden;
        }
        
        /* Адаптивне розташування для мобільних пристроїв в горизонтальній орієнтації */
        @media (max-width: 1024px) and (orientation: landscape) {
            .control-panel {
                left: 20px;
                right: auto;
                top: 20px; /* Змінено - підняли панель вище */
                transform: none; /* Прибрали translateY(-50%) */
                max-height: calc(100vh - 40px); /* Обмежуємо висоту */
                overflow-y: auto;
                width: 240px; /* Трохи вужча для мобільних */
                padding: 15px;
            }
            
            .control-panel button {
                padding: 10px 15px;
                font-size: 13px;
            }
            
            .control-panel h3 {
                font-size: 16px;
                margin-bottom: 10px;
            }
            
            /* Компактніші кнопки для мобільних пристроїв */
            .control-panel button i {
                font-size: 14px;
                margin-right: 8px;
            }
            
            /* Додаткова тінь для кращої видимості на мобільних */
            .control-panel {
                box-shadow: 0 0 25px rgba(0, 0, 0, 0.5), 0 0 35px rgba(0, 140, 255, 0.25);
            }
            
            /* Додаємо індикатор прокрутки, якщо панель не вміщується */
            .control-panel::after {
                content: '';
                position: absolute;
                bottom: 5px;
                left: 50%;
                transform: translateX(-50%);
                width: 50px;
                height: 4px;
                background: rgba(59, 130, 246, 0.5);
                border-radius: 2px;
                opacity: 0.7;
            }
        }
        
        /* Для портретної орієнтації телефонів розміщуємо вгорі */
        @media (max-width: 767px) and (orientation: portrait) {
            .control-panel {
                left: 0;
                right: 0;
                top: 0;
                bottom: auto;
                width: 100%;
                max-width: none;
                padding: 10px 15px;
                border-radius: 0 0 16px 16px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
            }
            
            /* Горизонтальне розташування кнопок для вертикальної орієнтації */
            .control-panel {
                flex-direction: row;
                flex-wrap: wrap;
                justify-content: flex-start; /* Змінено з center на flex-start */
                gap: 8px;
                padding-left: 5%; /* Додаємо відступ зліва */
            }
            
            .control-panel h3 {
                width: 100%;
                text-align: left; /* Змінено з center на left */
                margin-bottom: 8px;
                padding-bottom: 5px;
                font-size: 14px;
                padding-left: 5px; /* Додаємо невеликий відступ для заголовка */
            }
            
            .control-panel button {
                padding: 8px 10px;
                width: calc(48% - 8px); /* Зменшено з 50% до 48% */
                font-size: 12px;
                margin-left: 2px; /* Додаємо невеликий лівий відступ для кнопок */
            }
            
            .control-panel button i {
                font-size: 12px;
                margin-right: 5px;
            }
            
            .control-panel .panel-bottom {
                width: 100%;
                margin-top: 5px;
                font-size: 10px;
                text-align: left; /* Змінено з center на left */
                padding-left: 5px; /* Невеликий відступ зліва */
            }
        }
        
        /* Спеціальна адаптація для дуже малих екранів */
        @media (max-width: 320px) {
            .control-panel button {
                width: 100%;
            }
            
            .control-panel {
                padding-left: 10px; /* Менший відступ для малих екранів */
            }
        }
        
        /* Обробка орієнтації пристрою */
        @media (orientation: landscape) {
            .panel-orientation-indicator {
                display: block;
                position: absolute;
                top: 10px;
                right: 10px;
                font-size: 12px;
                color: #64748b;
            }
        }
        
        .control-panel::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #3b82f6, #ec4899, #3b82f6);
            background-size: 200% 100%;
            animation: gradientMove 3s linear infinite;
        }
        
        @keyframes gradientMove {
            0% { background-position: 0% 0%; }
            100% { background-position: 200% 0%; }
        }
        
        .control-panel.ar-active {
            opacity: 0.2;
            pointer-events: none;
            transform: scale(0.92) translateX(30px);
        }
        
        .control-panel button {
            background: rgba(30, 41, 59, 0.7);
            border: none;
            color: #e2e8f0;
            padding: 12px 18px;
            text-align: left;
            text-decoration: none;
            display: flex;
            align-items: center;
            font-size: 14px;
            margin: 0;
            cursor: pointer;
            border-radius: 12px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            font-weight: 500;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 
                        0 1px 3px rgba(0, 0, 0, 0.08),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
            letter-spacing: 0.3px;
            font-family: 'Orbitron', sans-serif;
        }
        
        .control-panel button i {
            margin-right: 12px;
            font-size: 16px;
            width: 20px;
            text-align: center;
            transition: all 0.3s ease;
        }
        
        .control-panel button .button-text {
            flex-grow: 1;
        }
        
        .control-panel button .status-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #64748b;
            margin-left: auto;
            transition: all 0.3s ease;
        }
        
        .control-panel button.active .status-indicator {
            background-color: #22c55e;
            box-shadow: 0 0 8px #22c55e;
        }
        
        .control-panel button:hover {
            background-color: rgba(51, 65, 85, 0.9);
            transform: translateY(-2px);
            box-shadow: 0 7px 14px rgba(0, 0, 0, 0.12), 
                        0 3px 6px rgba(0, 0, 0, 0.08),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        
        .control-panel button:hover i {
            transform: scale(1.2);
            color: #3b82f6;
        }
        
        .control-panel button:active {
            transform: translateY(1px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        
        .control-panel button.active {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.7), rgba(37, 99, 235, 0.7));
            color: white;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35),
                        inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }
        
        .control-panel button.active i {
            color: white;
        }
        
        .control-panel button.active:hover {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(37, 99, 235, 0.8));
        }
        
        .control-panel h3 {
            margin: 0 0 12px 0;
            font-size: 18px;
            text-align: center;
            color: #ffffff;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
            padding-bottom: 12px;
            position: relative;
            text-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }
        
        .control-panel h3::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 10%;
            right: 10%;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.7), transparent);
        }
        
        /* Футуристичні анімації */
        .control-panel button::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(59, 130, 246, 0.2);
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            z-index: -1;
        }
        
        .control-panel button:hover::before {
            transform: translateX(0);
        }
        
        /* Ефект пульсації для активних кнопок */
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
            70% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); }
            100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        
        .control-panel button.active {
            animation: pulse 2s infinite;
        }
        
        /* Стильний скролбар */
        .control-panel::-webkit-scrollbar {
            width: 4px;
        }
        
        .control-panel::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.1);
        }
        
        .control-panel::-webkit-scrollbar-thumb {
            background: rgba(59, 130, 246, 0.5);
            border-radius: 4px;
        }
        
        /* Додаткові дизайнерські елементи */
        .control-panel .panel-bottom {
            margin-top: 10px;
            font-size: 12px;
            text-align: center;
            color: rgba(226, 232, 240, 0.6);
        }
        
        /* Анімація для кнопок при відкритті панелі */
        @keyframes buttonAppear {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .control-panel button {
            animation: buttonAppear 0.5s forwards;
            opacity: 1;
        }
        
        .control-panel button:nth-child(2) { animation-delay: 0.1s; }
        .control-panel button:nth-child(3) { animation-delay: 0.2s; }
        .control-panel button:nth-child(4) { animation-delay: 0.3s; }
        .control-panel button:nth-child(5) { animation-delay: 0.4s; }
        .control-panel button:nth-child(6) { animation-delay: 0.5s; }
        .control-panel button:nth-child(7) { animation-delay: 0.6s; }
    `;
    document.head.appendChild(style);

    // Створюємо панель керування
    const panel = document.createElement('div');
    panel.className = 'control-panel';
    panel.innerHTML = `
        <h3>Панель керування</h3>
        <span class="panel-orientation-indicator"><i class="fa-solid fa-mobile-screen-button"></i> Landscape Mode</span>
        <button id="toggle-rotation">
            <i class="fa-solid fa-sync-alt"></i>
            <span class="button-text">Disable Rotation</span>
            <span class="status-indicator"></span>
        </button>
        <button id="toggle-emissive">
            <i class="fa-solid fa-lightbulb"></i>
            <span class="button-text">Enable Color/Emit</span>
            <span class="status-indicator"></span>
        </button>
        <button id="toggle-textures">
            <i class="fa-solid fa-image"></i>
            <span class="button-text">Enable Textures</span>
            <span class="status-indicator"></span>
        </button>
        <button id="toggle-pulse">
            <i class="fa-solid fa-wave-square"></i>
            <span class="button-text">Enable Pulse/Move</span>
            <span class="status-indicator"></span>
        </button>
        <button id="toggle-speed">
            <i class="fa-solid fa-gauge-high"></i>
            <span class="button-text">Speed: Normal</span>
            <span class="status-indicator"></span>
        </button>
        <button id="toggle-effect">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span class="button-text">Enable Special Effect</span>
            <span class="status-indicator"></span>
        </button>
        <div class="panel-bottom">AR EXPERIENCE CONTROLS v1.0</div>
    `;
    document.body.appendChild(panel);

    // Додаємо обробники подій для кнопок
    document.getElementById('toggle-rotation').addEventListener('click', toggleRotation);
    document.getElementById('toggle-emissive').addEventListener('click', toggleEmissive);
    document.getElementById('toggle-textures').addEventListener('click', toggleTextures);
    document.getElementById('toggle-pulse').addEventListener('click', togglePulse);
    document.getElementById('toggle-speed').addEventListener('click', toggleSpeed);
    document.getElementById('toggle-effect').addEventListener('click', toggleSpecialEffect);
    
    // Додаємо анімацію появи панелі
    setTimeout(() => {
        panel.style.transform = 'translateY(0)';
        panel.style.opacity = '1';
    }, 100);
    
    // Додаємо обробник зміни орієнтації екрану
    window.addEventListener('orientationchange', updatePanelPositionBasedOnOrientation);
    window.addEventListener('resize', updatePanelPositionBasedOnOrientation);
    
    // Одразу встановлюємо правильну позицію
    updatePanelPositionBasedOnOrientation();
}

// Функція для оновлення позиції панелі залежно від орієнтації
function updatePanelPositionBasedOnOrientation() {
    const panel = document.querySelector('.control-panel');
    const orientationIndicator = document.querySelector('.panel-orientation-indicator');
    
    if (!panel) return;
    
    // Перевіряємо чи це мобільний пристрій
    const isMobile = window.innerWidth <= 1024;
    // Перевіряємо орієнтацію (альбомна чи портретна)
    const isLandscape = window.innerWidth > window.innerHeight;
    
    if (orientationIndicator) {
        orientationIndicator.style.display = (isMobile && isLandscape) ? 'block' : 'none';
    }
    
    // Скидаємо будь-які inline-стилі, щоб застосувались CSS медіа-запити
    if (panel.style.transform) {
        // Зберігаємо transform тільки для AR режиму
        if (!panel.classList.contains('ar-active')) {
            panel.style.transform = isMobile && isLandscape ? 'translateY(-50%)' : '';
        }
    }
}

// Функції для обробки подій кнопок
function toggleRotation() {
    rotationEnabled = !rotationEnabled;
    const button = document.getElementById('toggle-rotation');
    const buttonText = button.querySelector('.button-text');
    
    if (rotationEnabled) {
        buttonText.textContent = 'Disable Rotation';
        button.classList.remove('active');
    } else {
        buttonText.textContent = 'Enable Rotation';
        button.classList.add('active');
    }
}

function toggleEmissive() {
    emissiveEnabled = !emissiveEnabled;
    const button = document.getElementById('toggle-emissive');
    const buttonText = button.querySelector('.button-text');
    
    if (emissiveEnabled) {
        buttonText.textContent = 'Disable Color/Emit';
        button.classList.add('active');
        
        // Змінюємо кольори об'єктів та включаємо випромінювання
        circleMesh.material.color.set(0x00ff00); // Зелений колір
        torusMesh.material.color.set(0xff00ff); // Рожевий колір
        icosahedronMesh.material.color.set(0x00ffff); // Бірюзовий колір
        
        // Включаємо випромінювання для всіх об'єктів
        if (torusMesh.material.emissive) {
            torusMesh.material.emissiveIntensity = 2;
        }
        
        // Додаємо випромінювання для золотого матеріалу також
        if (icosahedronMesh.material.emissive) {
            icosahedronMesh.material.emissive.set(0x555500);
            icosahedronMesh.material.emissiveIntensity = 1;
        }
    } else {
        buttonText.textContent = 'Enable Color/Emit';
        button.classList.remove('active');
        
        // Повертаємо оригінальні кольори
        circleMesh.material.color.set(0x87CEEB);
        torusMesh.material.color.set(0xff4500);
        icosahedronMesh.material.color.set(0xffd700);
        
        // Вимикаємо випромінювання
        if (torusMesh.material.emissive) {
            torusMesh.material.emissiveIntensity = 0;
        }
        
        if (icosahedronMesh.material.emissive) {
            icosahedronMesh.material.emissiveIntensity = 0;
        }
    }
}

function toggleTextures() {
    texturesEnabled = !texturesEnabled;
    const button = document.getElementById('toggle-textures');
    const buttonText = button.querySelector('.button-text');
    
    if (texturesEnabled) {
        buttonText.textContent = 'Disable Textures';
        button.classList.add('active');
        
        // Додаємо текстури до об'єктів
        circleMesh.material.map = circleTexture;
        torusMesh.material.map = torusTexture;
        icosahedronMesh.material.map = icosahedronTexture;
        
        // Оновлюємо матеріали
        circleMesh.material.needsUpdate = true;
        torusMesh.material.needsUpdate = true;
        icosahedronMesh.material.needsUpdate = true;
    } else {
        buttonText.textContent = 'Enable Textures';
        button.classList.remove('active');
        
        // Прибираємо текстури
        circleMesh.material.map = null;
        torusMesh.material.map = null;
        icosahedronMesh.material.map = null;
        
        // Оновлюємо матеріали
        circleMesh.material.needsUpdate = true;
        torusMesh.material.needsUpdate = true;
        icosahedronMesh.material.needsUpdate = true;
    }
}

function togglePulse() {
    pulseEnabled = !pulseEnabled;
    const button = document.getElementById('toggle-pulse');
    const buttonText = button.querySelector('.button-text');
    
    if (pulseEnabled) {
        buttonText.textContent = 'Disable Pulse/Move';
        button.classList.add('active');
        
        // ОНОВЛЕНО: Показуємо повідомлення для підтвердження
        console.log("Пульсація активована");
        document.body.style.backgroundColor = "rgba(255,0,0,0.2)"; // Тимчасово змінюємо фон для діагностики
        
        // Відразу застосовуємо екстремальний масштаб для перевірки
        circleMesh.scale.set(3, 3, 1);
        torusMesh.scale.set(4, 4, 4);
        icosahedronMesh.scale.set(3, 3, 3);
        
        // ВАЖЛИВО: Переміщуємо об'єкти для видимого ефекту
        circleMesh.position.y = 2;
        torusMesh.position.y = -2;
        icosahedronMesh.position.z = 2;
        
        // Встановлюємо затримку для повернення до анімації
        setTimeout(() => {
            if (pulseEnabled) { // Перевіряємо, чи все ще активна пульсація
                circleMesh.scale.set(1, 1, 1);
                torusMesh.scale.set(1, 1, 1);
                icosahedronMesh.scale.set(1, 1, 1);
                
                // Повертаємо початкові позиції
                circleMesh.position.set(-1.5, 0, 0);
                torusMesh.position.set(0, 0, 0);
                icosahedronMesh.position.set(1.5, 0, 0);
                
                document.body.style.backgroundColor = ""; // Повертаємо нормальний фон
            }
        }, 500);
    } else {
        buttonText.textContent = 'Enable Pulse/Move';
        button.classList.remove('active');
        
        console.log("Пульсація деактивована");
        document.body.style.backgroundColor = "";
        
        // Повертаємо оригінальний масштаб об'єктів
        circleMesh.scale.set(1, 1, 1);
        torusMesh.scale.set(1, 1, 1);
        icosahedronMesh.scale.set(1, 1, 1);
        
        // Повертаємо оригінальні позиції
        circleMesh.position.set(-1.5, 0, 0);
        torusMesh.position.set(0, 0, 0);
        icosahedronMesh.position.set(1.5, 0, 0);
    }
}

function toggleSpeed() {
    const button = document.getElementById('toggle-speed');
    const buttonText = button.querySelector('.button-text');
    
    if (animationSpeed === 0.01) {
        animationSpeed = 0.03; // Швидка анімація
        buttonText.textContent = 'Speed: Fast';
        button.classList.add('active');
    } else {
        animationSpeed = 0.01; // Нормальна швидкість
        buttonText.textContent = 'Speed: Normal';
        button.classList.remove('active');
    }
}

function toggleSpecialEffect() {
    specialEffectEnabled = !specialEffectEnabled;
    const button = document.getElementById('toggle-effect');
    const buttonText = button.querySelector('.button-text');
    
    if (specialEffectEnabled) {
        buttonText.textContent = 'Disable Special Effect';
        button.classList.add('active');
    } else {
        buttonText.textContent = 'Enable Special Effect';
        button.classList.remove('active');
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Основна функція анімації
function animate() {
    renderer.setAnimationLoop(render);
    controls.update();
}

// Функція рендерингу сцени - тут відбувається вся анімація
function render() {
    // Отримуємо поточний час для анімацій
    const time = Date.now() * 0.001;
    
    // Світлові ефекти
    animateLights(time);
    
    // Спеціальний ефект світла та кольорів
    if (specialEffectEnabled) {
        applySpecialEffect(time);
    } else {
        resetLightColors();
    }
    
    // Ефект пульсації та руху
    if (pulseEnabled) {
        applyPulseEffect(time);
    }
    
    // Обертання об'єктів
    if (rotationEnabled) {
        rotateObjects();
    }
    
    // Рендеримо сцену
    renderer.render(scene, camera);
}

// Анімація світла
function animateLights(time) {
    if (redPointLight) {
        redPointLight.position.x = Math.sin(time) * 2;
        redPointLight.position.z = Math.cos(time) * 2;
    }
    
    if (bluePointLight) {
        bluePointLight.position.x = Math.sin(time + Math.PI) * 2;
        bluePointLight.position.z = Math.cos(time + Math.PI) * 2;
    }
}

// Застосування спеціального ефекту
function applySpecialEffect(time) {
    const pulseValue = (Math.sin(time * 3) + 1) / 2; // 0 до 1
    
    // Світлові ефекти
    redPointLight.intensity = 5 + pulseValue * 15;
    bluePointLight.intensity = 5 + (1 - pulseValue) * 15;
    
    // Зміна кольору світла
    const hue = (time * 0.1) % 1;
    const color = new THREE.Color().setHSL(hue, 1, 0.5);
    redPointLight.color.copy(color);
    bluePointLight.color.setHSL((hue + 0.5) % 1, 1, 0.5);
    
    // Ефекти матеріалів
    if (circleMesh.material.transparent) {
        circleMesh.material.opacity = 0.2 + pulseValue * 0.7;
        circleMesh.material.needsUpdate = true;
    }
    
    if (torusMesh.material.emissive) {
        torusMesh.material.emissive.setHSL(hue, 1, 0.5);
        torusMesh.material.emissiveIntensity = 0.5 + pulseValue * 1.5;
    }
    
    if (icosahedronMesh.material.emissive) {
        icosahedronMesh.material.emissive.setHSL((hue + 0.3) % 1, 1, 0.5);
        icosahedronMesh.material.emissiveIntensity = 0.5 + (1 - pulseValue) * 1.5;
    }
}

// Повернення оригінальних кольорів світла
function resetLightColors() {
    redPointLight.intensity = 5;
    bluePointLight.intensity = 5;
    redPointLight.color.set(0xff4500);
    bluePointLight.color.set(0x4169e1);
    
    // Повертаємо початкову прозорість скляного матеріалу
    if (circleMesh.material.transparent && !emissiveEnabled) {
        circleMesh.material.opacity = 0.5;
        circleMesh.material.needsUpdate = true;
    }
    
    // Прибираємо випромінення, якщо не активований режим emissive
    if (torusMesh.material.emissive && !emissiveEnabled) {
        torusMesh.material.emissiveIntensity = 0;
    }
    
    if (icosahedronMesh.material.emissive && !emissiveEnabled) {
        icosahedronMesh.material.emissiveIntensity = 0;
    }
}

// ОНОВЛЕНА ФУНКЦІЯ: ефект пульсації та руху
function applyPulseEffect(time) {
    // Використовуємо дуже інтенсивні значення для масштабування
    const scaleCircle = 1 + Math.sin(time * 4) * 1.5; // від -0.5 до 2.5
    const scaleTorus = 1 + Math.sin(time * 3 + 1) * 2;  // від -1 до 3
    const scaleIcosahedron = 1 + Math.sin(time * 5 + 2) * 1.5; // від -0.5 до 2.5
    
    // Застосовуємо масштабування
    circleMesh.scale.set(Math.abs(scaleCircle), Math.abs(scaleCircle), 1);
    torusMesh.scale.set(Math.abs(scaleTorus), Math.abs(scaleTorus), Math.abs(scaleTorus));
    icosahedronMesh.scale.set(Math.abs(scaleIcosahedron), Math.abs(scaleIcosahedron), Math.abs(scaleIcosahedron));
    
    // Використовуємо величезну амплітуду руху
    const moveAmplitude = 1.5;
    
    // Рух по Y
    circleMesh.position.y = Math.sin(time * 4) * moveAmplitude;
    torusMesh.position.y = Math.sin(time * 3 + 1) * moveAmplitude;
    icosahedronMesh.position.y = Math.sin(time * 5 + 2) * moveAmplitude;
    
    // Рух по X (зі збереженням базових позицій)
    circleMesh.position.x = -1.5 + Math.sin(time * 3) * moveAmplitude;
    torusMesh.position.x = Math.sin(time * 2) * moveAmplitude;
    icosahedronMesh.position.x = 1.5 + Math.sin(time * 2.5 + 1) * moveAmplitude;
    
    // Додаємо рух по Z для ще більшого ефекту
    circleMesh.position.z = Math.sin(time * 2) * moveAmplitude;
    torusMesh.position.z = Math.sin(time * 3.5) * moveAmplitude;
    icosahedronMesh.position.z = Math.sin(time * 4.5 + 3) * moveAmplitude;
    
    // Виводимо інформацію для діагностики
    if (Math.floor(time) % 2 === 0) { // Логуємо кожні 2 секунди
        console.log("Pulse scales:", 
            circleMesh.scale.x.toFixed(2), 
            torusMesh.scale.x.toFixed(2), 
            icosahedronMesh.scale.x.toFixed(2)
        );
    }
}

// Обертання об'єктів
function rotateObjects() {
    const speedMultiplier = animationSpeed;
    
    circleMesh.rotation.y -= speedMultiplier;
    torusMesh.rotation.x += speedMultiplier;
    torusMesh.rotation.y += speedMultiplier;
    icosahedronMesh.rotation.x -= speedMultiplier;
    icosahedronMesh.rotation.z += speedMultiplier;
}