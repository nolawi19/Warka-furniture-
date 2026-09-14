import * as THREE from 'three';

import { LOGO_PARTS, TREE_PARTS, type TracedShape } from './logo-geometry';

/**
 * The Warka sign as a physical object.
 *
 * Two rules shape everything here:
 *
 *  1. The silhouette is the brand and is never touched. Depth, bevel,
 *     material, light and shadow are the only things tuned.
 *  2. The sign does not spin. A brand mark that rotates forever reads as a
 *     3D demo. This one is assembled once, then moves only because the
 *     reader scrolled — and even then only within a narrow, deliberate arc.
 */

export type Tier = 'low' | 'mid' | 'high';

export type SceneOptions = {
  canvas: HTMLCanvasElement;
  tier: Tier;
  reducedMotion: boolean;
  theme: 'light' | 'dark';
};

export type SignController = {
  /** 0 at the top of the hero, 1 when the hero has fully scrolled away. */
  setScrollProgress(p: number): void;
  setTheme(theme: 'light' | 'dark'): void;
  setVisible(visible: boolean): void;
  replay(): void;
  nudge(dx: number, dy: number): void;
  resize(): void;
  dispose(): void;
  /** Frames drawn since the last read, for the performance probe. */
  readFrameCount(): number;
};

const TIER_SETTINGS: Record<Tier, {
  dprCap: number;
  antialias: boolean;
  shadows: boolean;
  shadowRes: number;
  bevelSegments: number;
  envRes: number;
}> = {
  low:  { dprCap: 1,   antialias: false, shadows: false, shadowRes: 0,    bevelSegments: 1, envRes: 128 },
  mid:  { dprCap: 1.5, antialias: true,  shadows: true,  shadowRes: 512,  bevelSegments: 2, envRes: 256 },
  high: { dprCap: 2,   antialias: true,  shadows: true,  shadowRes: 1024, bevelSegments: 3, envRes: 512 },
};

// Assembly timing, in seconds.
const LETTER_STAGGER = 0.075;
const LETTER_DUR = 0.44;
const TREE_GAP = 0.2;
const TREE_STAGGER = 0.17;
const TREE_DUR = 0.52;

type Piece = {
  node: THREE.Mesh;
  material: THREE.MeshPhysicalMaterial;
  home: THREE.Vector3;
  at: number;
  dur: number;
  rise: number;
  push: number;
  tilt: number;
};

