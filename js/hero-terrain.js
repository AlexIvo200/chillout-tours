// Hero: процедурный Кавказ на закате. Low-poly горы, река в долине, облака, пыльца, пролёт камеры.
import * as THREE from 'three';
import { createNoise2D, fbm, ridged } from './noise.js';

const TERRAIN_SIZE = 1000;
const TERRAIN_SEGMENTS = 300;
const WATER_LEVEL = 3.4;
const CAMERA_CLEARANCE = 30;
const FOG_DENSITY = 0.0021;
const POLLEN_COUNT = 520;
const CLOUD_COUNT = 26;
const MAX_PIXEL_RATIO = 1.75;
const SUN_DIR = new THREE.Vector3(-0.52, 0.17, -0.84).normalize();

const PALETTE = {
  skyTop: 0x1a1c3d,
  skyMid: 0x7a4666,
  horizon: 0xf0a067,
  fog: 0xd99070,
  sun: 0xffc48a,
  hemiSky: 0x9c86c0,
  hemiGround: 0x2b1b19,
  grass: 0x34502f,
  meadow: 0x8d8a45,
  rock: 0x5a4843,
  rockLight: 0x93776a,
  snow: 0xf7f2ea,
  water: 0x2f5e6a,
  pollen: 0xffd9a8,
};

const noise = createNoise2D(7);

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Центр долины, по которой летит камера. */
export const valleyX = (z) => Math.sin(z * 0.011) * 45 + Math.sin(z * 0.027 + 1.3) * 14;

export function heightAt(x, z) {
  const openness = smoothstep(14, 120, Math.abs(x - valleyX(z)));
  const ridges = ridged(noise, x * 0.0024, z * 0.0024, 4);
  const base = fbm(noise, x * 0.0015 + 20, z * 0.0015 - 7, 4) * 0.5 + 0.5;
  let h = (Math.pow(ridges, 1.6) * 185 + base * 70) * (0.1 + 0.9 * openness);
  const kazbek = Math.hypot(x - 90, z + 420);
  h += 330 * Math.exp(-(kazbek * kazbek) / (2 * 85 * 85)) * (0.65 + 0.35 * ridges);
  h += fbm(noise, x * 0.03, z * 0.03, 2) * 1.5 + 1;
  return h;
}

function buildSky() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(PALETTE.skyTop) },
      uMid: { value: new THREE.Color(PALETTE.skyMid) },
      uHorizon: { value: new THREE.Color(PALETTE.horizon) },
      uSun: { value: new THREE.Color(PALETTE.sun) },
      uSunDir: { value: SUN_DIR },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uMid, uHorizon, uSun, uSunDir;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.2, h));
        col = mix(col, uTop, smoothstep(0.16, 0.65, h));
        col = mix(col, uHorizon * 0.85, smoothstep(0.0, -0.25, h));
        float s = max(dot(d, uSunDir), 0.0);
        col += uSun * (pow(s, 1200.0) * 8.0 + pow(s, 60.0) * 0.55 + pow(s, 6.0) * 0.22);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(1600, 48, 24), material);
}

function colorTerrain(geometry) {
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const colors = new Float32Array(position.count * 3);
  const c = new THREE.Color();
  const grass = new THREE.Color(PALETTE.grass);
  const meadow = new THREE.Color(PALETTE.meadow);
  const rock = new THREE.Color(PALETTE.rock);
  const rockLight = new THREE.Color(PALETTE.rockLight);
  const snow = new THREE.Color(PALETTE.snow);

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const up = normal.getY(i);
    const variation = noise(x * 0.02, z * 0.02) * 0.5 + 0.5;

    c.copy(grass).lerp(meadow, variation * smoothstep(40, 4, y));
    c.lerp(rockLight, smoothstep(50, 140, y) * 0.8);
    c.lerp(rock, smoothstep(0.86, 0.6, up));
    const snowLine = 85 + noise(x * 0.01, z * 0.01) * 22;
    c.lerp(snow, smoothstep(snowLine, snowLine + 30, y) * smoothstep(0.12, 0.38, up));

    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function buildTerrain() {
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    position.setY(i, heightAt(position.getX(i), position.getZ(i)));
  }
  geometry.computeVertexNormals();
  colorTerrain(geometry);
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.92,
    metalness: 0,
    envMapIntensity: 0.35,
  });
  return new THREE.Mesh(geometry, material);
}

