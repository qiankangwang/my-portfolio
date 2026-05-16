import { useEffect, useRef } from "react";
import * as THREE from "three";

/* Morphing particle field — one continuous Three.js point cloud that
   flows between six formations as the user scrolls. The SAME particles
   persist across every scene; they just rearrange:

     0  Hero        scattered cloud         (overview / arrival)
     1  About       DNA double helix        (the user's biology focus)
     2  Research    layered neural network  (the AI focus)
     3  Publication sphere                  (one structured object)
     4  Projects    grid                    (built things, organised)
     5  Skills      concentric rings        (orbital toolset)

   Continuity comes from the lerp: at scene index 1.5 (mid-transition
   between About and Research), every particle sits exactly halfway
   between its DNA target and its network target. The whole field
   flows together, no cross-fades, no swaps.

   props:
     sceneRef  React ref whose .current is a float in [0, 5] tracking
               the current scroll scene. Read every animation frame.

   Performance: 1200 particles × 3 floats per frame on the CPU. The
   GPU draws them as additive-blended sprites with bloom-like glow
   from overlap. Bundle: three.js only (no Vanta). */

const PARTICLE_COUNT = 1200;
const SCENE_COUNT = 6;

// Build every particle's target position for every scene. Returns an
// array of 6 Float32Arrays (one per scene), each of length COUNT*3.
function buildFormations(count) {
  const out = Array.from({ length: SCENE_COUNT }, () => new Float32Array(count * 3));

  // Deterministic pseudo-random so the same particle has consistent
  // identity / jitter across formations.
  const rand = mulberry32(0x1A2B3C4D);

  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    const t01 = i / (count - 1);          // 0..1 sweep along particle index
    const golden = (i * 137.508) % 360;   // golden-angle phyllotaxis hint

    // ── 0  Hero — scattered cloud (3D blob, slight oblate squash) ──
    // Random Gaussian-ish offsets so it reads as an atmospheric drift
    // around the centre rather than a perfect sphere.
    {
      const r = 80 + rand() * 90;
      const phi = rand() * Math.PI * 2;
      const theta = Math.acos(2 * rand() - 1);
      out[0][ix]     = Math.sin(theta) * Math.cos(phi) * r;
      out[0][ix + 1] = Math.cos(theta) * r * 0.7;
      out[0][ix + 2] = Math.sin(theta) * Math.sin(phi) * r * 0.85;
    }

    // ── 1  About — DNA double helix ──
    // Two intertwined strands. Particles alternate between strand A
    // and strand B by parity. 6 turns over the column height.
    {
      const strand = i % 2;
      const tt = (i / count) * Math.PI * 12;
      const radius = 32;
      const yPos = (t01 - 0.5) * 220;
      out[1][ix]     = Math.cos(tt + (strand ? Math.PI : 0)) * radius;
      out[1][ix + 1] = yPos;
      out[1][ix + 2] = Math.sin(tt + (strand ? Math.PI : 0)) * radius;
    }

    // ── 2  Research — feedforward neural network ──
    // 6 vertical layers, each particle assigned to one layer's column.
    // Within a layer, particles are spread vertically along a slight
    // S-curve to echo the procedural network we had earlier.
    {
      const LAYERS = 6;
      const layer = i % LAYERS;
      const idxInLayer = Math.floor(i / LAYERS);
      const perLayer = Math.ceil(count / LAYERS);
      const ratio = (idxInLayer + 0.5) / perLayer;
      const curve = Math.sin((ratio - 0.5) * Math.PI) * 14;
      out[2][ix]     = (layer - (LAYERS - 1) / 2) * 28;
      out[2][ix + 1] = (ratio - 0.5) * 140 + curve;
      out[2][ix + 2] = (rand() - 0.5) * 22;
    }

    // ── 3  Publication — Fibonacci sphere ──
    // Particles evenly distributed on a sphere surface for the
    // "structured object" look (a paper as a self-contained whole).
    {
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = ((i * Math.PI) * (3 - Math.sqrt(5))) % (Math.PI * 2);
      out[3][ix]     = Math.cos(theta) * r * 95;
      out[3][ix + 1] = y * 95;
      out[3][ix + 2] = Math.sin(theta) * r * 95;
    }

    // ── 4  Projects — 3D grid ──
    // A 12 × 10 grid in the xy plane (depth at small z offset). Reads
    // as a contribution-graph / build-grid surface.
    {
      const cols = 12, rows = 10;
      const ix2 = i % cols;
      const iy2 = Math.floor(i / cols) % rows;
      const iz2 = Math.floor(i / (cols * rows));
      out[4][ix]     = (ix2 - (cols - 1) / 2) * 18;
      out[4][ix + 1] = (iy2 - (rows - 1) / 2) * 18;
      out[4][ix + 2] = (iz2 - 4) * 14 + (rand() - 0.5) * 4;
    }

    // ── 5  Skills — concentric rings ──
    // 7 rings of varying radius and y-offset, each holding count/7
    // particles. Reads as an orbital system / planetarium of tools.
    {
      const RINGS = 7;
      const ring = i % RINGS;
      const indexOnRing = Math.floor(i / RINGS);
      const onRingCount = Math.ceil(count / RINGS);
      const angle = (indexOnRing / onRingCount) * Math.PI * 2 + ring * 0.4;
      const radius = 24 + ring * 14;
      const yOff = (ring - (RINGS - 1) / 2) * 9;
      out[5][ix]     = Math.cos(angle) * radius;
      out[5][ix + 1] = yOff;
      out[5][ix + 2] = Math.sin(angle) * radius;
    }

    // golden-angle is unused but referenced for stable particle identity
    // (clarity for future formations that want it)
    void golden;
    void t01;
  }
  return out;
}