export function createSignScene(opts: SceneOptions): SignController {
  const cfg = TIER_SETTINGS[opts.tier];
  const { canvas } = opts;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: cfg.antialias,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cfg.dprCap));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;

  if (cfg.shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    // The sign only moves while it is being built; after that the shadow map
    // is identical frame to frame and regenerating it is pure waste.
    renderer.shadowMap.autoUpdate = false;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(17, 4 / 3, 0.05, 60);

  // ---------------------------------------------------------------- lighting
  // A softbox above and in front, a cool bounce from behind-left, and a warm
  // rim. This is a product-photography rig, not a game light.
  const key = new THREE.DirectionalLight(0xffffff, 1.42);
  key.position.set(1.05, 1.95, 4.3);
  scene.add(key, key.target);

  const fill = new THREE.DirectionalLight(0xdfe6f0, 0.5);
  fill.position.set(-2.6, 1.2, -2.0);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xfff0dc, 0.68);
  rim.position.set(-1.4, 2.2, -3.2);
  scene.add(rim);

  const ambient = new THREE.AmbientLight(0xffffff, 0.16);
  scene.add(ambient);

  // ---------------------------------------------------------------- material
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envTex = new THREE.Texture(studioEnvCanvas(cfg.envRes));
  envTex.colorSpace = THREE.SRGBColorSpace;
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.needsUpdate = true;
  const envRT = pmrem.fromEquirectangular(envTex);
  scene.environment = envRT.texture;
  envTex.dispose();
  pmrem.dispose();

  const grain = woodTexture(1024);
  const grainNormal = normalFrom(grain, 0.85);
  const grainRough = roughnessFrom(grain, 0.34, 0.72);

  const wood = new THREE.MeshPhysicalMaterial({
    map: grain,
    normalMap: grainNormal,
    roughnessMap: grainRough,
    // roughnessMap multiplies this, so it must stay at 1 and let the map
    // carry the whole range.
    roughness: 1,
    metalness: 0,
    clearcoat: 0.38,
    clearcoatRoughness: 0.22,
    envMapIntensity: 1.05,
    transparent: true,
  });
  wood.normalScale = new THREE.Vector2(0.42, 0.42);

  // ---------------------------------------------------------------- geometry
  const signGroup = new THREE.Group();
  scene.add(signGroup);

  const pieces: Piece[] = [];
  let cursor = 0;

  for (const part of LOGO_PARTS) {
    const geo = extrude(part.s, 0.07, cfg.bevelSegments, 0.13, 0.1);
    const mesh = meshFrom(geo, wood, cfg.shadows);
    signGroup.add(mesh.node);
    pieces.push({
      ...mesh,
      at: cursor,
      dur: LETTER_DUR,
      rise: 0.13,
      push: 0.24,
      tilt: 0.5,
    });
    cursor += LETTER_STAGGER;
  }

  cursor += TREE_GAP;

  const treeBox = { x: -0.368, y: -0.024, z: 0.008, w: 0.316 };
  TREE_PARTS.p.forEach((part, i) => {
    const geo = extrude(part.s, 0.052, cfg.bevelSegments, 0.17, 0.13, treeBox);
    const mesh = meshFrom(geo, wood, cfg.shadows);
    signGroup.add(mesh.node);
    pieces.push({
      ...mesh,
      at: cursor,
      dur: TREE_DUR,
      // The stem grows up out of nothing; the fans open outward from it.
      rise: i === 0 ? -0.05 : 0.045,
      push: i === 0 ? 0.04 : 0.09,
      tilt: i === 0 ? 0 : 0.4,
    });
    cursor += TREE_STAGGER;
  });

  const assemblyEnd = cursor + TREE_DUR;

  const bounds = new THREE.Box3().setFromObject(signGroup);
  const size = bounds.getSize(new THREE.Vector3());
  const centre = bounds.getCenter(new THREE.Vector3());

  // Centre the group on its own origin so scaling and rotation pivot on the
  // middle of the sign rather than wherever the traced coordinates happened
  // to put zero.
  signGroup.children.forEach((child) => child.position.sub(centre));
  pieces.forEach((p) => p.home.sub(centre));

  // ---------------------------------------------------------------- shadow wall
  let wall: THREE.Mesh | null = null;
  if (cfg.shadows) {
    wall = new THREE.Mesh(
      new THREE.PlaneGeometry(size.x + 0.42, size.y + 0.42),
      new THREE.ShadowMaterial({ opacity: 0.22, transparent: true }),
    );
    wall.position.set(0, 0, bounds.min.z - centre.z - 0.022);
    wall.receiveShadow = true;
    scene.add(wall);

    key.position.set(1.05, 1.95, 4.3);
    key.castShadow = true;
    key.shadow.mapSize.set(cfg.shadowRes, cfg.shadowRes);
    key.shadow.radius = 4;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.01;
    const span = Math.max(size.x, size.y) * 0.62 + 0.14;
    const dist = key.position.length();
    const sc = key.shadow.camera;
    sc.left = -span;
    sc.right = span;
    sc.top = span;
    sc.bottom = -span;
    sc.near = Math.max(0.1, dist - 1.4);
    sc.far = dist + 1.4;
    sc.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- state
  let assemblyT = opts.reducedMotion ? assemblyEnd + 1 : 0;
  let assembling = !opts.reducedMotion;
  let scrollP = 0;
  let renderedScrollP = 0;
  let breath = 0;
  let nudgeX = 0;
  let nudgeY = 0;
  let visible = true;
  let dirty = true;
  let frames = 0;
  let disposed = false;
  let last = performance.now();
  let raf = 0;

  applyAssembly();

  function applyAssembly() {
    let done = true;
    for (const p of pieces) {
      const t = (assemblyT - p.at) / p.dur;
      if (t < 1) done = false;
      const e = easeOutBack(t);
      const inv = 1 - clamp01(e);
      const scale = 0.62 + 0.38 * e;
      p.node.scale.setScalar(scale);
      p.node.position.set(p.home.x, p.home.y + inv * p.rise, p.home.z + inv * p.push);
      p.node.rotation.x = -inv * p.tilt;
      const o = clamp01(t * 2.4);
      p.material.opacity = o;
      p.node.visible = o > 0.004;
    }
    return done;
  }

  /**
   * The scroll choreography.
   *
   * Progress 0 → 1 as the hero leaves the viewport. The sign turns through a
   * small, fixed arc, drifts up and left toward where the header mark sits,
   * and shrinks — so by the time the header is all you can see, the sign has
   * visibly become that mark rather than just disappearing.
   *
   * Nothing here touches scroll itself. The page scrolls at its own speed.
   */
  function applyScroll(p: number) {
    const eased = easeInOutCubic(clamp01(p));

    signGroup.rotation.y = 0.2 + eased * 0.34 + nudgeX;
    signGroup.rotation.x = 0.04 + eased * 0.1 + nudgeY;
    signGroup.rotation.z = eased * -0.03;

    const shrink = 1 - eased * 0.34;
    signGroup.scale.setScalar(shrink);
    signGroup.position.set(-eased * 0.22 * size.x, eased * 0.16 * size.y, eased * 0.5);

    // The wall follows the sign so the shadow stays attached to it.
    if (wall) {
      wall.position.x = signGroup.position.x;
      wall.position.y = signGroup.position.y;
      wall.scale.setScalar(shrink);
    }

    // Light warms and drops slightly as it settles: the difference between a
    // piece on a workshop wall at noon and at the end of the day.
    key.intensity = 1.42 - eased * 0.22;
    rim.intensity = 0.68 + eased * 0.2;
    renderer.toneMappingExposure = 1.06 - eased * 0.07;
  }

  function frameCamera() {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 1;
    const h = rect.height || 1;
    const aspect = w / h;

    if (camera.aspect !== aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }

    const vFov = (camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const az = signGroup.rotation.y;
    // Turning the sign sweeps a wider box than its resting width.
    const sweep = Math.abs(size.x * Math.cos(az)) + Math.abs(size.z * Math.sin(az));
    const dist =
      Math.max(sweep / 2 / Math.tan(hFov / 2), size.y / 2 / Math.tan(vFov / 2)) * 1.04 + size.z;

    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
  }

  function tick(now: number) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);

    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    if (!visible) return;

    if (assembling) {
      assemblyT += dt;
      if (applyAssembly()) assembling = false;
      if (cfg.shadows) renderer.shadowMap.needsUpdate = true;
      dirty = true;
    }

    if (Math.abs(scrollP - renderedScrollP) > 0.0004) {
      // Ease toward the target so a flicked scroll wheel does not snap the
      // sign; it arrives a beat later, like something with mass.
      renderedScrollP += (scrollP - renderedScrollP) * Math.min(1, dt * 7);
      dirty = true;
    }

    if (!opts.reducedMotion && !assembling) {
      // A breath, not a spin: a quarter of a degree, slow enough that you
      // notice it only if you look for it.
      breath += dt * 0.34;
      dirty = true;
    }

    if (!dirty) return;

    applyScroll(renderedScrollP);
    if (!opts.reducedMotion && !assembling) {
      signGroup.rotation.y += Math.sin(breath) * 0.012;
      signGroup.position.y += Math.sin(breath * 0.77) * 0.004;
    }

    const rect = canvas.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (w > 0 && h > 0) {
      const dpr = renderer.getPixelRatio();
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        renderer.setSize(w, h, false);
      }
      frameCamera();
      renderer.render(scene, camera);
      frames++;
    }
    dirty = false;
  }

  raf = requestAnimationFrame(tick);

  return {
    setScrollProgress(p) {
      const next = clamp01(p);
      if (Math.abs(next - scrollP) < 0.0005) return;
      scrollP = next;
      dirty = true;
    },
    setTheme(theme) {
      // Wood stays wood; only the exposure shifts so the sign sits correctly
      // against a near-black stage instead of glowing off it.
      renderer.toneMappingExposure = theme === 'dark' ? 1.0 : 1.06;
      ambient.intensity = theme === 'dark' ? 0.1 : 0.16;
      dirty = true;
    },
    setVisible(v) {
      visible = v;
      if (v) {
        last = performance.now();
        dirty = true;
      }
    },
    replay() {
      if (opts.reducedMotion) return;
      assemblyT = 0;
      assembling = true;
      breath = 0;
      dirty = true;
    },
    nudge(dx, dy) {
      nudgeX = clamp(nudgeX + dx, -0.7, 0.7);
      nudgeY = clamp(nudgeY + dy, -0.35, 0.35);
      dirty = true;
    },
    resize() {
      dirty = true;
    },
    readFrameCount() {
      const n = frames;
      frames = 0;
      return n;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      pieces.forEach((p) => p.node.geometry.dispose());
      wall?.geometry.dispose();
      (wall?.material as THREE.Material | undefined)?.dispose();
      wood.dispose();
      grain.dispose();
      grainNormal.dispose();
      grainRough.dispose();
      envRT.dispose();
      renderer.dispose();
    },
  };
}

