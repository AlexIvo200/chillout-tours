// 3D-карта Грузии: гексагональный рельеф (Большой и Малый Кавказ), светящиеся маршруты из Тбилиси.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GEORGIA_RING } from './georgia-shape.js';
import { TOURS, TBILISI } from './tours-data.js';
import { pick, t } from './i18n.js';
import { project, unproject, pointInPolygon, clusterStops, distanceToPolyline, geoDistance } from './geo.js';
import { createNoise2D, fbm } from './noise.js';

const HEX_STEP = 0.4;
const HEX_RADIUS = 0.215;
const BASE_HEIGHT = 0.22;
const HEIGHT_SCALE = 3.7;
const RISE_SECONDS = 2.4;
const ROUTE_LIFT = 0.45;
const DIM_OPACITY = 0.1;
const NEAR_TBILISI = 0.07;
const CITY_LOOP_RADIUS = 0.9;
const CAMERA_EASE = 3; // скорость доводки камеры, не зависит от FPS
const ROUND_TRIPS = new Set(['kakheti', 'borjomi', 'mtskheta']);

const MAIN_RIDGE = [[40.0, 43.45], [41.5, 43.2], [42.7, 42.95], [43.6, 42.78], [44.5, 42.66], [45.3, 42.42], [46.1, 41.98], [46.7, 41.8]];
const LESSER_RIDGE = [[41.8, 41.62], [42.8, 41.55], [43.6, 41.42], [44.4, 41.22], [45.0, 41.12]];
const LIKHI_RIDGE = [[43.15, 42.3], [43.55, 41.95]];
const PEAKS = [
  { lon: 44.52, lat: 42.7, h: 0.75, r: 0.09 },
  { lon: 43.13, lat: 43.0, h: 0.5, r: 0.12 },
  { lon: 42.3, lat: 43.1, h: 0.35, r: 0.15 },
];
const RELIEF_STOPS = [
  [0.0, 0x86a05a],
  [0.16, 0x5d8544],
  [0.38, 0x3f6139],
  [0.58, 0x7a6457],
  [0.78, 0xb09a8b],
  [0.9, 0xf6f0e7],
];

const noise = createNoise2D(11);
const gauss = (d, width) => Math.exp(-(d * d) / (2 * width * width));
const easeOutBack = (x) => {
  const c = 1.4;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};

export function reliefAt(lon, lat) {
  let h = gauss(distanceToPolyline(lon, lat, MAIN_RIDGE), 0.22);
  h += 0.5 * gauss(distanceToPolyline(lon, lat, LESSER_RIDGE), 0.2);
  h += 0.28 * gauss(distanceToPolyline(lon, lat, LIKHI_RIDGE), 0.12);
  PEAKS.forEach((p) => {
    h += p.h * gauss(geoDistance(p, { lon, lat }), p.r);
  });
  h *= 0.72 + 0.56 * (fbm(noise, lon * 2.4, lat * 2.4, 4) * 0.5 + 0.5);
  return Math.max(0, Math.min(1.35, h + 0.04 + fbm(noise, lon * 6, lat * 6, 2) * 0.03));
}

const surfaceY = (lon, lat) => BASE_HEIGHT + reliefAt(lon, lat) * HEIGHT_SCALE;

function reliefColor(h, target) {
  const upper = RELIEF_STOPS.findIndex(([stop]) => stop >= h);
  if (upper <= 0) return target.setHex(upper === 0 ? RELIEF_STOPS[0][1] : RELIEF_STOPS.at(-1)[1]);
  const [s0, c0] = RELIEF_STOPS[upper - 1];
  const [s1, c1] = RELIEF_STOPS[upper];
  return target.setHex(c0).lerp(new THREE.Color(c1), (h - s0) / (s1 - s0));
}

