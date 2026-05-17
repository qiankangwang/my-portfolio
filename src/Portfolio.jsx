import { useState, useEffect, useRef, useCallback, memo } from "react";
import D from "./data";
import NeuralNetCanvas from "./NeuralNetCanvas";
import "./Portfolio.css";

/* ── Ambient background orbs ── */
function AmbientBg() {
  return (
    <div className="ambient" aria-hidden="true">
      <div className="amb-orb amb-1" />
      <div className="amb-orb amb-2" />
      <div className="amb-orb amb-3" />
    </div>
  );
}

/* ── DecodeText ──
   AI-style decode/glitch reveal — text starts scrambled (random
   alphanumerics with structure-preserving spaces/punctuation), then
   resolves to the target left-to-right as the section enters view.
   The scrambled tail keeps re-rolling every frame so the unresolved
   characters churn — reads as a model "deciding" each token before
   committing it. Triggered once per element via IntersectionObserver. */
// Greek + math symbols mixed in with the alphanumerics — the glitch
// passes through ∇ ∂ Σ etc. before resolving. Reads as model output
// rather than a generic Hollywood-decryption alphabet.
const DECODE_CHARSET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ∇∂Σλπθϕψξµη∫∑";
function decodeScramble(target) {
  let out = "";
  for (let i = 0; i < target.length; i++) {
    const c = target.charCodeAt(i);
    // Preserve whitespace, hyphens, dots, mid-dots, slashes, brackets.
    if (c <= 32 || c === 0x00B7 || c === 0x2013 || c === 0x2014 ||
        (c >= 0x21 && c <= 0x2F) || (c >= 0x3A && c <= 0x40) ||
        (c >= 0x5B && c <= 0x60) || (c >= 0x7B && c <= 0x7E)) {
      out += target[i];
    } else {
      out += DECODE_CHARSET[Math.floor(Math.random() * DECODE_CHARSET.length)];
    }
  }
  return out;
}
function DecodeText({ text, duration = 720, delay = 0, threshold = 0.25, className, as: Tag = "span", retrigger = false }) {
  const ref = useRef(null);
  const [out, setOut] = useState(text);
  const startedRef = useRef(false);
  const rafRef = useRef(0);
  const lastTriggerRef = useRef(0);

  const run = useCallback((skipDelay = false) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const target = String(text);
    const startT = performance.now() + (skipDelay ? 0 : delay);
    const tick = (now) => {
      const elapsed = now - startT;
      if (elapsed < 0) {
        setOut(decodeScramble(target));
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const settled = Math.floor(eased * target.length);
      setOut(target.slice(0, settled) + decodeScramble(target.slice(settled)));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else setOut(target);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [text, delay, duration]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setOut(decodeScramble(text));
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || startedRef.current) return;
        startedRef.current = true;
        obs.disconnect();
        run();
      },
      { threshold }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [text, threshold, run]);

  // Re-trigger a fresh decode on mouseenter. Debounced to 220 ms so
  // a fast cursor wiggle doesn't restart on every entered pixel.
  const onMouseEnter = useCallback(() => {
    if (!retrigger) return;
    const now = performance.now();
    if (now - lastTriggerRef.current < 220) return;
    lastTriggerRef.current = now;
    run(true);
  }, [retrigger, run]);

  return (
    <Tag ref={ref} className={className} onMouseEnter={onMouseEnter}>
      {out}
    </Tag>
  );
}

/* ── useTrace ──
   Cycles through a list of fake "model output" lines, character-by-
   character: type → hold → erase → next. Drives the streaming TRACE
   row in the SystemHUD so the lab dashboard reads as a continuously
   inferring model rather than a static panel. */
// Per-scene trace lines — the HUD's streaming row reads what's
// "being inferred" right now, based on the camera's current scene.
// Scene change resets the cycle to that scene's first line so the
// readout always reflects the section the reader is in.
const TRACE_LINES_PER_SCENE = [
  // 0 Hero
  ["NEURAL_FIELD · INIT", "MODEL → cloud/v0", "BOOT · 100%", "STATE · READY"],
  // 1 About
  ["DECODE → profile.bio", "TYPE · BIO_HELIX", "QUERY ← reader.gaze", "EMBED · 768d"],
  // 2 Research
  ["ENGINE · GRAD_FLOW", "EPOCH 27 · LOSS 0.0034", "FIELDS · LABS_3", "ATTEND → corpus"],
  // 3 Publication
  ["ARTIFACT · MANIFOLD", "LANCET · 2024", "AUTHORS · 8", "VENUE → PUBLISHED"],
  // 4 Projects
  ["MATRIX/12×10", "REPOS · 6 LIVE", "STATUS · DEPLOYED", "ATTEND → github"],
  // 5 Skills
  ["TOOLKIT · INDEX", "RINGS/7", "STACK → FLUENT", "WEIGHTS · LOADED"],
];
function useTrace(sceneRef, typeSpeed = 48, eraseSpeed = 24, holdMs = 1500) {
  const [text, setText] = useState("");
  useEffect(() => {
    let cancelled = false;
    let line = 0;
    let char = 0;
    let phase = "typing";
    let holdUntil = 0;
    let lastScene = -1;
    let tId = 0;
    const tick = () => {
      if (cancelled) return;
      const scene = Math.max(0, Math.min(5, Math.round(sceneRef?.current ?? 0)));
      // On scene change reset to the new scene's first line so the
      // streaming readout always describes what the camera is over.
      if (scene !== lastScene) {
        lastScene = scene;
        line = 0;
        char = 0;
        phase = "typing";
      }
      const sceneLines = TRACE_LINES_PER_SCENE[scene];
      const cur = sceneLines[line % sceneLines.length];
      let delay = typeSpeed;
      if (phase === "typing") {
        char++;
        setText(cur.slice(0, char));
        if (char >= cur.length) {
          phase = "holding";
          holdUntil = performance.now() + holdMs;
        }
      } else if (phase === "holding") {
        if (performance.now() >= holdUntil) phase = "erasing";
        delay = 60;
      } else {
        char = Math.max(0, char - 1);
        setText(cur.slice(0, char));
        delay = eraseSpeed;
        if (char <= 0) {
          phase = "typing";
          line = (line + 1) % sceneLines.length;
        }
      }
      tId = setTimeout(tick, delay);
    };
    tId = setTimeout(tick, typeSpeed);
    return () => {
      cancelled = true;
      clearTimeout(tId);
    };
  }, [sceneRef, typeSpeed, eraseSpeed, holdMs]);
  return text;
}

/* ── Atmosphere ──
   2D layered neural-net canvas as the page's living atmosphere.
   Replaces the earlier morphing 3D particle field — same z-index
   role, same multiply blend with the cream paper, but now an
   explicit network diagram with signal pulses and bio motifs. */