// ------------------------------------------------------------------ geometry

function shapeOf(sh: TracedShape): THREE.Shape {
  const outer = sh.o.map(([x, y]) => new THREE.Vector2(x, y));
  // ExtrudeGeometry needs consistent winding or the caps come out inside out.
  if (THREE.ShapeUtils.isClockWise(outer)) outer.reverse();
  const shape = new THREE.Shape(outer);
  for (const hole of sh.h) {
    const pts = hole.map(([x, y]) => new THREE.Vector2(x, y));
    if (!THREE.ShapeUtils.isClockWise(pts)) pts.reverse();
    shape.holes.push(new THREE.Path(pts));
  }
  return shape;
}

function extrude(
  shapes: TracedShape[],
  depth: number,
  bevelSegments: number,
  thicknessRatio: number,
  sizeRatio: number,
  box?: { x: number; y: number; z: number; w: number },
): THREE.BufferGeometry {
  const geo = new THREE.ExtrudeGeometry(shapes.map(shapeOf), {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * thicknessRatio,
    bevelSize: depth * sizeRatio,
    bevelSegments,
    // The outlines are already polylines; curve subdivision would only add
    // vertices that change nothing.
    curveSegments: 1,
  });
  geo.computeVertexNormals();
  if (box) {
    geo.scale(box.w, box.w, 1);
    geo.translate(box.x, box.y, box.z);
  }
  scaleUV(geo, 1.15, 1.15);
  return geo;
}