function buildPillars() {
  const projected = GEORGIA_RING.map(([lon, lat]) => project(lon, lat));
  const xs = projected.map((p) => p.x);
  const zs = projected.map((p) => p.z);
  const [xMin, xMax, zMin, zMax] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const rowStep = HEX_STEP * 0.866;
  const cells = [];
  for (let row = 0, z = zMin; z <= zMax; row++, z = zMin + row * rowStep) {
    for (let x = xMin + (row % 2) * HEX_STEP * 0.5; x <= xMax; x += HEX_STEP) {
      const { lon, lat } = unproject(x, z);
      if (!pointInPolygon(lon, lat, GEORGIA_RING)) continue;
      const h = reliefAt(lon, lat);
      cells.push({ x, z, h, delay: ((x - xMin) / (xMax - xMin)) * 1.1 + Math.random() * 0.25 });
    }
  }

  const geometry = new THREE.CylinderGeometry(HEX_RADIUS, HEX_RADIUS, 1, 6, 1);
  geometry.translate(0, 0.5, 0);
  const material = new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0.04, flatShading: true });
  const mesh = new THREE.InstancedMesh(geometry, material, cells.length);
  const color = new THREE.Color();
  cells.forEach((cell, i) => mesh.setColorAt(i, reliefColor(cell.h / 1.15, color)));
  mesh.instanceColor.needsUpdate = true;

  const dummy = new THREE.Object3D();
  const setRise = (elapsed) => {
    let done = true;
    cells.forEach((cell, i) => {
      const progress = Math.max(0, Math.min(1, (elapsed - cell.delay) / RISE_SECONDS));
      if (progress < 1) done = false;
      dummy.position.set(cell.x, 0, cell.z);
      dummy.scale.set(1, Math.max(0.001, (BASE_HEIGHT + cell.h * HEIGHT_SCALE) * easeOutBack(progress)), 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    return done;
  };
  setRise(0);
  return { mesh, setRise, bounds: { xMin, xMax, zMin, zMax } };
}

function buildBase() {
  const shape = new THREE.Shape(GEORGIA_RING.map(([lon, lat]) => {
    const p = project(lon, lat);
    return new THREE.Vector2(p.x, -p.z);
  }));
  const slab = new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false });
  slab.rotateX(-Math.PI / 2);
  slab.translate(0, -0.6, 0);
  const base = new THREE.Mesh(slab, new THREE.MeshStandardMaterial({ color: 0x3a1a26, roughness: 0.55 }));

  const outlinePoints = GEORGIA_RING.map(([lon, lat]) => {
    const p = project(lon, lat);
    return new THREE.Vector3(p.x, 0.02, p.z);
  });
  const outline = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(outlinePoints),
    new THREE.LineBasicMaterial({ color: 0xf2a261, transparent: true, opacity: 0.9 }),
  );

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color(0xf2a261) } },
      vertexShader: /* glsl */ `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; varying vec3 vPos;
        void main(){
          vec2 cell = abs(fract(vPos.xz * 0.5) - 0.5);
          float dotMask = 1.0 - smoothstep(0.03, 0.07, length(cell));
          float fade = 1.0 - smoothstep(8.0, 48.0, length(vPos.xz));
          gl_FragColor = vec4(uColor, dotMask * fade * 0.28);
          #include <colorspace_fragment>
        }`,
    }),
  );
  ground.position.y = -0.62;
  return [base, outline, ground];
}

