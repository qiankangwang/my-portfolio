import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
  ChromaticAberration,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Stars, Sparkles, Float, Environment, Trail } from "@react-three/drei";
import { useRef, useMemo, useEffect, Suspense, useState } from "react";
import * as THREE from "three";

/**
 * BgScene3D — cinematic 3D stage for the portfolio.
 *
 * The composition (built top-down inside the Canvas):
 *
 *   1.  drei <Stars> — distant starfield, slowly drifting.
 *   2.  Background nebula plane — a soft radial gradient sphere far behind
 *       everything, gives the dark space a coloured glow rather than pure
 *       black; fixes the "too dark to read against" feedback.
 *   3.  Neural network "brain" — 120 nodes Fibonacci-distributed on a
 *       sphere (radius 2.8) around the central DNA. Nodes are emissive
 *       physical-material spheres; edges are nearest-neighbour line
 *       segments. A travelling activation wave (great-circle direction)
 *       cycles brightness across the cluster.
 *   4.  Central DNA double helix — two intertwined TubeGeometry strands
 *       (warm gold + cool cyan), each with clearcoat + iridescent
 *       physical material. Base pairs as line segments.
 *   5.  Floating sub-structures (wrapped in drei <Float>):
 *         · 3 protein α-helices (ribbon-style tubes)
 *         · 2 RNA loops (closed CatmullRom curves with small spheres)
 *   6.  drei <Sparkles> swirling around the DNA — instant micro-glow.
 *   7.  Two orbiting drei <Trail> tracers — long emissive streaks circling
 *       the central structure.
 *   8.  HDR <Environment preset="night"> — gives every physical material
 *       proper reflections so the scene reads as "real" rather than flat
 *       3D-toy. This + Bloom is what pushes the premium feel.
 *
 * Camera (CameraRig): 5 director-style waypoints with FOV interpolation
 * (50→44→34→46→54 — wide, dolly, long-lens close, crane, pull-back). A
 * critical-damped follow makes scrolls of any speed land smooth.
 *
 * Post: Bloom (mipmap blur), Vignette, subtle ChromaticAberration on the
 * frame edges, screen-blended Noise. Together this reads as filmic
 * grade rather than raw WebGL.
 */

// ─── Spherical neural-net using Fibonacci-distributed nodes ──────────────
function NeuralBrain({ pulseSpeedRef }) {
  const groupRef = useRef();
  const sphereRefs = useRef([]);

  const { nodes, edgePositions, edgeAlphas } = useMemo(() => {
    const N = 120;
    const radius = 2.85;
    const pts = [];
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = phi * i;
      pts.push(
        new THREE.Vector3(
          Math.cos(theta) * r * radius,
          y * radius,
          Math.sin(theta) * r * radius
        )
      );
    }
    const ns = pts.map((p) => ({
      pos: p,
      // Activation phase along great-circle direction (azimuth-ish)
      wavePos: Math.atan2(p.z, p.x) / (Math.PI * 2) + 0.5,
      basePhase: Math.random() * Math.PI * 2,
    }));

    // Connect each node to its K nearest neighbours (drops to ~5-6 edges/node)
    const K = 4;
    const positions = [];
    for (let i = 0; i < N; i++) {
      const dists = [];
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        dists.push({ j, d: ns[i].pos.distanceTo(ns[j].pos) });
      }
      dists.sort((a, b) => a.d - b.d);
      for (let k = 0; k < K; k++) {
        const j = dists[k].j;
        if (j > i) {
          positions.push(ns[i].pos.x, ns[i].pos.y, ns[i].pos.z);
          positions.push(ns[j].pos.x, ns[j].pos.y, ns[j].pos.z);
        }
      }
    }

    return { nodes: ns, edgePositions: new Float32Array(positions), edgeAlphas: 0.22 };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const speed = pulseSpeedRef?.current ?? 1;
    sphereRefs.current.forEach((m, i) => {
      if (!m) return;
      const n = nodes[i];
      // Activation wave travels around the sphere
      const wave = Math.sin(t * 1.4 * speed - n.wavePos * Math.PI * 4 + n.basePhase * 0.3);
      const burst = Math.max(0, wave);
      const intensity = 0.6 + burst * burst * 3.2;
      m.material.emissiveIntensity = intensity;
      const s = 1 + burst * 0.6;
      m.scale.setScalar(s);
    });
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.045;
      groupRef.current.rotation.x = Math.sin(t * 0.08) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {nodes.map((n, i) => (
        <mesh
          key={i}
          ref={(el) => (sphereRefs.current[i] = el)}
          position={n.pos}
        >
          <icosahedronGeometry args={[0.075, 1]} />
          <meshStandardMaterial
            color="#a8d4ff"
            emissive="#6ab2ff"
            emissiveIntensity={1}
            roughness={0.25}
            metalness={0.4}
          />
        </mesh>
      ))}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={edgePositions.length / 3}
            array={edgePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#6ab2ff" transparent opacity={edgeAlphas} />
      </lineSegments>
    </group>
  );
}