function buildWater() {
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 1, 1);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshStandardMaterial({
    color: PALETTE.water,
    roughness: 0.12,
    metalness: 0.75,
    envMapIntensity: 1.2,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = WATER_LEVEL;
  return mesh;
}

function softDotTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildClouds(texture) {
  const group = new THREE.Group();
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: i % 3 === 0 ? 0xffd2b0 : 0xf3c3c0,
      transparent: true,
      opacity: 0.18 + Math.random() * 0.2,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    const scale = 120 + Math.random() * 220;
    sprite.scale.set(scale * 2.2, scale * 0.55, 1);
    sprite.position.set((Math.random() - 0.5) * 900, 110 + Math.random() * 120, -150 - Math.random() * 500);
    sprite.userData.speed = 1.5 + Math.random() * 3;
    group.add(sprite);
  }
  return group;
}

function buildPollen(texture) {
  const positions = new Float32Array(POLLEN_COUNT * 3);
  for (let i = 0; i < POLLEN_COUNT; i++) {
    positions.set([(Math.random() - 0.5) * 160, Math.random() * 60, (Math.random() - 0.5) * 160], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    map: texture,
    color: PALETTE.pollen,
    size: 0.9,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geometry, material);
}

const wrap = (value, center, span) => center + ((((value - center + span / 2) % span) + span) % span) - span / 2;

function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ onFirstFrame?: () => void, reducedMotion?: boolean }} options
 */
export function initHeroTerrain(canvas, { onFirstFrame, reducedMotion = false } = {}) {
  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(PALETTE.fog, FOG_DENSITY);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 4000);

  const sky = buildSky();
  scene.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(buildSky());
  scene.environment = pmrem.fromScene(envScene, 0.02).texture;

  scene.add(buildTerrain(), buildWater());
  const dot = softDotTexture();
  const clouds = buildClouds(dot);
  const pollen = buildPollen(dot);
  scene.add(clouds, pollen);

  const sun = new THREE.DirectionalLight(PALETTE.sun, 4.2);
  sun.position.copy(SUN_DIR).multiplyScalar(500);
  scene.add(sun, new THREE.HemisphereLight(PALETTE.hemiSky, PALETTE.hemiGround, 1.25));

  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const scroll = { target: 0, value: 0 };
  const lookTarget = new THREE.Vector3();
  const host = canvas.parentElement;

  const onPointerMove = (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
  };
  const onScroll = () => {
    scroll.target = clamp01(window.scrollY / Math.max(1, host.offsetHeight));
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = host;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 68 : 55;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(host);
  resize();

  const clock = new THREE.Clock();
  let firstFrame = true;

  const updateCamera = (elapsed) => {
    pointer.sx += (pointer.x - pointer.sx) * 0.035;
    pointer.sy += (pointer.y - pointer.sy) * 0.035;
    scroll.value += (scroll.target - scroll.value) * 0.08;

    const z = 330 - 110 * (1 - Math.cos(elapsed * 0.03)) - scroll.value * 170;
    const x = valleyX(z) + pointer.sx * 16;
    const ground = Math.max(heightAt(x, z), WATER_LEVEL);
    const y = ground + CAMERA_CLEARANCE + scroll.value * 60 - pointer.sy * 6 + Math.sin(elapsed * 0.4) * 1.2;
    camera.position.set(x, y, z);

    const lz = z - 140;
    lookTarget.set(valleyX(lz) * 0.9 + pointer.sx * 12, y - 6 + pointer.sy * 8 - scroll.value * 30, lz);
    camera.lookAt(lookTarget);
    sky.position.copy(camera.position);
  };

  const updateAtmosphere = (delta) => {
    clouds.children.forEach((cloud) => {
      cloud.position.x = wrap(cloud.position.x + cloud.userData.speed * delta, camera.position.x, 900);
    });
    const p = pollen.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      p.setXYZ(
        i,
        wrap(p.getX(i) + Math.sin(i + p.getY(i) * 0.1) * delta * 0.6, camera.position.x, 160),
        wrap(p.getY(i) + delta * (0.6 + (i % 5) * 0.2), camera.position.y, 60),
        wrap(p.getZ(i), camera.position.z - 40, 160),
      );
    }
    p.needsUpdate = true;
  };

  const renderFrame = () => {
    const delta = Math.min(clock.getDelta(), 0.1);
    const elapsed = reducedMotion ? 0 : clock.elapsedTime;
    updateCamera(elapsed);
    if (!reducedMotion) updateAtmosphere(delta);
    renderer.render(scene, camera);
    if (firstFrame) {
      firstFrame = false;
      onFirstFrame?.();
    }
  };

  let running = false;
  const setRunning = (shouldRun) => {
    if (shouldRun === running) return;
    running = shouldRun;
    renderer.setAnimationLoop(shouldRun ? renderFrame : null);
  };

  new IntersectionObserver(([entry]) => setRunning(entry.isIntersecting && !document.hidden)).observe(host);
  document.addEventListener('visibilitychange', () => setRunning(!document.hidden && window.scrollY < host.offsetHeight));
  renderFrame();
  if (!reducedMotion) setRunning(true);
}