function routeMaterial(color, length) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uOpacity: { value: DIM_OPACITY },
      uDashes: { value: Math.max(6, length * 1.4) },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uTime, uProgress, uOpacity, uDashes; varying vec2 vUv;
      void main(){
        if (vUv.x > uProgress) discard;
        float dash = smoothstep(0.3, 0.5, fract(vUv.x * uDashes - uTime * 1.2));
        float head = smoothstep(uProgress - 0.05, uProgress, vUv.x) * step(uProgress, 0.999);
        vec3 col = mix(uColor * 1.6, vec3(1.0), head * 0.8 + dash * 0.15);
        gl_FragColor = vec4(col, uOpacity * (0.45 + 0.55 * dash));
        #include <colorspace_fragment>
      }`,
  });
}

function routePoints(tour, clusters) {
  if (tour.id === 'old-tbilisi') {
    const c = project(TBILISI.lon, TBILISI.lat);
    const y = surfaceY(TBILISI.lon, TBILISI.lat) + 1.1;
    return Array.from({ length: 48 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      const r = CITY_LOOP_RADIUS * (1 + 0.15 * Math.sin(a * 3));
      return new THREE.Vector3(c.x + Math.cos(a) * r, y + Math.sin(a * 2) * 0.25, c.z + Math.sin(a) * r);
    });
  }
  const waypoints = [TBILISI, ...clusters.map((c) => c.anchor), ...(ROUND_TRIPS.has(tour.id) ? [TBILISI] : [])];
  return waypoints.slice(0, -1).flatMap((a, index) => {
    const b = waypoints[index + 1];
    const pa = project(a.lon, a.lat);
    const pb = project(b.lon, b.lat);
    const length = Math.hypot(pb.x - pa.x, pb.z - pa.z);
    const lift = 0.8 + length * 0.12;
    const samples = Math.max(10, Math.round(length * 5));
    const [ga, gb] = [surfaceY(a.lon, a.lat), surfaceY(b.lon, b.lat)];
    const isLast = index === waypoints.length - 2;
    return Array.from({ length: samples + (isLast ? 1 : 0) }, (_, j) => {
      const s = j / samples;
      const lon = a.lon + (b.lon - a.lon) * s;
      const lat = a.lat + (b.lat - a.lat) * s;
      const arc = ga + (gb - ga) * s + lift * Math.sin(Math.PI * s);
      const y = Math.max(surfaceY(lon, lat) + ROUTE_LIFT, arc + ROUTE_LIFT);
      return new THREE.Vector3(pa.x + (pb.x - pa.x) * s, y, pa.z + (pb.z - pa.z) * s);
    });
  });
}

function buildRoute(tour) {
  const clusters = clusterStops(tour.stops).filter((c) => geoDistance(c.anchor, TBILISI) > NEAR_TBILISI);
  const points = routePoints(tour, clusters);
  const curve = new THREE.CatmullRomCurve3(points, tour.id === 'old-tbilisi', 'centripetal');
  const length = curve.getLength();
  const material = routeMaterial(tour.color, length);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(120, points.length * 4), 0.075, 8, curve.closed), material);

  const markers = new THREE.Group();
  const markerMaterial = new THREE.MeshBasicMaterial({ color: tour.color, transparent: true, opacity: 0 });
  const stickMaterial = new THREE.LineBasicMaterial({ color: tour.color, transparent: true, opacity: 0 });
  const anchors = clusters.map((cluster) => {
    const { lon, lat } = cluster.anchor;
    const p = project(lon, lat);
    const top = surfaceY(lon, lat) + 1.6;
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), markerMaterial);
    sphere.position.set(p.x, top, p.z);
    const stick = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p.x, surfaceY(lon, lat), p.z), sphere.position]),
      stickMaterial,
    );
    markers.add(sphere, stick);
    return { cluster, position: sphere.position.clone() };
  });

  return { id: tour.id, tour, curve, tube, material, markers, markerMaterial, stickMaterial, anchors, targetOpacity: DIM_OPACITY };
}

function buildTbilisiBeacon() {
  const p = project(TBILISI.lon, TBILISI.lat);
  const y = surfaceY(TBILISI.lon, TBILISI.lat);
  const group = new THREE.Group();
  group.position.set(p.x, y, p.z);
  const glow = { color: 0xffd3a1, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 7, 12, 1, true), new THREE.MeshBasicMaterial({ ...glow, opacity: 0.45 }));
  beam.position.y = 3.5;
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff1de }));
  core.position.y = 0.3;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.48, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ ...glow, opacity: 0.8, side: THREE.DoubleSide }));
  ring.position.y = 0.08;
  group.add(beam, core, ring);
  return { group, ring, top: new THREE.Vector3(p.x, y + 1.2, p.z) };
}

function createLabel(container, className) {
  const el = document.createElement('div');
  el.className = `map-label ${className}`;
  el.setAttribute('aria-hidden', 'true');
  container.append(el);
  return el;
}

/**
 * @param {{ stage: HTMLElement, labels: HTMLElement, reducedMotion?: boolean }} options
 */
export function initMap({ stage, labels, reducedMotion = false }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.classList.add('map-canvas');
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const world = new THREE.Group();
  scene.add(world);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 400);

  scene.add(new THREE.HemisphereLight(0xffe0bd, 0x1a0f14, 1.3));
  const key = new THREE.DirectionalLight(0xffb877, 2.8);
  key.position.set(-24, 30, 14);
  const rim = new THREE.DirectionalLight(0x86a8ff, 0.9);
  rim.position.set(22, 12, -24);
  scene.add(key, rim);

  const pillars = buildPillars();
  world.add(pillars.mesh, ...buildBase());
  const beacon = buildTbilisiBeacon();
  world.add(beacon.group);
  const routes = TOURS.map(buildRoute);
  routes.forEach((r) => world.add(r.tube, r.markers));

  const bus = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  world.add(bus);

  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, {
    enableDamping: true,
    dampingFactor: 0.06,
    enablePan: false,
    enableZoom: false,
    minPolarAngle: 0.35,
    maxPolarAngle: 1.12,
    minAzimuthAngle: -0.9,
    maxAzimuthAngle: 0.9,
    rotateSpeed: 0.6,
  });
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  controls.enabled = !coarsePointer;
  camera.position.set(0, 36, 22);
  controls.target.set(0, 0, 0);

  const view = { target: new THREE.Vector3(), distance: 44 };
  const offset = new THREE.Vector3();
  const projected = new THREE.Vector3();

  const labelItems = [
    { el: createLabel(labels, 'map-label--city'), pos: beacon.top, text: () => pick(TBILISI.name), always: true },
    { el: createLabel(labels, 'map-label--muted'), pos: (() => { const p = project(40.75, 42.35); return new THREE.Vector3(p.x, 0, p.z); })(), text: () => t('map.sea'), always: true },
    { el: createLabel(labels, 'map-label--muted'), pos: (() => { const p = project(44.52, 42.7); return new THREE.Vector3(p.x, surfaceY(44.52, 42.7) + 0.6, p.z); })(), text: () => t('map.kazbek'), always: true, hideFor: 'kazbegi' },
    ...routes.flatMap((r) => r.anchors.map(({ cluster, position }, index) => {
      const el = createLabel(labels, `map-label--stop ${index % 2 ? 'map-label--left' : 'map-label--right'}`);
      el.style.setProperty('--tour', r.tour.color);
      const stop = cluster.anchor;
      return { el, pos: position, text: () => pick(stop.short) || pick(stop.name).split(',')[0], tourId: r.id };
    })),
  ];
  const refreshLabelText = () => labelItems.forEach((l) => { l.el.textContent = l.text(); });
  refreshLabelText();

  let activeId = null;
  let busProgress = 0;

  const fitDistance = (span) => {
    const aspect = camera.aspect || 1.4;
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const needed = span / (2 * Math.tan(verticalFov / 2) * Math.min(aspect, 1.7));
    return THREE.MathUtils.clamp(needed * 1.25, 14, 80);
  };

  const select = (id) => {
    const route = routes.find((r) => r.id === id);
    if (!route) return;
    activeId = id;
    busProgress = 0;
    routes.forEach((r) => {
      r.targetOpacity = r.id === id ? 1 : DIM_OPACITY;
      if (r.id === id) r.material.uniforms.uProgress.value = reducedMotion ? 1 : 0;
    });
    labelItems.forEach((l) => l.el.classList.toggle('is-on', (l.always && l.hideFor !== id) || l.tourId === id));

    const box = new THREE.Box3().setFromPoints([beacon.top, ...route.curve.getSpacedPoints(40)]);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    view.target.set(center.x, center.y * 0.6, center.z + 0.5);
    view.distance = fitDistance(Math.max(size.x, size.z * 1.6) + 9);
  };

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = stage;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (activeId) select(activeId);
  };
  new ResizeObserver(resize).observe(stage);
  resize();

  const updateLabels = () => {
    const { clientWidth: w, clientHeight: h } = stage;
    labelItems.forEach((l) => {
      if (!l.el.classList.contains('is-on')) return;
      projected.copy(l.pos).applyMatrix4(world.matrixWorld).project(camera);
      const x = (projected.x * 0.5 + 0.5) * w;
      const y = (-projected.y * 0.5 + 0.5) * h;
      l.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    });
  };

  const clock = new THREE.Clock();
  let riseStart = null;
  let risen = false;

  const frame = () => {
    const delta = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.elapsedTime;
    if (!risen) {
      riseStart ??= elapsed;
      risen = pillars.setRise(reducedMotion ? 99 : elapsed - riseStart);
    }

    const ease = 1 - Math.exp(-delta * CAMERA_EASE);
    offset.copy(camera.position).sub(controls.target);
    offset.setLength(offset.length() + (view.distance - offset.length()) * ease);
    controls.target.lerp(view.target, ease);
    camera.position.copy(controls.target).add(offset);
    controls.update();
    if (coarsePointer && !reducedMotion) world.rotation.y = Math.sin(elapsed * 0.2) * 0.08;

    const pulse = (elapsed * 0.8) % 1;
    beacon.ring.scale.setScalar(1 + pulse * 2.2);
    beacon.ring.material.opacity = 0.8 * (1 - pulse);

    routes.forEach((r) => {
      const u = r.material.uniforms;
      u.uTime.value = elapsed;
      u.uOpacity.value += (r.targetOpacity - u.uOpacity.value) * 0.08;
      if (r.id === activeId) u.uProgress.value = Math.min(1, u.uProgress.value + delta * 0.55);
      const markerOpacity = r.id === activeId ? Math.min(1, u.uProgress.value * 1.5) : 0;
      r.markerMaterial.opacity += (markerOpacity - r.markerMaterial.opacity) * 0.1;
      r.stickMaterial.opacity = r.markerMaterial.opacity * 0.6;
    });

    const active = routes.find((r) => r.id === activeId);
    bus.visible = Boolean(active) && active.material.uniforms.uProgress.value >= 1;
    if (bus.visible) {
      busProgress = (busProgress + delta * (active.curve.closed ? 0.12 : 0.08)) % 1;
      bus.position.copy(active.curve.getPointAt(busProgress));
      bus.material.color.set(active.tour.color).lerp(new THREE.Color(0xffffff), 0.55);
    }

    renderer.render(scene, camera);
    updateLabels();
  };

  let running = false;
  const setRunning = (shouldRun) => {
    if (shouldRun === running) return;
    running = shouldRun;
    renderer.setAnimationLoop(shouldRun ? frame : null);
  };
  new IntersectionObserver(([entry]) => setRunning(entry.isIntersecting)).observe(stage);

  controls.addEventListener('start', () => stage.classList.add('is-dragging'));
  controls.addEventListener('end', () => stage.classList.remove('is-dragging'));

  return { select, refreshLabelText };
}
