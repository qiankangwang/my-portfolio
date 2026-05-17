import { useEffect, useRef } from "react";

/* Layered feedforward neural network on a 2D canvas with a virtual
   camera that pans + zooms across the scene driven by scroll. Each
   section anchors to a specific element in the world:

     About       → input layer            (leftmost dots, close-up)
     Research    → middle hidden layer    (mid-shot)
     Publication → output layer           (rightmost, close-up)
     Projects    → a protein α-helix      (bio motif)
     Skills      → an RNA strand          (bio motif)

   As the user scrolls, the camera glides between these anchors —
   it's the same "cinematic camera move" that the 3D r3f version had,
   but on a 2D canvas (smooth on every machine, no shader cost).

   Implementation notes
   - World coords: the network and bio motifs are positioned in a fixed
     virtual world (no viewport-dependent geometry). The draw loop
     applies translate + scale so a chosen world point appears at the
     screen anchor (offset to the left so the cards on the right of
     the viewport don't cover the focused element).
   - Two-stage low-pass: scroll progress is smoothed first (~0.12s),
     then the camera position follows the smoothed target (~0.30s).
     Same trick the 3D camera used — discrete wheel ticks become a
     glide, not a jolt.
   - pointer-events: none on .bgnet means scroll passes through, so
     this is non-interactive — animation runs autonomously. */

const WORLD_W = 1400; // network total width in world coords
const WORLD_H = 720;  // network total height
const WORLD_LAYERS = [5, 7, 9, 7, 5, 3];

