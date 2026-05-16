import { useEffect, useRef } from "react";

/* Layered feedforward neural network on a 2D canvas — the visualisation
   people actually recognise as a "neural network" (input → hidden → output).
   Lives fixed full-bleed behind the page. Pulses travel along edges,
   bursts arriving at output nodes light them up. Bio motifs (RNA strands +
   protein helices) drift in the gaps so the AI + Bio research identity
   shows in one image.

   Notes on why this is 2D not r3f:
   - The previous r3f version was a Fibonacci sphere of nodes, which doesn't
     read as "neural network" — it reads as "node cloud". A layered shape is
     the literal canonical NN diagram.
   - A 2D canvas with rAF rendering is buttery-smooth on every machine. No
     postprocessing, no shaders, no per-frame instance buffer reuploads.
   - pointer-events: none on .bgnet means scroll passes through, so we don't
     try to be mouse-interactive here; the animation runs autonomously. */
export default function NeuralNetCanvas() {
  const canvasRef = useRef(null);
  const raf = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Classic feedforward shape — input narrow, hidden layers wide, output
    // narrows back down. Reads as "neural net" at a glance.
    const layers = [5, 7, 9, 7, 5, 3];
    let nodes = [];
    let edges = [];
    let pulses = [];
    let bioMotifs = [];
    let edgeCursor = 0;
    let frame = 0;

    // Theme detection: read data-theme attribute on <html> (matches the
    // rest of the portfolio's theme system), fall back to system pref.
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
      const netW = Math.min(w * 0.92, 1400);
      const netH = Math.min(h * 0.82, 760);
      const startX = cx - netW / 2;
      const layerGap = netW / (layers.length - 1);

      layers.forEach((count, layer) => {
        const x = startX + layerGap * layer;
        // Slight per-layer height variation so the shape isn't a hard rectangle.
        const usableH = netH * (0.76 + layer * 0.018);
        const startY = cy - usableH / 2;
        for (let i = 0; i < count; i++) {
          const ratio = count === 1 ? 0.5 : i / (count - 1);
          // Sine-curve nudges nodes off the strict vertical line — feels
          // organic, not graph-paper.
          const curve = Math.sin((ratio - 0.5) * Math.PI) * 14;
          nodes.push({
            x,
            y: startY + ratio * usableH + curve,
            baseX: x,
            baseY: startY + ratio * usableH + curve,
            layer,
            r: 3.2 + (layer === 0 || layer === layers.length - 1 ? 0.4 : 0.9),
            phase: Math.random() * Math.PI * 2,
            activation: layer === 0 ? 0.4 : 0,
          });
        }
      });

      // Edges between consecutive layers — sparser than fully-connected so
      // the diagram doesn't read as a mess. Bias toward "vertically similar"
      // pairs (a clean nearest-neighbour-ish look) plus a periodic stride
      // for variety.
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

      if (w >= 480) {
        const left = startX;
        const top = cy - netH * 0.34;
        const bottom = cy + netH * 0.34;
        // A small bio touch: a few RNA strands + protein helices in the
        // gutters — signals AI + Bio research without competing with
        // the network's silhouette.
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
      frame++;
      ctx.clearRect(0, 0, w, h);
      // Palette tuned to actually READ against the cool-gray backdrop.
      // Light-mode dim was previously near-bg gray so edges vanished —
      // pushed to a darker slate so they show as visible structure.
      const accent = dark ? [120, 165, 235] : [40, 95, 215];
      const cool   = dark ? [80, 105, 140]  : [70, 95, 130];
      const dim    = dark ? [48, 55, 66]    : [115, 130, 150];
      const warm   = dark ? [220, 158, 115] : [200, 105, 55];
      const t = frame * (reducedMotion ? 0.012 : 0.025);

      // Very soft radial wash — adds depth without competing with the net.
      const grad = ctx.createRadialGradient(
        w * 0.5, h * 0.45, 0,
        w * 0.5, h * 0.45, Math.max(w, h) * 0.55
      );
      grad.addColorStop(0, rgba(accent, dark ? 0.055 : 0.045));
      grad.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      /* ── Bio motifs (drawn under the network so the net sits on top) ─── */
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
            const alpha  = active ? (dark ? 0.78 : 0.62) : (dark ? 0.36 : 0.28);
            if (i > 0) {
              ctx.beginPath();
              ctx.moveTo(x - dx * 0.72, y - dy * 0.72);
              ctx.lineTo(x - dx * 0.25, y - dy * 0.25);
              ctx.strokeStyle = rgba(dim, dark ? 0.28 : 0.20);
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
          ctx.strokeStyle = rgba(warm, dark ? 0.30 : 0.22);
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

      /* ── Node positions: gentle Lissajous-style drift around base point ── */
      nodes.forEach((n) => {
        n.x = n.baseX + Math.sin(t + n.phase) * 2.2;
        n.y = n.baseY + Math.cos(t * 0.7 + n.phase * 1.3) * 2.2;
        n.activation *= 0.93;
      });

      /* ── Edges ──────────────────────────────────────── */
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

      /* ── Pulses: signals travelling along edges ────── */
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
        ctx.fillStyle = rgba(accent, 0.05 * glow);
        ctx.fill();
      }

      /* ── Nodes ─────────────────────────────────────── */
      nodes.forEach((n) => {
        const mix = Math.min(1, n.activation);
        if (mix > 0.08) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 9 * mix, 0, Math.PI * 2);
          ctx.fillStyle = rgba(accent, mix * 0.12);
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

      raf.current = requestAnimationFrame(draw);
    };
    draw();

    /* Pause when tab hidden so we don't burn CPU off-screen */
    const onVisibility = () => {
      running = !document.hidden;
      if (running) {
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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}
    />
  );
}