const Atmosphere = memo(function Atmosphere({ sceneRef, fpsRef }) {
  return (
    <div className="atmos" aria-hidden="true">
      <NeuralNetCanvas sceneRef={sceneRef} fpsRef={fpsRef} />
      <div className="atmos-vignette" />
    </div>
  );
});

/* ── SectionWatermark ──
   Huge translucent italic serif word in the bottom-right corner that
   names the current scene. Renders behind everything (z 1) so it
   reads as an editorial chapter watermark, not as content. Fades
   between section names on scroll. */
const SectionWatermark = memo(function SectionWatermark({ active }) {
  const label = active || "Hero";
  return (
    <div className="section-watermark" aria-hidden="true" key={label}>
      {label}
    </div>
  );
});

/* ── HelpOverlay ──
   Modal that lists every keyboard shortcut + interactive feature.
   Opened via ? key, closed via Esc / backdrop click / × button. */
const HelpOverlay = memo(function HelpOverlay({ onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="help-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Help and shortcuts"
    >
      <div className="help-inner" onClick={(e) => e.stopPropagation()}>
        <div className="help-head">
          <span className="help-led" />
          <h3>HELP · v2.6</h3>
          <button onClick={onClose} className="help-close" aria-label="Close help">×</button>
        </div>
        <h4 className="help-sub">KEYBOARD</h4>
        <dl className="help-list">
          <div><dt><kbd>j</kbd><kbd>k</kbd></dt><dd>next / previous scene</dd></div>
          <div><dt><kbd>g</kbd><kbd>G</kbd></dt><dd>top / bottom of document</dd></div>
          <div><dt><kbd>h</kbd></dt><dd>toggle HUD panel</dd></div>
          <div><dt><kbd>?</kbd></dt><dd>toggle this help</dd></div>
          <div><dt><kbd>Esc</kbd></dt><dd>close overlays</dd></div>
        </dl>
        <h4 className="help-sub">INTERACTIONS</h4>
        <dl className="help-list">
          <div><dt>hover title</dt><dd>re-decode characters</dd></div>
          <div><dt>cursor on field</dt><dd>attention rays + elastic pull</dd></div>
          <div><dt>click anywhere</dt><dd>ink ripple</dd></div>
          <div><dt>tap avatar</dt><dd>headpat</dd></div>
        </dl>
        <h4 className="help-sub">SYSTEM</h4>
        <dl className="help-list">
          <div><dt>scroll velocity</dt><dd>field intensity</dd></div>
          <div><dt>5s idle</dt><dd>particles begin to drift / dream</dd></div>
          <div><dt>scene change</dt><dd>camera bank + scan flash + particle pulse</dd></div>
        </dl>
      </div>
    </div>
  );
});

/* ── KbdHint ──
   Top-right floating chip advertising the j/k/g/G keyboard nav.
   Hidden on touch / narrow / reduced-motion so it doesn't add noise
   where it can't actually be used. */
const KbdHint = memo(function KbdHint() {
  return (
    <div className="kbd-hint" aria-hidden="true">
      <kbd>j</kbd><kbd>k</kbd>
      <span className="kbd-hint-sep">scenes</span>
      <kbd>g</kbd><kbd>G</kbd>
      <span className="kbd-hint-sep">top/bot</span>
      <kbd>h</kbd>
      <span className="kbd-hint-sep">hud</span>
      <kbd>?</kbd>
      <span className="kbd-hint-sep">help</span>
    </div>
  );
});

/* Small text-only identity strip anchored to the top-left corner of
   the viewport. The interactive avatar (with headpat easter egg) now
   lives in the hero scene; this strip is a discreet always-on label. */
const IdentityBadge = memo(function IdentityBadge() {
  return (
    <div className="id-badge">
      <div className="id-badge-meta">
        <span className="id-badge-name">Qiankang Wang</span>
        <span className="id-badge-sub">UC Berkeley · DS '27</span>
      </div>
    </div>
  );
});

/* ── Side-rail formation icons ──
   Each section's particle formation rendered as a 14px SVG glyph:
   helix, layered network, sphere, grid, rings. Slot into the nav
   items so scrolling between sections previews where you're going,
   not just "01 / About". currentColor lets the .sb-nav-item active
   state tint them with the section accent. */
