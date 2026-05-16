import { useEffect, useRef } from "react";

/* Layered feedforward neural network on a 2D canvas — the AI subject
   readers recognise at a glance (input → hidden → output). Pulses travel
   along edges; a scroll-driven activation wave sweeps left-to-right
   through the layers as the page scrolls top-to-bottom, so scrolling
   feels like "watching the data flow forward through the net". A few
   deliberately-placed bio motifs (RNA strands + protein helices) sit
   in the outer corners — small signal of the AI+Bio research focus,
   not a busy floating particle field.

   Design notes:
   - 2D because it animates smoothly on every machine and reads as the
     literal feedforward NN shape, not a node cloud.
   - pointer-events: none on .bgnet means scroll passes through, so the
     canvas doesn't try to be mouse-interactive.
   - Scroll progress is consumed via a ref handed in from Portfolio —
     no React re-renders per scroll tick, the canvas reads the ref
     inside its own rAF loop. */
export default function NeuralNetCanvas({ progressRef }) {
  const canvasRef = useRef(null);
  const raf = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Classic feedforward shape — input narrow, hidden layers wide, output narrows back.
    const layers = [5, 7, 9, 7, 5, 3];
    let nodes = [];
    let edges = [];
    let pulses = [];
    let bioMotifs = [];
    let edgeCursor = 0;
    let frame = 0;

    // Theme: read data-theme attribute (matches portfolio's theme system),
    // fall back to system preference.
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

    const buildNetwork = () => {
      nodes = [];
      edges = [];
      pulses = [];
      bioMotifs = [];
      const cx = w * 0.5;
      const cy = h * 0.5;
      const netW = Math.min(w * 0.94, 1480);
      const netH = Math.min(h * 0.78, 720);
      const startX = cx - netW / 2;
      const layerGap = netW / (layers.length - 1);

      layers.forEach((count, layer) => {
        const x = startX + layerGap * layer;
        const usableH = netH * (0.78 + layer * 0.018);
        const startY = cy - usableH / 2;
        for (let i = 0; i < count; i++) {
          const ratio = count === 1 ? 0.5 : i / (count - 1);
          // Sine nudge so the column isn't a hard vertical line.
          const curve = Math.sin((ratio - 0.5) * Math.PI) * 14;
          const layerPos = layer / (layers.length - 1); // 0..1 for scroll-wave math
          nodes.push({
            x,
            y: startY + ratio * usableH + curve,
            baseX: x,
            baseY: startY + ratio * usableH + curve,
            layer,
            layerPos,
            r: 3.4 + (layer === 0 || layer === layers.length - 1 ? 0.6 : 1.1),
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
            if (distance < 0.40 || (a + b + layer) % 5 === 0) {
              edges.push({
                from: aStart + a,
                to: bStart + b,
                weight: 1 - Math.min(distance, 0.45),
                // For scroll-wave math: which transition this edge belongs to (0..1).
                tPos: layer / (layers.length - 1),
              });
            }
          }
        }
      }

      // Bio motifs placed deliberately in the outer corners only, not
      // strewn across the network's silhouette. Two RNA strands top-left
      // and bottom-right; two protein helices top-right and bottom-left.
      // This reads as "Bio is present in the margins" rather than "the
      // network is in a soup of molecules".
      if (w >= 720) {
        const pad = 40;
        bioMotifs = [
          { type: "rna",     x: pad,                  y: pad + 30,          len: 11, angle: 0.18,  phase: 0.2, bend: 8 },
          { type: "protein", x: w - pad - 80,         y: pad + 20,          len: 8,  scale: 0.85, phase: 1.6 },
          { type: "protein", x: pad + 20,             y: h - pad - 120,     len: 8,  scale: 0.80, phase: 4.2 },
          { type: "rna",     x: w - pad - 180,        y: h - pad - 30,      len: 10, angle: -0.16, phase: 5.8, bend: -8 },
        ];
      }
    };

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
      if (!edges.length || pulses.length > 24) return;
      const edge = edges[edgeCursor % edges.length];
      edgeCursor += 7;
      pulses.push({
        edge,
        t: 0,
        speed: reducedMotion ? 0.012 : 0.005 + Math.random() * 0.004,
        alpha: 0.55 + Math.random() * 0.28,
      });
    };

    let running = true;

    const draw = () => {
      if (!running) return;
      frame++;
      ctx.clearRect(0, 0, w, h);

      // Palette tuned to read clearly against the cool-gray .bgnet backdrop.
      // Light-mode accent saturated enough that edges + nodes are crisp;
      // warm provides a small amber accent for the bio motifs.
      const accent = dark ? [120, 165, 235] : [37, 90, 210];
      const accentDeep = dark ? [80, 130, 220] : [22, 65, 180];
      const cool   = dark ? [80, 105, 140]  : [70, 95, 130];
      const dim    = dark ? [48, 60, 80]    : [110, 125, 148];
      const warm   = dark ? [220, 158, 115] : [200, 105, 55];
      const t = frame * (reducedMotion ? 0.012 : 0.025);

      // Scroll progress 0..1. Phase wave moves through layers left→right
      // as the page scrolls top→bottom. Adds ~0.35 of extra activation to
      // the layer currently under the scroll position — feels like data
      // flowing forward through the net as the user reads.
      const progress = Math.max(0, Math.min(1, progressRef?.current ?? 0));
      const waveCenter = progress;
      const waveWidth = 0.18;

      // Very soft radial wash for depth.
      const grad = ctx.createRadialGradient(
        w * 0.5, h * 0.45, 0,
        w * 0.5, h * 0.45, Math.max(w, h) * 0.55
      );
      grad.addColorStop(0, rgba(accent, dark ? 0.06 : 0.05));
      grad.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      /* ── Bio motifs (under the network, in the corners) ─── */
      bioMotifs.forEach((m, mi) => {
        const drift = Math.sin(frame * 0.008 + m.phase) * 6;

        if (m.type === "rna") {
          const step = 13;
          const dx = Math.cos(m.angle) * step;
          const dy = Math.sin(m.angle) * step;
          for (let i = 0; i < m.len; i++) {
            const wave = Math.sin(frame * 0.014 + i * 0.75 + m.phase);
            const arc  = Math.sin((i / Math.max(1, m.len - 1)) * Math.PI) * (m.bend || 0);
            const x    = m.x + dx * i + Math.sin(m.angle + Math.PI / 2) * (wave * 5 + arc);
            const y    = m.y + dy * i + drift + Math.cos(m.angle + Math.PI / 2) * (wave * 5 + arc);
            const hot  = (i / Math.max(1, m.len - 1) + frame * 0.0045 + mi * 0.17) % 1;
            const active = hot > 0.42 && hot < 0.58;
            const alpha  = active ? (dark ? 0.72 : 0.58) : (dark ? 0.34 : 0.26);
            if (i > 0) {
              ctx.beginPath();
              ctx.moveTo(x - dx * 0.72, y - dy * 0.72);
              ctx.lineTo(x - dx * 0.25, y - dy * 0.25);
              ctx.strokeStyle = rgba(dim, dark ? 0.28 : 0.22);
              ctx.lineWidth = active ? 1 : 0.7;
              ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(x, y, active ? 2.2 : 1.5, 0, Math.PI * 2);
            ctx.fillStyle = rgba(i % 2 ? warm : accent, alpha);
            ctx.fill();
          }
        } else if (m.type === "protein") {
          const pts = [];
          for (let i = 0; i < m.len; i++) {
            pts.push({
              x: m.x + Math.cos(i * 0.88 + frame * 0.010 + m.phase) * (12 + i * 2.4) * m.scale,
              y: m.y + drift + i * 10 * m.scale + Math.sin(i * 1.2 + frame * 0.008 + m.phase) * 9 * m.scale,
            });
          }
          ctx.beginPath();
          pts.forEach((pt, i) => { if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y); });
          ctx.strokeStyle = rgba(warm, dark ? 0.28 : 0.22);
          ctx.lineWidth = 0.85;
          ctx.stroke();
          pts.forEach((pt, i) => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, i % 3 === 0 ? 1.9 : 1.4, 0, Math.PI * 2);
            ctx.fillStyle = rgba(i % 2 ? warm : accent, dark ? 0.40 : 0.30);
            ctx.fill();
          });
        }
      });

      /* ── Node positions: Lissajous drift around base point ── */
      nodes.forEach((n) => {
        n.x = n.baseX + Math.sin(t + n.phase) * 2.2;
        n.y = n.baseY + Math.cos(t * 0.7 + n.phase * 1.3) * 2.2;
        // Scroll-wave activation bump: layers near the scroll position
        // light up. Falls off as a tent function across waveWidth.
        const dist = Math.abs(n.layerPos - waveCenter);
        const waveBoost = Math.max(0, 1 - dist / waveWidth) * 0.55;
        n.activation = Math.max(n.activation * 0.93, waveBoost);
      });

      /* ── Edges ──────────────────────────────────── */
      edges.forEach((e) => {
        const a = nodes[e.from];
        const b = nodes[e.to];
        const act = Math.max(a.activation, b.activation);
        // Edges between the active layers (scroll wave hovering on this
        // transition) brighten too — reinforces the "data flowing through"
        // feeling.
        const edgeWave = Math.max(0, 1 - Math.abs(e.tPos - waveCenter) / (waveWidth * 1.5));
        const lit = Math.max(act, edgeWave * 0.45);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = lit > 0.08
          ? rgba(accent, 0.22 + lit * 0.40)
          : rgba(dim, (dark ? 0.24 : 0.42) * e.weight);
        ctx.lineWidth = lit > 0.08 ? 0.95 + lit * 1.0 : 0.7;
        ctx.stroke();
      });

      /* ── Pulses travelling along edges ─────────── */
      if (frame % (reducedMotion ? 42 : 11) === 0) spawnPulse();

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
        ctx.arc(px, py, 2.4 + glow * 1.4, 0, Math.PI * 2);
        ctx.fillStyle = rgba(accent, p.alpha);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, 11 + glow * 6, 0, Math.PI * 2);
        ctx.fillStyle = rgba(accent, 0.06 * glow);
        ctx.fill();
      }

      /* ── Nodes ──────────────────────────────────── */
      nodes.forEach((n) => {
        const mix = Math.min(1, n.activation);
        if (mix > 0.08) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 10 * mix, 0, Math.PI * 2);
          ctx.fillStyle = rgba(accent, mix * 0.14);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        // Interpolate node fill from cool (rest) toward accentDeep (active).
        const target = mix > 0.5 ? accent : accentDeep;
        const cr = Math.round(cool[0] + (target[0] - cool[0]) * mix);
        const cg = Math.round(cool[1] + (target[1] - cool[1]) * mix);
        const cb = Math.round(cool[2] + (target[2] - cool[2]) * mix);
        ctx.fillStyle = rgba([cr, cg, cb], dark ? 0.82 : 0.92);
        ctx.fill();
        ctx.strokeStyle = rgba(accent, 0.36 + mix * 0.32);
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      raf.current = requestAnimationFrame(draw);
    };
    draw();

    /* Pause when tab hidden — don't burn CPU off-screen */
    const onVisibility = () => {
      running = !document.hidden;
      if (running) raf.current = requestAnimationFrame(draw);
      else if (raf.current) cancelAnimationFrame(raf.current);
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
  }, [progressRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}
    />
  );
}