function meshFrom(
  geo: THREE.BufferGeometry,
  material: THREE.MeshPhysicalMaterial,
  shadows: boolean,
): { node: THREE.Mesh; material: THREE.MeshPhysicalMaterial; home: THREE.Vector3 } {
  geo.computeBoundingBox();
  const c = geo.boundingBox!.getCenter(new THREE.Vector3());
  geo.translate(-c.x, -c.y, -c.z);

  const mat = material.clone();
  const node = new THREE.Mesh(geo, mat);
  node.position.copy(c);
  node.castShadow = shadows;
  node.receiveShadow = shadows;
  return { node, material: mat, home: c.clone() };
}

function scaleUV(geo: THREE.BufferGeometry, sx: number, sy: number) {
  const uv = geo.attributes.uv;
  if (!uv) return;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
  }
  uv.needsUpdate = true;
}

// ------------------------------------------------------------------ textures

/**
 * A studio environment as an equirectangular strip: a bright soft ceiling, two
 * softbox bands, and a darker floor. This is what the clearcoat reflects, and
 * it is why the bevels catch a highlight that moves as the sign turns.
 */
function studioEnvCanvas(res: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = res;
  c.height = res / 2;
  const g = c.getContext('2d')!;

  const sky = g.createLinearGradient(0, 0, 0, c.height);
  sky.addColorStop(0, '#ffffff');
  sky.addColorStop(0.42, '#e8e4dc');
  sky.addColorStop(0.55, '#b9b2a6');
  sky.addColorStop(1, '#4a453d');
  g.fillStyle = sky;
  g.fillRect(0, 0, c.width, c.height);

  // Two softboxes, offset so the reflection is not symmetrical.
  for (const [cx, w, alpha] of [
    [c.width * 0.26, c.width * 0.17, 0.95],
    [c.width * 0.68, c.width * 0.1, 0.6],
  ] as const) {
    const box = g.createRadialGradient(cx, c.height * 0.3, 0, cx, c.height * 0.3, w);
    box.addColorStop(0, `rgba(255,255,255,${alpha})`);
    box.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = box;
    g.fillRect(cx - w, 0, w * 2, c.height * 0.72);
  }

  // A warm bounce off the floor, the colour of a timber workshop.
  const bounce = g.createRadialGradient(
    c.width * 0.5, c.height, 0,
    c.width * 0.5, c.height, c.width * 0.42,
  );
  bounce.addColorStop(0, 'rgba(184,140,84,0.42)');
  bounce.addColorStop(1, 'rgba(184,140,84,0)');
  g.fillStyle = bounce;
  g.fillRect(0, c.height * 0.5, c.width, c.height * 0.5);

  return c;
}

/**
 * Wood grain.
 *
 * Frequencies are whole numbers of cycles across the canvas so the texture
 * tiles with no seam down the side of a letter. They are also deliberately
 * LOW: the sign is about a metre wide and the UV repeats a little over once
 * across it, so a handful of growth rings is what you would actually see.
 * High frequencies here read as bamboo, not seasoned hardwood.
 */