const NavGlyphHelix = () => (
  <svg className="sb-nav-glyph" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 2 C7 5, 9 5, 13 2 M3 8 C7 11, 9 11, 13 8 M3 14 C7 11, 9 11, 13 14" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);
const NavGlyphNetwork = () => (
  <svg className="sb-nav-glyph" viewBox="0 0 16 16" aria-hidden="true">
    <g fill="currentColor">
      <circle cx="2" cy="3" r=".9" /><circle cx="2" cy="8" r=".9" /><circle cx="2" cy="13" r=".9" />
      <circle cx="8" cy="2" r=".9" /><circle cx="8" cy="8" r=".9" /><circle cx="8" cy="14" r=".9" />
      <circle cx="14" cy="3" r=".9" /><circle cx="14" cy="8" r=".9" /><circle cx="14" cy="13" r=".9" />
    </g>
    <g stroke="currentColor" strokeWidth=".4" opacity=".55">
      <line x1="2" y1="3" x2="8" y2="2" /><line x1="2" y1="3" x2="8" y2="8" />
      <line x1="2" y1="8" x2="8" y2="8" /><line x1="2" y1="13" x2="8" y2="14" />
      <line x1="2" y1="13" x2="8" y2="8" />
      <line x1="8" y1="2" x2="14" y2="3" /><line x1="8" y1="8" x2="14" y2="8" />
      <line x1="8" y1="8" x2="14" y2="3" /><line x1="8" y1="14" x2="14" y2="13" />
      <line x1="8" y1="8" x2="14" y2="13" />
    </g>
  </svg>
);
const NavGlyphSphere = () => (
  <svg className="sb-nav-glyph" viewBox="0 0 16 16" aria-hidden="true">
    <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.1" />
    <ellipse cx="8" cy="8" rx="6" ry="2.4" fill="none" stroke="currentColor" strokeWidth=".6" opacity=".55" />
    <circle cx="8" cy="8" r="1.4" fill="currentColor" />
  </svg>
);
const NavGlyphGrid = () => (
  <svg className="sb-nav-glyph" viewBox="0 0 16 16" aria-hidden="true">
    <g fill="currentColor">
      <rect x="2"  y="2"  width="2.6" height="2.6" />
      <rect x="6.7" y="2"  width="2.6" height="2.6" />
      <rect x="11.4" y="2"  width="2.6" height="2.6" />
      <rect x="2"  y="6.7" width="2.6" height="2.6" />
      <rect x="11.4" y="6.7" width="2.6" height="2.6" />
      <rect x="2"  y="11.4" width="2.6" height="2.6" />
      <rect x="6.7" y="11.4" width="2.6" height="2.6" />
      <rect x="11.4" y="11.4" width="2.6" height="2.6" />
    </g>
  </svg>
);
const NavGlyphRings = () => (
  <svg className="sb-nav-glyph" viewBox="0 0 16 16" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="1">
      <circle cx="8" cy="8" r="2" />
      <circle cx="8" cy="8" r="4.2" opacity=".75" />
      <circle cx="8" cy="8" r="6.4" opacity=".5" />
    </g>
  </svg>
);
const NAV_GLYPHS = {
  About:       NavGlyphHelix,
  Research:    NavGlyphNetwork,
  Publication: NavGlyphSphere,
  Projects:    NavGlyphGrid,
  Skills:      NavGlyphRings,
};

/* Vertical nav rail floating on the left edge of the viewport — appears
   only after the user has scrolled past the hero. Clicking a label
   smooth-scrolls to its section. */
const SideRail = memo(function SideRail({ active, scrollTo, visible }) {
  const activeIdx = NAV.indexOf(active);
  return (
    <nav
      className={`side-rail${visible ? " visible" : ""}`}
      aria-label="Section navigation"
    >
      {NAV.map((n, i) => {
        const isActive = active === n;
        const isPassed = activeIdx >= 0 && i < activeIdx;
        const Glyph = NAV_GLYPHS[n];
        const classes = [
          "sb-nav-item",
          isActive ? "active" : "",
          isPassed ? "passed" : "",
        ].filter(Boolean).join(" ");
        return (
          <a
            key={n}
            href={`#${n.toLowerCase()}`}
            className={classes}
            aria-current={isActive ? "page" : undefined}
            onClick={(e) => { e.preventDefault(); scrollTo(n.toLowerCase()); }}
          >
            <span className="sb-nav-rail" aria-hidden="true" />
            <span className="sb-nav-i">{String(i + 1).padStart(2, "0")}</span>
            {Glyph ? <Glyph /> : null}
            <span className="sb-nav-label">{n}</span>
          </a>
        );
      })}
    </nav>
  );
});

/* ── GlyphRain ──
   Ambient layer of sparse mathematical glyphs drifting top-to-bottom
   behind the content column (z 1, below .main z 2). Each span gets
   a random column position, random font size, random animation
   duration with a negative delay so they don't all start at the top
   together. Very low opacity so they read as research-paper ambient
   rather than a distinct effect. */
const GLYPH_CHARS = ["∇", "∂", "Σ", "λ", "π", "θ", "∫", "ϕ", "ψ", "ξ", "∞", "∑", "η", "μ"];
const GlyphRain = memo(function GlyphRain() {
  const ref = useRef(null);
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const N = 14;
    const created = [];
    for (let i = 0; i < N; i++) {
      const span = document.createElement("span");
      span.className = "glyph-rain-item";
      span.textContent = GLYPH_CHARS[Math.floor(Math.random() * GLYPH_CHARS.length)];
      span.style.left = `${Math.random() * 100}%`;
      span.style.fontSize = `${0.9 + Math.random() * 1.7}rem`;
      const dur = 36 + Math.random() * 28;
      span.style.animationDuration = `${dur}s`;
      span.style.animationDelay = `-${Math.random() * dur}s`;
      container.appendChild(span);
      created.push(span);
    }
    return () => created.forEach((el) => el.remove());
  }, []);
  return <div ref={ref} className="glyph-rain" aria-hidden="true" />;
});

/* ── IntroSplash ──
   First-visit only. A solid-cream boot screen with "NEURAL_FIELD"
   header, staged status messages (INIT → LOAD_WEIGHTS → WARM_PASS →
   READY), a progress bar, and a numeric percent readout. Plays once,
   stamps localStorage so repeat visits jump straight to the hero. */
// Streaming boot log lines for the IntroSplash. Each entry is the
// fraction-of-duration at which the line appears + the line itself.
// Last entry is the OK that completes the boot.
const SPLASH_LOG = [
  [0.00, "[INFO] booting neural_field.v2.6"],
  [0.18, "[INFO] loading checkpoint.bin · 100%"],
  [0.36, "[INFO] warm_pass · ATTN/6 · PULSE/32"],
  [0.54, "[INFO] palette · navy.research-paper"],
  [0.72, "[INFO] camera · J-path · 6 scenes"],
  [0.92, "[ OK ] ready"],
];
const IntroSplash = memo(function IntroSplash() {
  const SEEN_KEY = "intro-splash-seen-v2";
  const [skip] = useState(() => {
    try { return localStorage.getItem(SEEN_KEY) === "1"; } catch { return false; }
  });
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);
  const [unmount, setUnmount] = useState(skip);
  useEffect(() => {
    if (skip) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 400 : 1700;
    const startT = performance.now();
    let raf = 0;
    const tick = (now) => {
      const p = Math.min((now - startT) / duration, 1);
      setProgress(p);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
        setFading(true);
        setTimeout(() => setUnmount(true), 520);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [skip]);
  if (unmount) return null;
  // Filter SPLASH_LOG to lines whose threshold has been crossed.
  const visibleLines = SPLASH_LOG.filter(([t]) => progress >= t);
  const isDone = progress >= 1;
  return (
    <div
      className={`intro-splash${fading ? " intro-splash-fade" : ""}`}
      aria-hidden="true"
    >
      <div className="intro-splash-inner">
        <div className="intro-splash-header">
          <span className="intro-splash-led" />
          <span className="intro-splash-title">NEURAL_FIELD · v2.6</span>
        </div>
        <div className="intro-splash-log">
          {visibleLines.map(([, line], i) => (
            <div
              key={i}
              className={`intro-splash-log-line${line.startsWith("[ OK") ? " ok" : ""}`}
            >
              {line}
            </div>
          ))}
          {!isDone && <span className="intro-splash-caret">_</span>}
        </div>
        <div className="intro-splash-bar">
          <div
            className="intro-splash-bar-fill"
            style={{ transform: `scaleX(${progress})` }}
          />
        </div>
        <div className="intro-splash-meta">
          {String(Math.round(progress * 100)).padStart(3, "0")}%
          <span className="intro-splash-meta-dim"> · qiankang.field</span>
        </div>
      </div>
    </div>
  );
});

/* ── SceneFlash ──
   Cinematic punctuation at scene boundaries — a horizontal scan band
   sweeps top-to-bottom whenever the camera's rounded scene index
   changes. Polls sceneRef every 80 ms and remounts a fresh <div>
   with a 700 ms CSS animation keyed off the scene-change counter, so
   the animation always plays from frame 0 instead of being stale.
   Debounced to 600 ms so a fast scroll across multiple scenes doesn't
   strobe. */
const SceneFlash = memo(function SceneFlash({ sceneRef }) {
  const [key, setKey] = useState(0);
  const prevInt = useRef(-1);
  const lastFlashAt = useRef(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = setInterval(() => {
      const raw = sceneRef?.current ?? 0;
      const rounded = Math.round(raw);
      if (rounded === prevInt.current) return;
      const now = performance.now();
      if (prevInt.current !== -1 && now - lastFlashAt.current > 600) {
        setKey((k) => k + 1);
        lastFlashAt.current = now;
      }
      prevInt.current = rounded;
    }, 80);
    return () => clearInterval(id);
  }, [sceneRef]);
  if (key === 0) return null;
  return <div key={key} className="scene-flash" aria-hidden="true" />;
});

