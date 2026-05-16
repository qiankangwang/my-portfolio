import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import NET from "vanta/dist/vanta.net.min";
import CELLS from "vanta/dist/vanta.cells.min";
import FOG from "vanta/dist/vanta.fog.min";
import GLOBE from "vanta/dist/vanta.globe.min";
import WAVES from "vanta/dist/vanta.waves.min";
import RINGS from "vanta/dist/vanta.rings.min";

/* Per-scene Vanta effect with cross-fade.

   Each of the six scroll scenes has its OWN dedicated Three.js
   background (via vanta.js):

     0  Hero        NET    — neural-net-style dots + lines
     1  About       CELLS  — biological cell pattern
     2  Research    FOG    — dramatic atmospheric fog
     3  Publication GLOBE  — rotating wireframe globe of nodes
     4  Projects    WAVES  — 3D ocean waves
     5  Skills      RINGS  — concentric orbital rings

   Two layered <div>s render side-by-side; when activeScene changes,
   the OTHER div mounts the new effect, then opacity cross-fades over
   ~900ms. After the fade the old effect is destroyed. The result:
   each scene reads as its own animation, not a single backdrop with
   motifs piled on top.

   props:
     activeScene  number 0..5 — the scene whose effect should be active

   Bundle note: each Vanta effect ships its own minified bundle of
   Three.js geometry/shaders, so this file pulls in six effects up
   front. Acceptable for the "wow" upgrade since the user explicitly
   asked for richer animations and we no longer have to also ship
   the procedural canvas drawing code. */

const palette = (dark) => ({
  // The accent in light mode is a saturated blue; in dark mode a
  // slightly lighter blue reads better against the dark backdrop.
  accent:  dark ? 0x60a5fa : 0x3b82f6,
  accent2: dark ? 0x93c5fd : 0x2563eb,
  warm:    dark ? 0xfbbf24 : 0xf59e0b,
  bg:      dark ? 0x0a1322 : 0xdde3eb,
});

// Per-scene Vanta config factories. Each returns the (effect, params)
// pair to pass to Vanta. Params are tuned per effect for visual impact.
const SCENE_CONFIGS = [
  // 0 Hero — NET. Classical web-of-dots, matches the page's AI theme.
  (theme) => ({
    effect: NET,
    params: {
      color: theme.accent,
      backgroundColor: theme.bg,
      points: 14,
      maxDistance: 22,
      spacing: 17,
      showDots: true,
    },
  }),
  // 1 About — CELLS. Soft biological cell pattern; the page subject
  // works on ML for biology so this slots in thematically.
  (theme) => ({
    effect: CELLS,
    params: {
      color1: theme.accent,
      color2: theme.warm,
      backgroundColor: theme.bg,
      size: 1.6,
      speed: 1.0,
    },
  }),
  // 2 Research — FOG. Atmospheric rolling fog. Reads as the "deep
  // thought / unknown" space of active research.
  (theme) => ({
    effect: FOG,
    params: {
      highlightColor: theme.accent,
      midtoneColor: theme.accent2,
      lowlightColor: theme.warm,
      baseColor: theme.bg,
      blurFactor: 0.6,
      speed: 1.2,
      zoom: 0.8,
    },
  }),
  // 3 Publication — GLOBE. Rotating sphere of points — reads as a
  // graph of references / a citation network.
  (theme) => ({
    effect: GLOBE,
    params: {
      color: theme.accent,
      color2: theme.warm,
      backgroundColor: theme.bg,
      size: 1.1,
    },
  }),
  // 4 Projects — WAVES. 3D ocean waves with lit highlights. Dramatic,
  // dynamic, and totally distinct from the static backgrounds.
  (theme) => ({
    effect: WAVES,
    params: {
      color: theme.accent2,
      shininess: 55,
      waveHeight: 18,
      waveSpeed: 0.9,
      zoom: 0.85,
    },
  }),
  // 5 Skills — RINGS. Concentric orbital rings — matches the "tools
  // of the trade" framing as a system of orbiting capabilities.
  (theme) => ({
    effect: RINGS,
    params: {
      color: theme.accent,
      backgroundColor: theme.bg,
      backgroundAlpha: 1,
    },
  }),
];

