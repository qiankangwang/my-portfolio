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

// Neural-network architecture for the Research scene.
// Five layers with distinct widths — looks like a real feedforward
// net silhouette (input wide, narrowing, output narrow). Each "node"
// is a cloud of ~25 particles around an anchor point so the field
// reads as fuzzy neuron dots, not single geometric points.
const NN_LAYERS = [14, 10, 8, 10, 6];
const NN_TOTAL = NN_LAYERS.reduce((a, b) => a + b, 0);
// LUT: global slot index → { layer, node, layerSize }.
// Built once at module load so the per-particle place lookup is O(1).
const NN_SLOT_LUT = (() => {
  const out = [];
  for (let L = 0; L < NN_LAYERS.length; L++) {
    for (let n = 0; n < NN_LAYERS[L]; n++) {
      out.push({ layer: L, node: n, layerSize: NN_LAYERS[L] });
    }
  }
  return out;
})();

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
    // 5-layer architecture with distinct node counts (input wide,
    // narrowing through hidden, expanding to output). Each "node" is
    // a small cloud of ~25 particles around an anchor, so the field
    // reads as a real architecture diagram with fuzzy neuron dots.
    //
    //   layer 0  14 nodes  (input)
    //   layer 1  10        (hidden)
    //   layer 2   8        (bottleneck)
    //   layer 3  10        (hidden)
    //   layer 4   6        (output)
    {
      // Map particle index i → slot k via even distribution
      const slotK = Math.min(NN_TOTAL - 1, Math.floor((i / count) * NN_TOTAL));
      const { layer: nnLayer, node: nnNode, layerSize } = NN_SLOT_LUT[slotK];
      const layerAnchorX = (nnLayer - (NN_LAYERS.length - 1) / 2) * 64;
      const nodeAnchorY  = (nnNode - (layerSize - 1) / 2) * 13;
      // Stable per-particle micro-jitter so each node is a fuzzy blob,
      // not one geometric point.
      const jx = (rand() - 0.5) * 6;
      const jy = (rand() - 0.5) * 6;
      const jz = (rand() - 0.5) * 12;
      out[2][ix]     = layerAnchorX + jx;
      out[2][ix + 1] = nodeAnchorY + jy;
      out[2][ix + 2] = jz;
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

// Build k-nearest-neighbor edges over a single formation. Each
// particle finds its k closest spatial neighbors; pairs are deduped
// so (i, j) and (j, i) become one undirected edge. We compute this
// once on the Hero (cloud) formation and use the resulting graph
// topology across every scene — the same edges connect the same
// particle pairs as they morph between DNA, network, sphere, grid,
// rings. Reads as the same neural network viewed in different
// layouts, instead of an arbitrary sequential adjacency.
function buildKnnEdges(positions, k, count) {
  const edgeSet = new Set();
  const buf = new Array(count - 1);
  for (let i = 0; i < count; i++) {
    const ix = i * 3;
    const xi = positions[ix], yi = positions[ix + 1], zi = positions[ix + 2];
    let n = 0;
    for (let j = 0; j < count; j++) {
      if (j === i) continue;
      const jx = j * 3;
      const dx = positions[jx]     - xi;
      const dy = positions[jx + 1] - yi;
      const dz = positions[jx + 2] - zi;
      buf[n++] = [dx * dx + dy * dy + dz * dz, j];
    }
    // Partial sort: only need the top-k smallest distances.
    buf.length = n;
    buf.sort((a, b) => a[0] - b[0]);
    for (let kk = 0; kk < k && kk < n; kk++) {
      const j = buf[kk][1];
      const a = i < j ? i : j;
      const b = i < j ? j : i;
      edgeSet.add(a * count + b);
    }
  }
  const edges = [];
  edgeSet.forEach((key) => {
    const a = Math.floor(key / count);
    const b = key % count;
    edges.push([a, b]);
  });
  return edges;
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

export default function ParticleScene({ sceneRef, scrollVelRef, lastInteractRef, fpsRef }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Scene setup ────────────────────────────────────────────────
    const scene = new THREE.Scene();
    // Atmospheric depth fog — distant particles fade toward the cream
    // paper colour. Combined with the canvas-level mix-blend-mode
    // multiply, fogged-out particles dissolve into the page instead
    // of rendering at full opacity regardless of distance. Near plane
    // 110, far plane 420 brackets the camera's working z range
    // (cameras live at z 205-295 with a +72 pullback at transitions).
    scene.fog = new THREE.Fog(0xf4f1ea, 110, 420);
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
    // Research-paper palette: muted deep navy + warm rust, with tiny
    // hue shifts per scene. Particles are rendered with mix-blend-mode:
    // multiply on the canvas, so these colours read as INK on cream
    // paper, not glowing pixels. Saturated enough to show against the
    // warm bg, restrained enough to coexist with serif body text.
    //   (accentR, accentG, accentB, warmR, warmG, warmB)
    const SCENE_PALETTE = [
      // 0 Hero       — deep journal navy + warm rust
      [0.12, 0.22, 0.55,   0.70, 0.32, 0.04],
      // 1 About      — slightly warmer ink + rust
      [0.18, 0.20, 0.45,   0.74, 0.36, 0.08],
      // 2 Research   — analytical mid-navy + ochre
      [0.10, 0.25, 0.55,   0.62, 0.45, 0.10],
      // 3 Publication — graphite + warm sienna
      [0.18, 0.22, 0.30,   0.68, 0.30, 0.05],
      // 4 Projects   — engineer indigo + steel teal
      [0.22, 0.20, 0.50,   0.12, 0.40, 0.42],
      // 5 Skills     — refined navy + accent rust
      [0.16, 0.22, 0.48,   0.70, 0.32, 0.04],
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

    // ── Particle sprite — soft ink dot. Gentler than the previous
    //     phosphor sprite: no hot white core, just a tactile mark.
    //     Combined with the canvas mix-blend-mode: multiply this reads
    //     as printed ink on paper, not glowing light. ────────────────
    const haloCanvas = document.createElement("canvas");
    haloCanvas.width = 64;
    haloCanvas.height = 64;
    const hctx = haloCanvas.getContext("2d");
    const grad = hctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0.00, "rgba(255,255,255,1.00)");
    grad.addColorStop(0.25, "rgba(255,255,255,0.80)");
    grad.addColorStop(0.60, "rgba(255,255,255,0.30)");
    grad.addColorStop(1.00, "rgba(255,255,255,0)");
    hctx.fillStyle = grad;
    hctx.fillRect(0, 0, 64, 64);
    const haloTex = new THREE.CanvasTexture(haloCanvas);

    // The CANVAS has mix-blend-mode: multiply applied at the .atmos
    // level, so additive blending here would fight that. Use normal
    // alpha and let the canvas-level multiply do the integration —
    // particles read as ink dots on the paper, not phosphor pixels.
    const material = new THREE.PointsMaterial({
      size: 4.2,
      map: haloTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.NormalBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // ── Per-scene KNN graph topology ──
    // Each formation gets its own k-nearest-neighbor graph. So when
    // the camera is on the Research scene, the edges actually trace
    // layer-to-layer connections inside the feedforward network; on
    // the Sphere scene, edges trace the sphere's surface; on the DNA
    // helix, they connect within-strand adjacencies. The graph is no
    // longer "Hero topology viewed in different layouts" — it's a
    // first-class scene element rebuilt per formation.
    //
    // Lines render with vertexColors so unused entries (when a scene
    // has fewer edges than the max) can be zeroed out per-frame.
    const formationKnnList = formations.map((pos) =>
      buildKnnEdges(pos, 2, PARTICLE_COUNT)
    );
    const maxEdges = formationKnnList.reduce((m, e) => Math.max(m, e.length), 0);
    let activePairs = formationKnnList[0];
    const linePositions = new Float32Array(maxEdges * 2 * 3);
    const lineColors = new Float32Array(maxEdges * 2 * 3);
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));
    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.34,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // ── Signal pulses ──
    // Warm sparks travelling along the connecting lines, visualising
    // signal propagation through the network — the universal AI motif
    // of "data flowing through a neural net". Each pulse is born at
    // one endpoint of a random line segment, travels to the other
    // endpoint, then respawns on a fresh line. Coloured with the
    // active scene's WARM accent so they pop against the navy ink
    // dots and read as the "live data" flowing through the field.
    const PULSE_COUNT = 32;
    const pulsePositions = new Float32Array(PULSE_COUNT * 3);
    const pulseColors = new Float32Array(PULSE_COUNT * 3);
    const pulseGeometry = new THREE.BufferGeometry();
    pulseGeometry.setAttribute("position", new THREE.BufferAttribute(pulsePositions, 3));
    pulseGeometry.setAttribute("color", new THREE.BufferAttribute(pulseColors, 3));
    const pulseMaterial = new THREE.PointsMaterial({
      size: 9.5,
      map: haloTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.NormalBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const pulseObj = new THREE.Points(pulseGeometry, pulseMaterial);
    scene.add(pulseObj);

    const pulseState = Array.from({ length: PULSE_COUNT }, () => ({
      lineIndex: Math.floor(Math.random() * activePairs.length),
      t: Math.random(),
      speed: 0.35 + Math.random() * 0.55,
    }));

    // ── Attention edges ──
    // Sparse long-range connections that link far-apart particles for
    // a beat, then fade. Mirrors how attention is drawn in transformer
    // visualisations — distant tokens lighting up momentarily as the
    // model "attends" across the field. Re-roll every ~800ms.
    const ATTN_COUNT = 6;
    const attnPositions = new Float32Array(ATTN_COUNT * 2 * 3);
    const attnGeometry = new THREE.BufferGeometry();
    attnGeometry.setAttribute("position", new THREE.BufferAttribute(attnPositions, 3));
    const attnMaterial = new THREE.LineBasicMaterial({
      color: 0xb45309,
      transparent: true,
      opacity: 0.30,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    const attnLines = new THREE.LineSegments(attnGeometry, attnMaterial);
    scene.add(attnLines);

    const attnState = {
      pairs: Array.from({ length: ATTN_COUNT }, () => [
        Math.floor(Math.random() * PARTICLE_COUNT),
        Math.floor(Math.random() * PARTICLE_COUNT),
      ]),
      ageMs: 0,
      lifeMs: 800,
    };

    // ── Cursor attention rays ──
    // Whenever the cursor is over the field we draw 6 faint lines
    // from the cursor's world-space projection to the 6 nearest
    // particles within an extended radius. Makes the existing
    // (invisible) pull + attention-anchor effects literal — the model
    // is visibly "looking at" specific tokens. Opacity is lerped each
    // frame toward 0 when cursor leaves the field.
    const CURSOR_EDGE_COUNT = 6;
    const cursorEdgePositions = new Float32Array(CURSOR_EDGE_COUNT * 2 * 3);
    const cursorEdgeGeometry = new THREE.BufferGeometry();
    cursorEdgeGeometry.setAttribute("position", new THREE.BufferAttribute(cursorEdgePositions, 3));
    const cursorEdgeMaterial = new THREE.LineBasicMaterial({
      color: 0xb45309,           // warm rust — matches cursor spotlight tone
      transparent: true,
      opacity: 0,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    const cursorEdgeLines = new THREE.LineSegments(cursorEdgeGeometry, cursorEdgeMaterial);
    scene.add(cursorEdgeLines);
    // Reused per-frame top-K arrays (no GC churn).
    const topKDist = new Float32Array(CURSOR_EDGE_COUNT);
    const topKIdx = new Int32Array(CURSOR_EDGE_COUNT);

    // ── Cursor particle ──
    // A single, larger, warm-rust Point at the cursor's projected world
    // position. The 6 edge rays + 2 attention edges anchored to the
    // closest particle were all emanating from invisible — now they
    // read as "this glowing particle is reaching out to those
    // neighbors." Inhabits the scene as a first-class point, not just
    // a screen-space overlay.
    const cursorParticlePos = new Float32Array(3);
    const cursorParticleGeometry = new THREE.BufferGeometry();
    cursorParticleGeometry.setAttribute("position", new THREE.BufferAttribute(cursorParticlePos, 3));
    const cursorParticleMaterial = new THREE.PointsMaterial({
      size: 18,
      map: haloTex,
      color: 0xb45309,
      transparent: true,
      opacity: 0,
      blending: THREE.NormalBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const cursorParticle = new THREE.Points(cursorParticleGeometry, cursorParticleMaterial);
    scene.add(cursorParticle);

    // ── Per-scene camera vantage points ────────────────────────────
    // Cinematic camera path. Text + formation occupy the SAME quadrant
    // each scene — they fuse on a shared paper surface via the canvas's
    // mix-blend-mode: multiply, so particles read as ink "printing over"
    // the text rather than as a separate animation layer behind it.
    //
    // To put the formation in a given quadrant, point the camera at the
    // OPPOSITE side of the origin so the origin appears in that quadrant
    // on screen:
    //   lookX > 0  → camera looks right of origin → origin appears LEFT
    //   lookX < 0  → camera looks left of origin  → origin appears RIGHT
    //   lookY > 0  → camera looks above origin    → origin appears BELOW
    //   lookY < 0  → camera looks below origin    → origin appears ABOVE
    //
    // The camera traces a continuous J-shape path through the page —
    // top-right → middle-right → bottom-right → bottom-left → top-left.
    // Each scene is a film cut along that path; text positions in
    // Portfolio.jsx track the same quadrants.
    const SCENE_CAMS = [
      // 0 Hero       — centred arrival shot, no quadrant
      { x:  0, y:  20, z: 205, lookX:   0, lookY:   0 },
      // 1 About      — TOP-RIGHT (path begins)
      { x: 14, y:  22, z: 220, lookX: -68, lookY: -22 },
      // 2 Research   — MIDDLE-RIGHT (camera drifts down)
      { x: 14, y:   2, z: 205, lookX: -68, lookY:   0 },
      // 3 Publication — BOTTOM-RIGHT (camera continues down)
      { x: 14, y: -22, z: 250, lookX: -68, lookY:  22 },
      // 4 Projects   — BOTTOM-LEFT (camera swings across)
      { x:-14, y: -22, z: 215, lookX:  68, lookY:  22 },
      // 5 Skills     — TOP-LEFT (camera rises to exit)
      { x:-14, y:  22, z: 235, lookX:  68, lookY: -22 },
    ];

    // ── Mouse parallax ─────────────────────────────────────────────
    // Cursor position drives a subtle rotation of the whole scene —
    // moves up to ~5° away from the cursor on each axis. Low-pass on
    // arrival so it doesn't twitch on every move event. The cursor is
    // also projected to the z=0 world plane (via raycaster) so the
    // particle field can elastically pull toward the cursor and so
    // attention edges can anchor on the particle nearest the cursor —
    // the model "attends" where the reader is looking.
    const mouse = { x: 0, y: 0, tx: 0, ty: 0, active: false };
    const onMouseMove = (e) => {
      mouse.tx = (e.clientX / window.innerWidth)  * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
      mouse.active = true;
    };
    const onMouseLeave = () => { mouse.active = false; };
    if (!reducedMotion) {
      window.addEventListener("mousemove", onMouseMove, { passive: true });
      document.addEventListener("mouseleave", onMouseLeave, { passive: true });
    }

    // Reusable vectors for cursor → world projection (avoid per-frame
    // allocations). Mouse is in NDC ([-1, 1] x, with web-y flipped);
    // raycaster intersects the z=0 plane to get a world point that
    // the particle pull + attention anchor both use. The intersect is
    // inverse-rotated by the current scene quaternion so it lines up
    // with the un-rotated particle buffer.
    const cursorRay = new THREE.Raycaster();
    const cursorPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const cursorNDC = new THREE.Vector2();
    const cursorWorld = new THREE.Vector3();
    const cursorLocal = new THREE.Vector3();
    const cursorInvQuat = new THREE.Quaternion();
    let cursorLocalValid = false;
    let cursorClosestIdx = 0;

    // ── Animation loop ─────────────────────────────────────────────
    let raf = 0;
    let frame = 0;
    let running = true;

    // Smoothed scene index (low-pass on the raw sceneRef so the morph
    // doesn't twitch with wheel jitter).
    let smoothedScene = sceneRef?.current ?? 0;
    let lastTime = performance.now();

    // Scene-boundary brightness pulse — when the integer scene index
    // changes, the field briefly saturates and brightens. Decays
    // exponentially each frame so the burst lasts ~1s. Initial value
    // is -1 so the first frame (lo=0) doesn't fire a phantom flash.
    let prevSceneLo = -1;
    let sceneFlashI = 0;
    // Easter-egg trigger: typing 'qk' anywhere dispatches a custom
    // event we listen for and respond with a 2x flash burst.
    const onEgg = () => { sceneFlashI = Math.max(sceneFlashI, 2.0); };
    window.addEventListener("portfolio:qk", onEgg);

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

    // Rolling FPS buffer — keep the last 60 frame deltas, average for
    // a smoothed reading. Writes to fpsRef each frame so the HUD can
    // poll without setting up its own timing infrastructure.
    const fpsBuf = new Float32Array(60);
    let fpsBufIdx = 0;
    let fpsBufFilled = 0;

    const animate = () => {
      if (!running) return;
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      frame++;
      // FPS sample: dt in seconds → fps = 1/dt. Buffer & average.
      if (dt > 0.0005) {
        fpsBuf[fpsBufIdx] = 1 / dt;
        fpsBufIdx = (fpsBufIdx + 1) % fpsBuf.length;
        if (fpsBufFilled < fpsBuf.length) fpsBufFilled++;
        if (fpsRef && (frame & 7) === 0) {  // update every 8 frames
          let sum = 0;
          for (let i = 0; i < fpsBufFilled; i++) sum += fpsBuf[i];
          fpsRef.current = sum / fpsBufFilled;
        }
      }

      const target = sceneRef?.current ?? 0;
      const k = 1 - Math.exp(-dt / 0.25);
      smoothedScene += (target - smoothedScene) * k;

      // ── Cursor projection (1-frame lag — imperceptible) ──
      // Project mouse NDC through the camera onto the z=0 plane, then
      // inverse-rotate by the field's current quaternion so the result
      // lives in particle-local space. Both the elastic pull (below)
      // and the attention-edge anchoring (later) consume cursorLocal.
      cursorLocalValid = false;
      if (mouse.active && !reducedMotion) {
        cursorNDC.set(mouse.x, -mouse.y);
        cursorRay.setFromCamera(cursorNDC, camera);
        if (cursorRay.ray.intersectPlane(cursorPlane, cursorWorld)) {
          cursorInvQuat.copy(points.quaternion).invert();
          cursorLocal.copy(cursorWorld).applyQuaternion(cursorInvQuat);
          cursorLocalValid = true;
        }
      }

      const segCount = formations.length - 1;
      const clamped = Math.max(0, Math.min(segCount, smoothedScene));
      const lo = Math.floor(clamped);
      const hi = Math.min(lo + 1, segCount);
      const u = clamped - lo;

      // Scene-change brightness pulse: fires when integer scene index
      // shifts (either direction). Decays multiplicatively each frame.
      // Also swap the active KNN edge set (and reroll the pulses that
      // ride on it) so the graph topology matches what the camera is
      // currently parked on.
      if (lo !== prevSceneLo) {
        if (prevSceneLo !== -1) sceneFlashI = 1.0;
        prevSceneLo = lo;
        activePairs = formationKnnList[lo];
        // Reroll pulses onto the new edge set — old line indices would
        // point at the wrong edges (or out of bounds if the new set
        // has fewer edges).
        for (let p = 0; p < PULSE_COUNT; p++) {
          pulseState[p].lineIndex = Math.floor(Math.random() * activePairs.length);
          pulseState[p].t = Math.random();
        }
        // Zero out any edge slots above the new set's length so they
        // render as degenerate (0,0,0)-(0,0,0) — invisible.
        for (let p = activePairs.length; p < maxEdges; p++) {
          for (let q = 0; q < 6; q++) {
            linePositions[p * 6 + q] = 0;
            lineColors[p * 6 + q] = 0;
          }
        }
      }
      sceneFlashI *= 0.92;
      // Smoothstep so the morph eases at the ends of each segment.
      const eased = u * u * (3 - 2 * u);

      const A = formations[lo];
      const B = formations[hi];
      const posAttr = geometry.attributes.position.array;
      // Per-particle tiny live drift so the field always breathes.
      // Idle awareness: after 5s of no reader input, ramp drift up
      // over 8s so the field starts "dreaming" rather than just
      // floating. Snaps back to base the moment anything happens.
      let idleNorm = 0;
      if (lastInteractRef) {
        const idleMs = now - lastInteractRef.current;
        idleNorm = Math.min(1, Math.max(0, (idleMs - 5000) / 8000));
      }
      const driftAmp = reducedMotion ? 0 : 0.7 + idleNorm * 1.6;
      const t = frame * 0.02;
      // Dispersal: particles fly outward from the centre during the
      // middle of each scene transition, then settle back as the next
      // formation comes in. Magnitude peaks at u = 0.5 and is zero at
      // u = 0 and u = 1 so the rest position of each scene is exact.
      // Kept gentle so text + formation stay visually fused mid-cut.
      // Scroll velocity (0..1.5+) boosts both — fast scrolling wakes
      // the field up, settled scrolling keeps it calm.
      const rawVel = scrollVelRef?.current ?? 0;
      const velNorm = Math.min(rawVel / 1400, 1.5);
      const dispersal = 1 + Math.sin(u * Math.PI) * 0.12 + velNorm * 0.05;
      const scatterAmp = Math.sin(u * Math.PI) * 7 + velNorm * 5.5;
      // Track the particle closest to the cursor while we walk the
      // buffer. The attention-edge re-roll below anchors two edges
      // there so the field visibly "attends" to the reader. We also
      // maintain a top-K list of nearest particles within an extended
      // radius so the cursor edge-rays know which endpoints to use.
      let closestDistSq = Infinity;
      const cursorR = 55;
      const cursorRSq = cursorR * cursorR;
      const cursorRTrackSq = cursorR * cursorR * 2.6;  // wider window for rays
      const cursorPullMax = 2.6;
      for (let k = 0; k < CURSOR_EDGE_COUNT; k++) {
        topKDist[k] = Infinity;
        topKIdx[k] = 0;
      }
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
        let px = lx + dx + sx;
        let py = ly + dy + sy;
        const pz = lz + dz + sz;
        // ── Elastic cursor pull + top-K tracking ──
        // Particles within cursorR of the projected cursor are tugged
        // toward it with linear falloff, so the field bulges gently
        // under the reader's pointer. We also keep a sorted top-K
        // list of the closest particles in an extended radius — the
        // cursor edge-rays connect the cursor to those endpoints, so
        // the reader literally sees which tokens the model is
        // attending to.
        if (cursorLocalValid) {
          const ddx = cursorLocal.x - px;
          const ddy = cursorLocal.y - py;
          const dSq = ddx * ddx + ddy * ddy;
          if (dSq < cursorRSq && dSq > 1) {
            const d = Math.sqrt(dSq);
            const pull = (1 - d / cursorR) * cursorPullMax;
            px += (ddx / d) * pull;
            py += (ddy / d) * pull;
            if (dSq < closestDistSq) {
              closestDistSq = dSq;
              cursorClosestIdx = i;
            }
          }
          if (dSq < cursorRTrackSq && dSq < topKDist[CURSOR_EDGE_COUNT - 1]) {
            let pos = CURSOR_EDGE_COUNT - 1;
            while (pos > 0 && dSq < topKDist[pos - 1]) {
              topKDist[pos] = topKDist[pos - 1];
              topKIdx[pos] = topKIdx[pos - 1];
              pos--;
            }
            topKDist[pos] = dSq;
            topKIdx[pos] = i;
          }
        }
        posAttr[idx]     = px;
        posAttr[idx + 1] = py;
        posAttr[idx + 2] = pz;
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
      const flashBoost = 1 + sceneFlashI * 0.55;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const warm = (i % 7 === 0);
        const ci = i * 3;
        if (warm) {
          cAttr[ci]     = Math.min(1, wr * flashBoost);
          cAttr[ci + 1] = Math.min(1, wg * flashBoost);
          cAttr[ci + 2] = Math.min(1, wb * flashBoost);
        } else {
          cAttr[ci]     = Math.min(1, ar * flashBoost);
          cAttr[ci + 1] = Math.min(1, ag * flashBoost);
          cAttr[ci + 2] = Math.min(1, ab * flashBoost);
        }
      }
      geometry.attributes.color.needsUpdate = true;

      // Update line endpoint positions + per-line vertex colors. Lines
      // whose endpoints sit close to the cursor get a brightness boost
      // (clamped to 1.0 since RGB > 1 doesn't render), so the graph
      // visibly "lights up" around the reader's attention.
      const lpos = lineGeometry.attributes.position.array;
      const cxw = cursorLocal.x, cyw = cursorLocal.y;
      const brightR = 60 * 60;    // squared brightening radius (60 units)
      const useCursor = cursorLocalValid;
      for (let p = 0; p < activePairs.length; p++) {
        const [ia, ib] = activePairs[p];
        const a3 = ia * 3, b3 = ib * 3;
        const ax = posAttr[a3],     ay = posAttr[a3 + 1], az = posAttr[a3 + 2];
        const bx = posAttr[b3],     by = posAttr[b3 + 1], bz = posAttr[b3 + 2];
        lpos[p * 6 + 0] = ax;
        lpos[p * 6 + 1] = ay;
        lpos[p * 6 + 2] = az;
        lpos[p * 6 + 3] = bx;
        lpos[p * 6 + 4] = by;
        lpos[p * 6 + 5] = bz;
        let factor = 1.0;
        if (useCursor) {
          const daSq = (cxw - ax) * (cxw - ax) + (cyw - ay) * (cyw - ay);
          const dbSq = (cxw - bx) * (cxw - bx) + (cyw - by) * (cyw - by);
          const minSq = daSq < dbSq ? daSq : dbSq;
          if (minSq < brightR) {
            factor = 1 + (1 - minSq / brightR) * 1.7;
          }
        }
        const r = Math.min(1, ar * factor);
        const g = Math.min(1, ag * factor);
        const b = Math.min(1, ab * factor);
        lineColors[p * 6 + 0] = r;
        lineColors[p * 6 + 1] = g;
        lineColors[p * 6 + 2] = b;
        lineColors[p * 6 + 3] = r;
        lineColors[p * 6 + 4] = g;
        lineColors[p * 6 + 5] = b;
      }
      lineGeometry.attributes.position.needsUpdate = true;
      lineGeometry.attributes.color.needsUpdate = true;
      // Scroll velocity bumps line opacity so the whole network
      // "lights up" during fast scrolls in addition to the per-line
      // cursor brightening.
      lineMaterial.opacity = 0.34 + Math.min(velNorm, 1) * 0.18;

      // ── Pulse advance ──
      // Each pulse rides along its assigned line segment from endpoint
      // A to endpoint B. When it reaches B, it respawns on a fresh
      // line so the data-flow effect never stalls.
      const pulseVelBoost = 1 + Math.min(velNorm, 1) * 0.6;
      for (let p = 0; p < PULSE_COUNT; p++) {
        const ps = pulseState[p];
        ps.t += ps.speed * dt * pulseVelBoost;
        if (ps.t >= 1) {
          ps.t = 0;
          ps.lineIndex = Math.floor(Math.random() * activePairs.length);
          ps.speed = 0.35 + Math.random() * 0.55;
        }
        // Guard against stale lineIndex from a recent scene change
        // (the swap reroll already covers most cases, but cheap belt+).
        if (ps.lineIndex >= activePairs.length) {
          ps.lineIndex = Math.floor(Math.random() * activePairs.length);
        }
        const [pia, pib] = activePairs[ps.lineIndex];
        const pa3 = pia * 3, pb3 = pib * 3;
        const pax = posAttr[pa3],     pay = posAttr[pa3 + 1], paz = posAttr[pa3 + 2];
        const pbx = posAttr[pb3],     pby = posAttr[pb3 + 1], pbz = posAttr[pb3 + 2];
        const tt = ps.t;
        pulsePositions[p * 3]     = pax + (pbx - pax) * tt;
        pulsePositions[p * 3 + 1] = pay + (pby - pay) * tt;
        pulsePositions[p * 3 + 2] = paz + (pbz - paz) * tt;
        // Warm accent colour, brighter than the rust used elsewhere
        // so the pulses clearly read as the "live signal" layer.
        pulseColors[p * 3]     = Math.min(1, wr * 1.15);
        pulseColors[p * 3 + 1] = Math.min(1, wg * 1.15);
        pulseColors[p * 3 + 2] = Math.min(1, wb * 1.15);
      }
      pulseGeometry.attributes.position.needsUpdate = true;
      pulseGeometry.attributes.color.needsUpdate = true;

      // ── Attention edges ──
      // Periodically re-roll the long-range pairs so a fresh set of
      // distant particles "lights up" between them. Opacity is sin-
      // pulsed over the lifetime so each edge fades in and out
      // smoothly instead of popping.
      attnState.ageMs += dt * 1000;
      if (attnState.ageMs >= attnState.lifeMs) {
        attnState.ageMs = 0;
        attnState.lifeMs = 700 + Math.random() * 400;
        for (let a = 0; a < ATTN_COUNT; a++) {
          attnState.pairs[a][0] = Math.floor(Math.random() * PARTICLE_COUNT);
          attnState.pairs[a][1] = Math.floor(Math.random() * PARTICLE_COUNT);
        }
        // When the cursor is on the field, bias the first two edges to
        // originate at the particle nearest the cursor — the model is
        // literally "attending to" where the reader is looking.
        if (cursorLocalValid && closestDistSq < Infinity) {
          attnState.pairs[0][0] = cursorClosestIdx;
          attnState.pairs[1][0] = cursorClosestIdx;
        }
      }
      const attnPhase = attnState.ageMs / attnState.lifeMs;
      attnMaterial.opacity = Math.sin(attnPhase * Math.PI) * 0.34;
      const attnPos = attnGeometry.attributes.position.array;
      for (let a = 0; a < ATTN_COUNT; a++) {
        const [aa, bb] = attnState.pairs[a];
        const aIdx = aa * 3, bIdx = bb * 3;
        attnPos[a * 6 + 0] = posAttr[aIdx];
        attnPos[a * 6 + 1] = posAttr[aIdx + 1];
        attnPos[a * 6 + 2] = posAttr[aIdx + 2];
        attnPos[a * 6 + 3] = posAttr[bIdx];
        attnPos[a * 6 + 4] = posAttr[bIdx + 1];
        attnPos[a * 6 + 5] = posAttr[bIdx + 2];
      }
      attnGeometry.attributes.position.needsUpdate = true;
      // Match the accent hue lerp so attention edges shift with palette
      attnMaterial.color.setRGB(
        Math.min(1, wr * 0.95),
        Math.min(1, wg * 0.95),
        Math.min(1, wb * 0.95)
      );

      // ── Cursor edge-rays ──
      // If the cursor is on the field, draw 6 lines from the cursor's
      // local-space projection to the 6 nearest particles tracked
      // above. Opacity lerps toward 0.55 when active, 0 otherwise so
      // they fade out cleanly when the cursor leaves the viewport.
      const cursorActive = cursorLocalValid && topKDist[0] < Infinity;
      const cursorEdgeTargetOp = cursorActive ? 0.55 : 0;
      cursorEdgeMaterial.opacity += (cursorEdgeTargetOp - cursorEdgeMaterial.opacity) * 0.18;

      // Cursor particle — sit at the projected cursor world pos, fade
      // opacity with the same lerp as the edge rays so they appear
      // together. Subtle size pulse from the frame index gives it a
      // slow "alive" breath.
      if (cursorLocalValid) {
        cursorParticlePos[0] = cursorLocal.x;
        cursorParticlePos[1] = cursorLocal.y;
        cursorParticlePos[2] = cursorLocal.z;
        cursorParticleGeometry.attributes.position.needsUpdate = true;
      }
      const cursorParticleTargetOp = cursorActive ? 0.85 : 0;
      cursorParticleMaterial.opacity += (cursorParticleTargetOp - cursorParticleMaterial.opacity) * 0.18;
      // Slow breathing scale modulation via material size (re-applied
      // each frame because Points doesn't have per-instance scale).
      cursorParticleMaterial.size = 18 + Math.sin(frame * 0.05) * 1.6;
      // Hue follow per-scene warm accent
      cursorParticleMaterial.color.setRGB(
        Math.min(1, wr * 1.1),
        Math.min(1, wg * 1.1),
        Math.min(1, wb * 1.1)
      );
      if (cursorEdgeMaterial.opacity > 0.005) {
        for (let kk = 0; kk < CURSOR_EDGE_COUNT; kk++) {
          if (topKDist[kk] < Infinity) {
            const pIx = topKIdx[kk] * 3;
            cursorEdgePositions[kk * 6 + 0] = cursorLocal.x;
            cursorEdgePositions[kk * 6 + 1] = cursorLocal.y;
            cursorEdgePositions[kk * 6 + 2] = cursorLocal.z;
            cursorEdgePositions[kk * 6 + 3] = posAttr[pIx];
            cursorEdgePositions[kk * 6 + 4] = posAttr[pIx + 1];
            cursorEdgePositions[kk * 6 + 5] = posAttr[pIx + 2];
          } else {
            for (let q = 0; q < 6; q++) cursorEdgePositions[kk * 6 + q] = 0;
          }
        }
        cursorEdgeGeometry.attributes.position.needsUpdate = true;
        // Use the warm-accent lerp from the palette so the rays also
        // shift hue per scene, just toward the rust end of the family.
        cursorEdgeMaterial.color.setRGB(
          Math.min(1, wr * 1.05),
          Math.min(1, wg * 1.05),
          Math.min(1, wb * 1.05)
        );
      }

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
      pulseObj.quaternion.copy(tmpQuat);
      attnLines.quaternion.copy(tmpQuat);
      cursorEdgeLines.quaternion.copy(tmpQuat);
      cursorParticle.quaternion.copy(tmpQuat);

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
      // Bigger z-pullback so the camera flies further out between
      // scenes, then dives back in — reads as a deliberate cinematic
      // dolly rather than a quick pan.
      const pullback = Math.sin(u * Math.PI) * 110;
      const camTargetZ = camA.z + (camB.z - camA.z) * tCam + pullback;
      const camTargetLX = camA.lookX + (camB.lookX - camA.lookX) * tCam;
      const camTargetLY = camA.lookY + (camB.lookY - camA.lookY) * tCam;
      // Slower camera lerp (tau .45 -> .65) for a more deliberate
      // cinematic glide between vantage points, less reactive feel.
      const camK = 1 - Math.exp(-dt / 0.65);
      cam.x += (camTargetX - cam.x) * camK;
      cam.y += (camTargetY - cam.y) * camK;
      cam.z += (camTargetZ - cam.z) * camK;
      cam.lookX += (camTargetLX - cam.lookX) * camK;
      cam.lookY += (camTargetLY - cam.lookY) * camK;

      // Tiny scene-driven oscillation for ambient motion on top of base.
      const oscY = Math.sin(smoothedScene * 1.3 + frame * 0.0009) * 4;
      const oscZ = Math.sin(smoothedScene * 0.9 + frame * 0.0011) * 6;
      camera.position.set(cam.x, cam.y + oscY, cam.z + oscZ);

      // ── Cinematic camera roll on transition ──
      // Bank the camera slightly around its forward axis during scene
      // cuts — peaks at u=0.5 (max ~6.3°), zero at both ends. The roll
      // direction alternates per transition so consecutive cuts don't
      // bank the same way. Mimics a film dolly's lateral bank on fast
      // moves. Applied by setting camera.up to a tilted unit vector
      // BEFORE lookAt so the up-axis is read with the new orientation.
      const rollPhase = Math.sin(u * Math.PI);
      const rollDir = (lo % 2 === 0) ? 1 : -1;
      const rollAngle = rollPhase * 0.11 * rollDir;
      camera.up.set(-Math.sin(rollAngle), Math.cos(rollAngle), 0);
      // lookAt is shifted in x for non-hero scenes, pushing the
      // formation's centre of mass to the right half of the viewport
      // and leaving the left half for the text content.
      camera.lookAt(cam.lookX, cam.lookY, 0);

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize handling ────────────────────────────────────────────
    // FOV adapts to portrait viewports — phones in portrait squash
    // landscape-tuned 55° framing, so wider angle there fits the
    // formation while preserving the landscape composition on
    // desktop / wide screens.
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      const aspect = w / h;
      const fov = aspect < 0.75 ? 70 : aspect < 1.1 ? 62 : 55;
      camera.aspect = aspect;
      if (camera.fov !== fov) camera.fov = fov;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    onResize();
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
      window.removeEventListener("portfolio:qk", onEgg);
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
      pulseGeometry.dispose();
      pulseMaterial.dispose();
      attnGeometry.dispose();
      attnMaterial.dispose();
      cursorEdgeGeometry.dispose();
      cursorEdgeMaterial.dispose();
      cursorParticleGeometry.dispose();
      cursorParticleMaterial.dispose();
      haloTex.dispose();
      renderer.dispose();
    };
  }, [sceneRef]);

  return <div ref={containerRef} className="particle-scene" aria-hidden="true" />;
}