// Small deterministic PRNG so formation jitter is repeatable across
// reloads.
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export default function ParticleScene({ sceneRef }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Scene setup ────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );
    camera.position.set(0, 0, 180);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // ── Formations ─────────────────────────────────────────────────
    const formations = buildFormations(PARTICLE_COUNT);

    // ── Per-scene colour palettes ──────────────────────────────────
    // Each scene has its own (accentR, accentG, accentB, warmR, warmG,
    // warmB) pair. Each frame the active colour is lerped between
    // adjacent scenes' palettes so the chromatic identity flows in
    // sync with the morph (Hero cool → About pink → … → Skills violet).
    const SCENE_PALETTE = [
      // 0 Hero — cool blue cloud + gold sparks (theme anchor)
      [0.28, 0.62, 0.96,  0.98, 0.68, 0.28],
      // 1 About — biology pink + cream (cellular warmth)
      [0.88, 0.50, 0.78,  0.98, 0.78, 0.55],
      // 2 Research — cool blue + cyan (analytical)
      [0.32, 0.66, 0.98,  0.55, 0.92, 0.96],
      // 3 Publication — academic gold + ember (paper / citation)
      [0.96, 0.78, 0.30,  0.96, 0.42, 0.30],
      // 4 Projects — engineer teal + lime (build / make)
      [0.30, 0.86, 0.72,  0.86, 0.92, 0.35],
      // 5 Skills — violet + magenta (orbital / mixed toolset)
      [0.72, 0.45, 0.98,  0.98, 0.45, 0.78],
    ];

    // ── Geometry ───────────────────────────────────────────────────
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    positions.set(formations[0]);
    // Colours initialise to the hero palette; the animation loop
    // refreshes them every frame based on the smoothed scene index.
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    {
      const [ar, ag, ab, wr, wg, wb] = SCENE_PALETTE[0];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const t = i / PARTICLE_COUNT;
        const warm = (i % 9 === 0);
        if (warm) {
          colors[i * 3]     = wr;
          colors[i * 3 + 1] = wg;
          colors[i * 3 + 2] = wb;
        } else {
          colors[i * 3]     = ar * (0.85 + 0.30 * t);
          colors[i * 3 + 1] = ag * (0.92 + 0.16 * (1 - t));
          colors[i * 3 + 2] = ab;
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // ── Halo sprite texture — bright core + soft falloff. Stronger
    //     centre so particles read as solid dots, halo for glow. ───
    const haloCanvas = document.createElement("canvas");
    haloCanvas.width = 128;
    haloCanvas.height = 128;
    const hctx = haloCanvas.getContext("2d");
    const grad = hctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0.00, "rgba(255,255,255,1)");
    grad.addColorStop(0.18, "rgba(255,255,255,0.95)");
    grad.addColorStop(0.45, "rgba(255,255,255,0.45)");
    grad.addColorStop(1.00, "rgba(255,255,255,0)");
    hctx.fillStyle = grad;
    hctx.fillRect(0, 0, 128, 128);
    const haloTex = new THREE.CanvasTexture(haloCanvas);

    const material = new THREE.PointsMaterial({
      size: 7.5,
      map: haloTex,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // ── Connecting lines between particles within a short radius.
    //     Adds "network" mass — the field reads as a connected graph,
    //     not just isolated points. Pre-build pairs once (by particle
    //     index, not world position) and update per frame. ─────────
    const MAX_PAIRS = 900; // limit so the line buffer stays small
    const linePairs = [];
    {
      const stride = Math.max(1, Math.floor(PARTICLE_COUNT / 220));
      for (let i = 0; i < PARTICLE_COUNT && linePairs.length < MAX_PAIRS; i += stride) {
        // Connect each picked particle to a few near-neighbours by index
        for (let k = 1; k <= 3; k++) {
          const j = (i + k * 17) % PARTICLE_COUNT;
          linePairs.push([i, j]);
        }
      }
    }
    const linePositions = new Float32Array(linePairs.length * 2 * 3);
    const lineColors = new Float32Array(linePairs.length * 2 * 3);
    for (let p = 0; p < linePairs.length; p++) {
      const c = (p % 6 === 0) ? [0.96, 0.66, 0.27] : [0.36, 0.62, 0.95];
      lineColors[p * 6 + 0] = c[0];
      lineColors[p * 6 + 1] = c[1];
      lineColors[p * 6 + 2] = c[2];
      lineColors[p * 6 + 3] = c[0];
      lineColors[p * 6 + 4] = c[1];
      lineColors[p * 6 + 5] = c[2];
    }
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));
    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // ── Per-scene camera vantage points ────────────────────────────
    // Each scene has its own base camera offset so the formation is
    // viewed from a deliberately different angle, not just zoom drift.
    // (x, y, z, lookY) — camera position + where it's pointed vertically.
    const SCENE_CAMS = [
      // 0 Hero — wider, slight tilt up (atmospheric)
      { x:  0, y:  20, z: 195, lookY: -5 },
      // 1 About — angled in from upper-right onto the helix
      { x: 35, y:  40, z: 175, lookY:  0 },
      // 2 Research — straight-on like reading a chart
      { x:  0, y:  10, z: 150, lookY:  0 },
      // 3 Publication — looking down-into the sphere
      { x:-30, y:  50, z: 170, lookY:-10 },
      // 4 Projects — low angle, looking up at the grid
      { x:  0, y: -45, z: 165, lookY: 20 },
      // 5 Skills — high orbit, looking down at the rings
      { x: 25, y:  60, z: 180, lookY:-15 },
    ];

    // ── Mouse parallax ─────────────────────────────────────────────
    // Cursor position drives a subtle rotation of the whole scene —
    // moves up to ~5° away from the cursor on each axis. Low-pass on
    // arrival so it doesn't twitch on every move event.
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMouseMove = (e) => {
      mouse.tx = (e.clientX / window.innerWidth)  * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    if (!reducedMotion) {
      window.addEventListener("mousemove", onMouseMove, { passive: true });
    }

    // ── Animation loop ─────────────────────────────────────────────
    let raf = 0;
    let frame = 0;
    let running = true;

    // Smoothed scene index (low-pass on the raw sceneRef so the morph
    // doesn't twitch with wheel jitter).
    let smoothedScene = sceneRef?.current ?? 0;
    let lastTime = performance.now();

    // Camera state — interpolated between SCENE_CAMS entries per frame.
    const cam = { x: SCENE_CAMS[0].x, y: SCENE_CAMS[0].y, z: SCENE_CAMS[0].z, lookY: SCENE_CAMS[0].lookY };

    const tmpEuler = new THREE.Euler();
    const tmpQuat = new THREE.Quaternion();

    const animate = () => {
      if (!running) return;
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      frame++;

      const target = sceneRef?.current ?? 0;
      const k = 1 - Math.exp(-dt / 0.25);
      smoothedScene += (target - smoothedScene) * k;

      const segCount = formations.length - 1;
      const clamped = Math.max(0, Math.min(segCount, smoothedScene));
      const lo = Math.floor(clamped);
      const hi = Math.min(lo + 1, segCount);
      const u = clamped - lo;
      // Smoothstep so the morph eases at the ends of each segment.
      const eased = u * u * (3 - 2 * u);

      const A = formations[lo];
      const B = formations[hi];
      const posAttr = geometry.attributes.position.array;
      // Per-particle tiny live drift so the field always breathes.
      const driftAmp = reducedMotion ? 0 : 0.7;
      const t = frame * 0.02;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3;
        const ax = A[idx],     ay = A[idx + 1],     az = A[idx + 2];
        const bx = B[idx],     by = B[idx + 1],     bz = B[idx + 2];
        const dx = Math.sin(t + i * 0.13) * driftAmp;
        const dy = Math.cos(t * 0.9 + i * 0.27) * driftAmp;
        const dz = Math.sin(t * 1.1 + i * 0.41) * driftAmp;
        posAttr[idx]     = ax + (bx - ax) * eased + dx;
        posAttr[idx + 1] = ay + (by - ay) * eased + dy;
        posAttr[idx + 2] = az + (bz - az) * eased + dz;
      }
      geometry.attributes.position.needsUpdate = true;

      // Per-frame palette lerp — same eased fraction as the morph, so
      // colour changes are perfectly synchronised with shape changes.
      const palA = SCENE_PALETTE[lo];
      const palB = SCENE_PALETTE[hi];
      const ar = palA[0] + (palB[0] - palA[0]) * eased;
      const ag = palA[1] + (palB[1] - palA[1]) * eased;
      const ab = palA[2] + (palB[2] - palA[2]) * eased;
      const wr = palA[3] + (palB[3] - palA[3]) * eased;
      const wg = palA[4] + (palB[4] - palA[4]) * eased;
      const wb = palA[5] + (palB[5] - palA[5]) * eased;
      const cAttr = geometry.attributes.color.array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ti = i / PARTICLE_COUNT;
        const warm = (i % 9 === 0);
        const ci = i * 3;
        if (warm) {
          cAttr[ci]     = wr;
          cAttr[ci + 1] = wg;
          cAttr[ci + 2] = wb;
        } else {
          cAttr[ci]     = ar * (0.85 + 0.30 * ti);
          cAttr[ci + 1] = ag * (0.92 + 0.16 * (1 - ti));
          cAttr[ci + 2] = ab;
        }
      }
      geometry.attributes.color.needsUpdate = true;

      // Update line endpoint positions + colours. Each line's colour
      // is sampled from one of its endpoint particles so the connecting
      // lines pick up the current scene's chroma.
      const lpos = lineGeometry.attributes.position.array;
      const lcol = lineGeometry.attributes.color.array;
      for (let p = 0; p < linePairs.length; p++) {
        const [ia, ib] = linePairs[p];
        const a3 = ia * 3, b3 = ib * 3;
        lpos[p * 6 + 0] = posAttr[a3];
        lpos[p * 6 + 1] = posAttr[a3 + 1];
        lpos[p * 6 + 2] = posAttr[a3 + 2];
        lpos[p * 6 + 3] = posAttr[b3];
        lpos[p * 6 + 4] = posAttr[b3 + 1];
        lpos[p * 6 + 5] = posAttr[b3 + 2];
        // Line vertex colours: pick from endpoint particles (already
        // recoloured above), so lines reflect the active palette.
        lcol[p * 6 + 0] = cAttr[a3];
        lcol[p * 6 + 1] = cAttr[a3 + 1];
        lcol[p * 6 + 2] = cAttr[a3 + 2];
        lcol[p * 6 + 3] = cAttr[b3];
        lcol[p * 6 + 4] = cAttr[b3 + 1];
        lcol[p * 6 + 5] = cAttr[b3 + 2];
      }
      lineGeometry.attributes.position.needsUpdate = true;
      lineGeometry.attributes.color.needsUpdate = true;

      // Low-pass smoothing on mouse parallax — keeps the cursor follow
      // gentle rather than twitchy.
      mouse.x += (mouse.tx - mouse.x) * (1 - Math.exp(-dt / 0.18));
      mouse.y += (mouse.ty - mouse.y) * (1 - Math.exp(-dt / 0.18));

      // Constant gentle rotation + cursor-driven rotation. The cursor
      // adds up to ~9° of rotation away from where the mouse points,
      // for a "the field is paying attention to you" feeling.
      const spinY = frame * (reducedMotion ? 0.0006 : 0.0016) - mouse.x * 0.16;
      const tiltX = Math.sin(frame * 0.0011) * 0.16 + mouse.y * 0.10;
      tmpEuler.set(tiltX, spinY, 0);
      tmpQuat.setFromEuler(tmpEuler);
      points.quaternion.copy(tmpQuat);
      lines.quaternion.copy(tmpQuat);

      // Per-scene camera vantage — lerp toward the scene's base camera
      // position so each formation is viewed from a deliberate angle.
      // Smoothstep on the segment fraction so it eases into place.
      const camA = SCENE_CAMS[lo];
      const camB = SCENE_CAMS[hi];
      const tCam = eased;
      const camTargetX = camA.x + (camB.x - camA.x) * tCam;
      const camTargetY = camA.y + (camB.y - camA.y) * tCam;
      const camTargetZ = camA.z + (camB.z - camA.z) * tCam;
      const camTargetLY = camA.lookY + (camB.lookY - camA.lookY) * tCam;
      const camK = 1 - Math.exp(-dt / 0.45);
      cam.x += (camTargetX - cam.x) * camK;
      cam.y += (camTargetY - cam.y) * camK;
      cam.z += (camTargetZ - cam.z) * camK;
      cam.lookY += (camTargetLY - cam.lookY) * camK;

      // Tiny scene-driven oscillation for ambient motion on top of base.
      const oscY = Math.sin(smoothedScene * 1.3 + frame * 0.0009) * 4;
      const oscZ = Math.sin(smoothedScene * 0.9 + frame * 0.0011) * 6;
      camera.position.set(cam.x, cam.y + oscY, cam.z + oscZ);
      camera.lookAt(0, cam.lookY, 0);

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize handling ────────────────────────────────────────────
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // Pause when tab is hidden (saves battery, prevents jank on resume).
    const onVisibility = () => {
      running = !document.hidden;
      if (running) {
        lastTime = performance.now();
        raf = requestAnimationFrame(animate);
      } else {
        cancelAnimationFrame(raf);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // (Per-scene palettes are applied per frame above, so no separate
    // theme observer is needed — the colour buffer is rewritten every
    // frame regardless of theme.)

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("visibilitychange", onVisibility);
      try {
        container.removeChild(renderer.domElement);
      } catch {
        /* node already gone */
      }
      geometry.dispose();
      material.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      haloTex.dispose();
      renderer.dispose();
    };
  }, [sceneRef]);

  return <div ref={containerRef} className="particle-scene" aria-hidden="true" />;
}
