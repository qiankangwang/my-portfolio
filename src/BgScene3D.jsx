import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Environment } from "@react-three/drei";
import {
  useRef,
  useMemo,
  useEffect,
  Suspense,
  useState,
  memo,
} from "react";
import * as THREE from "three";

/* ════════════════════════════════════════════════════════════════════════
   Unified palette ─ same values as Portfolio.css var(--accent) / --warm,
   so emissive surfaces and the card borders/shadows share one colour
   system. The 3D scene reads as part of the same design language as the
   UI rather than a separate WebGL demo behind it.
   ════════════════════════════════════════════════════════════════════════ */
const COL = {
  blue:     "#60A5FA",
  blueDeep: "#3B82F6",
  bluePale: "#93C5FD",
  amber:    "#FBBF24",
};

// Reusable scratch objects so frame loops don't allocate.
const _m4 = new THREE.Matrix4();
const _v3 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _color = new THREE.Color();

/* ════════════════════════════════════════════════════════════════════════
   Neural-net data: 150 Fibonacci-sphere nodes + K-nearest-neighbour edges
   ════════════════════════════════════════════════════════════════════════ */
function buildNetwork(N = 150, K = 6, radius = 2.85) {
  const nodes = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    const pos = new THREE.Vector3(
      Math.cos(theta) * r * radius,
      y * radius,
      Math.sin(theta) * r * radius
    );
    nodes.push({
      pos,
      wavePos: Math.atan2(pos.z, pos.x) / (Math.PI * 2) + 0.5,
      basePhase: Math.random() * Math.PI * 2,
    });
  }
  // K-nearest-neighbour edges (each pair only once)
  const edges = [];
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    const dists = [];
    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      dists.push({ j, d: nodes[i].pos.distanceTo(nodes[j].pos) });
    }
    dists.sort((a, b) => a.d - b.d);
    for (let k = 0; k < K; k++) {
      const j = dists[k].j;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ a: nodes[i].pos, b: nodes[j].pos });
    }
  }
  return { nodes, edges };
}