// ─── Central DNA double helix with iridescent physical material ──────────
function DNAHelix() {
  const groupRef = useRef();

  const { curveA, curveB, basePairs } = useMemo(() => {
    const turns = 3.4;
    const samples = 140;
    const radius = 0.6;
    const height = 4.8;
    const ptsA = [];
    const ptsB = [];
    const pairs = [];
    for (let i = 0; i < samples; i++) {
      const t = i / (samples - 1);
      const angle = t * turns * Math.PI * 2;
      const y = (t - 0.5) * height;
      const a = new THREE.Vector3(
        Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      );
      const b = new THREE.Vector3(
        Math.cos(angle + Math.PI) * radius,
        y,
        Math.sin(angle + Math.PI) * radius
      );
      ptsA.push(a);
      ptsB.push(b);
      if (i % 4 === 0) pairs.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    return {
      curveA: new THREE.CatmullRomCurve3(ptsA),
      curveB: new THREE.CatmullRomCurve3(ptsB),
      basePairs: new Float32Array(pairs),
    };
  }, []);

  useFrame((_, dt) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * 0.28;
      const ms = performance.now();
      groupRef.current.rotation.x = Math.sin(ms * 0.0002) * 0.08;
      groupRef.current.position.y = Math.sin(ms * 0.0004) * 0.12;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Strand A — warm gold, clearcoat for jewel feel */}
      <mesh>
        <tubeGeometry args={[curveA, 180, 0.055, 12, false]} />
        <meshPhysicalMaterial
          color="#ffb070"
          emissive="#ff7a30"
          emissiveIntensity={1.4}
          roughness={0.18}
          metalness={0.5}
          clearcoat={1}
          clearcoatRoughness={0.1}
          iridescence={0.6}
          iridescenceIOR={1.3}
        />
      </mesh>
      {/* Strand B — cool cyan */}
      <mesh>
        <tubeGeometry args={[curveB, 180, 0.055, 12, false]} />
        <meshPhysicalMaterial
          color="#9cdcff"
          emissive="#4aa8ff"
          emissiveIntensity={1.4}
          roughness={0.18}
          metalness={0.5}
          clearcoat={1}
          clearcoatRoughness={0.1}
          iridescence={0.6}
          iridescenceIOR={1.3}
        />
      </mesh>
      {/* Base pairs — violet line segments */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={basePairs.length / 3}
            array={basePairs}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#c8b6ff" transparent opacity={0.7} />
      </lineSegments>
      {/* Sparkles around the helix */}
      <Sparkles
        count={60}
        scale={[1.8, 5.5, 1.8]}
        size={3}
        speed={0.35}
        color="#dcccff"
        noise={0.4}
      />
    </group>
  );
}

// ─── Protein α-helix ribbons (multiple sizes/positions) ──────────────────
function ProteinRibbon({ pos, color, scale, speed, turns = 4, samples = 80 }) {
  const groupRef = useRef();
  const curve = useMemo(() => {
    const r = 0.32;
    const h = 1.8;
    const pts = [];
    for (let i = 0; i < samples; i++) {
      const t = i / (samples - 1);
      const angle = t * turns * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * r, (t - 0.5) * h, Math.sin(angle) * r));
    }
    return new THREE.CatmullRomCurve3(pts);
  }, [turns, samples]);

  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * speed;
  });

  return (
    <group ref={groupRef} position={pos} scale={scale}>
      <mesh>
        <tubeGeometry args={[curve, 100, 0.055, 8, false]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.9}
          roughness={0.3}
          metalness={0.4}
          clearcoat={0.6}
        />
      </mesh>
    </group>
  );
}