export default function NeuralNetCanvas({ sceneRef }) {
  const canvasRef = useRef(null);
  const raf = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const layers = WORLD_LAYERS;
    let nodes = [];
    let edges = [];
    let pulses = [];
    let bioMotifs = [];
    // Scene motifs — distinct visual elements per scroll scene:
    //   "dna"       : DNA double helix      (About waypoint)
    //   "equations" : math glyph cluster    (Publication waypoint)
    //   "grid"      : contribution grid     (Projects waypoint)
    //   "labels"    : floating skill labels (Skills waypoint)
    // Each is its own camera anchor — the scene that focuses on it sees it
    // big and centred while the rest of the world falls into background.
    let sceneMotifs = [];
    // Ambient particle field — small dots drifting across the whole world,
    // very faint, just for atmospheric depth behind everything else.
    let ambient = [];
    let edgeCursor = 0;
    let frame = 0;

    // Theme detection — data-theme attr on <html>, fall back to system pref.
    const readDark = () => {
      const attr = document.documentElement.getAttribute("data-theme");
      if (attr === "dark") return true;
      if (attr === "light") return false;
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    };
    let dark = readDark();
    const themeObs = new MutationObserver(() => { dark = readDark(); });
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const darkMq = window.matchMedia("(prefers-color-scheme: dark)");
    const onDarkMq = () => { dark = readDark(); };
    darkMq.addEventListener("change", onDarkMq);
    const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;

    // Build the network + bio motifs in WORLD coordinates (centred at the
    // world origin). The camera transform in draw() places these onto
    // screen at the right place / scale for the current scroll position.
    const buildNetwork = () => {
      nodes = [];
      edges = [];
      pulses = [];
      bioMotifs = [];
      const netW = WORLD_W;
      const netH = WORLD_H;
      const layerGap = netW / (layers.length - 1);
      const startX = -netW / 2;

      layers.forEach((count, layer) => {
        const x = startX + layerGap * layer;
        const usableH = netH * (0.76 + layer * 0.018);
        const layerStartY = -usableH / 2;
        for (let i = 0; i < count; i++) {
          const ratio = count === 1 ? 0.5 : i / (count - 1);
          const curve = Math.sin((ratio - 0.5) * Math.PI) * 14;
          nodes.push({
            x,
            y: layerStartY + ratio * usableH + curve,
            baseX: x,
            baseY: layerStartY + ratio * usableH + curve,
            layer,
            r: 3.2 + (layer === 0 || layer === layers.length - 1 ? 0.4 : 0.9),
            phase: Math.random() * Math.PI * 2,
            activation: layer === 0 ? 0.4 : 0,
          });
        }
      });

      const layerStarts = layers.reduce((acc, count, i) => {
        acc.push(i === 0 ? 0 : acc[i - 1] + layers[i - 1]);
        return acc;
      }, []);

      for (let layer = 0; layer < layers.length - 1; layer++) {
        const aStart = layerStarts[layer];
        const bStart = layerStarts[layer + 1];
        for (let a = 0; a < layers[layer]; a++) {
          for (let b = 0; b < layers[layer + 1]; b++) {
            const distance = Math.abs(
              (a + 0.5) / layers[layer] - (b + 0.5) / layers[layer + 1]
            );
            if (distance < 0.38 || (a + b + layer) % 5 === 0) {
              edges.push({
                from: aStart + a,
                to: bStart + b,
                weight: 1 - Math.min(distance, 0.45),
              });
            }
          }
        }
      }

      // Atmospheric bio motifs (RNA + protein helices) scattered around
      // the network. These are the "always-on" texture that gives the
      // world its biology flavour.
      const left = -netW / 2;
      const top = -netH * 0.34;
      const bottom = netH * 0.34;
      bioMotifs = [
        { type: "rna",     x: left + netW * 0.10, y: top + netH * 0.12,    len: 13, angle: 0.15,  phase: 0.2, bend: 10 },
        { type: "rna",     x: left + netW * 0.50, y: top + netH * 0.74,    len: 10, angle: -0.20, phase: 3.1, bend: -7 },
        { type: "rna",     x: left + netW * 0.08, y: top + netH * 0.58,    len: 9,  angle: 0.32,  phase: 6.0, bend: 6 },
        { type: "protein", x: left + netW * 0.18, y: bottom - netH * 0.16, len: 8,  scale: 0.92, phase: 2.4 },
        { type: "protein", x: left + netW * 0.42, y: top + netH * 0.06,    len: 7,  scale: 0.70, phase: 5.4 },
        { type: "protein", x: left + netW * 0.88, y: bottom - netH * 0.28, len: 6,  scale: 0.65, phase: 6.8 },
        { type: "protein", x: left + netW * 0.30, y: top + netH * 0.48,    len: 7,  scale: 0.78, phase: 1.3 },
      ];

      // Scene motifs — each becomes one section's camera anchor.
      // Spaced into the four world corners so each is fully isolated
      // when the camera frames it at zoom ~2.4-2.7:
      //   upper-left  : DNA (About)
      //   upper-right : Equations (Publication)
      //   lower-left  : Contribution grid (Projects)
      //   lower-right : Skill labels orbit (Skills)
      // The network's hidden layer at (0, 0) serves as Research anchor.
      sceneMotifs = [
        // DNA double helix — vertical, About anchor (upper-left).
        // amp bumped from 38 → 56 so the helix reads with more 3D
        // separation and the strands genuinely cross in front of each
        // other rather than just wiggling close together.
        { type: "dna", x: -480, y: -160, len: 17, amp: 56, phase: 0 },

        // Equation glyph cluster — Publication anchor (upper-right).
        {
          type: "equations",
          x: 480,
          y: -160,
          glyphs: [
            { ch: "∇",   ox: -70, oy: -32, size: 38, phase: 0.0 },
            { ch: "∂",   ox:  10, oy: -50, size: 32, phase: 1.2 },
            { ch: "Σ",   ox:  80, oy: -10, size: 44, phase: 2.4 },
            { ch: "∫",   ox: -40, oy:  30, size: 42, phase: 3.1 },
            { ch: "π",   ox:  60, oy:  46, size: 28, phase: 4.0 },
            { ch: "ψ",   ox: -90, oy:  10, size: 30, phase: 5.2 },
            { ch: "⟨ψ⟩", ox:   0, oy:  -2, size: 24, phase: 0.7 },
            { ch: "∞",   ox:  35, oy: -36, size: 26, phase: 6.0 },
          ],
        },

        // GitHub-style contribution grid — Projects anchor (lower-left).
        { type: "grid", x: -480, y: 230, cols: 14, rows: 7, cell: 14, gap: 6 },

        // Floating skill labels orbiting a central anchor — Skills anchor.
        {
          type: "labels",
          x: 480,
          y: 230,
          items: [
            { text: "PyTorch", r: 100, speed: 0.18, phase: 0.0 },
            { text: "CUDA",    r: 75,  speed: -0.22, phase: 1.2 },
            { text: "C++",     r: 125, speed: 0.14, phase: 2.5 },
            { text: "Slurm",   r: 60,  speed: 0.28, phase: 3.8 },
            { text: "GPU",     r: 110, speed: -0.16, phase: 5.0 },
            { text: "Linux",   r: 85,  speed: 0.20, phase: 0.4 },
            { text: "PBSA",    r: 120, speed: -0.18, phase: 4.4 },
            { text: "SSL",     r: 55,  speed: 0.30, phase: 2.0 },
          ],
        },
      ];

      // Ambient particle field — slow drifting dots across the whole
      // world. Faint, just adds depth so the bg never feels empty.
      ambient = [];
      const ambientCount = reducedMotion ? 0 : 70;
      for (let i = 0; i < ambientCount; i++) {
        ambient.push({
          x: -netW * 0.6 + Math.random() * netW * 1.2,
          y: -netH * 0.6 + Math.random() * netH * 1.2,
          r: 0.6 + Math.random() * 1.3,
          alpha: 0.18 + Math.random() * 0.32,
          drift: 0.08 + Math.random() * 0.14,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    // Six camera waypoints — one per portfolio scene (incl. hero). Each is
    // a target (worldX, worldY, zoom, roll) in world coords; the draw loop
    // interpolates between them along an arc path (not a straight line) and
    // adds a zoom-dolly pull-back at the midpoint of every transition. This
    // gives the camera a cinematic "fly-through 3D space" feel even though
    // the canvas is 2D.
    //
    //   roll : per-scene camera bank angle in degrees. Mostly small; the
    //          banks between scenes are what create the 3D feel.
    const computeWaypoints = () => {
      // The page's centred content card sits over the viewport's middle.
      // To keep each scene's motif visible, the camera anchors slightly
      // OFFSET from the motif so the motif lands in the gutter beside
      // the card rather than directly behind it. Computed so the motif's
      // screen position falls ~280px from a viewport edge at ~1440px wide
      // (with the per-waypoint zoom).
      return [
        // 0 — Hero: wide overview — sees all four corners + the network
        { x: 0, y: 0, zoom: 1.0, roll: 0 },
        // 1 — About: DNA helix sits in the LEFT gutter beside the card
        { x: -290, y: -160, zoom: 2.3, roll: -3 },
        // 2 — Research: network hidden layer centred behind the card
        { x: 0, y: 0, zoom: 1.75, roll: 2.5 },
        // 3 — Publication: equation cluster in the RIGHT gutter
        { x: 295, y: -160, zoom: 2.4, roll: -3 },
        // 4 — Projects: contribution grid in the LEFT gutter
        { x: -310, y: 230, zoom: 2.6, roll: 4 },
        // 5 — Skills: skill-label orbit in the RIGHT gutter
        { x: 290, y: 230, zoom: 2.3, roll: -2.5 },
      ];
    };

    const waypoints = computeWaypoints();

    // Camera state — initialised to the first waypoint so the page opens
    // already framed on the hero wide shot (no jarring initial fly-in).
    const cam = {
      x: waypoints[0].x,
      y: waypoints[0].y,
      zoom: waypoints[0].zoom,
      roll: waypoints[0].roll,
    };
    let smoothedScene = 0;
    let lastTime = performance.now();

    const resize = () => {
      w = canvas.clientWidth || window.innerWidth;
      h = canvas.clientHeight || window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildNetwork();
    };
    resize();
    window.addEventListener("resize", resize);

    const spawnPulse = () => {
      if (!edges.length || pulses.length > 18) return;
      const edge = edges[edgeCursor % edges.length];
      edgeCursor += 7;
      pulses.push({
        edge,
        t: 0,
        speed: reducedMotion ? 0.012 : 0.005 + Math.random() * 0.004,
        alpha: 0.40 + Math.random() * 0.28,
      });
    };

    let running = true;

    const draw = () => {
      if (!running) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      frame++;
      ctx.clearRect(0, 0, w, h);

      // Two-stage low-pass smoothing on the scene index → camera path,
      // so wheel-tick scroll doesn't transmit as a visible camera kick.
      const segCount = waypoints.length - 1;
      const targetScene = Math.max(0, Math.min(segCount, sceneRef?.current ?? 0));
      const kS = 1 - Math.exp(-dt / 0.12);
      smoothedScene += (targetScene - smoothedScene) * kS;

      // Interpolate the target waypoint from the smoothed scene index —
      // sceneRef places the camera at the actual section in view, so the
      // transition fires when the user crosses the section boundary.
      const lo = Math.floor(smoothedScene);
      const hi = Math.min(lo + 1, segCount);
      const u = smoothedScene - lo;
      const eased = u * u * (3 - 2 * u); // smoothstep
      const a = waypoints[lo];
      const b = waypoints[hi];

      // 1) Linear interpolation between the two waypoints
      const linX = a.x + (b.x - a.x) * eased;
      const linY = a.y + (b.y - a.y) * eased;
      const linZoom = a.zoom + (b.zoom - a.zoom) * eased;
      const linRoll = a.roll + (b.roll - a.roll) * eased;

      // 2) Arc path — push the midpoint perpendicular to the straight line
      //    so the camera *swings* from A to B instead of going dead-straight.
      //    Arc magnitude scales with segment length, capped. Direction
      //    alternates by segment index so consecutive arcs swing opposite
      //    ways (avoids a monotonous "always curves up" feel).
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const segLen = Math.hypot(dx, dy);
      let arcDX = 0, arcDY = 0;
      if (segLen > 5) {
        const nx = -dy / segLen;
        const ny = dx / segLen;
        const arcMag = Math.min(segLen * 0.18, 180);
        const arcCurve = Math.sin(eased * Math.PI);
        const arcSign = lo % 2 === 0 ? 1 : -1;
        arcDX = nx * arcMag * arcCurve * arcSign;
        arcDY = ny * arcMag * arcCurve * arcSign;
      }

      // Mobile/portrait compensation: world is ~1400 wide so a narrow
      // viewport sees the motifs cramped against the edges. Scale the
      // entire zoom path down when aspect drops below 1.0 so the
      // composition fits.
      const aspect = w / Math.max(1, h);
      const portraitScale = aspect < 1.0
        ? Math.max(0.55, 0.55 + aspect * 0.35)
        : 1.0;

      // 3) Zoom dolly — briefly pull back at the midpoint of every
      //    transition, like a director using an establishing shot
      //    between two close-ups. Creates depth motion that flat panning
      //    can't produce.
      const dollyMag = 0.45;
      const dollyOffset = Math.sin(eased * Math.PI) * dollyMag;

      const targetX = linX + arcDX;
      const targetY = linY + arcDY;
      const targetZoom = Math.max(0.5, (linZoom - dollyOffset) * portraitScale);
      const targetRoll = linRoll;

      // 4) Camera follow — critically-damped lerp so the move feels like a
      //    cinematic glide settling into place, not a snap.
      const kC = 1 - Math.exp(-dt / 0.30);
      cam.x += (targetX - cam.x) * kC;
      cam.y += (targetY - cam.y) * kC;
      cam.zoom += (targetZoom - cam.zoom) * kC;
      cam.roll += (targetRoll - cam.roll) * kC;

      // Palette tuned to read against the cool-gray .bgnet backdrop.
      const accent = dark ? [120, 165, 235] : [40, 95, 215];
      const cool   = dark ? [80, 105, 140]  : [70, 95, 130];
      const dim    = dark ? [48, 60, 80]    : [115, 130, 150];
      const warm   = dark ? [220, 158, 115] : [200, 105, 55];
      const t = frame * (reducedMotion ? 0.012 : 0.025);

      // ── Per-motif visibility ──
      // Each scene has a primary element (DNA at About, equations at
      // Publication, etc.). When the camera is parked on its owner
      // scene the motif is at full alpha; as the camera slides away
      // it fades toward 0.15 so the next motif can take focus. Linear
      // ramp between ±0.5 (full) and ±1.5 (faint).
      const motifVis = (target) => {
        const d = Math.abs(smoothedScene - target);
        if (d <= 0.5) return 1.0;
        if (d >= 1.5) return 0.15;
        return 0.15 + (1.5 - d) * 0.85;
      };
      const visDNA       = motifVis(1);
      const visEquations = motifVis(3);
      const visGrid      = motifVis(4);
      const visLabels    = motifVis(5);
      // Network is the headlining element at Hero (0) AND Research (2)
      // — visible at full alpha on either, faded between.
      const visNetwork   = Math.max(motifVis(0), motifVis(2));
      // Bio motifs are atmospheric background; keep them low so they
      // don't fight whichever scene-motif is currently in focus.
      const visBio       = 0.22;

      // Soft radial wash drawn in SCREEN coords (no transform yet).
      const grad = ctx.createRadialGradient(
        w * 0.5, h * 0.45, 0,
        w * 0.5, h * 0.45, Math.max(w, h) * 0.55
      );
      grad.addColorStop(0, rgba(accent, dark ? 0.055 : 0.045));
      grad.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // ── Camera transform ────────────────────────────────────────────
      // World point (cam.x, cam.y) maps to dead-centre of the canvas.
      // Order matters: translate-to-anchor, rotate by roll, scale by zoom,
      // then shift the world so the target lands on the anchor.
      ctx.save();
      ctx.translate(w * 0.50, h * 0.50);
      ctx.rotate(cam.roll * Math.PI / 180);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);

      // ── Ambient particle field — slow drifting dust behind everything,
      // gives the world ambient depth so corners never feel empty. ─────
      ambient.forEach((p) => {
        const px = p.x + Math.sin(frame * 0.005 + p.phase) * (12 * p.drift);
        const py = p.y + Math.cos(frame * 0.004 + p.phase * 1.3) * (10 * p.drift);
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(dim, p.alpha * 0.5);
        ctx.fill();
      });

      // ── Bio motifs (drawn after ambient, before network) ────────────
      // Atmospheric decoration only — every alpha is multiplied by
      // visBio so they sit well behind whichever scene motif is
      // currently in focus.
      bioMotifs.forEach((m, mi) => {
        const drift = Math.sin(frame * 0.008 + m.phase) * 8;
        if (m.type === "rna") {
          const step = 14;
          const dx = Math.cos(m.angle) * step;
          const dy = Math.sin(m.angle) * step;
          for (let i = 0; i < m.len; i++) {
            const wave = Math.sin(frame * 0.014 + i * 0.75 + m.phase);
            const arc  = Math.sin((i / Math.max(1, m.len - 1)) * Math.PI) * (m.bend || 0);
            const x    = m.x + dx * i + Math.sin(m.angle + Math.PI / 2) * (wave * 5 + arc);
            const y    = m.y + dy * i + drift + Math.cos(m.angle + Math.PI / 2) * (wave * 5 + arc);
            const hot  = (i / Math.max(1, m.len - 1) + frame * 0.0045 + mi * 0.17) % 1;
            const active = hot > 0.42 && hot < 0.58;
            const alpha  = (active ? (dark ? 0.82 : 0.66) : (dark ? 0.4 : 0.32)) * visBio;
            if (i > 0) {
              ctx.beginPath();
              ctx.moveTo(x - dx * 0.72, y - dy * 0.72);
              ctx.lineTo(x - dx * 0.25, y - dy * 0.25);
              ctx.strokeStyle = rgba(dim, (dark ? 0.3 : 0.22) * visBio);
              ctx.lineWidth = active ? 1 : 0.7;
              ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(x, y, active ? 2.3 : 1.55, 0, Math.PI * 2);
            ctx.fillStyle = rgba(i % 2 ? warm : accent, alpha);
            ctx.fill();
          }
        } else if (m.type === "protein") {
          const pts = [];
          for (let i = 0; i < m.len; i++) {
            pts.push({
              x: m.x + Math.cos(i * 0.88 + frame * 0.012 + m.phase) * (12 + i * 2.4) * m.scale,
              y: m.y + drift + i * 10 * m.scale + Math.sin(i * 1.2 + frame * 0.01 + m.phase) * 9 * m.scale,
            });
          }
          ctx.beginPath();
          pts.forEach((pt, i) => { if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y); });
          ctx.strokeStyle = rgba(warm, (dark ? 0.34 : 0.26) * visBio);
          ctx.lineWidth = 0.85;
          ctx.stroke();
          pts.forEach((pt, i) => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, i % 3 === 0 ? 2 : 1.45, 0, Math.PI * 2);
            ctx.fillStyle = rgba(i % 2 ? warm : accent, (dark ? 0.44 : 0.32) * visBio);
            ctx.fill();
          });
        }
      });

      // ── Scene motifs (DNA / equations / grid / labels) ──────────────
      // Drawn after bio motifs but before the network nodes, so the
      // network's bright nodes/pulses still pop over everything.
      sceneMotifs.forEach((m) => {
        // Pick this motif's visibility multiplier — chosen by motif type
        // so it tracks the right scene anchor. Multiplied into every
        // rgba() alpha in the branch.
        let vM = 1;
        if (m.type === "dna") vM = visDNA;
        else if (m.type === "equations") vM = visEquations;
        else if (m.type === "grid") vM = visGrid;
        else if (m.type === "labels") vM = visLabels;
        if (vM < 0.02) return; // fully off — skip the work
        if (m.type === "dna") {
          // Double helix with explicit 3D depth ordering. At each
          // segment we know which strand is "in front" (higher cos
          // value = closer to camera). We draw the BACK strand
          // smaller / dimmer first, then the rung, then the FRONT
          // strand bigger / brighter on top. The result reads as
          // actual depth in 2D, not just two sine curves.
          const step = 20;
          const cx = m.x;
          // Pre-compute strand positions for backbone connections
          const strandA = [];
          const strandB = [];
          for (let i = 0; i < m.len; i++) {
            const py = m.y - (m.len * step) / 2 + i * step;
            const theta = (i / m.len) * Math.PI * 4 + frame * 0.025 + m.phase;
            const zA = Math.cos(theta);
            strandA.push({ x: cx + zA * m.amp, y: py, z: zA });
            strandB.push({ x: cx - zA * m.amp, y: py, z: -zA });
          }
          // Backbone lines first (under everything)
          for (let i = 1; i < m.len; i++) {
            const a0 = strandA[i - 1], a1 = strandA[i];
            const b0 = strandB[i - 1], b1 = strandB[i];
            // Front backbone gets full alpha, back is half
            const aDepth = (a0.z + a1.z) / 2; // -1..1
            const bDepth = (b0.z + b1.z) / 2;
            const aFront = aDepth > bDepth;
            ctx.beginPath();
            ctx.moveTo(b0.x, b0.y);
            ctx.lineTo(b1.x, b1.y);
            ctx.strokeStyle = rgba(warm, (aFront ? 0.22 : 0.55) * vM);
            ctx.lineWidth = aFront ? 1.0 : 1.6;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(a0.x, a0.y);
            ctx.lineTo(a1.x, a1.y);
            ctx.strokeStyle = rgba(accent, (aFront ? 0.55 : 0.22) * vM);
            ctx.lineWidth = aFront ? 1.6 : 1.0;
            ctx.stroke();
          }
          // Rungs + strand dots, depth-ordered per segment
          for (let i = 0; i < m.len; i++) {
            const A = strandA[i];
            const B = strandB[i];
            const aFront = A.z > B.z;
            const backStrand  = aFront ? B : A;
            const frontStrand = aFront ? A : B;
            const backColor  = aFront ? warm : accent;
            const frontColor = aFront ? accent : warm;
            const backDepth01  = (backStrand.z + 1) / 2;   // 0..1
            const frontDepth01 = (frontStrand.z + 1) / 2;
            // Rung between strands — alpha scales with how spread they
            // are (so close-crossing rungs look thin like edge-on)
            const sep = Math.abs(A.x - B.x) / (m.amp * 2);
            ctx.beginPath();
            ctx.moveTo(backStrand.x, backStrand.y);
            ctx.lineTo(frontStrand.x, frontStrand.y);
            ctx.strokeStyle = rgba(dim, (0.16 + sep * 0.28) * vM);
            ctx.lineWidth = 1.1;
            ctx.stroke();
            // Back strand dot — small + dim
            ctx.beginPath();
            ctx.arc(backStrand.x, backStrand.y, 1.6 + backDepth01 * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = rgba(backColor, (0.35 + backDepth01 * 0.25) * vM);
            ctx.fill();
            // Front strand dot — bigger + glow halo
            ctx.beginPath();
            ctx.arc(frontStrand.x, frontStrand.y, 8 + frontDepth01 * 3, 0, Math.PI * 2);
            ctx.fillStyle = rgba(frontColor, 0.08 * frontDepth01 * vM);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(frontStrand.x, frontStrand.y, 3.2 + frontDepth01 * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = rgba(frontColor, (0.8 + frontDepth01 * 0.15) * vM);
            ctx.fill();
          }
        } else if (m.type === "equations") {
          // Academic angle-bracket frame around the cluster — calligraphy
          // detail that says "this is a quoted equation" rather than
          // just floating glyphs.
          {
            const bw = 130, bh = 95; // bracket reach in world coords
            const tip = 10;
            ctx.strokeStyle = rgba(accent, 0.35 * vM);
            ctx.lineWidth = 1.6;
            ctx.lineCap = "round";
            // Left bracket  ⟨
            ctx.beginPath();
            ctx.moveTo(m.x - bw + tip, m.y - bh);
            ctx.lineTo(m.x - bw,      m.y);
            ctx.lineTo(m.x - bw + tip, m.y + bh);
            ctx.stroke();
            // Right bracket ⟩
            ctx.beginPath();
            ctx.moveTo(m.x + bw - tip, m.y - bh);
            ctx.lineTo(m.x + bw,      m.y);
            ctx.lineTo(m.x + bw - tip, m.y + bh);
            ctx.stroke();
          }
          // Compute each glyph's animated position once so we can use
          // it both for the linking lines and for the glyph render.
          const glyphPos = m.glyphs.map((g) => ({
            g,
            x: m.x + g.ox + Math.sin(frame * 0.008 + g.phase) * 6,
            y: m.y + g.oy + Math.cos(frame * 0.006 + g.phase * 1.3) * 5,
            pulse: 1 + Math.sin(frame * 0.018 + g.phase) * 0.07,
          }));
          // Subtle linking lines first (drawn under the glyphs)
          for (let i = 0; i < glyphPos.length - 1; i++) {
            const a = glyphPos[i], b = glyphPos[i + 1];
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = rgba(accent, 0.14 * vM);
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
          // Each glyph: soft accent halo + the glyph itself in italic
          // serif. The halo gives the cluster "live ink" energy.
          glyphPos.forEach(({ g, x, y, pulse }) => {
            // Halo
            const haloR = g.size * 0.7;
            const haloG = ctx.createRadialGradient(x, y, 0, x, y, haloR);
            haloG.addColorStop(0, rgba(accent, 0.18 * vM));
            haloG.addColorStop(1, rgba(accent, 0));
            ctx.fillStyle = haloG;
            ctx.beginPath();
            ctx.arc(x, y, haloR, 0, Math.PI * 2);
            ctx.fill();
            // Glyph
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(pulse, pulse);
            ctx.fillStyle = rgba(accent, 0.78 * vM);
            ctx.font = `italic ${g.size}px Georgia, 'Times New Roman', serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(g.ch, 0, 0);
            ctx.restore();
          });
        } else if (m.type === "grid") {
          // GitHub-style contribution grid with two overlaid diagonal
          // waves (different angles + phases) so the surface reads as
          // a richer interference pattern, not a single repeating
          // marquee. Bright cells get extruded with a fake light-from-
          // top-left shadow so they look raised off the grid.
          const totalW = m.cols * (m.cell + m.gap) - m.gap;
          const totalH = m.rows * (m.cell + m.gap) - m.gap;
          const x0 = m.x - totalW / 2;
          const y0 = m.y - totalH / 2;
          for (let c = 0; c < m.cols; c++) {
            for (let r = 0; r < m.rows; r++) {
              const base = ((c * 31 + r * 17) % 7) / 6;
              // Two waves: one sweeps SE, one sweeps NE, different
              // speeds, so cells light up in moving interference fronts.
              const w1 = Math.sin(c * 0.35 + r * 0.45 + frame * 0.020);
              const w2 = Math.sin(c * 0.30 - r * 0.42 + frame * 0.013 + 1.7);
              const wave = Math.max(0, w1 * 0.45 + w2 * 0.35);
              const intensity = Math.min(1, base * 0.5 + wave);
              const x = x0 + c * (m.cell + m.gap);
              const y = y0 + r * (m.cell + m.gap);
              // Drop shadow under bright cells (extrude illusion).
              // Light from top-left → shadow falls bottom-right.
              if (intensity > 0.55) {
                const lift = (intensity - 0.55) * 2.4; // 0..1
                ctx.fillStyle = rgba([20, 25, 35], 0.18 * lift * vM);
                ctx.fillRect(x + 1.5 * lift, y + 1.5 * lift, m.cell, m.cell);
              }
              // Main cell
              const ar = Math.round(cool[0] + (accent[0] - cool[0]) * intensity);
              const ag = Math.round(cool[1] + (accent[1] - cool[1]) * intensity);
              const ab = Math.round(cool[2] + (accent[2] - cool[2]) * intensity);
              ctx.fillStyle = rgba([ar, ag, ab], (0.32 + intensity * 0.55) * vM);
              ctx.fillRect(x, y, m.cell, m.cell);
              // Bright cells get a top-left highlight + soft glow halo
              if (intensity > 0.7) {
                ctx.fillStyle = rgba([255, 255, 255], (intensity - 0.7) * 0.6 * vM);
                ctx.fillRect(x, y, m.cell, 1.2);
                ctx.fillRect(x, y, 1.2, m.cell);
                ctx.fillStyle = rgba(accent, (intensity - 0.7) * 0.22 * vM);
                ctx.fillRect(x - 2, y - 2, m.cell + 4, m.cell + 4);
              }
            }
          }
        } else if (m.type === "labels") {
          // Compute every label's current position first, so we can
          // draw orbit rings, connecting lines (knowledge graph),
          // halos and labels in the right z-order.
          const pos = m.items.map((it) => {
            const theta = frame * 0.006 * it.speed + it.phase;
            return {
              it,
              x: m.x + Math.cos(theta) * it.r,
              y: m.y + Math.sin(theta) * it.r * 0.6, // squashed orbit
            };
          });
          // Orbit rings — three faint elliptical guides at the
          // distinct radii used by the labels, so the "orbit"
          // metaphor reads visually instead of just from motion.
          const radii = Array.from(new Set(m.items.map((it) => it.r)))
            .sort((a, b) => a - b);
          radii.forEach((r) => {
            ctx.beginPath();
            ctx.ellipse(m.x, m.y, r, r * 0.6, 0, 0, Math.PI * 2);
            ctx.strokeStyle = rgba(accent, 0.10 * vM);
            ctx.lineWidth = 0.6;
            ctx.stroke();
          });
          // Knowledge-graph lines — connect each label to its two
          // nearest neighbours. Recomputed each frame so the graph
          // breathes with the orbits.
          for (let i = 0; i < pos.length; i++) {
            const p = pos[i];
            // Find two closest
            const dists = pos.map((q, j) => ({ j, d: j === i ? Infinity : Math.hypot(q.x - p.x, q.y - p.y) }))
              .sort((a, b) => a.d - b.d).slice(0, 2);
            dists.forEach(({ j, d }) => {
              if (j <= i) return; // avoid duplicate (i,j)+(j,i)
              const fade = Math.max(0, 1 - d / 180);
              if (fade <= 0) return;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(pos[j].x, pos[j].y);
              ctx.strokeStyle = rgba(accent, 0.14 * fade * vM);
              ctx.lineWidth = 0.6;
              ctx.stroke();
            });
          }
          // Labels themselves with a soft glow halo under each
          ctx.font = `600 13px ui-monospace, Menlo, monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          pos.forEach(({ it, x, y }) => {
            const haloG = ctx.createRadialGradient(x, y, 0, x, y, 26);
            haloG.addColorStop(0, rgba(accent, 0.18 * vM));
            haloG.addColorStop(1, rgba(accent, 0));
            ctx.fillStyle = haloG;
            ctx.beginPath();
            ctx.arc(x, y, 26, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = rgba(accent, 0.76 * vM);
            ctx.fillText(it.text, x, y);
          });
          // Central anchor — bright dot + outer ring
          ctx.beginPath();
          ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = rgba(accent, 0.85 * vM);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(m.x, m.y, 14, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(accent, 0.32 * vM);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      // ── Node positions: Lissajous drift around base point ─────────
      // Forward-pass wave: every ~3 seconds a wave sweeps left-to-right
      // through the layers, briefly lighting up each layer's nodes in
      // sequence. Reads as a real inference pass through the net.
      const WAVE_PERIOD = 180;   // frames per full sweep
      const waveT = (frame % WAVE_PERIOD) / WAVE_PERIOD;   // 0..1
      const waveLayer = waveT * (layers.length + 0.5);     // walks 0..N
      nodes.forEach((n) => {
        n.x = n.baseX + Math.sin(t + n.phase) * 2.2;
        n.y = n.baseY + Math.cos(t * 0.7 + n.phase * 1.3) * 2.2;
        n.activation *= 0.93;
        // Wave injection: bump activation when the wave is on n's
        // layer. Narrow window so the burst is per-layer, not global.
        const layerDist = Math.abs(waveLayer - n.layer);
        if (layerDist < 0.45) {
          n.activation = Math.max(n.activation, 0.6 * (1 - layerDist / 0.45));
        }
      });

      // ── Edges ──────────────────────────────────────────────────────
      // Network as a whole is multiplied by visNetwork (full on Hero +
      // Research, faint on other scenes where another motif takes the
      // spotlight). Per-edge `act` activation still modulates within.
      edges.forEach((e) => {
        const a = nodes[e.from];
        const b = nodes[e.to];
        const act = Math.max(a.activation, b.activation);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = act > 0.08
          ? rgba(accent, (0.18 + act * 0.32) * visNetwork)
          : rgba(dim, (dark ? 0.22 : 0.42) * e.weight * visNetwork);
        ctx.lineWidth = act > 0.08 ? 0.9 + act * 0.9 : 0.65;
        ctx.stroke();
      });

      // ── Pulses travelling along edges ─────────────────────────────
      if (frame % (reducedMotion ? 42 : 14) === 0) spawnPulse();

      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += p.speed;
        if (p.t > 1) {
          nodes[p.edge.to].activation = 1;
          pulses.splice(i, 1);
          continue;
        }
        const a = nodes[p.edge.from];
        const b = nodes[p.edge.to];
        const px = a.x + (b.x - a.x) * p.t;
        const py = a.y + (b.y - a.y) * p.t;
        const glow = Math.sin(p.t * Math.PI);
        // Soft trailing tail — line from the source node to the current
        // pulse position, fading out behind it. Gives motion direction.
        const tailLen = 0.22;
        const tailStartT = Math.max(0, p.t - tailLen);
        const tailX = a.x + (b.x - a.x) * tailStartT;
        const tailY = a.y + (b.y - a.y) * tailStartT;
        const tailGrad = ctx.createLinearGradient(tailX, tailY, px, py);
        tailGrad.addColorStop(0, rgba(accent, 0));
        tailGrad.addColorStop(1, rgba(accent, p.alpha * 0.6 * visNetwork));
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(px, py);
        ctx.strokeStyle = tailGrad;
        ctx.lineWidth = 1.4 + glow * 0.8;
        ctx.lineCap = "round";
        ctx.stroke();
        // Inner bright dot
        ctx.beginPath();
        ctx.arc(px, py, 2.4 + glow * 1.3, 0, Math.PI * 2);
        ctx.fillStyle = rgba(accent, Math.min(1, p.alpha + 0.18) * visNetwork);
        ctx.fill();
        // Outer halo — slightly bigger and warmer
        ctx.beginPath();
        ctx.arc(px, py, 11 + glow * 6, 0, Math.PI * 2);
        ctx.fillStyle = rgba(accent, 0.075 * glow * visNetwork);
        ctx.fill();
      }

      // ── Nodes ──────────────────────────────────────────────────────
      nodes.forEach((n) => {
        const mix = Math.min(1, n.activation);
        if (mix > 0.08) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 8 * mix, 0, Math.PI * 2);
          ctx.fillStyle = rgba(accent, mix * 0.08 * visNetwork);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        const cr = Math.round(cool[0] + (accent[0] - cool[0]) * mix);
        const cg = Math.round(cool[1] + (accent[1] - cool[1]) * mix);
        const cb = Math.round(cool[2] + (accent[2] - cool[2]) * mix);
        ctx.fillStyle = rgba([cr, cg, cb], (dark ? 0.78 : 0.88) * visNetwork);
        ctx.fill();
        ctx.strokeStyle = rgba(accent, (0.32 + mix * 0.32) * visNetwork);
        ctx.lineWidth = 0.9;
        ctx.stroke();
      });

      ctx.restore();
      raf.current = requestAnimationFrame(draw);
    };
    draw();

    const onVisibility = () => {
      running = !document.hidden;
      if (running) {
        lastTime = performance.now();
        raf.current = requestAnimationFrame(draw);
      } else if (raf.current) {
        cancelAnimationFrame(raf.current);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
      darkMq.removeEventListener("change", onDarkMq);
      themeObs.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [sceneRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}
    />
  );
}
