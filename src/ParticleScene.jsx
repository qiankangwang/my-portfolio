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
    // Wider radius so the card sits inside the helix tube rather than
    // hiding the strands. 6 turns over the column height.
    {
      const strand = i % 2;
      const tt = (i / count) * Math.PI * 12;
      const radius = 75;
      const yPos = (t01 - 0.5) * 260;
      out[1][ix]     = Math.cos(tt + (strand ? Math.PI : 0)) * radius;
      out[1][ix + 1] = yPos;
      out[1][ix + 2] = Math.sin(tt + (strand ? Math.PI : 0)) * radius;
    }

    // ── 2  Research — feedforward neural network ──
    // Wider column spread + taller layers so the outer layers fall
    // outside the card's footprint at viewport centre.
    {
      const LAYERS = 6;
      const layer = i % LAYERS;
      const idxInLayer = Math.floor(i / LAYERS);
      const perLayer = Math.ceil(count / LAYERS);
      const ratio = (idxInLayer + 0.5) / perLayer;
      const curve = Math.sin((ratio - 0.5) * Math.PI) * 18;
      out[2][ix]     = (layer - (LAYERS - 1) / 2) * 50;
      out[2][ix + 1] = (ratio - 0.5) * 180 + curve;
      out[2][ix + 2] = (rand() - 0.5) * 22;
    }

    // ── 3  Publication — Fibonacci sphere (enlarged) ──
    // Radius 140 so the sphere is BIGGER than the centred card — the
    // card sits inside the sphere, particles wrap around the edges.
    {
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = ((i * Math.PI) * (3 - Math.sqrt(5))) % (Math.PI * 2);
      out[3][ix]     = Math.cos(theta) * r * 140;
      out[3][ix + 1] = y * 140;
      out[3][ix + 2] = Math.sin(theta) * r * 140;
    }

    // ── 4  Projects — 3D grid (with hollow centre) ──
    // 12 × 10 grid; particles in the centre rows/columns are pushed
    // OUTWARD radially so the middle of the grid (where the card sits)
    // is hollow and the grid frames the card.
    {
      const cols = 12, rows = 10;
      const ix2 = i % cols;
      const iy2 = Math.floor(i / cols) % rows;
      const iz2 = Math.floor(i / (cols * rows));
      let gx = (ix2 - (cols - 1) / 2) * 22;
      let gy = (iy2 - (rows - 1) / 2) * 22;
      // Radial repulsion from origin if too close (carves the hollow).
      const gr = Math.hypot(gx, gy);
      const minR = 65;
      if (gr < minR && gr > 0.001) {
        const s = minR / gr;
        gx *= s;
        gy *= s;
      }
      out[4][ix]     = gx;
      out[4][ix + 1] = gy;
      out[4][ix + 2] = (iz2 - 4) * 14 + (rand() - 0.5) * 4;
    }

    // ── 5  Skills — concentric rings (hollow centre) ──
    // Min radius bumped up so even the innermost ring is outside the
    // card. Rings now span 70..160 instead of 24..108.
    {
      const RINGS = 7;
      const ring = i % RINGS;
      const indexOnRing = Math.floor(i / RINGS);
      const onRingCount = Math.ceil(count / RINGS);
      const angle = (indexOnRing / onRingCount) * Math.PI * 2 + ring * 0.4;
      const radius = 70 + ring * 14;
      const yOff = (ring - (RINGS - 1) / 2) * 11;
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
    // Terminal aesthetic: single chromatic family (terminal green +
    // signal amber) with subtle hue variation per scene. Stays cohesive
    // like a research console, not a rainbow demo.
    //   (accentR, accentG, accentB, warmR, warmG, warmB)
    const SCENE_PALETTE = [
      // 0 Hero       — terminal green + amber signal
      [0.00, 1.00, 0.64,   1.00, 0.70, 0.28],
      // 1 About      — cooler green-cyan + amber
      [0.18, 0.95, 0.78,   1.00, 0.70, 0.28],
      // 2 Research   — pure terminal green + amber
      [0.00, 1.00, 0.64,   1.00, 0.78, 0.32],
      // 3 Publication — yellower phosphor (older CRT) + amber
      [0.55, 1.00, 0.45,   1.00, 0.62, 0.22],
      // 4 Projects   — light green + cyan amber
      [0.40, 1.00, 0.68,   0.40, 0.95, 0.95],
      // 5 Skills     — cyan-leaning phosphor + amber
      [0.18, 0.95, 0.88,   1.00, 0.70, 0.28],
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

    // ── Particle sprite — phosphor pixel: tight bright core + soft
    //     bloom halo. Reads like a CRT phosphor dot or a node on an
    //     oscilloscope. Additive blending so overlapping particles
    //     compound into brighter glow (terminal phosphor behaviour). ─
    const haloCanvas = document.createElement("canvas");
    haloCanvas.width = 64;
    haloCanvas.height = 64;
    const hctx = haloCanvas.getContext("2d");
    const grad = hctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0.00, "rgba(255,255,255,1.00)");
    grad.addColorStop(0.14, "rgba(255,255,255,0.95)");
    grad.addColorStop(0.40, "rgba(255,255,255,0.35)");
    grad.addColorStop(0.90, "rgba(255,255,255,0.04)");
    grad.addColorStop(1.00, "rgba(255,255,255,0)");
    hctx.fillStyle = grad;
    hctx.fillRect(0, 0, 64, 64);
    const haloTex = new THREE.CanvasTexture(haloCanvas);

    const material = new THREE.PointsMaterial({
      size: 4.2,
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

    // ── Sparse sequential connecting lines. Far fewer than before
    //     (~150 instead of ~400) so the field doesn't read as a
    //     chaotic mesh. Each line is a single (i, i+1) pair, which
    //     traces the formation's natural ordering — DNA strands, ring
    //     orbits, grid rows. Single saturated colour pulled from the
    //     active scene palette per frame. ──────────────────────────
    const LINE_STRIDE = 4;
    const linePairs = [];
    for (let i = 0; i + 1 < PARTICLE_COUNT; i += LINE_STRIDE) {
      linePairs.push([i, i + 1]);
    }
    const linePositions = new Float32Array(linePairs.length * 2 * 3);
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffa3,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // ── Per-scene camera vantage points ────────────────────────────
    // Each scene has its own (camera pos, lookAt) so the formation is
    // viewed from a deliberately different angle. `lookX` shifts the
    // camera target horizontally: negative values move what the camera
    // looks AT to the left, which pushes the formation visually to the
    // RIGHT of the viewport — leaving the left side empty for content.
    // Hero is the exception: lookX 0 so the field stays centred behind
    // the giant hero text.
    // Each camera frames its formation so the WHOLE shape is visible
    // and the centred text sits inside the formation's interior:
    //   - DNA helix → text inside the helix tube
    //   - Sphere    → text inside the sphere's projected disc
    //   - Rings     → text inside the rings' central hole
    //   - Grid      → text in front of the grid plane
    //   - Network   → text between the layer columns
    //   - Hero      → wide overview, text on top of full network
    // Transitions still add a z-pullback at u=0.5 so the camera flies
    // out of the current formation, travels open space, then frames
    // the next one — the "exit → travel → re-enter" beat.
    const SCENE_CAMS = [
      // 0 Hero — wide atmospheric arrival
      { x:  0, y:  20, z: 240, lookX:   0, lookY:  -5 },
      // 1 About — frame DNA helix (height 260, radius 75) with margin
      { x: 12, y:   0, z: 260, lookX:   0, lookY:   0 },
      // 2 Research — frame layered network
      { x:  0, y:  10, z: 230, lookX:   0, lookY:   0 },
      // 3 Publication — frame sphere (radius 140 → diameter 280)
      { x:-12, y:  18, z: 305, lookX:   0, lookY:  -5 },
      // 4 Projects — frame grid (264 wide × 220 tall), slight low angle
      { x:  0, y: -38, z: 250, lookX:   0, lookY:  22 },
      // 5 Skills — frame rings (max radius 160), slight high angle
      { x: 20, y:  30, z: 285, lookX:   0, lookY: -12 },
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
    const cam = {
      x: SCENE_CAMS[0].x,
      y: SCENE_CAMS[0].y,
      z: SCENE_CAMS[0].z,
      lookX: SCENE_CAMS[0].lookX,
      lookY: SCENE_CAMS[0].lookY,
    };

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
      // Dispersal: particles fly outward from the centre during the
      // middle of each scene transition, then settle back as the next
      // formation comes in. Magnitude peaks at u = 0.5 and is zero at
      // u = 0 and u = 1 so the rest position of each scene is exact.
      const dispersal = 1 + Math.sin(u * Math.PI) * 0.35;
      const scatterAmp = Math.sin(u * Math.PI) * 18;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3;
        const ax = A[idx],     ay = A[idx + 1],     az = A[idx + 2];
        const bx = B[idx],     by = B[idx + 1],     bz = B[idx + 2];
        const dx = Math.sin(t + i * 0.13) * driftAmp;
        const dy = Math.cos(t * 0.9 + i * 0.27) * driftAmp;
        const dz = Math.sin(t * 1.1 + i * 0.41) * driftAmp;
        // Per-particle deterministic scatter direction (3D).
        const sx = Math.sin(i * 12.9898 + 1.7) * scatterAmp;
        const sy = Math.cos(i * 7.234  + 4.2) * scatterAmp;
        const sz = Math.sin(i *  3.111 + 9.0) * scatterAmp;
        // Lerped position then radial dispersal (multiplies distance
        // from origin) and a per-particle scatter offset.
        const lx = (ax + (bx - ax) * eased) * dispersal;
        const ly = (ay + (by - ay) * eased) * dispersal;
        const lz = (az + (bz - az) * eased) * dispersal;
        posAttr[idx]     = lx + dx + sx;
        posAttr[idx + 1] = ly + dy + sy;
        posAttr[idx + 2] = lz + dz + sz;
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
        const warm = (i % 7 === 0);
        const ci = i * 3;
        if (warm) {
          cAttr[ci]     = wr;
          cAttr[ci + 1] = wg;
          cAttr[ci + 2] = wb;
        } else {
          cAttr[ci]     = ar;
          cAttr[ci + 1] = ag;
          cAttr[ci + 2] = ab;
        }
      }
      geometry.attributes.color.needsUpdate = true;

      // Update line endpoint positions. Lines are sequential (i, i+1)
      // pairs, so their endpoints sit on adjacent particles.
      const lpos = lineGeometry.attributes.position.array;
      for (let p = 0; p < linePairs.length; p++) {
        const [ia, ib] = linePairs[p];
        const a3 = ia * 3, b3 = ib * 3;
        lpos[p * 6 + 0] = posAttr[a3];
        lpos[p * 6 + 1] = posAttr[a3 + 1];
        lpos[p * 6 + 2] = posAttr[a3 + 2];
        lpos[p * 6 + 3] = posAttr[b3];
        lpos[p * 6 + 4] = posAttr[b3 + 1];
        lpos[p * 6 + 5] = posAttr[b3 + 2];
      }
      lineGeometry.attributes.position.needsUpdate = true;
      // Single uniform line colour pulled from the lerped accent —
      // gives the line layer a clean saturated reading against the
      // particles, instead of mush-mixed vertex colours.
      lineMaterial.color.setRGB(ar, ag, ab);

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
      // position so each formation is viewed from inside. Add a strong
      // z-pullback at the mid-transition so the camera "flies out" of
      // the current formation, travels through open space, then dives
      // into the next one.
      const camA = SCENE_CAMS[lo];
      const camB = SCENE_CAMS[hi];
      const tCam = eased;
      const camTargetX = camA.x + (camB.x - camA.x) * tCam;
      const camTargetY = camA.y + (camB.y - camA.y) * tCam;
      const pullback = Math.sin(u * Math.PI) * 130;
      const camTargetZ = camA.z + (camB.z - camA.z) * tCam + pullback;
      const camTargetLX = camA.lookX + (camB.lookX - camA.lookX) * tCam;
      const camTargetLY = camA.lookY + (camB.lookY - camA.lookY) * tCam;
      const camK = 1 - Math.exp(-dt / 0.45);
      cam.x += (camTargetX - cam.x) * camK;
      cam.y += (camTargetY - cam.y) * camK;
      cam.z += (camTargetZ - cam.z) * camK;
      cam.lookX += (camTargetLX - cam.lookX) * camK;
      cam.lookY += (camTargetLY - cam.lookY) * camK;

      // Tiny scene-driven oscillation for ambient motion on top of base.
      const oscY = Math.sin(smoothedScene * 1.3 + frame * 0.0009) * 4;
      const oscZ = Math.sin(smoothedScene * 0.9 + frame * 0.0011) * 6;
      camera.position.set(cam.x, cam.y + oscY, cam.z + oscZ);
      // lookAt is shifted in x for non-hero scenes, pushing the
      // formation's centre of mass to the right half of the viewport
      // and leaving the left half for the text content.
      camera.lookAt(cam.lookX, cam.lookY, 0);

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