// ─── RNA loop — closed curve with bead spheres ───────────────────────────
function RNALoop({ pos, scale = 1, color = "#a8c8ff", speed = 0.5 }) {
  const groupRef = useRef();
  const curve = useMemo(() => {
    const pts = [];
    const N = 24;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      // Lemniscate-ish loop for variety
      const r = 0.9 + Math.cos(t * 2) * 0.2;
      pts.push(new THREE.Vector3(Math.cos(t) * r, Math.sin(t * 2) * 0.45, Math.sin(t) * r * 0.7));
    }
    return new THREE.CatmullRomCurve3(pts, true);
  }, []);

  const beadPositions = useMemo(() => {
    const arr = [];
    const N = 18;
    for (let i = 0; i < N; i++) {
      const p = curve.getPoint(i / N);
      arr.push([p.x, p.y, p.z]);
    }
    return arr;
  }, [curve]);

  useFrame((_, dt) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * speed;
      groupRef.current.rotation.z += dt * speed * 0.4;
    }
  });

  return (
    <group ref={groupRef} position={pos} scale={scale}>
      <mesh>
        <tubeGeometry args={[curve, 100, 0.04, 8, true]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.7}
          roughness={0.35}
          metalness={0.4}
        />
      </mesh>
      {beadPositions.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.4}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Orbiting tracers with motion trails (drei <Trail>) ──────────────────
function OrbitingTracer({ radius = 3.4, axisTilt = 0.5, speed = 0.6, color = "#88c4ff" }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * speed;
    ref.current.position.set(
      Math.cos(t) * radius,
      Math.sin(t * 1.3) * radius * axisTilt,
      Math.sin(t) * radius
    );
  });
  return (
    <Trail
      width={0.4}
      length={5}
      color={color}
      attenuation={(t) => t * t}
    >
      <mesh ref={ref}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} toneMapped={false} />
      </mesh>
    </Trail>
  );
}