function woodTexture(res: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = res;
  const g = c.getContext('2d')!;

  const img = g.createImageData(res, res);
  const d = img.data;
  const dark = [0x4f, 0x30, 0x16];
  const mid = [0x8a, 0x5c, 0x27];
  const light = [0xc2, 0x94, 0x58];

  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const u = x / res;
      const v = y / res;

      // Two whole cycles of growth ring across the board, wandering slightly
      // along its length the way a sawn plank does.
      const wander = Math.sin(v * Math.PI * 2) * 0.09 + Math.sin(v * 2 * Math.PI * 2) * 0.04;
      const rings = Math.sin((u * 2 + wander) * Math.PI * 2);

      // A late-wood band: the darker, harder line at the edge of each ring.
      const late = Math.pow(Math.max(0, Math.sin((u * 2 + wander) * Math.PI * 2)), 6) * 0.55;

      // Fine pore texture, barely there — it exists to catch the normal map,
      // not to be seen as stripes.
      const pores =
        Math.sin((u * 13 + wander * 2) * Math.PI * 2) * 0.05 +
        Math.sin((u * 29 + v * 3) * Math.PI * 2) * 0.03;

      let n = clamp01(rings * 0.34 + 0.5 + pores);
      n = clamp01(n - late * 0.5);

      // Blend dark -> mid -> light so the board has a body colour rather than
      // reading as two alternating inks.
      const [a, b, t] = n < 0.5 ? [dark, mid, n * 2] : [mid, light, (n - 0.5) * 2];

      const i = (y * res + x) * 4;
      d[i] = a[0] + (b[0] - a[0]) * t;
      d[i + 1] = a[1] + (b[1] - a[1]) * t;
      d[i + 2] = a[2] + (b[2] - a[2]) * t;
      d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/** Sobel over the grain: cheap, and enough to make the surface catch light. */
function normalFrom(source: THREE.CanvasTexture, strength: number): THREE.CanvasTexture {
  const src = source.image as HTMLCanvasElement;
  const res = src.width;
  const sg = src.getContext('2d')!.getImageData(0, 0, res, res).data;

  const c = document.createElement('canvas');
  c.width = c.height = res;
  const g = c.getContext('2d')!;
  const out = g.createImageData(res, res);

  const lum = (x: number, y: number) => {
    const xi = (x + res) % res;
    const yi = (y + res) % res;
    const i = (yi * res + xi) * 4;
    return (sg[i] * 0.299 + sg[i + 1] * 0.587 + sg[i + 2] * 0.114) / 255;
  };

  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const dx =
        lum(x - 1, y - 1) + 2 * lum(x - 1, y) + lum(x - 1, y + 1) -
        (lum(x + 1, y - 1) + 2 * lum(x + 1, y) + lum(x + 1, y + 1));
      const dy =
        lum(x - 1, y - 1) + 2 * lum(x, y - 1) + lum(x + 1, y - 1) -
        (lum(x - 1, y + 1) + 2 * lum(x, y + 1) + lum(x + 1, y + 1));

      const nx = dx * strength;
      const ny = dy * strength;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * res + x) * 4;
      out.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      out.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      out.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }
  g.putImageData(out, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Darker grain reads as slightly rougher, the way open pores actually do. */
function roughnessFrom(source: THREE.CanvasTexture, min: number, max: number): THREE.CanvasTexture {
  const src = source.image as HTMLCanvasElement;
  const res = src.width;
  const sg = src.getContext('2d')!.getImageData(0, 0, res, res).data;

  const c = document.createElement('canvas');
  c.width = c.height = res;
  const g = c.getContext('2d')!;
  const out = g.createImageData(res, res);

  for (let i = 0; i < sg.length; i += 4) {
    const l = (sg[i] * 0.299 + sg[i + 1] * 0.587 + sg[i + 2] * 0.114) / 255;
    const r = (max - (max - min) * l) * 255;
    out.data[i] = out.data[i + 1] = out.data[i + 2] = r;
    out.data[i + 3] = 255;
  }
  g.putImageData(out, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ------------------------------------------------------------------ easing

function clamp01(n: number) {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}
function clamp(n: number, lo: number, hi: number) {
  return n < lo ? lo : n > hi ? hi : n;
}
/** The small overshoot is what makes a piece look like it lands. */
function easeOutBack(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const u = t - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
}
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
