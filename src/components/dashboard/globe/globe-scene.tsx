'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import landTopology from 'world-atlas/land-110m.json';

export type GlobePoint = { id: string; name: string; lat: number; lng: number; cases: number };

export interface GlobeSceneProps {
  points: GlobePoint[];
  selectedId: string;
  compareId?: string;
  onSelect?: (id: string) => void;
  /** CSS colours resolved from the theme tokens. */
  colors: { land: string; pillar: string; selected: string; compare: string; atmosphere: string; ocean: string };
  reducedMotion: boolean;
}

const RADIUS = 1;

/** Latitude/longitude to a point on the sphere (y up, longitude 0 facing +z). */
function toVector(lat: number, lng: number, r = RADIUS) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 90) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

/**
 * Dots on land. Land comes from Natural Earth (public domain) via world-atlas,
 * rasterised once onto a small canvas and sampled on an even Fibonacci sphere.
 */
function landDotPositions(count = 14000) {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return new Float32Array();

  const topo = landTopology as unknown as Topology<{ land: GeometryCollection }>;
  const land = feature(topo, topo.objects.land);
  const projection = geoEquirectangular().fitSize([width, height], { type: 'Sphere' });
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  geoPath(projection, ctx)(land);
  ctx.fill();
  const pixels = ctx.getImageData(0, 0, width, height).data;

  const positions: number[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const lat = (Math.asin(y) * 180) / Math.PI;
    const lng = ((((i * golden * 180) / Math.PI) % 360) + 360) % 360 - 180;
    const [px, py] = projection([lng, lat]) ?? [0, 0];
    if (pixels[(Math.floor(py) * width + Math.floor(px)) * 4 + 3] > 128) {
      const v = toVector(lat, lng, RADIUS * 1.002);
      positions.push(v.x, v.y, v.z);
    }
  }
  return new Float32Array(positions);
}

/** Round sprite so land dots read as dots, not squares. */
function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.9)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const atmosphereFragment = /* glsl */ `
  uniform vec3 glowColor;
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
    gl_FragColor = vec4(glowColor, 1.0) * intensity;
  }
`;

type Pillar = {
  point: GlobePoint;
  group: THREE.Group;
  bar: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> | null;
  height: number;
  target: number;
};

/** Camera sits a little south of India so the pillars visibly rise off the surface. */
const START = toVector(9, 80, 3.3);

/** Everything three.js needs, kept outside React state so the scene is built once. */
type Scene = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  spin: THREE.Group;
  pillarGroup: THREE.Group;
  pillars: Map<string, Pillar>;
  ocean: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  dots: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  atmosphere: THREE.ShaderMaterial;
  reducedMotion: boolean;
};

