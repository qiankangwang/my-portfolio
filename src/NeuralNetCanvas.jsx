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
// Two distinct network architectures:
//   Hero    — the familiar feed-forward shape, widens then narrows.
//   Research — symmetric hourglass with a 2-node latent bottleneck.
// They share world center; only one is visible at a time (alpha tied
// to its scene's motifVis), so the user sees two different networks
// without them ever overlapping on screen.
const HERO_LAYERS = [5, 7, 9, 7, 5, 3];
const RES_LAYERS  = [7, 4, 2, 4, 7];

export default function NeuralNetCanvas({ sceneRef }) {
  const canvasRef = useRef(null);
  const raf = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Guard against a null 2D context (very old / headless browsers,
    // context-creation failure). Without this, the first frame throws.
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0;
    let h = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Low-spec detection — coarse pointer (mobile), small CPU, or
    // reduced-motion preference. Used below to dial down DPR, particle
    // counts, halos, and other per-frame work so weaker machines stay
    // smooth instead of dropping frames.
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const fewCores = (navigator.hardwareConcurrency || 8) <= 4;
    const lowPerf = reducedMotion || coarse || fewCores;
    const dpr = Math.min(window.devicePixelRatio || 1, lowPerf ? 1 : 2);
    // Per-network state — Hero uses the familiar feed-forward layout,
    // Research uses a tight hourglass with the bottleneck nodes clustered
    // at the visual centre. Each network has its own nodes/edges/pulses.
    const heroNet = {
      layers: HERO_LAYERS,
      layout: "spread",        // node placement strategy
      worldScale: 1,           // full size at world origin
      nodes: [], edges: [], pulses: [], edgeCursor: 0,
    };
    const researchNet = {
      layers: RES_LAYERS,
      layout: "centered",      // narrow layers compress toward y=0
      worldScale: 0.7,         // bigger encoder-decoder diagram
      nodes: [], edges: [], pulses: [], edgeCursor: 0,
    };
    let bioMotifs = [];
    let sceneMotifs = [];
    let ambient = [];
    let frame = 0;

    // The document is committed to a single light theme (html{color-scheme:
    // light}, theme-color cream). A dark-tuned palette composited via
    // multiply over cream read lower-contrast and inconsistent, so the
    // canvas is hardcoded to its light palette — no prefers-color-scheme
    // listener.
    const dark = false;
    const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;

    // Build one network into the given container. layout=="centered"
    // makes narrow layers compress toward y=0 — required for the
    // hourglass shape so the bottleneck reads as a centred pinch.
    const buildOneNetwork = (net) => {
      net.nodes = [];
      net.edges = [];
      net.pulses = [];
      net.edgeCursor = 0;
      const scale = net.worldScale || 1;
      const netW = WORLD_W * scale;
      const netH = WORLD_H * scale;
      const ls = net.layers;
      const layerGap = netW / (ls.length - 1);
      const startX = -netW / 2;
      const maxCount = Math.max(...ls);

      ls.forEach((count, layer) => {
        const x = startX + layerGap * layer;
        // For the hourglass, narrow layers occupy proportionally less
        // vertical space so the 2-node bottleneck sits near y=0.
        const heightFactor = net.layout === "centered"
          ? Math.pow(count / maxCount, 1.6)
          : (0.76 + layer * 0.018);
        const usableH = netH * (net.layout === "centered" ? 0.78 * heightFactor : heightFactor);
        const layerStartY = -usableH / 2;
        for (let i = 0; i < count; i++) {
          const ratio = count === 1 ? 0.5 : i / (count - 1);
          const curve = Math.sin((ratio - 0.5) * Math.PI) * 14;
          net.nodes.push({
            x,
            y: layerStartY + ratio * usableH + curve,
            baseX: x,
            baseY: layerStartY + ratio * usableH + curve,
            layer,
            r: 3.2 + (layer === 0 || layer === ls.length - 1 ? 0.4 : 0.9),
            phase: Math.random() * Math.PI * 2,
            activation: layer === 0 ? 0.4 : 0,
          });
        }
      });

      const layerStarts = ls.reduce((acc, count, i) => {
        acc.push(i === 0 ? 0 : acc[i - 1] + ls[i - 1]);
        return acc;
      }, []);

      for (let layer = 0; layer < ls.length - 1; layer++) {
        const aStart = layerStarts[layer];
        const bStart = layerStarts[layer + 1];
        for (let a = 0; a < ls[layer]; a++) {
          for (let b = 0; b < ls[layer + 1]; b++) {
            const distance = Math.abs(
              (a + 0.5) / ls[layer] - (b + 0.5) / ls[layer + 1]
            );
            if (distance < 0.38 || (a + b + layer) % 5 === 0) {
              net.edges.push({
                from: aStart + a,
                to: bStart + b,
                weight: 1 - Math.min(distance, 0.45),
              });
            }
          }
        }
      }
    };

    // Build both networks + ambient world decoration.
    const buildNetwork = () => {
      buildOneNetwork(heroNet);
      buildOneNetwork(researchNet);
      bioMotifs = [];
      const netW = WORLD_W;
      const netH = WORLD_H;

      // Atmospheric bio motifs (RNA + protein helices) scattered around
      // the network. These are the "always-on" texture that gives the
      // world its biology flavour.
      const left = -netW / 2;
      const top = -netH * 0.34;
      const bottom = netH * 0.34;
      bioMotifs = [
        { type: "rna",     x: left + netW * 0.12, y: top + netH * 0.16,    len: 12, angle: 0.18,  phase: 0.2, bend: 9  },
        { type: "rna",     x: left + netW * 0.52, y: top + netH * 0.78,    len: 10, angle: -0.20, phase: 3.1, bend: -7 },
        { type: "protein", x: left + netW * 0.88, y: bottom - netH * 0.28, len: 7,  scale: 0.72, phase: 6.8 },
        { type: "protein", x: left + netW * 0.32, y: top + netH * 0.50,    len: 7,  scale: 0.80, phase: 1.3 },
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
      const ambientCount = reducedMotion ? 0 : (lowPerf ? 26 : 70);
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

    // Six camera waypoints. Motif sits OPPOSITE the text quadrant
    // (sect[data-pos]) so they don't share screen space — and consecutive
    // waypoints land in different halves of the viewport so every scene
    // transition is a visible camera swing, not a drift.
    //   About (tr) → DNA upper-left
    //   Research (mr) → network mid-left
    //   Publication (bl) → equations upper-right
    //   Projects (br) → grid lower-left
    //   Skills (tl) → labels lower-right
    const computeWaypoints = () => {
      return [
        { x: 0,    y: 0,    zoom: 1.2, roll: 0    }, // 0 — Hero
        { x: -290, y: -160, zoom: 2.3, roll: -3   }, // 1 — About
        { x: -15, y: 30,    zoom: 1.3,  roll: 0   }, // 2 — Research (encoder-decoder, shifted right of text + enlarged)
        { x: 295,  y: -160, zoom: 2.4, roll: -3   }, // 3 — Publication (right) ← swing across
        { x: -310, y: 230,  zoom: 2.6, roll: 4    }, // 4 — Projects (left-bottom) ← swing back
        { x: 290,  y: 230,  zoom: 2.3, roll: -2.5 }, // 5 — Skills (right-bottom)
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
    const onResize = () => {
      resize();
      // The reduced-motion path renders a single static frame and stops
      // the rAF loop, so a resize (which clears the backing store) needs
      // an explicit one-shot redraw.
      if (reducedMotion) {
        cancelAnimationFrame(raf.current);
        raf.current = requestAnimationFrame(draw);
      }
    };
    window.addEventListener("resize", onResize);

    const spawnPulse = (net) => {
      if (!net.edges.length || net.pulses.length > 18) return;
      const edge = net.edges[net.edgeCursor % net.edges.length];
      net.edgeCursor += 7;
      net.pulses.push({
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
      // Each scene has a primary motif (DNA at About, equations at
      // Publication, etc.). Tight parked zone at full alpha, smoothstep
      // crossfade ending at zero by the time the adjacent scene parks
      // — so when the camera is on scene N, scene N±1's motifs are
      // fully gone, not lingering at 50%.
      const motifVis = (target) => {
        const d = Math.abs(smoothedScene - target);
        if (d <= 0.15) return 1.0;
        if (d >= 0.85) return 0.0;
        const t = (0.85 - d) / 0.7;
        return t * t * (3 - 2 * t);
      };
      const visDNA       = motifVis(1);
      const visEquations = motifVis(3);
      const visGrid      = motifVis(4);
      const visLabels    = motifVis(5);
      // Per-network alpha — Hero net dimmed so the giant name stays
      // legible behind it; Research net keeps full punch.
      const visHeroNet     = 0.55 * motifVis(0);
      const visResearchNet = motifVis(2);
      // Bio motifs: prominent on Hero, clearly visible-but-smaller on
      // sub-sections so they read as atmosphere instead of disappearing.
      // Fully suppressed on Research where the user wants network alone.
      const visBio       = (0.6 + 0.35 * motifVis(0)) * (1 - motifVis(2));
      // Physical scale — Hero full, sub-sections at 60% so the close-up
      // camera zoom doesn't blow them up over the text.
      const sizeBio      = 0.6 + 0.4 * motifVis(0);
      // Network intensity presets — Hero is calm + sparse pulses; Research
      // is more active. Passed into drawNetwork below.
      const HERO_INTENSITY = {
        pulseEvery: 22, edgeBoost: 1.0, lineBoost: 1.0,
        wavePeriod: 180, wavePeak: 0.38,
        haloAlpha: 0.045, haloRBoost: 0,
        bottleneckBoost: 1.0,
      };
      const RES_INTENSITY = {
        pulseEvery: 16, edgeBoost: 1.18, lineBoost: 1.06,
        wavePeriod: 200, wavePeak: 0.5,
        haloAlpha: 0.06, haloRBoost: 0.5,
        // Hourglass-specific: when the wave hits a bottleneck layer (<=2
        // nodes), nodes pulse harder so the compression beat is felt.
        bottleneckBoost: 1.55,
        // Draw the directional encode→latent→decode "signal front" (a
        // luminous band that sweeps left→right and pinches at the
        // bottleneck) — only on the encoder-decoder, not the hero net.
        flow: true,
      };

      // Soft radial wash drawn in SCREEN coords. Skipped on low-spec
      // machines — it's a full-screen gradient fill every frame.
      if (!lowPerf) {
        const grad = ctx.createRadialGradient(
          w * 0.5, h * 0.45, 0,
          w * 0.5, h * 0.45, Math.max(w, h) * 0.55
        );
        grad.addColorStop(0, rgba(accent, dark ? 0.055 : 0.045));
        grad.addColorStop(1, rgba(accent, 0));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // ── Camera transform ────────────────────────────────────────────
      // World point (cam.x, cam.y) maps to dead-centre of the canvas.
      // Order matters: translate-to-anchor, rotate by roll, scale by zoom,
      // then shift the world so the target lands on the anchor.
      ctx.save();
      ctx.translate(w * 0.50, h * 0.50);
      ctx.rotate(cam.roll * Math.PI / 180);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);

      // ── Ambient particle field — slow drifting dust behind everything.
      // Suppressed on Research so the network reads as the only element.
      const visAmbient = 1 - motifVis(2);
      if (visAmbient > 0.02) {
        ambient.forEach((p) => {
          const px = p.x + Math.sin(frame * 0.005 + p.phase) * (12 * p.drift);
          const py = p.y + Math.cos(frame * 0.004 + p.phase * 1.3) * (10 * p.drift);
          ctx.beginPath();
          ctx.arc(px, py, p.r, 0, Math.PI * 2);
          ctx.fillStyle = rgba(dim, p.alpha * 0.5 * visAmbient);
          ctx.fill();
        });
      }

      // ── Bio motifs (drawn after ambient, before network) ────────────
      // Atmospheric decoration only — every alpha is multiplied by
      // visBio so they sit well behind whichever scene motif is
      // currently in focus.
      bioMotifs.forEach((m, mi) => {
        const drift = Math.sin(frame * 0.008 + m.phase) * 8;
        if (m.type === "rna") {
          const step = 22 * sizeBio;
          const dx = Math.cos(m.angle) * step;
          const dy = Math.sin(m.angle) * step;
          for (let i = 0; i < m.len; i++) {
            const wave = Math.sin(frame * 0.014 + i * 0.75 + m.phase);
            const arc  = Math.sin((i / Math.max(1, m.len - 1)) * Math.PI) * (m.bend || 0) * 1.4;
            const x    = m.x + dx * i + Math.sin(m.angle + Math.PI / 2) * (wave * 9 * sizeBio + arc * sizeBio);
            const y    = m.y + dy * i + drift + Math.cos(m.angle + Math.PI / 2) * (wave * 9 * sizeBio + arc * sizeBio);
            const hot  = (i / Math.max(1, m.len - 1) + frame * 0.0045 + mi * 0.17) % 1;
            const active = hot > 0.42 && hot < 0.58;
            const alpha  = (active ? (dark ? 0.88 : 0.78) : (dark ? 0.5 : 0.45)) * visBio;
            if (i > 0) {
              ctx.beginPath();
              ctx.moveTo(x - dx * 0.72, y - dy * 0.72);
              ctx.lineTo(x - dx * 0.25, y - dy * 0.25);
              ctx.strokeStyle = rgba(dim, (dark ? 0.42 : 0.34) * visBio);
              ctx.lineWidth = (active ? 1.5 : 1.1) * Math.max(0.55, sizeBio);
              ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(x, y, (active ? 3.6 : 2.4) * Math.max(0.55, sizeBio), 0, Math.PI * 2);
            ctx.fillStyle = rgba(i % 2 ? warm : accent, alpha);
            ctx.fill();
          }
        } else if (m.type === "protein") {
          const s = m.scale * 1.55 * sizeBio;
          const pts = [];
          for (let i = 0; i < m.len; i++) {
            pts.push({
              x: m.x + Math.cos(i * 0.88 + frame * 0.012 + m.phase) * (12 + i * 2.4) * s,
              y: m.y + drift + i * 10 * s + Math.sin(i * 1.2 + frame * 0.01 + m.phase) * 9 * s,
            });
          }
          ctx.beginPath();
          pts.forEach((pt, i) => { if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y); });
          ctx.strokeStyle = rgba(warm, (dark ? 0.46 : 0.4) * visBio);
          ctx.lineWidth = 1.4 * Math.max(0.55, sizeBio);
          ctx.stroke();
          pts.forEach((pt, i) => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, (i % 3 === 0 ? 3.2 : 2.3) * Math.max(0.55, sizeBio), 0, Math.PI * 2);
            ctx.fillStyle = rgba(i % 2 ? warm : accent, (dark ? 0.58 : 0.5) * visBio);
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
            // Halo — skip on low-spec (one gradient per glyph per frame).
            if (!lowPerf) {
              const haloR = g.size * 0.7;
              const haloG = ctx.createRadialGradient(x, y, 0, x, y, haloR);
              haloG.addColorStop(0, rgba(accent, 0.18 * vM));
              haloG.addColorStop(1, rgba(accent, 0));
              ctx.fillStyle = haloG;
              ctx.beginPath();
              ctx.arc(x, y, haloR, 0, Math.PI * 2);
              ctx.fill();
            }
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
            if (!lowPerf) {
              const haloG = ctx.createRadialGradient(x, y, 0, x, y, 26);
              haloG.addColorStop(0, rgba(accent, 0.18 * vM));
              haloG.addColorStop(1, rgba(accent, 0));
              ctx.fillStyle = haloG;
              ctx.beginPath();
              ctx.arc(x, y, 26, 0, Math.PI * 2);
              ctx.fill();
            }
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

      // ── Encoder-decoder schematic frame ───────────────────────────
      // For hourglass networks (a layer with ≤2 nodes flanked by wider
      // layers), draw the classic trapezoid encoder + bottleneck box +
      // trapezoid decoder around the nodes, with labels — matches the
      // textbook autoencoder diagram look.
      const drawHourglassFrame = (net, alphaScale) => {
        const ls = net.layers;
        const minCount = Math.min(...ls);
        if (minCount > 2) return;
        const bIdx = ls.indexOf(minCount);
        if (bIdx <= 0 || bIdx >= ls.length - 1) return;

        const scale = net.worldScale || 1;
        const netW = WORLD_W * scale;
        const netH = WORLD_H * scale;
        const maxCount = Math.max(...ls);
        const layerGap = netW / (ls.length - 1);
        const startX = -netW / 2;

        const layerHalfH = (layer) => {
          const c = ls[layer];
          const heightFactor = Math.pow(c / maxCount, 1.6);
          return netH * 0.78 * heightFactor / 2;
        };
        const layerX = (layer) => startX + layerGap * layer;

        const inX  = layerX(0);
        const inH  = layerHalfH(0)        + 30;
        const bX   = layerX(bIdx);
        const bH   = layerHalfH(bIdx)     + 28;
        const outX = layerX(ls.length - 1);
        const outH = layerHalfH(ls.length - 1) + 30;
        const bHalfW = 28;       // bottleneck box half-width
        const sidePad = 18;      // trapezoid padding past input/output

        // Encoder trapezoid — wide on the left tapering into the bottleneck.
        ctx.beginPath();
        ctx.moveTo(inX - sidePad, -inH);
        ctx.lineTo(bX - bHalfW,   -bH);
        ctx.lineTo(bX - bHalfW,    bH);
        ctx.lineTo(inX - sidePad,  inH);
        ctx.closePath();
        ctx.fillStyle = rgba(accent, 0.085 * alphaScale);
        ctx.fill();
        ctx.strokeStyle = rgba(accent, 0.55 * alphaScale);
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Bottleneck box — warm-tinted to read as the latent space.
        ctx.beginPath();
        ctx.rect(bX - bHalfW, -bH, bHalfW * 2, bH * 2);
        ctx.fillStyle = rgba(warm, 0.14 * alphaScale);
        ctx.fill();
        ctx.strokeStyle = rgba(warm, 0.75 * alphaScale);
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Decoder trapezoid — mirror of encoder.
        ctx.beginPath();
        ctx.moveTo(bX + bHalfW,    -bH);
        ctx.lineTo(outX + sidePad, -outH);
        ctx.lineTo(outX + sidePad,  outH);
        ctx.lineTo(bX + bHalfW,     bH);
        ctx.closePath();
        ctx.fillStyle = rgba(accent, 0.085 * alphaScale);
        ctx.fill();
        ctx.strokeStyle = rgba(accent, 0.55 * alphaScale);
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // ── Bio-themed input / output ──
        // Input: DNA base letters per input node, color-coded by class
        // (purines A/G → warm; pyrimidines C/T → accent) so the sequence
        // reads as a coloured strand being embedded.
        // Output: amino-acid one-letter codes per output node with a
        // faint backbone — reads as a folded primary sequence emerging
        // from the latent.
        const bases  = ["A", "C", "G", "T", "A", "G", "C", "T", "A"];
        const aminos = ["M", "K", "F", "R", "L", "Y", "P", "W", "I"];
        const isPurine = (b) => b === "A" || b === "G";

        ctx.save();
        ctx.textBaseline = "middle";
        const layerOf = (idx) => net.nodes.filter((n) => n.layer === idx);

        // Input DNA letters (right-aligned so they butt against the input nodes)
        ctx.textAlign = "right";
        ctx.font = `italic 700 20px Georgia, 'Times New Roman', serif`;
        const inputNodes = layerOf(0);
        inputNodes.forEach((n, i) => {
          const b = bases[i % bases.length];
          ctx.fillStyle = rgba(isPurine(b) ? warm : accent, 0.92 * alphaScale);
          ctx.fillText(b, n.baseX - n.r - 7, n.baseY);
        });

        // Output amino-acid letters (left-aligned past the output nodes)
        ctx.textAlign = "left";
        const outputNodes = layerOf(ls.length - 1);
        const aaPositions = outputNodes.map((n, i) => {
          const drift = Math.sin(frame * 0.022 + i * 0.55) * 2.4;
          return { x: n.baseX + n.r + 7, y: n.baseY + drift, i };
        });

        // Faint backbone line connecting amino positions
        if (aaPositions.length > 1) {
          ctx.beginPath();
          aaPositions.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x + 6, p.y);
            else ctx.lineTo(p.x + 6, p.y);
          });
          ctx.strokeStyle = rgba(warm, 0.5 * alphaScale);
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // Amino letters themselves, alternating accent / warm
        ctx.font = `italic 700 20px Georgia, 'Times New Roman', serif`;
        aaPositions.forEach((p) => {
          ctx.fillStyle = rgba(p.i % 2 ? accent : warm, 0.92 * alphaScale);
          ctx.fillText(aminos[p.i % aminos.length], p.x, p.y);
        });
        ctx.restore();
      };

      // ── Render one network ─────────────────────────────────────────
      // Drift nodes, draw edges, advance + draw pulses, draw node halos.
      // alphaScale is the visibility multiplier (0 = fully off); params
      // controls intensity (pulse cadence, edge boost, wave behaviour).
      const drawOneNetwork = (net, alphaScale, params) => {
        if (alphaScale < 0.02) return;
        drawHourglassFrame(net, alphaScale);
        const ls = net.layers;
        const waveT = (frame % params.wavePeriod) / params.wavePeriod;
        const waveLayer = waveT * (ls.length + 0.5);

        // Node drift + forward-pass wave activation injection. Bottleneck
        // layers (<=2 nodes) get an extra activation boost so the latent
        // compression in the hourglass reads as a clear visual beat.
        net.nodes.forEach((n) => {
          n.x = n.baseX + Math.sin(t + n.phase) * 2.2;
          n.y = n.baseY + Math.cos(t * 0.7 + n.phase * 1.3) * 2.2;
          n.activation *= 0.955;
          const layerDist = Math.abs(waveLayer - n.layer);
          if (layerDist < 0.45) {
            const isBottleneck = ls[n.layer] <= 2;
            const peak = params.wavePeak * (isBottleneck ? params.bottleneckBoost : 1);
            n.activation = Math.max(n.activation, peak * (1 - layerDist / 0.45));
          }
        });

        // ── Encode → latent → decode signal front (encoder-decoder only) ──
        // A luminous vertical front sweeps left→right tracking the forward
        // wave; its height follows the hourglass envelope, so it visibly
        // PINCHES into the 2-node latent (compression) and EXPANDS back out
        // (reconstruction). A warm bloom fires at the latent as it crosses.
        // Drawn here — under the edges/pulses/nodes — so the bright network
        // still reads on top while the front sweeps behind it.
        if (params.flow) {
          const fNetW = WORLD_W * (net.worldScale || 1);
          const fNetH = WORLD_H * (net.worldScale || 1);
          const fMax = Math.max(...ls);
          const fGap = fNetW / (ls.length - 1);
          const fStartX = -fNetW / 2;
          const fBIdx = ls.indexOf(Math.min(...ls));
          const halfHAt = (fl) => {
            const lo = Math.max(0, Math.min(ls.length - 1, Math.floor(fl)));
            const hi = Math.min(ls.length - 1, lo + 1);
            const f = Math.max(0, Math.min(1, fl - lo));
            const hh = (L) => fNetH * 0.78 * Math.pow(ls[L] / fMax, 1.6) / 2;
            return hh(lo) + (hh(hi) - hh(lo)) * f;
          };
          // Front position over the layers; fade out once it passes the
          // output so each cycle reads as one clean left→right pass.
          const fl = Math.max(0, Math.min(ls.length - 1, waveLayer));
          const flowVis = waveLayer > ls.length - 1
            ? Math.max(0, 1 - (waveLayer - (ls.length - 1)) / 0.5)
            : 1;
          const frontX = fStartX + fGap * fl;
          const frontHalfH = Math.max(16, halfHAt(fl) + 10);
          const bProx = Math.max(0, 1 - Math.abs(fl - fBIdx) / 1.2); // peaks at latent
          if (flowVis > 0) {
            // Soft trailing glow band (skipped on low-spec — it's a gradient).
            if (!lowPerf) {
              const bandW = 38;
              const g = ctx.createLinearGradient(frontX - bandW, 0, frontX + bandW, 0);
              g.addColorStop(0, rgba(accent, 0));
              g.addColorStop(0.5, rgba(accent, (0.10 + 0.20 * bProx) * flowVis * alphaScale));
              g.addColorStop(1, rgba(accent, 0));
              ctx.fillStyle = g;
              ctx.fillRect(frontX - bandW, -frontHalfH, bandW * 2, frontHalfH * 2);
            }
            // Bright leading edge — height = the envelope, so the line itself
            // shrinks into the latent then grows back on decode. Cheap; always on.
            ctx.beginPath();
            ctx.moveTo(frontX, -frontHalfH);
            ctx.lineTo(frontX, frontHalfH);
            ctx.strokeStyle = rgba(accent, (0.28 + 0.42 * bProx) * flowVis * alphaScale);
            ctx.lineWidth = 1.1 + bProx * 1.6;
            ctx.stroke();
            // Latent compression bloom at the bottleneck box.
            if (!lowPerf && bProx > 0.45) {
              const flash = (bProx - 0.45) / 0.55;
              const bx = fStartX + fGap * fBIdx;
              const r = 20 + flash * 22;
              const fg = ctx.createRadialGradient(bx, 0, 0, bx, 0, r);
              fg.addColorStop(0, rgba(warm, 0.55 * flash * flowVis * alphaScale));
              fg.addColorStop(1, rgba(warm, 0));
              ctx.fillStyle = fg;
              ctx.beginPath();
              ctx.arc(bx, 0, r, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // Edges
        net.edges.forEach((e) => {
          const a = net.nodes[e.from];
          const b = net.nodes[e.to];
          const act = Math.max(a.activation, b.activation);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = act > 0.08
            ? rgba(accent, (0.18 + act * 0.32) * params.edgeBoost * alphaScale)
            : rgba(dim, (dark ? 0.22 : 0.42) * e.weight * params.edgeBoost * alphaScale);
          ctx.lineWidth = (act > 0.08 ? 0.9 + act * 0.9 : 0.65) * params.lineBoost;
          ctx.stroke();
        });

        // Pulses
        const pulseEvery = reducedMotion ? 48 : params.pulseEvery;
        if (frame % pulseEvery === 0) spawnPulse(net);
        for (let i = net.pulses.length - 1; i >= 0; i--) {
          const p = net.pulses[i];
          p.t += p.speed;
          if (p.t > 1) {
            net.nodes[p.edge.to].activation = 1;
            net.pulses.splice(i, 1);
            continue;
          }
          const a = net.nodes[p.edge.from];
          const b = net.nodes[p.edge.to];
          const px = a.x + (b.x - a.x) * p.t;
          const py = a.y + (b.y - a.y) * p.t;
          const glow = Math.sin(p.t * Math.PI);
          const tailLen = 0.22;
          const tailStartT = Math.max(0, p.t - tailLen);
          const tailX = a.x + (b.x - a.x) * tailStartT;
          const tailY = a.y + (b.y - a.y) * tailStartT;
          const tailGrad = ctx.createLinearGradient(tailX, tailY, px, py);
          tailGrad.addColorStop(0, rgba(accent, 0));
          tailGrad.addColorStop(1, rgba(accent, p.alpha * 0.6 * alphaScale));
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(px, py);
          ctx.strokeStyle = tailGrad;
          ctx.lineWidth = 1.4 + glow * 0.8;
          ctx.lineCap = "round";
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(px, py, 2.4 + glow * 1.3, 0, Math.PI * 2);
          ctx.fillStyle = rgba(accent, Math.min(1, p.alpha + 0.18) * alphaScale);
          ctx.fill();
          // Outer halo skipped on low-spec — it's the most expensive
          // per-pulse fill, and the inner dot already conveys the pulse.
          if (!lowPerf) {
            const haloR = 9 + glow * (4.5 + params.haloRBoost);
            ctx.beginPath();
            ctx.arc(px, py, haloR, 0, Math.PI * 2);
            ctx.fillStyle = rgba(accent, params.haloAlpha * glow * alphaScale);
            ctx.fill();
          }
        }

        // Nodes
        net.nodes.forEach((n) => {
          const mix = Math.min(1, n.activation);
          if (!lowPerf && mix > 0.08) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r + 8 * mix, 0, Math.PI * 2);
            ctx.fillStyle = rgba(accent, mix * 0.08 * alphaScale);
            ctx.fill();
          }
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          const cr = Math.round(cool[0] + (accent[0] - cool[0]) * mix);
          const cg = Math.round(cool[1] + (accent[1] - cool[1]) * mix);
          const cb = Math.round(cool[2] + (accent[2] - cool[2]) * mix);
          ctx.fillStyle = rgba([cr, cg, cb], (dark ? 0.78 : 0.88) * alphaScale);
          ctx.fill();
          ctx.strokeStyle = rgba(accent, (0.32 + mix * 0.32) * alphaScale);
          ctx.lineWidth = 0.9;
          ctx.stroke();
        });
      };

      drawOneNetwork(heroNet,     visHeroNet,     HERO_INTENSITY);
      drawOneNetwork(researchNet, visResearchNet, RES_INTENSITY);

      ctx.restore();
      // Under prefers-reduced-motion we render exactly one static frame
      // and do NOT schedule the next — no auto-playing motion (WCAG
      // 2.2.2 / 2.3.3). Re-render is driven only by resize / visibility.
      if (!reducedMotion) raf.current = requestAnimationFrame(draw);
    };
    draw();

    const onVisibility = () => {
      running = !document.hidden;
      if (running) {
        lastTime = performance.now();
        cancelAnimationFrame(raf.current); // avoid stacking a second loop
        raf.current = requestAnimationFrame(draw);
      } else if (raf.current) {
        cancelAnimationFrame(raf.current);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", onResize);
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