/* ── ClickRipple ──
   Spawns a brief expanding ring at the click point whenever the user
   clicks anywhere that isn't a link / button / interactive element.
   The page already routes link / button clicks to their own visual
   feedback (sect-title hover, side rail active state, etc.) — this
   covers the rest, so every click has visible acknowledgment. Warm
   rust ring + multiply blend so it darkens the paper at the click
   point like ink touching down. */
const ClickRipple = memo(function ClickRipple() {
  const layerRef = useRef(null);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const onClick = (e) => {
      // Skip clicks on interactive elements — their own feedback covers it.
      if (e.target.closest("a, button, input, textarea, select, [role='button']")) return;
      const layer = layerRef.current;
      if (!layer) return;
      const ring = document.createElement("span");
      ring.className = "click-ripple-ring";
      ring.style.left = `${e.clientX}px`;
      ring.style.top  = `${e.clientY}px`;
      layer.appendChild(ring);
      setTimeout(() => ring.remove(), 950);
    };
    window.addEventListener("click", onClick, { passive: true });
    return () => window.removeEventListener("click", onClick);
  }, []);
  return <div ref={layerRef} className="click-ripple-layer" aria-hidden="true" />;
});

/* ── CursorSpot ──
   A soft warm halo that drifts behind the cursor at ~5 Hz under the
   real pointer. Layered between the particle canvas (z 4) and the
   floating UI chrome (z 60+) with mix-blend-mode: soft-light, so it
   warms the paper + particles + text where the user is looking
   without obscuring anything. Reads as a "reading lamp" / the model
   subtly tracking the reader's attention. Direct DOM writes via a
   ref — no React re-render per mouse move.

   Disabled on coarse pointers, narrow viewports, and when the user
   prefers reduced motion. */
const CursorSpot = memo(function CursorSpot() {
  const ref = useRef(null);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || coarse) return;
    let raf = 0;
    let tx = -9999, ty = -9999;
    let x = -9999, y = -9999;
    let seen = false;
    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!seen) {
        x = tx;
        y = ty;
        seen = true;
      }
    };
    const tick = () => {
      x += (tx - x) * 0.16;
      y += (ty - y) * 0.16;
      const el = ref.current;
      if (el) el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);
  return <div ref={ref} className="cursor-spot" aria-hidden="true" />;
});

/* ── SystemHUD ──
   Bottom-left lab-dashboard readout — a fixed mono panel that
   reports the current "scene" the camera is parked at, the active
   quadrant, attention-edge count, and a 16-tick sweeping signal
   meter that rolls at 4 Hz. Polls sceneRef.current every 200 ms and
   only re-renders on scene change, so it doesn't fight the
   high-frequency scroll loop. The LED dot pulses on its own CSS
   animation. */
const SCENE_TYPES = [
  "INIT/0xA0",
  "BIO_HELIX",
  "DENSE_NET",
  "MANIFOLD",
  "MATRIX/12×10",
  "ORBITS/7",
];
const SCENE_QUADS = ["CENTER", "TR", "MR", "BR", "BL", "TL"];
// Mirror of the per-section accent palette from Portfolio.css so the
// HUD's HUE swatches can preview the same shift the .sect[data-pos]
// overrides apply. Keep these in sync with the [data-pos] rules.
const SCENE_HUES = [
  { a: "#1E3A8A", a2: "#2754C2", a3: "#1E2A5E" }, // Hero (root)
  { a: "#1E3A8A", a2: "#2754C2", a3: "#1E2A5E" }, // About
  { a: "#1E40AF", a2: "#2563EB", a3: "#1D3491" }, // Research
  { a: "#334155", a2: "#475569", a3: "#1F2937" }, // Publication
  { a: "#4338CA", a2: "#4F46E5", a3: "#3730A3" }, // Projects
  { a: "#1F3D8E", a2: "#3B5BDB", a3: "#1E2D6B" }, // Skills
];
const WARM_HUE = "#B45309";
// Actual particle-formation parameters (matches ParticleScene's
// buildFormations). Reads as a real technical spec line in the HUD,
// not invented marketing text.
const SystemHUD = memo(function SystemHUD({ sceneRef, fpsRef }) {
  const [scene, setScene] = useState(0);
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [uptimeStr, setUptimeStr] = useState("00:00");
  const [fps, setFps] = useState(60);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sys-hud-collapsed") === "1"; } catch { return false; }
  });
  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem("sys-hud-collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  }, []);
  useEffect(() => {
    const onToggle = () => toggleCollapse();
    window.addEventListener("portfolio:toggle-hud", onToggle);
    return () => window.removeEventListener("portfolio:toggle-hud", onToggle);
  }, [toggleCollapse]);
  const bootRef = useRef(performance.now());
  const trace = useTrace(sceneRef);
  useEffect(() => {
    const id = setInterval(() => {
      const raw = sceneRef?.current ?? 0;
      const rounded = Math.max(0, Math.min(5, Math.round(raw)));
      setScene((p) => (p === rounded ? p : rounded));
    }, 200);
    return () => clearInterval(id);
  }, [sceneRef]);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 32), 220);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = (performance.now() - bootRef.current) / 1000;
      const m = Math.floor(elapsed / 60);
      const s = Math.floor(elapsed % 60);
      setUptimeStr(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      const sampled = Math.round(fpsRef?.current ?? 60);
      setFps((p) => (p === sampled ? p : sampled));
    }, 500);
    return () => clearInterval(id);
  }, [fpsRef]);
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
  return (
    <aside className={`sys-hud${collapsed ? " collapsed" : ""}`}>
      <div className="sys-hud-row sys-hud-head">
        <span
          className="sys-hud-avatar-wrap"
          style={{ "--ring": SCENE_HUES[scene].a }}
          aria-hidden="true"
        >
          <img className="sys-hud-avatar" src={D.avatar} alt="" />
        </span>
        <span className="sys-hud-k">NEURAL_FIELD</span>
        <span className="sys-hud-v sys-hud-ver">v2.6</span>
        <button
          type="button"
          className="sys-hud-collapse"
          onClick={toggleCollapse}
          aria-label={collapsed ? "Expand system panel" : "Collapse system panel"}
          aria-expanded={!collapsed}
        >
          {collapsed ? "+" : "−"}
        </button>
      </div>
      <div className="sys-hud-row">
        <span className="sys-hud-k">SCENE</span>
        <span className="sys-hud-v">
          {String(scene).padStart(2, "0")} · {SCENE_TYPES[scene]}
        </span>
      </div>
      <div className="sys-hud-row">
        <span className="sys-hud-k">QUAD</span>
        <span className="sys-hud-v">{SCENE_QUADS[scene]}</span>
      </div>
      <div className="sys-hud-row">
        <span className="sys-hud-k">ATTN</span>
        <span className="sys-hud-v">6 EDGES · LIVE</span>
      </div>
      <div className="sys-hud-row">
        <span className="sys-hud-k">TIME</span>
        <span className="sys-hud-v">{dateStr} · {timeStr}</span>
      </div>
      <div className="sys-hud-row">
        <span className="sys-hud-k">UP</span>
        <span className="sys-hud-v">{uptimeStr} · {fps} FPS</span>
      </div>
      <div className="sys-hud-row sys-hud-bar">
        <span className="sys-hud-k">SIG</span>
        <div className="sys-hud-meter">
          {Array.from({ length: 16 }).map((_, i) => {
            const phase = (i * 0.55) + (tick * 0.45);
            const level = 0.5 + Math.sin(phase) * 0.5;     // 0..1
            const on = level > 0.42;
            return (
              <span
                key={i}
                className={`sys-hud-tick${on ? " on" : ""}`}
                style={{ height: `${3 + level * 7}px` }}
              />
            );
          })}
        </div>
      </div>
      <div className="sys-hud-row sys-hud-bar">
        <span className="sys-hud-k">HUE</span>
        <div className="sys-hud-hue">
          <span style={{ background: SCENE_HUES[scene].a }} />
          <span style={{ background: SCENE_HUES[scene].a2 }} />
          <span style={{ background: SCENE_HUES[scene].a3 }} />
          <span style={{ background: WARM_HUE }} />
        </div>
      </div>
      <div className="sys-hud-row sys-hud-trace">
        <span className="sys-hud-k">TRACE</span>
        <span className="sys-hud-v sys-hud-trace-v">
          {trace}
          <span className="sys-hud-caret" aria-hidden="true">_</span>
        </span>
      </div>
    </aside>
  );
});