export default function GlobeScene({ points, selectedId, compareId, onSelect, colors, reducedMotion }: GlobeSceneProps) {
  const mount = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const onSelectRef = useRef(onSelect);
  // Read once when the scene is built; later changes go through the effect below.
  const initialReducedMotion = useRef(reducedMotion);
  const [hovered, setHovered] = useState<{ point: GlobePoint; x: number; y: number } | null>(null);
  onSelectRef.current = onSelect;

  // Build the scene once.
  useEffect(() => {
    const el = mount.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.touchAction = 'pan-y';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
    camera.position.copy(START);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.rotateSpeed = 0.45;
    controls.enableDamping = true;
    controls.minPolarAngle = 0.6;
    controls.maxPolarAngle = 2.3;

    const spin = new THREE.Group();
    scene.add(spin);

    const ocean = new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 64, 64), new THREE.MeshBasicMaterial());
    spin.add(ocean);

    const dotGeometry = new THREE.BufferGeometry();
    dotGeometry.setAttribute('position', new THREE.BufferAttribute(landDotPositions(), 3));
    const dots = new THREE.Points(
      dotGeometry,
      new THREE.PointsMaterial({ size: 0.05, map: dotTexture(), transparent: true, opacity: 0.55, depthWrite: false, sizeAttenuation: true }),
    );
    dots.renderOrder = 1;
    spin.add(dots);

    const atmosphere = new THREE.ShaderMaterial({
      vertexShader: atmosphereVertex,
      fragmentShader: atmosphereFragment,
      uniforms: { glowColor: { value: new THREE.Color() } },
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 64, 64), atmosphere);
    halo.scale.setScalar(1.13);
    scene.add(halo); // outside `spin` so the glow stays put while the globe sways

    const pillarGroup = new THREE.Group();
    spin.add(pillarGroup);

    const state: Scene = { renderer, scene, camera, controls, spin, pillarGroup, pillars: new Map(), ocean, dots, atmosphere, reducedMotion: initialReducedMotion.current };
    sceneRef.current = state;

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    // Hover and click on pillars.
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downAt = { x: 0, y: 0 };
    const pick = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(pillarGroup.children, true)[0];
      const id = hit?.object.userData.id as string | undefined;
      return { pillar: id ? state.pillars.get(id) : undefined, x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMove = (e: PointerEvent) => {
      const { pillar, x, y } = pick(e);
      setHovered(pillar ? { point: pillar.point, x, y } : null);
      renderer.domElement.style.cursor = pillar && onSelectRef.current ? 'pointer' : 'grab';
    };
    const onDown = (e: PointerEvent) => (downAt = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      // Treat it as a click only if the pointer barely moved (not a drag).
      if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) return;
      const { pillar } = pick(e);
      if (pillar) onSelectRef.current?.(pillar.point.id);
    };
    const onLeave = () => setHovered(null);
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);
    renderer.domElement.addEventListener('pointerleave', onLeave);

    const clock = new THREE.Clock();
    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      const delta = Math.min(clock.getDelta(), 0.1);
      if (!state.reducedMotion) {
        // A slow sway around India rather than a full spin, so the data stays in view.
        spin.rotation.y = Math.sin(clock.elapsedTime * 0.12) * 0.22;
      }
      state.pillars.forEach((p) => {
        p.height = state.reducedMotion ? p.target : THREE.MathUtils.damp(p.height, p.target, 6, delta);
        p.bar.scale.y = p.height;
        p.bar.position.y = p.height / 2;
      });
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('pointerleave', onLeave);
      controls.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((m) => m.dispose());
      });
      renderer.dispose();
      el.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.reducedMotion = reducedMotion;
  }, [reducedMotion]);

  // Theme colours for the globe surface.
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.ocean.material.color.set(colors.ocean);
    s.dots.material.color.set(colors.land);
    s.atmosphere.uniforms.glowColor.value.set(colors.atmosphere);
  }, [colors.ocean, colors.land, colors.atmosphere]);

  // Pillars: one per city, height follows cases, colour follows selection.
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    const maxCases = Math.max(1, ...points.map((p) => p.cases));
    const seen = new Set<string>();

    for (const point of points) {
      seen.add(point.id);
      const emphasis = point.id === selectedId ? 'selected' : point.id === compareId ? 'compare' : 'none';
      const color = emphasis === 'selected' ? colors.selected : emphasis === 'compare' ? colors.compare : colors.pillar;
      const width = emphasis === 'none' ? 0.0055 : 0.0105;
      const target = 0.02 + Math.sqrt(point.cases / maxCases) * 0.16;

      let pillar = s.pillars.get(point.id);
      if (!pillar) {
        const group = new THREE.Group();
        const position = toVector(point.lat, point.lng);
        group.position.copy(position);
        group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), position.clone().normalize());
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 10), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false }));
        bar.renderOrder = 2;
        bar.userData.id = point.id;
        group.add(bar);
        s.pillarGroup.add(group);
        pillar = { point, group, bar, ring: null, height: s.reducedMotion ? target : 0.001, target };
        s.pillars.set(point.id, pillar);
      }
      pillar.point = point;
      pillar.target = target;
      pillar.bar.scale.x = pillar.bar.scale.z = width;
      pillar.bar.material.color.set(color);
      pillar.bar.material.opacity = emphasis === 'none' ? 0.85 : 1;

      if (emphasis !== 'none' && !pillar.ring) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.022, 0.034, 32),
          new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.002;
        pillar.group.add(ring);
        pillar.ring = ring;
      }
      if (emphasis === 'none' && pillar.ring) {
        pillar.group.remove(pillar.ring);
        pillar.ring.geometry.dispose();
        pillar.ring.material.dispose();
        pillar.ring = null;
      }
      pillar.ring?.material.color.set(color);
    }

    s.pillars.forEach((p, id) => {
      if (seen.has(id)) return;
      s.pillarGroup.remove(p.group);
      p.bar.geometry.dispose();
      p.bar.material.dispose();
      s.pillars.delete(id);
    });
  }, [points, selectedId, compareId, colors.pillar, colors.selected, colors.compare]);

  return (
    <div ref={mount} className="relative h-full w-full">
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded-lg border border-border/15 bg-popover/90 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur"
          style={{ left: hovered.x, top: hovered.y }}
        >
          <p className="font-semibold">{hovered.point.name}</p>
          <p className="text-muted-foreground">{hovered.point.cases.toLocaleString()} cases</p>
        </div>
      )}
    </div>
  );
}
