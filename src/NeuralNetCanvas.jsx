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

      // Bio motifs scattered around the network (also world coords).
      const left = -netW / 2;
      const top = -netH * 0.34;
      const bottom = netH * 0.34;
      bioMotifs = [
        { type: "rna",     x: left + netW * 0.10, y: top + netH * 0.12,    len: 13, angle: 0.15,  phase: 0.2, bend: 10 },
        { type: "rna",     x: left + netW * 0.22, y: top + netH * 0.34,    len: 11, angle: -0.22, phase: 1.1, bend: -8 },
        { type: "rna",     x: left + netW * 0.50, y: top + netH * 0.74,    len: 10, angle: -0.20, phase: 3.1, bend: -7 },
        { type: "rna",     x: left + netW * 0.08, y: top + netH * 0.58,    len: 9,  angle: 0.32,  phase: 6.0, bend: 6 },
        { type: "rna",     x: left + netW * 0.82, y: top + netH * 0.34,    len: 9,  angle: -0.30, phase: 8.4, bend: -6 },
        { type: "protein", x: left + netW * 0.76, y: top + netH * 0.18,    len: 10, scale: 1.05, phase: 0.5 },
        { type: "protein", x: left + netW * 0.18, y: bottom - netH * 0.16, len: 8,  scale: 0.92, phase: 2.4 },
        { type: "protein", x: left + netW * 0.42, y: top + netH * 0.06,    len: 7,  scale: 0.70, phase: 5.4 },
        { type: "protein", x: left + netW * 0.58, y: bottom - netH * 0.10, len: 9,  scale: 0.85, phase: 3.7 },
        { type: "protein", x: left + netW * 0.88, y: bottom - netH * 0.28, len: 6,  scale: 0.65, phase: 6.8 },
        { type: "protein", x: left + netW * 0.30, y: top + netH * 0.48,    len: 7,  scale: 0.78, phase: 1.3 },
      ];
    };

    // Six camera waypoints — one per portfolio scene (incl. hero). Each is
    // a target (worldX, worldY, zoom) in world coords; the draw loop
    // interpolates smoothly between them as scroll progress goes 0 → N.
    const computeWaypoints = () => {
      const layerGap = WORLD_W / (layers.length - 1);
      const left = -WORLD_W / 2;
      const top = -WORLD_H * 0.34;
      // Bio anchors — pick two of the existing motifs as scene targets.
      const proteinAnchor = { x: left + WORLD_W * 0.76, y: top + WORLD_H * 0.18 };
      const rnaAnchor     = { x: left + WORLD_W * 0.82, y: top + WORLD_H * 0.34 };

      return [
        // 0 — Hero: wide overview of the entire network
        { x: 0, y: 0, zoom: 1.05 },
        // 1 — About: close-up on the input layer
        { x: left + layerGap * 0.5, y: 0, zoom: 2.6 },
        // 2 — Research: mid-shot on the second hidden layer
        { x: left + layerGap * 2,   y: 0, zoom: 1.7 },
        // 3 — Publication: close-up on the output layer
        { x: left + layerGap * 5,   y: 0, zoom: 2.3 },
        // 4 — Projects: zoom on a protein α-helix
        { x: proteinAnchor.x, y: proteinAnchor.y, zoom: 2.8 },
        // 5 — Skills: zoom on an RNA strand
        { x: rnaAnchor.x,     y: rnaAnchor.y,     zoom: 2.6 },
      ];
    };

    const waypoints = computeWaypoints();

    // Camera state — initialised to the first waypoint so the page opens
    // already framed on the input layer (no jarring initial fly-in).
    const cam = { x: waypoints[0].x, y: waypoints[0].y, zoom: waypoints[0].zoom };
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
      // sceneRef already places the camera at the actual section in view
      // (not at an even chunk of total scroll), so the transition fires
      // when the user crosses the section boundary.
      const lo = Math.floor(smoothedScene);
      const hi = Math.min(lo + 1, segCount);
      const u = smoothedScene - lo;
      const eased = u * u * (3 - 2 * u); // smoothstep
      const a = waypoints[lo];
      const b = waypoints[hi];
      const targetX = a.x + (b.x - a.x) * eased;
      const targetY = a.y + (b.y - a.y) * eased;
      const targetZoom = a.zoom + (b.zoom - a.zoom) * eased;

      // Camera follow — slow critical-damped lerp so the move feels
      // cinematic (glide-in) rather than tracking the cursor exactly.
      const kC = 1 - Math.exp(-dt / 0.30);
      cam.x += (targetX - cam.x) * kC;
      cam.y += (targetY - cam.y) * kC;
      cam.zoom += (targetZoom - cam.zoom) * kC;

      // Palette tuned to read against the cool-gray .bgnet backdrop.
      const accent = dark ? [120, 165, 235] : [40, 95, 215];
      const cool   = dark ? [80, 105, 140]  : [70, 95, 130];
      const dim    = dark ? [48, 60, 80]    : [115, 130, 150];
      const warm   = dark ? [220, 158, 115] : [200, 105, 55];
      const t = frame * (reducedMotion ? 0.012 : 0.025);

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
      // World point (cam.x, cam.y) maps to the centre of the canvas's
      // own container. The canvas now lives inside the left half of the
      // split-stage layout, so the natural anchor is dead-centre of its
      // pane (no left-bias needed any more).
      ctx.save();
      ctx.translate(w * 0.50, h * 0.50);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);

      // ── Bio motifs (drawn first so the network sits on top) ────────
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
            const alpha  = active ? (dark ? 0.82 : 0.66) : (dark ? 0.4 : 0.32);
            if (i > 0) {
              ctx.beginPath();
              ctx.moveTo(x - dx * 0.72, y - dy * 0.72);
              ctx.lineTo(x - dx * 0.25, y - dy * 0.25);
              ctx.strokeStyle = rgba(dim, dark ? 0.3 : 0.22);
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
          ctx.strokeStyle = rgba(warm, dark ? 0.34 : 0.26);
          ctx.lineWidth = 0.85;
          ctx.stroke();
          pts.forEach((pt, i) => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, i % 3 === 0 ? 2 : 1.45, 0, Math.PI * 2);
            ctx.fillStyle = rgba(i % 2 ? warm : accent, dark ? 0.44 : 0.32);
            ctx.fill();
          });
        }
      });

      // ── Node positions: Lissajous drift around base point ─────────
      nodes.forEach((n) => {
        n.x = n.baseX + Math.sin(t + n.phase) * 2.2;
        n.y = n.baseY + Math.cos(t * 0.7 + n.phase * 1.3) * 2.2;
        n.activation *= 0.93;
      });

      // ── Edges ──────────────────────────────────────────────────────
      edges.forEach((e) => {
        const a = nodes[e.from];
        const b = nodes[e.to];
        const act = Math.max(a.activation, b.activation);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = act > 0.08
          ? rgba(accent, 0.18 + act * 0.32)
          : rgba(dim, (dark ? 0.22 : 0.42) * e.weight);
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
        ctx.beginPath();
        ctx.arc(px, py, 2.1 + glow * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = rgba(accent, p.alpha);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, 9 + glow * 5, 0, Math.PI * 2);
        ctx.fillStyle = rgba(accent, 0.055 * glow);
        ctx.fill();
      }

      // ── Nodes ──────────────────────────────────────────────────────
      nodes.forEach((n) => {
        const mix = Math.min(1, n.activation);
        if (mix > 0.08) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 8 * mix, 0, Math.PI * 2);
          ctx.fillStyle = rgba(accent, mix * 0.08);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        const cr = Math.round(cool[0] + (accent[0] - cool[0]) * mix);
        const cg = Math.round(cool[1] + (accent[1] - cool[1]) * mix);
        const cb = Math.round(cool[2] + (accent[2] - cool[2]) * mix);
        ctx.fillStyle = rgba([cr, cg, cb], dark ? 0.78 : 0.88);
        ctx.fill();
        ctx.strokeStyle = rgba(accent, 0.32 + mix * 0.32);
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