/* Corner widget for socials + theme toggle, anchored bottom-right. */
const CornerControls = memo(function CornerControls({ theme, toggleTheme }) {
  return (
    <div className="corner-controls">
      <div className="sb-contacts">
        <a href={`mailto:${D.email}`} aria-label="Email" className="sb-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </a>
        <a href={D.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="sb-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
        </a>
        <a href={D.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="sb-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        </a>
      </div>
      <button className="sb-theme" onClick={toggleTheme} aria-label="Toggle dark mode">
        {theme === "dark" ? "☀" : "☾"}
      </button>
    </div>
  );
});

/* ── Intersection Observer hook ── */
function useInView(threshold = 0.12, once = true) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          if (once) obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, once]);
  return [ref, visible];
}

/* ── Section ──
   Each section is a tall scroll container (.sect, 150svh) whose inner stage
   (.sect-pin) is sticky-pinned to the viewport. While the user scrolls
   through the section's range, the visible content stays locked at the
   viewport's vertical center — that pinned midpoint is the "central anchor"
   the viewer's eye rests on. Internal content (headings, cards) reveals
   inside the anchor; the scroll only advances progress, it doesn't move
   focus. .in toggles a one-shot fly-in just before the pin engages so the
   stage lands cleanly. */
const Section = memo(function Section({ id, pos, children, className = "", ...rest }) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // rootMargin shrinks the trigger zone to the upper half of the viewport,
    // so .in fires when the section is just about to take the pinned position.
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVis(true);
          obs.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <section
      ref={ref}
      id={id}
      data-pos={pos}
      className={`sect${vis ? " in" : ""} ${className}`}
      {...rest}
    >
      <div className="sect-pin">
        <div className="sect-stage">
          {children}
        </div>
      </div>
    </section>
  );
});

/* ── Stagger child ──
   IO-triggered cascade: the parent container watches for entry, then each
   child fades + lifts in with a delay = index × 90ms. One-shot, calm. The
   scene's sticky pin is what makes scrolling feel cinematic; the stagger
   itself stays restrained so the page doesn't read as a particle demo. */
const StaggerItem = memo(function StaggerItem({ children, index, visible }) {
  return (
    <div
      className={`stag-item${visible ? " in" : ""}`}
      style={{ "--stag-i": index }}
    >
      {children}
    </div>
  );
});