const readDark = () => {
  if (typeof document === "undefined") return false;
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark") return true;
  if (attr === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

export default function VantaScene({ activeScene }) {
  const layerARef = useRef(null);
  const layerBRef = useRef(null);
  // Which layer (A or B) currently holds the visible effect.
  const [front, setFront] = useState("A");
  // Refs to the active effect instances on each layer.
  const effects = useRef({ A: null, B: null });
  // Track the scene last rendered so we don't re-mount on every render.
  const lastSceneRef = useRef(-1);
  // Track dark mode so effects can be rebuilt on theme change.
  const darkRef = useRef(readDark());

  // Mount the initial effect when first prop arrives.
  useEffect(() => {
    if (activeScene === lastSceneRef.current) return;
    const isFirst = lastSceneRef.current === -1;
    lastSceneRef.current = activeScene;

    const targetKey = isFirst ? front : front === "A" ? "B" : "A";
    const targetEl = targetKey === "A" ? layerARef.current : layerBRef.current;
    if (!targetEl) return;

    // Destroy any existing effect on the target layer before mounting new.
    if (effects.current[targetKey]) {
      try { effects.current[targetKey].destroy(); } catch {}
      effects.current[targetKey] = null;
    }

    const sceneIdx = Math.max(0, Math.min(SCENE_CONFIGS.length - 1, Math.round(activeScene)));
    const theme = palette(darkRef.current);
    const cfg = SCENE_CONFIGS[sceneIdx](theme);
    try {
      effects.current[targetKey] = cfg.effect({
        el: targetEl,
        THREE,
        mouseControls: false,
        touchControls: false,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        scale: 1,
        scaleMobile: 1,
        ...cfg.params,
      });
    } catch (e) {
      // Vanta can fail on first paint in some environments; swallow so
      // the page doesn't crash — we just won't have a bg this scene.
      console.warn("Vanta effect failed:", e);
    }

    if (isFirst) return;

    // Swap which layer is in front, then destroy the old effect after
    // the cross-fade has finished.
    const oldKey = front;
    setFront(targetKey);
    const oldEffect = effects.current[oldKey];
    setTimeout(() => {
      if (oldEffect) {
        try { oldEffect.destroy(); } catch {}
        if (effects.current[oldKey] === oldEffect) {
          effects.current[oldKey] = null;
        }
      }
    }, 1100);
  }, [activeScene, front]);

  // Watch theme changes and rebuild the current effect with the new
  // palette. Simpler than animating colour params live.
  useEffect(() => {
    const obs = new MutationObserver(() => {
      const next = readDark();
      if (next === darkRef.current) return;
      darkRef.current = next;
      // Force a remount of the current effect by clearing lastSceneRef.
      const cur = lastSceneRef.current;
      lastSceneRef.current = -1;
      // Re-trigger the effect-mount path.
      // Use a microtask so React re-runs the mount effect with same prop.
      Promise.resolve().then(() => {
        // Bump via temporary swap: re-mount on the back layer.
        // Easier: directly re-build current effect on the same layer.
        const key = front;
        const el = key === "A" ? layerARef.current : layerBRef.current;
        if (!el) return;
        if (effects.current[key]) {
          try { effects.current[key].destroy(); } catch {}
          effects.current[key] = null;
        }
        const theme = palette(darkRef.current);
        const cfg = SCENE_CONFIGS[cur](theme);
        try {
          effects.current[key] = cfg.effect({
            el,
            THREE,
            mouseControls: false,
            touchControls: false,
            gyroControls: false,
            minHeight: 200,
            minWidth: 200,
            scale: 1,
            scaleMobile: 1,
            ...cfg.params,
          });
        } catch {}
        lastSceneRef.current = cur;
      });
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, [front]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      ["A", "B"].forEach((k) => {
        if (effects.current[k]) {
          try { effects.current[k].destroy(); } catch {}
          effects.current[k] = null;
        }
      });
    };
  }, []);

  return (
    <>
      <div
        ref={layerARef}
        className={`vanta-layer${front === "A" ? " vanta-front" : ""}`}
        aria-hidden="true"
      />
      <div
        ref={layerBRef}
        className={`vanta-layer${front === "B" ? " vanta-front" : ""}`}
        aria-hidden="true"
      />
    </>
  );
}