// ─── Nebula backdrop plane (lifts the scene out of pure black) ───────────
function Nebula() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 512;
    const g = c.getContext("2d");
    // Two overlapping radial gradients for a richer nebula
    const g1 = g.createRadialGradient(420, 220, 0, 420, 220, 360);
    g1.addColorStop(0, "rgba(96, 142, 230, 0.55)");
    g1.addColorStop(0.4, "rgba(58, 78, 158, 0.28)");
    g1.addColorStop(1, "rgba(0, 0, 0, 0)");
    g.fillStyle = g1;
    g.fillRect(0, 0, 1024, 512);
    const g2 = g.createRadialGradient(680, 320, 0, 680, 320, 280);
    g2.addColorStop(0, "rgba(180, 100, 200, 0.35)");
    g2.addColorStop(0.5, "rgba(120, 60, 160, 0.15)");
    g2.addColorStop(1, "rgba(0, 0, 0, 0)");
    g.fillStyle = g2;
    g.fillRect(0, 0, 1024, 512);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  return (
    <mesh position={[0, 0, -18]} scale={[48, 26, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent fog={false} />
    </mesh>
  );
}

// ─── Camera rig: director-style waypoints, scroll-driven ─────────────────
function CameraRig({ phaseRef, pulseSpeedRef }) {
  const { camera } = useThree();
  const desiredPos = useRef(new THREE.Vector3(0, 0.4, 11));
  const desiredLook = useRef(new THREE.Vector3(0, 0, 0));
  const currentLook = useRef(new THREE.Vector3(0, 0, 0));
  const lastPhase = useRef(0);

  const waypoints = useMemo(
    () => [
      // p=0   ── opening establishing shot
      { pos: [0, 0.8, 11.5], look: [0, 0, 0], fov: 52 },
      // p=0.25 ── dolly forward, slight tilt right
      { pos: [3.6, 1.6, 6.8],  look: [0.4, 0.2, 0], fov: 46 },
      // p=0.5  ── inside the sphere now, long lens on DNA
      { pos: [1.5, 0,   2.6],  look: [0, 0, 0], fov: 32 },
      // p=0.75 ── crane up and over, looking down through structure
      { pos: [-3.4, 4.6, 4.8], look: [0, -0.5, 0], fov: 46 },
      // p=1    ── wide closer, off-axis pull-back
      { pos: [2.2, 1.2, 12],   look: [0, 0, 0], fov: 56 },
    ],
    []
  );

  useFrame((state, dt) => {
    const p = Math.min(Math.max(phaseRef?.current ?? 0, 0), 1);

    const dp = Math.abs(p - lastPhase.current);
    lastPhase.current = p;
    const scrollVel = Math.min(dp * 60, 1);
    pulseSpeedRef.current = 1 + scrollVel * 2.5;

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

    // Critical-damped follow (frame-rate independent)
    const k = 1 - Math.exp(-2.8 * dt);
    camera.position.lerp(desiredPos.current, k);
    currentLook.current.lerp(desiredLook.current, k);
    camera.lookAt(currentLook.current);

    // Cinematic breathing — tiny sub-Hz handheld jitter on the look-target
    const tNow = state.clock.elapsedTime;
    const jitterX = Math.sin(tNow * 0.7) * 0.025 + Math.sin(tNow * 1.31) * 0.012;
    const jitterY = Math.cos(tNow * 0.5) * 0.02 + Math.cos(tNow * 1.07) * 0.01;
    camera.position.x += jitterX * 0.4;
    camera.position.y += jitterY * 0.4;

    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, fov, k);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

// ─── Theme bridge (recolours bg + fog when CSS theme toggles) ────────────
function Theme() {
  const [dark, setDark] = useState(() => {
    if (typeof document === "undefined") return true;
    return document.documentElement.getAttribute("data-theme") !== "light";
  });
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setDark(document.documentElement.getAttribute("data-theme") !== "light");
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  const bgColor = dark ? "#070b1c" : "#0c1530";
  const fogColor = dark ? "#070b1c" : "#0c1530";
  return (
    <>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[fogColor, 10, 28]} />
    </>
  );
}

export default function BgScene3D({ phaseRef }) {
  const pulseSpeedRef = useRef(1);

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.8, 11.5], fov: 52, near: 0.1, far: 120 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0, zIndex: 0 }}
    >
      <Suspense fallback={null}>
        <Theme />

        {/* HDR-style ambient via Environment — gives the physical materials
           a sense of being lit by a real space scene, not flat directional
           lights. preset="night" is a cool starfield-blue HDR. */}
        <Environment preset="night" environmentIntensity={0.6} />

        {/* Direct lighting on top of HDR so emissives have an "edge light" */}
        <ambientLight intensity={0.22} />
        <directionalLight position={[6, 8, 4]} intensity={0.9} color="#fff2dc" />
        <pointLight position={[-6, 2, -4]} intensity={2.4} color="#4a96f5" distance={20} />
        <pointLight position={[3, -2, 5]} intensity={1.6} color="#ff8a3a" distance={14} />
        <pointLight position={[0, 0, 0]} intensity={0.8} color="#c8b6ff" distance={6} />

        <CameraRig phaseRef={phaseRef} pulseSpeedRef={pulseSpeedRef} />

        {/* Distant starfield */}
        <Stars radius={50} depth={30} count={1800} factor={3.2} fade speed={0.6} />

        {/* Nebula plane far behind the scene */}
        <Nebula />

        {/* Brain-cluster neural net surrounding the DNA */}
        <NeuralBrain pulseSpeedRef={pulseSpeedRef} />

        {/* Central DNA helix (idle motion + sparkles) */}
        <DNAHelix />

        {/* Floating proteins (wrapped in Float for organic bob) */}
        <Float speed={1.3} rotationIntensity={0.7} floatIntensity={0.9}>
          <ProteinRibbon pos={[-4.6, 1.6, -1]} color="#ffb37a" scale={0.85} speed={0.5} turns={4.5} />
        </Float>
        <Float speed={1.0} rotationIntensity={0.5} floatIntensity={0.7}>
          <ProteinRibbon pos={[5.2, -1.2, -2]}  color="#80c8ff" scale={0.7}  speed={-0.6} turns={5} />
        </Float>
        <Float speed={1.6} rotationIntensity={0.8} floatIntensity={0.6}>
          <ProteinRibbon pos={[3.8, 2.6, -3]}  color="#ffae6a" scale={0.55} speed={0.7}  turns={3.5} />
        </Float>
        <Float speed={1.1} rotationIntensity={0.6} floatIntensity={0.8}>
          <ProteinRibbon pos={[-3.4, -2.4, -2.4]} color="#a4c8ff" scale={0.7} speed={-0.45} turns={5.5} />
        </Float>

        {/* RNA loops */}
        <Float speed={0.9} rotationIntensity={0.4} floatIntensity={0.5}>
          <RNALoop pos={[4.2, 1.4, 1.2]} scale={0.7} color="#ffc290" speed={0.4} />
        </Float>
        <Float speed={1.2} rotationIntensity={0.6} floatIntensity={0.6}>
          <RNALoop pos={[-3.8, -0.4, 2]} scale={0.55} color="#9ccfff" speed={-0.55} />
        </Float>

        {/* Orbiting tracers with motion trails */}
        <OrbitingTracer radius={3.6} axisTilt={0.5}  speed={0.45} color="#ffae5a" />
        <OrbitingTracer radius={3.4} axisTilt={-0.3} speed={-0.55} color="#7ec0ff" />
        <OrbitingTracer radius={4.0} axisTilt={0.7}  speed={0.32} color="#c8a8ff" />

        {/* Filmic post chain */}
        <EffectComposer multisampling={0} disableNormalPass>
          <Bloom
            intensity={1.4}
            luminanceThreshold={0.28}
            luminanceSmoothing={0.32}
            mipmapBlur
          />
          <ChromaticAberration
            offset={[0.0009, 0.0014]}
            radialModulation={false}
            modulationOffset={0}
          />
          <Vignette eskil={false} offset={0.22} darkness={0.6} />
          <Noise opacity={0.035} premultiply blendFunction={BlendFunction.SCREEN} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