/* ── Animated counter ── */
const CountUp = memo(function CountUp({ target, suffix = "", duration = 2000 }) {
  const [ref, visible] = useInView(0.5);
  const raf = useRef(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setVal(Math.round(eased * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [visible, target, duration]);

  return <span ref={ref}>{val}{suffix}</span>;
});

/* ── Dark mode hook ── */
function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  return [theme, toggle];
}

/* ── Hero scene ──
   First viewport of the page. The page subject's name is rendered HUGE
   in italic serif over the network, the tagline types out below, then
   a scroll cue points down. Sets the overall art direction.

   id="hero" so the scroll-handler's SCENE_IDS picks up its centre as
   the first camera waypoint (the wide-overview shot). */
const HeroScene = memo(function HeroScene({ onAvatarClick, avatarRef, scrolled }) {
  return (
    <section id="hero" className="hero-scene">
      {/* Hero avatar — bigger, anchored above the name. Click to
         trigger the headpat easter egg (same ref used by the corner
         badge so either click target works). */}
      {/* avatar button */}
      <button
        type="button"
        className="hero-avatar-btn sb-avatar-btn"
        onClick={onAvatarClick}
        aria-label="Tap the avatar"
      >
        <img
          ref={avatarRef}
          className="hero-avatar sb-avatar"
          src={D.avatar}
          alt={D.name}
          loading="eager"
          decoding="async"
        />
      </button>
      <DecodeText className="hero-kicker" text="Qiankang (Kant) Wang · 2026 portfolio" duration={820} delay={140} retrigger />
      <h1 className="hero-name">
        <span className="hero-name-line">
          {Array.from("Qiankang").map((c, i) => (
            <span key={i} className="hero-name-char" style={{ "--i": i }}>{c}</span>
          ))}
        </span>
        <span className="hero-name-line hero-name-line-2">
          {Array.from("Wang.").map((c, i) => (
            <span key={i} className="hero-name-char" style={{ "--i": i + 9 }}>{c}</span>
          ))}
        </span>
      </h1>
      <DecodeText
        as="p"
        className="hero-tagline"
        text={D.tagline}
        duration={1200}
        delay={780}
        retrigger
      />
      <div className="hero-meta">
        <span className="hero-meta-led" aria-hidden="true" />
        <span>UC Berkeley</span>
        <span className="hero-meta-dot" aria-hidden="true">·</span>
        <span>Data Science · 2027</span>
        <span className="hero-meta-dot" aria-hidden="true">·</span>
        <span className="hero-meta-dim">RES/0xQK</span>
      </div>
      <a
        href="#about"
        className={`hero-cue${scrolled ? " hero-cue-fade" : ""}`}
        aria-label="Scroll to about"
      >
        <span>Scroll</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <polyline points="19 12 12 19 5 12"/>
        </svg>
      </a>
    </section>
  );
});

/* ── Main ──
   SCENE_IDS drives the canvas camera path (one waypoint per id, in order),
   while NAV is what the nav rail shows (hero is the implicit entry, not
   a clickable rail item). */
const SCENE_IDS = ["hero", "about", "research", "publication", "projects", "skills"];
const NAV = ["About", "Research", "Publication", "Projects", "Skills"];

// GitHub-style language colour dots — keys match the GitHub
// repo.language field exactly so lookups are O(1) and unknown
// languages fall back to a neutral fg4.
const LANG_COLORS = {
  JavaScript: "#F1E05A",
  TypeScript: "#3178C6",
  Python:     "#3572A5",
  Jupyter:    "#DA5B0B",
  "Jupyter Notebook": "#DA5B0B",
  Java:       "#B07219",
  HTML:       "#E34C26",
  CSS:        "#563D7C",
  Go:         "#00ADD8",
  Rust:       "#DEA584",
  Swift:      "#FFAC45",
  "C++":      "#F34B7D",
  C:          "#555555",
  Ruby:       "#701516",
  PHP:        "#4F5D95",
  Shell:      "#89E051",
  R:          "#198CE7",
  MATLAB:     "#E16737",
  Kotlin:     "#A97BFF",
  Scala:      "#C22D40",
  Lua:        "#000080",
  Vue:        "#41B883",
  Svelte:     "#FF3E00",
  Dart:       "#00B4AB",
  Julia:      "#A270BA",
  Haskell:    "#5E5086",
};

export default function Portfolio() {
  const [theme, toggleTheme] = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState("");
  const [repos, setRepos] = useState([]);
  const [repoLoading, setRepoLoading] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  // Each qk-egg trigger bumps this counter so the toast div remounts
  // and replays its CSS animation. The counter itself never resets.
  const [eggCount, setEggCount] = useState(0);
  useEffect(() => {
    const onEgg = () => setEggCount((c) => c + 1);
    window.addEventListener("portfolio:qk", onEgg);
    return () => window.removeEventListener("portfolio:qk", onEgg);
  }, []);

  // Continuous "scene index" — a value in [0, SCENE_IDS.length-1] that
  // tracks the current scroll position as a float. Handed to the
  // ParticleScene every frame to drive the morph between formations.
  const sceneRef = useRef(0);

  // FPS sample from the WebGL render loop. ParticleScene writes the
  // current frames-per-second here every frame; SystemHUD polls it.
  const fpsRef = useRef(60);

  // Last interaction timestamp — any mouse move, scroll, key press,
  // click, or touch resets it. ParticleScene reads idle-ms via this
  // ref and boosts drift amplitude after 5s so the field "dreams"
  // when the reader is inactive. Snaps back immediately on any input.
  const lastInteractRef = useRef(performance.now());
  useEffect(() => {
    const bump = () => { lastInteractRef.current = performance.now(); };
    const events = ["mousemove", "scroll", "keydown", "click", "touchstart", "wheel"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, bump));
  }, []);

  // Smoothed scroll velocity in pixels-per-second. Sampled on every
  // scroll event, decayed at ~12 Hz when no scrolling is happening, so
  // the particle field can boost dispersal / scatter / line brightness
  // during fast scrolls and settle when the reader stops.
  const scrollVelRef = useRef(0);
  useEffect(() => {
    let lastY = window.scrollY;
    let lastT = performance.now();
    const decay = setInterval(() => {
      scrollVelRef.current *= 0.88;
      if (scrollVelRef.current < 0.5) scrollVelRef.current = 0;
    }, 80);
    const onScroll = () => {
      const now = performance.now();
      const dy = window.scrollY - lastY;
      const dt = Math.max(1, now - lastT) / 1000;
      lastY = window.scrollY;
      lastT = now;
      const vel = Math.abs(dy / dt);
      scrollVelRef.current = scrollVelRef.current * 0.5 + vel * 0.5;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearInterval(decay);
    };
  }, []);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const winH = window.innerHeight;
        const y = window.scrollY;
        setScrolled(y > 40);
        const docH = document.documentElement.scrollHeight - winH;
        const p = docH > 0 ? Math.min(y / docH, 1) : 0;
        setProgress(p);

        // Camera path: use ALL scenes (hero + 5 sections). Each scene's
        // anchor is its element's vertical centre in doc coords.
        const sceneEls = SCENE_IDS.map((id) => document.getElementById(id));
        const viewCentre = y + winH * 0.5;
        const centres = sceneEls.map((s) => {
          if (!s) return null;
          const rect = s.getBoundingClientRect();
          return rect.top + y + rect.height * 0.5;
        });
        let scene = 0;
        if (centres[0] != null && viewCentre <= centres[0]) {
          scene = 0;
        } else if (centres[centres.length - 1] != null && viewCentre >= centres[centres.length - 1]) {
          scene = centres.length - 1;
        } else {
          for (let i = 0; i < centres.length - 1; i++) {
            const a = centres[i];
            const b = centres[i + 1];
            if (a != null && b != null && viewCentre >= a && viewCentre < b) {
              scene = i + (viewCentre - a) / (b - a);
              break;
            }
          }
        }
        sceneRef.current = scene;

        // Nav rail highlight — flip when a NAV section's top crosses
        // the upper threshold of the viewport. (Hero isn't in the rail.)
        const navEls = NAV.map((n) => document.getElementById(n.toLowerCase()));
        const flipAt = winH * 0.4;
        for (let i = navEls.length - 1; i >= 0; i--) {
          if (navEls[i] && navEls[i].getBoundingClientRect().top < flipAt) {
            setActive(NAV[i]);
            ticking = false;
            return;
          }
        }
        setActive("");
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const CACHE_KEY = "gh-repos-v2";
    const TTL_MS = 60 * 60 * 1000;
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { ts, data } = JSON.parse(cached);
        if (Array.isArray(data) && data.length && Date.now() - ts < TTL_MS) {
          setRepos(data);
          setRepoLoading(false);
          return;
        }
      }
    } catch { /* corrupt cache — fall through and refetch */ }
    fetch("https://api.github.com/users/qiankangwang/repos?sort=updated&per_page=18")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data)
          ? data
              .filter((r) => !r.fork && r.name !== "my-portfolio")
              .slice(0, 6)
              .map((r) => ({
                id: r.id,
                name: r.name,
                description: r.description,
                language: r.language,
                stargazers_count: r.stargazers_count,
                html_url: r.html_url,
              }))
          : [];
        setRepos(list);
        setRepoLoading(false);
        if (list.length) {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: list }));
          } catch { /* quota — ignore */ }
        }
      })
      .catch(() => setRepoLoading(false));
  }, []);

  const scrollTo = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Publish the active section's accent as a body-level CSS variable
  // so chrome that lives outside .sect[data-pos] (edge glow, future
  // body-level decorations) can still tint with the scene the reader
  // is on. NAV is About..Skills (indices 0..4) which map to scenes
  // 1..5; null active means we're still in the hero (scene 0).
  useEffect(() => {
    const idx = active ? NAV.indexOf(active) + 1 : 0;
    const hue = SCENE_HUES[Math.max(0, Math.min(5, idx))].a;
    document.body.style.setProperty("--scene-accent", hue);
  }, [active]);

  // Reflect the current scene in the browser tab title so users
  // bookmarking or scanning their tab strip see where they are in
  // the document, not just the same static "Qiankang Wang" string.
  useEffect(() => {
    const base = "Qiankang (Kant) Wang - Data Science, UC Berkeley";
    document.title = active ? `${active} · Qiankang Wang` : base;
    return () => { document.title = base; };
  }, [active]);

  // Easter egg: typing 'qk' anywhere on the page (outside an input)
  // dispatches a custom event that ParticleScene picks up and fires
  // a high-intensity scene flash. Hidden treat for readers who notice
  // the page is responsive to keyboard input.
  useEffect(() => {
    let buffer = "";
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      buffer = (buffer + (e.key || "").toLowerCase()).slice(-3);
      if (buffer.endsWith("qk")) {
        window.dispatchEvent(new CustomEvent("portfolio:qk"));
        buffer = "";
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Vim-style keyboard navigation: j/k = next/prev section,
  // g/G = top/bottom of document. Ignored while focus is in a form
  // input so the keys can still be typed.
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const winH = window.innerHeight;
      const findActiveIdx = () => {
        for (let i = 0; i < SCENE_IDS.length; i++) {
          const el = document.getElementById(SCENE_IDS[i]);
          if (!el) continue;
          const r = el.getBoundingClientRect();
          if (r.top < winH * 0.45 && r.bottom > winH * 0.35) return i;
        }
        return 0;
      };
      if (e.key === "j" || (e.key === "ArrowDown" && e.shiftKey)) {
        e.preventDefault();
        const idx = Math.min(SCENE_IDS.length - 1, findActiveIdx() + 1);
        document.getElementById(SCENE_IDS[idx])?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (e.key === "k" || (e.key === "ArrowUp" && e.shiftKey)) {
        e.preventDefault();
        const idx = Math.max(0, findActiveIdx() - 1);
        document.getElementById(SCENE_IDS[idx])?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (e.key === "g") {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (e.key === "G") {
        e.preventDefault();
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
      } else if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("portfolio:toggle-hud"));
      } else if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [expRef, expVis] = useInView(0.15);
  const [skillRef, skillVis] = useInView(0.15);

  const patTimer = useRef(null);
  const patCountRef = useRef(0);
  const avatarRef = useRef(null);

  const onAvatarClick = useCallback(() => {
    const nextCount = Math.min(patCountRef.current + 1, 8);
    patCountRef.current = nextCount;
    if (patTimer.current) clearTimeout(patTimer.current);
    patTimer.current = setTimeout(() => {
      patCountRef.current = 0;
    }, 1500);

    const el = avatarRef.current;
    if (!el) return;
    const s = Math.min(0.55 + nextCount * 0.05, 0.88);
    const t = Math.min(6 + nextCount * 2, 22);
    el.animate(
      [
        { transform: "scale(1) translateY(0)" },
        { transform: `scale(1.06, ${s}) translateY(${t}px)`, offset: 0.4 },
        { transform: "scale(1) translateY(0)" },
      ],
      { duration: 380, easing: "cubic-bezier(.22, 1, .36, 1)" }
    );
  }, []);

  return (
    <>
      <IntroSplash />
      <AmbientBg />
      <GlyphRain />
      <a className="skip" href="#about">Skip to content</a>

      {/* ── Scroll progress ── */}
      <div className="scroll-progress" aria-hidden="true">
        <div
          className="scroll-progress-bar"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {/* ── Unified atmosphere ───────────────────────────────────────
         Full-bleed neural-network canvas sits behind everything as the
         page's living atmosphere. Identity badge, nav rail, and theme
         controls float in the viewport corners. Content scrolls in a
         single centred column on top — no split panes anywhere. */}
      <Atmosphere sceneRef={sceneRef} fpsRef={fpsRef} />
      <div className="edge-glow" aria-hidden="true" />
      {/* Screen-reader-only live region — announces the active section
         when it changes so AT users hear what the canvas is showing
         even though the canvas itself is aria-hidden. */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {active ? `Now viewing: ${active}` : "Now viewing: Introduction"}
      </div>
      {helpOpen && <HelpOverlay onClose={() => setHelpOpen(false)} />}
      {eggCount > 0 && (
        <div key={eggCount} className="egg-toast" aria-hidden="true">
          easter egg · qk
        </div>
      )}
      <SceneFlash sceneRef={sceneRef} />
      <CursorSpot />
      <ClickRipple />
      <SectionWatermark active={active} />
      <IdentityBadge />
      <KbdHint />
      <SideRail active={active} scrollTo={scrollTo} visible={scrolled} />
      <SystemHUD sceneRef={sceneRef} fpsRef={fpsRef} />
      <CornerControls theme={theme} toggleTheme={toggleTheme} />

      <main className="main">

        {/* ── Hero — first viewport, giant name + avatar floating over the network ── */}
        <HeroScene onAvatarClick={onAvatarClick} avatarRef={avatarRef} scrolled={scrolled} />

        {/* ── About — editorial pull-quote intro, stats row, focus list ── */}
        {/* Text + formation share each quadrant — they fuse via the
           canvas's mix-blend-mode: multiply. Quadrants drift along a
           continuous path TR → MR → BR → BL → TL so the camera and
           text move together as one cluster. */}
        <Section id="about" pos="tr">
          <div className="sect-meta">
            <a href="#about" className="sect-n">01 · About</a>
            <DecodeText className="sect-meta-aux" text={`PROFILE · ${D.focuses.length} FOCUSES`} duration={520} retrigger />
          </div>
          <p className="about-lede">{D.about}</p>
          <div className="about-stats-row">
            {D.stats.map((s) => (
              <div key={s.l} className="stat-inline">
                <span className="stat-n">{s.n}</span>
                <span className="stat-l">{s.l}</span>
              </div>
            ))}
            <div className="stat-inline">
              <span className="stat-n"><CountUp target={new Date().getFullYear() - 2024} suffix="+" /></span>
              <span className="stat-l">Years researching</span>
            </div>
          </div>
          <ul className="focus-list">
            {D.focuses.map((f) => (
              <li key={f} className="focus-item">{f}</li>
            ))}
          </ul>
        </Section>

        {/* ── Research — year-led editorial rows, no card chrome ── */}
        <Section id="research" pos="mr">
          <div className="sect-meta">
            <a href="#research" className="sect-n">02 · Research</a>
            <DecodeText className="sect-meta-aux" text={`FIELD · ${D.experience.length} LABS`} duration={520} retrigger />
          </div>
          <DecodeText as="h2" className="sect-title decode-title" text={"Field notes\nfrom three labs."} duration={820} delay={120} retrigger />
          <ol className="exp-list" ref={expRef}>
            {D.experience.map((exp, i) => {
              const startYear = exp.period.match(/(\d{4})/)?.[1] ?? "—";
              return (
                <StaggerItem key={exp.org} index={i} visible={expVis}>
                  <li className="exp-row">
                    <time className="exp-year">{startYear}</time>
                    <div className="exp-body">
                      <div className="exp-role">{exp.role}</div>
                      <div className="exp-org">{exp.org}</div>
                      <div className="exp-period">{exp.period}</div>
                      <p className="exp-desc">{exp.desc}</p>
                      <span className="exp-tag">{exp.tag}</span>
                    </div>
                  </li>
                </StaggerItem>
              );
            })}
          </ol>
        </Section>

        {/* ── Publication — huge serif title, no card ── */}
        <Section id="publication" pos="br">
          <div className="sect-meta">
            <a href="#publication" className="sect-n">03 · Publication</a>
            <span className="sect-meta-aux">{D.publication.venue} · {D.publication.year}</span>
          </div>
          <a
            href={D.publication.links[0]?.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="pub-link"
          >
            <DecodeText as="h2" className="pub-title" text={D.publication.title} duration={820} delay={120} retrigger />
            <p className="pub-authors">
              {D.publication.authors} · <em>{D.publication.role}</em>
            </p>
            <span className="pub-cta">
              Read paper
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </span>
          </a>
        </Section>

        {/* ── Projects — list rows, hover-revealed underline ── */}
        <Section id="projects" pos="bl">
          <div className="sect-meta">
            <a href="#projects" className="sect-n">04 · Projects</a>
            <DecodeText className="sect-meta-aux" text={`REPOS · ${(repos.length > 0 ? repos.length : D.projects.length)} LIVE`} duration={520} retrigger />
          </div>
          <DecodeText as="h2" className="sect-title decode-title" text="Things I built." duration={820} delay={120} retrigger />
          {repoLoading ? (
            <div className="projects-loading">
              <div className="spinner" />
              <span>Loading repositories…</span>
            </div>
          ) : (
            <ul className="proj-list">
              {(repos.length > 0 ? repos : D.projects).map((repo, i) => (
                <li key={repo.id || repo.name} className="proj-row" style={{ "--stag-i": i }}>
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="proj-link"
                  >
                    <span className="proj-name">{repo.name}</span>
                    <span className="proj-desc">{repo.description || "No description provided."}</span>
                    <span className="proj-meta">
                      <span className="proj-lang">
                        {repo.language && (
                          <span
                            className="proj-lang-dot"
                            style={{ background: LANG_COLORS[repo.language] || "var(--fg4)" }}
                            aria-hidden="true"
                          />
                        )}
                        {repo.language || "—"}
                      </span>
                      {repo.stargazers_count > 0 && (
                        <span className="proj-stars">★ {repo.stargazers_count}</span>
                      )}
                      <span className="proj-arrow" aria-hidden="true">→</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* ── Skills — pill cloud grouped under mono labels ── */}
        <Section id="skills" pos="tl">
          <div className="sect-meta">
            <a href="#skills" className="sect-n">05 · Skills</a>
            <DecodeText className="sect-meta-aux" text={`TOOLKIT · ${Object.keys(D.skills).length} STACKS`} duration={520} retrigger />
          </div>
          <DecodeText as="h2" className="sect-title decode-title" text={"Tools of\nthe trade."} duration={820} delay={120} retrigger />
          <div className="skill-groups" ref={skillRef}>
            {Object.entries(D.skills).map(([cat, items], ci) => (
              <StaggerItem key={cat} index={ci} visible={skillVis}>
                <div className="skill-group">
                  <div className="skill-cat">{cat}</div>
                  <ul className="skill-pills">
                    {items.map((s) => (
                      <li key={s} className="pill">{s}</li>
                    ))}
                  </ul>
                </div>
              </StaggerItem>
            ))}
          </div>
        </Section>

        {/* ── Footer (inside main column so it scrolls with content) ── */}
        <footer className="foot">
          <div className="foot-inner">
            <div className="foot-sig">
              <span className="foot-led" aria-hidden="true" />
              <span className="foot-sig-k">NEURAL_FIELD</span>
              <span className="foot-sig-sep" aria-hidden="true">·</span>
              <span className="foot-sig-v">v2.6</span>
              <span className="foot-sig-sep" aria-hidden="true">·</span>
              <span className="foot-sig-v foot-sig-dim">
                BUILD #{(Math.floor(Date.now() / 86400000) % 9999).toString().padStart(4, "0")}
              </span>
              <span className="foot-sig-sep" aria-hidden="true">·</span>
              <a
                href="https://github.com/qiankangwang/my-portfolio"
                target="_blank"
                rel="noopener noreferrer"
                className="foot-sig-link"
              >
                view source
              </a>
            </div>
            <div className="foot-copy">© {new Date().getFullYear()} {D.fullName} · Built with React</div>
          </div>
        </footer>
      </main>

    </>
  );
}
