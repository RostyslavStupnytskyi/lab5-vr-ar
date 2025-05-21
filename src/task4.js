import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let container;
let camera, scene, renderer;
let reticle;
let controller;
let models = [];
let directionalLightEnabled = true;
let jumpEnabled = true;
let rotationEnabled = true;
let directionalLight;
let lightIntensity = 3;
let lightColors = [0xffffff, 0xffaaaa, 0xaaffaa, 0xaaaaff]; // White, red, green, blue
let currentLightColorIndex = 0;

// Array of material styles (updated for clarity)
const materials = {
  realistic: null, // Realistic (with model textures)
  gold: new THREE.MeshStandardMaterial({
    color: 0xffd700, // Gold color
    metalness: 0.9, // Increased for clearer reflections
    roughness: 0.1,
  }),
  glow: new THREE.MeshStandardMaterial({
    color: 0x00ff00, // Green glow
    emissive: 0x00ff00,
    emissiveIntensity: 1.5, // Reduced to not hide details
    metalness: 0.3,
    roughness: 0.3, // Reduced for clarity
  }),
  glass: new THREE.MeshPhysicalMaterial({
    transparent: true,
    opacity: 0.5, // Increased for visibility
    metalness: 0.2,
    roughness: 0.05, // Reduced for clearer reflections
    transmission: 0.9,
    thickness: 0.5,
  }),
  chrome: new THREE.MeshStandardMaterial({
    color: 0xffffff, // White for chrome effect
    metalness: 1, // Maximum reflectivity
    roughness: 0.02, // Minimum roughness for clarity
  }),
};

// Save original materials for each model
const originalMaterials = new Map();
let currentMaterial = "realistic";

init();
animate();

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  // Rendering
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.shadowMap.enabled = true; // Enable shadows
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
  container.appendChild(renderer.domElement);

  // Light
  directionalLight = new THREE.DirectionalLight(0xffffff, lightIntensity);
  directionalLight.position.set(2, 3, 2); // Change position for clearer shadows
  directionalLight.castShadow = true; // Enable shadows
  directionalLight.shadow.mapSize.width = 1024; // Shadow quality
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  scene.add(directionalLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Reduce intensity
  scene.add(ambientLight);

  const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 0.5); // Add Hemisphere Light
  hemisphereLight.position.set(0, 1, 0);
  scene.add(hemisphereLight);

  // Controller for adding objects
  controller = renderer.xr.getController(0);
  controller.addEventListener("select", onSelect);
  scene.add(controller);

  // Add surface marker
  addReticleToScene();

  // AR mode setup with hit-test
  const button = ARButton.createButton(renderer, {
    requiredFeatures: ["hit-test"],
    onSessionStarted: () => {
      renderer.domElement.style.background = "transparent";
      document.getElementById("controls").style.display = "flex";
    },
    onSessionEnded: () => {
      document.getElementById("controls").style.display = "flex";
    },
  });
  document.body.appendChild(button);
  renderer.domElement.style.display = "block";

  // Add Listener for buttons
  document
    .getElementById("materialRealisticBtn")
    .addEventListener("click", () => setMaterial("realistic"));
  document
    .getElementById("materialGoldBtn")
    .addEventListener("click", () => setMaterial("gold"));
  document
    .getElementById("materialGlowBtn")
    .addEventListener("click", () => setMaterial("glow"));
  document
    .getElementById("materialGlassBtn")
    .addEventListener("click", () => setMaterial("glass"));
  document
    .getElementById("materialChromeBtn")
    .addEventListener("click", () => setMaterial("chrome"));
  document
    .getElementById("toggleDirectionalLightBtn")
    .addEventListener("click", toggleDirectionalLight);
  document
    .getElementById("increaseLightIntensityBtn")
    .addEventListener("click", increaseLightIntensity);
  document
    .getElementById("decreaseLightIntensityBtn")
    .addEventListener("click", decreaseLightIntensity);
  document
    .getElementById("changeLightColorBtn")
    .addEventListener("click", changeLightColor);
  document
    .getElementById("toggleJumpBtn")
    .addEventListener("click", toggleJump);
  document
    .getElementById("toggleRotationBtn")
    .addEventListener("click", toggleRotation);

  window.addEventListener("resize", onWindowResize, false);
}

function addReticleToScene() {
  const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.7,
  });

  reticle = new THREE.Mesh(geometry, material);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  reticle.add(new THREE.AxesHelper(0.5));
}

function onSelect() {
  if (reticle.visible) {
    console.log("onSelect triggered, reticle is visible at", reticle.position);

    const loader = new GLTFLoader();
    loader.load(
      "/disco.gltf",
      (gltf) => {
        const model = gltf.scene;

        model.position.setFromMatrixPosition(reticle.matrix);
        model.quaternion.setFromRotationMatrix(reticle.matrix);
        model.scale.set(0.5, 0.5, 0.5);

        // Save base position for jump animations
        model.userData.basePosition = model.position.clone();
        model.userData.rotationSpeed = 0.02;

        // Model setup for shadows and materials
        model.traverse((child) => {
          if (child.isMesh) {
            console.log("Mesh found:", child.name, "Material:", child.material);
            originalMaterials.set(child, child.material);
            child.castShadow = true; // Model casts shadows
            child.receiveShadow = true; // Model receives shadows
            if (child.material) {
              child.material.side = THREE.DoubleSide;
              child.material.needsUpdate = true;
              // Setup for clarity
              child.material.metalness = child.material.metalness || 0.5; // Increased for reflections
              child.material.roughness = child.material.roughness || 0.3; // Reduced for clarity
              if (child.material.map) {
                child.material.map.encoding = THREE.sRGBEncoding;
                child.material.map.flipY = false;
              }
              if (child.material.normalMap) {
                child.material.normalMap.encoding = THREE.LinearEncoding;
              }
              if (child.material.roughnessMap) {
                child.material.roughnessMap.encoding = THREE.LinearEncoding;
              }
              if (child.material.metalnessMap) {
                child.material.metalnessMap.encoding = THREE.LinearEncoding;
              }
            }
          }
        });

        // Apply current style
        if (materials[currentMaterial]) {
          model.traverse((child) => {
            if (child.isMesh) {
              child.material = materials[currentMaterial].clone();
              child.material.needsUpdate = true;
            }
          });
        }

        models.push(model);
        scene.add(model);

        console.log("Model added to scene at", model.position);

        // Play sound
        const placeSound = document.getElementById("placeSound");
        if (placeSound) {
          placeSound.currentTime = 0;
          placeSound.play();
        }
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
      },
      (error) => {
        console.error("Error loading model:", error);
      }
    );
  } else {
    console.warn("onSelect triggered, but reticle is not visible");
  }
}

