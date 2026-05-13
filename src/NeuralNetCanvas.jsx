import { useEffect, useRef } from "react";

export default function NeuralNetCanvas() {
  const canvasRef = useRef(null);
  const raf = useRef(null);
  const mouse = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const layers = [5, 7, 9, 7, 5, 3];
    let nodes = [];
    let edges = [];
    let pulses = [];
    let bioMotifs = [];
    let edgeCursor = 0;
    let frame = 0;

    const darkMq = window.matchMedia("(prefers-color-scheme: dark)");
    let dark = darkMq.matches;
    const onDarkChange = (e) => { dark = e.matches; };
    darkMq.addEventListener("change", onDarkChange);
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
        const usableH = netH * (0.76 + layer * 0.018);
        const startY = cy - usableH / 2;
        for (let i = 0; i < count; i++) {
          const ratio = count === 1 ? 0.5 : i / (count - 1);
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
        bioMotifs = [
          { type: "rna", x: left + netW * 0.1,  y: top + netH * 0.12, len: 13, angle: 0.15,  phase: 0.2, bend: 10 },
          { type: "rna", x: left + netW * 0.22, y: top + netH * 0.34, len: 11, angle: -0.22, phase: 1.1, bend: -8 },
          { type: "rna", x: left + netW * 0.5,  y: top + netH * 0.74, len: 10, angle: -0.2,  phase: 3.1, bend: -7 },
          { type: "rna", x: left + netW * 0.08, y: top + netH * 0.58, len: 9,  angle: 0.32,  phase: 6.0, bend: 6 },
          { type: "rna", x: left + netW * 0.7,  y: top + netH * 0.42, len: 9,  angle: -0.28, phase: 5.1, bend: -7 },
          { type: "rna", x: left + netW * 0.82, y: top + netH * 0.34, len: 9,  angle: -0.3,  phase: 8.4, bend: -6 },
          { type: "rna", x: left + netW * 0.72, y: top + netH * 0.78, len: 9,  angle: 0.28,  phase: 9.8, bend: 7 },
          { type: "protein", x: left + netW * 0.76, y: top + netH * 0.18, len: 10, scale: 1.05, phase: 0.5 },
          { type: "protein", x: left + netW * 0.18, y: bottom - netH * 0.16, len: 8, scale: 0.92, phase: 2.4 },
          { type: "protein", x: left + netW * 0.42, y: top + netH * 0.06, len: 7, scale: 0.7, phase: 5.4 },
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
      if (!edges.length || pulses.length > 16) return;
      const edge = edges[edgeCursor % edges.length];
      edgeCursor += 7;
      pulses.push({
        edge,
        t: 0,
        speed: reducedMotion ? 0.012 : 0.006 + Math.random() * 0.004,
        alpha: 0.42 + Math.random() * 0.26,
      });
    };

    let running = true;

    const draw = () => {
      if (!running) return;
      frame++;
      ctx.clearRect(0, 0, w, h);
      const accent = dark ? [139, 173, 230] : [47, 94, 158];
      const cool   = dark ? [83, 106, 137]  : [126, 145, 164];
      const dim    = dark ? [45, 51, 59]    : [200, 205, 210];
      const warm   = dark ? [214, 154, 112] : [168, 101, 63];
      const mx = mouse.current.x;
      const my = mouse.current.y;
      const t = frame * (reducedMotion ? 0.012 : 0.035);

      const grad = ctx.createRadialGradient(w * 0.58, h * 0.44, 0, w * 0.58, h * 0.44, Math.max(w, h) * 0.55);
      grad.addColorStop(0, rgba(accent, dark ? 0.055 : 0.045));
      grad.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      bioMotifs.forEach((m, mi) => {
        const drift = Math.sin(frame * 0.01 + m.phase) * 9;
        if (m.type === "rna") {
          const step = 14;
          const dx = Math.cos(m.angle) * step;
          const dy = Math.sin(m.angle) * step;
          for (let i = 0; i < m.len; i++) {
            const wave = Math.sin(frame * 0.018 + i * 0.75 + m.phase);
            const arc  = Math.sin((i / Math.max(1, m.len - 1)) * Math.PI) * (m.bend || 0);
            const x    = m.x + dx * i + Math.sin(m.angle + Math.PI / 2) * (wave * 5 + arc);
            const y    = m.y + dy * i + drift + Math.cos(m.angle + Math.PI / 2) * (wave * 5 + arc);
            const hot  = (i / Math.max(1, m.len - 1) + frame * 0.006 + mi * 0.17) % 1;
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
            if (i % 3 === 1) {
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x + Math.sin(m.angle + Math.PI / 2) * 8, y + Math.cos(m.angle + Math.PI / 2) * 8);
              ctx.strokeStyle = rgba(i % 2 ? warm : accent, active ? 0.36 : 0.2);
              ctx.lineWidth = 0.7;
              ctx.stroke();
            }
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

      nodes.forEach((n) => {
        n.x = n.baseX + Math.sin(t + n.phase) * 2.2;
        n.y = n.baseY + Math.cos(t * 0.7 + n.phase * 1.3) * 2.2;
        const dx = n.x - mx;
        const dy = n.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < 130) {
          const pull = (130 - dist) / 130;
          n.x += (dx / dist) * pull * 8;
          n.y += (dy / dist) * pull * 8;
          n.activation = Math.max(n.activation, pull * 0.7);
        }
        n.activation *= 0.93;
      });

      edges.forEach((e) => {
        const a = nodes[e.from];
        const b = nodes[e.to];
        const act = Math.max(a.activation, b.activation);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = act > 0.08
          ? rgba(accent, 0.08 + act * 0.22)
          : rgba(dim, (dark ? 0.12 : 0.18) * e.weight);
        ctx.lineWidth = act > 0.08 ? 0.75 + act * 0.8 : 0.55;
        ctx.stroke();
      });

      if (frame % (reducedMotion ? 42 : 16) === 0) spawnPulse();

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
        ctx.fillStyle = rgba([cr, cg, cb], dark ? 0.72 : 0.64);
        ctx.fill();
        ctx.strokeStyle = rgba(accent, 0.16 + mix * 0.25);
        ctx.lineWidth = 0.75;
        ctx.stroke();
      });

      raf.current = requestAnimationFrame(draw);
    };
    draw();

    /* Pause when tab hidden */
    const onVisibility = () => {
      running = !document.hidden;
      if (running) {
        raf.current = requestAnimationFrame(draw);
      } else if (raf.current) {
        cancelAnimationFrame(raf.current);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onLeave = () => { mouse.current = { x: -9999, y: -9999 }; };
    const onTouchMove = (e) => {
      const touch = e.touches[0];
      if (!touch) return;
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchend", onLeave);
    canvas.addEventListener("touchcancel", onLeave);

    return () => {
      running = false;
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onLeave);
      canvas.removeEventListener("touchcancel", onLeave);
      darkMq.removeEventListener("change", onDarkChange);
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