/* ─── Neural network (InstancedMesh ×4 + wireframe containment) ─────── */
function NeuralBrain() {
  const groupRef = useRef();
  const coreRef = useRef();
  const haloRef = useRef();

  // 160 nodes / K=6 keeps the network feeling dense without paying for 200×
  // per-frame color buffer rewrites on lower-end GPUs (one of the sources
  // of the choppy feel — the GPU was uploading ~1200 floats per frame).
  const { nodes, edges } = useMemo(() => buildNetwork(160, 6, 3.4), []);

  // Initialise instance matrices + initial colors once.
  useEffect(() => {
    if (!coreRef.current || !haloRef.current) return;
    const init = new THREE.Color(COL.bluePale);
    nodes.forEach((n, i) => {
      _m4.makeTranslation(n.pos.x, n.pos.y, n.pos.z);
      coreRef.current.setMatrixAt(i, _m4);
      haloRef.current.setMatrixAt(i, _m4);
      coreRef.current.setColorAt(i, init);
      haloRef.current.setColorAt(i, init);
    });
    coreRef.current.instanceMatrix.needsUpdate = true;
    haloRef.current.instanceMatrix.needsUpdate = true;
    coreRef.current.instanceColor.needsUpdate = true;
    haloRef.current.instanceColor.needsUpdate = true;
  }, [nodes]);

  useFrame(({ clock }) => {
    if (!coreRef.current) return;
    const t = clock.elapsedTime;

    // Slow, continuous "breathing" activation wave instead of the old fast
    // disco-pulse. Frequency 0.45/s (was 1.5/s and coupled to scroll
    // velocity) gives a calm, cinematic shimmer. Burst is shaped by sin²
    // for a softer ramp-in/out — no harsh on/off snaps.
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const wave = Math.sin(t * 0.45 - n.wavePos * Math.PI * 4 + n.basePhase * 0.3);
      const burst = Math.max(0, wave);
      const intensity = 0.6 + burst * burst * 5.5;
      _color.setRGB(0.376 * intensity, 0.647 * intensity, 0.98 * intensity);
      coreRef.current.setColorAt(i, _color);
      _color.multiplyScalar(0.3);
      haloRef.current.setColorAt(i, _color);
    }
    coreRef.current.instanceColor.needsUpdate = true;
    haloRef.current.instanceColor.needsUpdate = true;

    if (groupRef.current) {
      // Slow continuous orbit. Halved from t*0.05 so the network rotation
      // reads as ambient drift, not active spinning.
      groupRef.current.rotation.y = t * 0.025;
      groupRef.current.rotation.x = Math.sin(t * 0.04) * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Solid blue core dots — readable as nodes on the light backdrop */}
      <instancedMesh ref={coreRef} args={[null, null, nodes.length]}>
        <icosahedronGeometry args={[0.075, 1]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>
      {/* Outer additive halo — soft aura on the burst peaks */}
      <instancedMesh ref={haloRef} args={[null, null, nodes.length]}>
        <icosahedronGeometry args={[0.2, 1]} />
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
      {/* Edges + flowing data packets share the network's edges */}
      <NetworkEdges edges={edges} />
      <DataPackets edges={edges} count={55} />
      {/* Faint wireframe icosahedron suggesting a containment field */}
      <mesh>
        <icosahedronGeometry args={[4.0, 2]} />
        <meshBasicMaterial
          color={COL.blue}
          wireframe
          transparent
          opacity={0.08}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ─── Edges as instanced cylinders (sharp, beautiful, ~450 in 1 draw) ─── */
function NetworkEdges({ edges }) {
  const meshRef = useRef();
  useEffect(() => {
    if (!meshRef.current) return;
    edges.forEach((edge, i) => {
      _dir.subVectors(edge.b, edge.a);
      const length = _dir.length();
      _v3.addVectors(edge.a, edge.b).multiplyScalar(0.5);
      _dir.normalize();
      _q.setFromUnitVectors(_up, _dir);
      _scale.set(1, length, 1);
      _m4.compose(_v3, _q, _scale);
      meshRef.current.setMatrixAt(i, _m4);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [edges]);
  return (
    <instancedMesh ref={meshRef} args={[null, null, edges.length]}>
      <cylinderGeometry args={[0.008, 0.008, 1, 5]} />
      <meshBasicMaterial
        color={COL.blueDeep}
        transparent
        opacity={0.55}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

/* ─── Data packets streaming along edges (the "tech-thinking" feel) ──── */
function DataPackets({ edges, count = 55 }) {
  const meshRef = useRef();
  // useMemo guarantees packets exists before the first useFrame tick;
  // useRef + useEffect raced the r3f render loop in StrictMode (first
  // frame fired before the effect committed → undefined.t crash).
  const packets = useMemo(
    () => Array.from({ length: count }, () => ({
      edgeIdx: Math.floor(Math.random() * edges.length),
      t: Math.random(),
      // Narrower speed range so packets travel at a more uniform pace —
      // looks calmer / more deliberate.
      speed: 0.35 + Math.random() * 0.35,
    })),
    [edges, count]
  );

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    for (let i = 0; i < count; i++) {
      const p = packets[i];
      p.t += p.speed * dt * 0.45;
      if (p.t > 1) {
        p.t = 0;
        p.edgeIdx = Math.floor(Math.random() * edges.length);
      }
      const edge = edges[p.edgeIdx];
      if (!edge) continue;
      _v3.lerpVectors(edge.a, edge.b, p.t);
      _m4.makeTranslation(_v3.x, _v3.y, _v3.z);
      meshRef.current.setMatrixAt(i, _m4);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[0.028, 10, 10]} />
      <meshBasicMaterial color={COL.bluePale} toneMapped={false} />
    </instancedMesh>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Camera rig
   - 6 section-themed waypoints (matches Portfolio NAV order).
   - Each transition into a new section triggers a Bloom spike + a pulse
     burst so the network "responds" to the user arriving at the section.
   - Cinematic handheld jitter + critical-damped follow for filmic motion.
   - Look targets biased left (-0.5 X) to compose the scene on the left
     half of the canvas, leaving breathing room for the glass card on the
     right.
   ════════════════════════════════════════════════════════════════════════ */
function CameraRig({ phaseRef }) {
  const { camera } = useThree();
  const desiredPos = useRef(new THREE.Vector3(1.6, 1.0, 10.5));
  const desiredLook = useRef(new THREE.Vector3(-1.0, 0, 0));
  const currentLook = useRef(new THREE.Vector3(-1.0, 0, 0));
  // Low-pass-filtered phase: phaseRef can jump on wheel ticks (discrete
  // scroll events), and feeding those jumps directly into the camera lerp
  // produces visible micro-jolts. Smoothing the phase itself removes them
  // at the source so the camera glides instead of pulses.
  const smoothedPhase = useRef(0);

  // Continuous orbit around the network — the only subject in the scene.
  // Look targets biased -1.0 X so the network sits on the LEFT half of
  // the canvas, leaving breathing room on the right for the card panel.
  // Camera distance varies gently (8–11.5) for a touch of dolly motion.
  const waypoints = useMemo(
    () => [
      // p=0.0 ── About: opening front-right wide
      { pos: [1.6, 1.0, 10.5], look: [-1.0, 0, 0], fov: 50 },
      // p=0.2 ── drift around to the near-left face
      { pos: [-1.6, 1.2, 8.8], look: [-1.0, 0.1, 0], fov: 46 },
      // p=0.4 ── Research: orbit upper-left, network filling frame
      { pos: [-4.0, 2.0, 7.0], look: [-1.0, 0.3, 0], fov: 46 },
      // p=0.6 ── Publication: drift over the top
      { pos: [-2.4, 3.6, 8.0], look: [-1.0, -0.2, 0], fov: 48 },
      // p=0.8 ── Projects: continue orbit to the right side
      { pos: [2.8, 2.4, 8.4], look: [-0.6, -0.2, 0], fov: 48 },
      // p=1.0 ── Skills: settle wider for the closing composition
      { pos: [1.4, 1.4, 11.5], look: [-1.0, 0, 0], fov: 52 },
    ],
    []
  );

  useFrame((state, dt) => {
    const rawP = Math.min(Math.max(phaseRef?.current ?? 0, 0), 1);

    // First-order low-pass on the phase itself. tau ≈ 0.10s — debounces
    // discrete wheel-tick jumps without making the camera feel laggy. The
    // camera-follow lerp downstream adds another ~0.25s smoothing, giving
    // a total perceived response of ~0.35s — cinematic but responsive.
    const kPhase = 1 - Math.exp(-(dt / 0.10));
    smoothedPhase.current += (rawP - smoothedPhase.current) * kPhase;
    const p = smoothedPhase.current;

    // Waypoint interpolation
    const idx = p * (waypoints.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(lo + 1, waypoints.length - 1);
    const u = idx - lo;
    const eased = u * u * (3 - 2 * u);
    const a = waypoints[lo];
    const b = waypoints[hi];

    desiredPos.current.set(
      a.pos[0] + (b.pos[0] - a.pos[0]) * eased,
      a.pos[1] + (b.pos[1] - a.pos[1]) * eased,
      a.pos[2] + (b.pos[2] - a.pos[2]) * eased
    );
    desiredLook.current.set(
      a.look[0] + (b.look[0] - a.look[0]) * eased,
      a.look[1] + (b.look[1] - a.look[1]) * eased,
      a.look[2] + (b.look[2] - a.look[2]) * eased
    );
    const fov = a.fov + (b.fov - a.fov) * eased;

    // Critical-damped follow (tau ≈ 0.25s). Combined with the upstream
    // 0.10s phase filter, the camera glides into each waypoint over ~0.35s
    // total — fast enough to feel directly linked to scroll, slow enough
    // to never appear to "snap".
    const k = 1 - Math.exp(-dt / 0.25);
    camera.position.lerp(desiredPos.current, k);
    currentLook.current.lerp(desiredLook.current, k);
    camera.lookAt(currentLook.current);

    // Subtle slow drift in lieu of the old handheld jitter. ~0.5x lower
    // amplitude and ~3x slower frequency — reads as "breathing", not
    // "shaky cam". Applied as a relative offset to the lerped position so
    // it doesn't compound frame-over-frame.
    const tNow = state.clock.elapsedTime;
    camera.position.x += Math.sin(tNow * 0.22) * 0.006;
    camera.position.y += Math.cos(tNow * 0.17) * 0.005;

    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, fov, k);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

/* ─── Theme bridge ─ recolours bg + fog based on data-theme attribute ─── */
function Theme() {
  const [dark, setDark] = useState(() => {
    if (typeof document === "undefined") return true;
    return document.documentElement.getAttribute("data-theme") === "dark";
  });
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setDark(document.documentElement.getAttribute("data-theme") === "dark");
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  // Light mode: soft cool-gray atmosphere so the 3D feels bright and reads
  // as part of the same airy palette as the cards. Dark mode: deep navy.
  const bgColor = dark ? "#0F172A" : "#D6DCE5";
  const fogColor = dark ? "#0F172A" : "#D6DCE5";
  return (
    <>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[fogColor, 12, 34]} />
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Composition
   ════════════════════════════════════════════════════════════════════════ */
// Memoised: Portfolio re-renders on every scroll event (setProgress for the
// CSS scroll bar). phaseRef is a stable useRef so React.memo's default
// shallow compare skips the whole 3D subtree, leaving the Canvas's internal
// useFrame loop to drive animation — no React work per scroll tick.
function BgScene3DInner({ phaseRef }) {
  return (
    <Canvas
      // DPR capped at 1.5 (was 2) — on retina laptops a 2× framebuffer is
      // 1.78× the pixel work of 1.5×, and a steady 60fps is more important
      // than the marginal sharpness gain for a soft animated backdrop.
      dpr={[1, 1.5]}
      camera={{ position: [1.6, 1.0, 10.5], fov: 50, near: 0.1, far: 140 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0, zIndex: 0 }}
    >
      <Suspense fallback={null}>
        <Theme />

        {/* HDR environment so PhysicalMaterials get real reflections.
           Brighter "studio" preset reads better on the light backdrop than
           "night" which was tuned for the old dark scene. */}
        <Environment preset="studio" environmentIntensity={0.85} />

        {/* Lighting: airy fill + soft key + gentle accent rims. Reduced
           power-point lights so the scene reads bright/clean rather than
           a moody nightclub. */}
        <ambientLight intensity={0.85} />
        <hemisphereLight color="#FFFFFF" groundColor="#C8D2E0" intensity={0.65} />
        <directionalLight position={[6, 8, 4]} intensity={0.7} color="#fff5e6" />
        <pointLight position={[-5, 3, -3]} intensity={1.2} color={COL.blue} distance={18} />
        <pointLight position={[4, -1, 4]} intensity={0.9} color={COL.amber} distance={14} />

        <CameraRig phaseRef={phaseRef} />

        {/* The whole scene is the neural network now — no DNA, no protein
           ribbons, no RNA loops, no sparkles, no orbital tracers, no
           nebula plane. Pure AI/network subject so the eye has exactly
           one thing to look at and the GPU has less per-frame work. */}
        <NeuralBrain />

        {/* Gentle bloom on the bright HDR emissives — clean, no ref (see
           commit history: React 19 puts refs in the props bag and drei's
           postprocessing JSON.stringifies them). Vignette / aberration /
           noise dropped: they darkened the corners and added film grain,
           which fought the bright airy palette we want now. */}
        <EffectComposer multisampling={0} disableNormalPass>
          <Bloom
            intensity={1.1}
            luminanceThreshold={0.7}
            luminanceSmoothing={0.35}
            mipmapBlur
          />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}

export default memo(BgScene3DInner);