function setMaterial(type) {
  currentMaterial = type;
  models.forEach((model) => {
    if (materials[type]) {
      model.traverse((child) => {
        if (child.isMesh) {
          child.material = materials[type].clone();
          child.material.needsUpdate = true;
        }
      });
    } else {
      // Return original materials
      model.traverse((child) => {
        if (child.isMesh) {
          const originalMaterial = originalMaterials.get(child);
          if (originalMaterial) {
            child.material = originalMaterial;
            child.material.needsUpdate = true;
          }
        }
      });
    }
  });

  // Simplified approach to update button texts
  document.getElementById("materialRealisticBtn").textContent = currentMaterial === "realistic" ? "Realistic (Active)" : "Realistic";
  document.getElementById("materialGoldBtn").textContent = currentMaterial === "gold" ? "Gold (Active)" : "Gold";
  document.getElementById("materialGlowBtn").textContent = currentMaterial === "glow" ? "Glow (Active)" : "Glow";
  document.getElementById("materialGlassBtn").textContent = currentMaterial === "glass" ? "Glass (Active)" : "Glass";
  document.getElementById("materialChromeBtn").textContent = currentMaterial === "chrome" ? "Chrome (Active)" : "Chrome";

  // Set active button attributes
  document.querySelectorAll('[id^="material"]').forEach(btn => {
    btn.removeAttribute('active');
  });
  
  document.getElementById(`material${type.charAt(0).toUpperCase() + type.slice(1)}Btn`).setAttribute('active', '');
}

function toggleDirectionalLight() {
  directionalLightEnabled = !directionalLightEnabled;
  directionalLight.visible = directionalLightEnabled;
  
  const btn = document.getElementById("toggleDirectionalLightBtn");
  btn.textContent = directionalLightEnabled ? "Light: On" : "Light: Off";
  
  if (directionalLightEnabled) {
    btn.setAttribute('active', '');
  } else {
    btn.removeAttribute('active');
  }
}

function increaseLightIntensity() {
  lightIntensity = Math.min(lightIntensity + 0.5, 5); // Max: 5
  directionalLight.intensity = lightIntensity;
  console.log("Light intensity increased to", lightIntensity);
  
  // Show current intensity
  document.getElementById("increaseLightIntensityBtn").textContent = "Intensity +";
  document.getElementById("decreaseLightIntensityBtn").textContent = "Intensity -";
}

function decreaseLightIntensity() {
  lightIntensity = Math.max(lightIntensity - 0.5, 0); // Min: 0
  directionalLight.intensity = lightIntensity;
  console.log("Light intensity decreased to", lightIntensity);
  
  // Show current intensity
  document.getElementById("increaseLightIntensityBtn").textContent = "Intensity +";
  document.getElementById("decreaseLightIntensityBtn").textContent = "Intensity -";
}

function changeLightColor() {
  currentLightColorIndex = (currentLightColorIndex + 1) % lightColors.length;
  directionalLight.color.setHex(lightColors[currentLightColorIndex]);
  const colorNames = ["White", "Red", "Green", "Blue"];
  document.getElementById("changeLightColorBtn").textContent = `Color: ${colorNames[currentLightColorIndex]}`;
}

function toggleJump() {
  jumpEnabled = !jumpEnabled;
  const btn = document.getElementById("toggleJumpBtn");
  btn.textContent = jumpEnabled ? "Jump: On" : "Jump: Off";
  
  if (jumpEnabled) {
    btn.setAttribute('active', '');
  } else {
    btn.removeAttribute('active');
  }
}

function toggleRotation() {
  rotationEnabled = !rotationEnabled;
  const btn = document.getElementById("toggleRotationBtn");
  btn.textContent = rotationEnabled ? "Rotation: On" : "Rotation: Off";
  
  if (rotationEnabled) {
    btn.setAttribute('active', '');
  } else {
    btn.removeAttribute('active');
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

let hitTestSource = null;
let localSpace = null;
let hitTestSourceInitialized = false;

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

        reticle.material.opacity = 0.7 + 0.3 * Math.sin(timestamp * 0.005);
        reticle.material.color.setHSL((timestamp * 0.0005) % 1, 0.7, 0.5);
      } else {
        reticle.visible = false;
      }
    }

    // Animations for each model
    models.forEach((model) => {
      // Jump animations
      if (jumpEnabled) {
        const jumpHeight = 0.1;
        const jumpSpeed = 0.005;
        const offsetY = Math.sin(timestamp * jumpSpeed) * jumpHeight;
        model.position.y = model.userData.basePosition.y + offsetY;
      } else {
        model.position.y = model.userData.basePosition.y;
      }

      // Rotation animations
      if (rotationEnabled) {
        model.rotation.y += model.userData.rotationSpeed;
      }
    });

    renderer.render(scene, camera);
  }
}