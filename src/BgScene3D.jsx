import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
  ChromaticAberration,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import {
  Stars,
  Sparkles,
  Float,
  Environment,
  Trail,
} from "@react-three/drei";
import {
  useRef,
  useMemo,
  useEffect,
  Suspense,
  useState,
} from "react";
import * as THREE from "three";

/* ════════════════════════════════════════════════════════════════════════
   Unified palette ─ same values as Portfolio.css var(--accent) / --warm,
   so emissive surfaces and the card borders/shadows share one colour
   system. The 3D scene reads as part of the same design language as the
   UI rather than a separate WebGL demo behind it.
   ════════════════════════════════════════════════════════════════════════ */
const COL = {
  blue:       "#60A5FA",
  blueDeep:   "#3B82F6",
  blueDark:   "#1E40AF",
  bluePale:   "#93C5FD",
  amber:      "#FBBF24",
  amberDeep:  "#F59E0B",
  amberPale:  "#FED7AA",
  violet:     "#A78BFA",
  violetDeep: "#7C3AED",
  ivory:      "#F8FAFC",
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
function NeuralBrain({ pulseSpeedRef }) {
  const groupRef = useRef();
  const coreRef = useRef();
  const haloRef = useRef();

  const { nodes, edges } = useMemo(() => buildNetwork(150, 6, 2.85), []);

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
    const speed = pulseSpeedRef?.current ?? 1;

    // Travelling activation wave around the sphere's azimuth.
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const wave = Math.sin(t * 1.5 * speed - n.wavePos * Math.PI * 4 + n.basePhase * 0.3);
      const burst = Math.max(0, wave);
      // HDR boost (>1) so Bloom picks the bright nodes up.
      const intensity = 1.1 + burst * burst * 5.5;
      _color.setRGB(0.376 * intensity, 0.647 * intensity, 0.98 * intensity);
      coreRef.current.setColorAt(i, _color);
      // Halo gets the same colour but dimmer + scaled up when active
      _color.multiplyScalar(0.35);
      haloRef.current.setColorAt(i, _color);
    }
    coreRef.current.instanceColor.needsUpdate = true;
    haloRef.current.instanceColor.needsUpdate = true;

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.05;
      groupRef.current.rotation.x = Math.sin(t * 0.07) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Bright HDR core dots — Bloom picks these up for the glow */}
      <instancedMesh ref={coreRef} args={[null, null, nodes.length]}>
        <icosahedronGeometry args={[0.05, 1]} />
        <meshBasicMaterial vertexColors toneMapped={false} />
      </instancedMesh>
      {/* Outer additive halo — gives every node a soft aura */}
      <instancedMesh ref={haloRef} args={[null, null, nodes.length]}>
        <icosahedronGeometry args={[0.18, 1]} />
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
      {/* Edges + flowing data packets share the network's edges */}
      <NetworkEdges edges={edges} />
      <DataPackets edges={edges} count={90} pulseSpeedRef={pulseSpeedRef} />
      {/* Faint wireframe icosahedron suggesting a containment field */}
      <mesh>
        <icosahedronGeometry args={[3.3, 2]} />
        <meshBasicMaterial
          color={COL.blue}
          wireframe
          transparent
          opacity={0.06}
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
      <cylinderGeometry args={[0.006, 0.006, 1, 5]} />
      <meshBasicMaterial
        color={COL.blue}
        transparent
        opacity={0.32}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

/* ─── Data packets streaming along edges (the "tech-thinking" feel) ──── */
function DataPackets({ edges, count = 80, pulseSpeedRef }) {
  const meshRef = useRef();
  // useMemo guarantees packets exists before the first useFrame tick;
  // useRef + useEffect raced the r3f render loop in StrictMode (first
  // frame fired before the effect committed → undefined.t crash).
  const packets = useMemo(
    () => Array.from({ length: count }, () => ({
      edgeIdx: Math.floor(Math.random() * edges.length),
      t: Math.random(),
      speed: 0.5 + Math.random() * 0.7,
    })),
    [edges, count]
  );

  useFrame((_, dt) => {
    if (!meshRef.current) return;
    const speed = pulseSpeedRef?.current ?? 1;
    for (let i = 0; i < count; i++) {
      const p = packets[i];
      p.t += p.speed * dt * 0.55 * speed;
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
   Central DNA double helix ─ now with halo tubes, instanced base pairs,
   instanced nucleotide spheres, and Sparkles in the volume.
   ════════════════════════════════════════════════════════════════════════ */
function DNAHelix() {
  const groupRef = useRef();

  const dna = useMemo(() => {
    const turns = 3.8;
    const samples = 220;
    const radius = 0.62;
    const height = 5.2;
    const ptsA = [];
    const ptsB = [];
    const basePairs = [];
    const nucleotides = []; // [{pos, isA}]
    for (let i = 0; i < samples; i++) {
      const t = i / (samples - 1);
      const angle = t * turns * Math.PI * 2;
      const y = (t - 0.5) * height;
      const a = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      const b = new THREE.Vector3(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius);
      ptsA.push(a);
      ptsB.push(b);
      if (i % 7 === 0 && i > 3 && i < samples - 3) {
        basePairs.push({ a: a.clone(), b: b.clone() });
        nucleotides.push({ pos: a.clone(), isA: true });
        nucleotides.push({ pos: b.clone(), isA: false });
      }
    }
    return {
      curveA: new THREE.CatmullRomCurve3(ptsA),
      curveB: new THREE.CatmullRomCurve3(ptsB),
      basePairs,
      nucleotides,
    };
  }, []);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += dt * 0.26;
    const ms = performance.now();
    groupRef.current.rotation.x = Math.sin(ms * 0.0002) * 0.07;
    groupRef.current.position.y = Math.sin(ms * 0.0004) * 0.1;
  });

  return (
    <group ref={groupRef}>
      {/* Strand A — warm amber */}
      <mesh>
        <tubeGeometry args={[dna.curveA, 260, 0.058, 14, false]} />
        <meshPhysicalMaterial
          color={COL.amberPale}
          emissive={COL.amber}
          emissiveIntensity={1.8}
          roughness={0.18}
          metalness={0.55}
          clearcoat={1}
          clearcoatRoughness={0.08}
          iridescence={0.7}
          iridescenceIOR={1.35}
        />
      </mesh>
      {/* Strand A halo (additive, transparent) */}
      <mesh>
        <tubeGeometry args={[dna.curveA, 200, 0.14, 14, false]} />
        <meshBasicMaterial
          color={COL.amber}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Strand B — cool blue */}
      <mesh>
        <tubeGeometry args={[dna.curveB, 260, 0.058, 14, false]} />
        <meshPhysicalMaterial
          color={COL.bluePale}
          emissive={COL.blueDeep}
          emissiveIntensity={1.8}
          roughness={0.18}
          metalness={0.55}
          clearcoat={1}
          clearcoatRoughness={0.08}
          iridescence={0.7}
          iridescenceIOR={1.35}
        />
      </mesh>
      {/* Strand B halo */}
      <mesh>
        <tubeGeometry args={[dna.curveB, 200, 0.14, 14, false]} />
        <meshBasicMaterial
          color={COL.blue}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Base-pair cylinders (instanced) */}
      <DNABasePairs pairs={dna.basePairs} />
      {/* Nucleotide spheres — bright dots at each base-pair endpoint */}
      <DNANucleotides nucleotides={dna.nucleotides} />
      {/* Sparkles inside the helix volume */}
      <Sparkles
        count={80}
        scale={[1.8, 5.5, 1.8]}
        size={3.4}
        speed={0.4}
        color={COL.violet}
        noise={0.4}
      />
    </group>
  );
}

function DNABasePairs({ pairs }) {
  const meshRef = useRef();
  useEffect(() => {
    if (!meshRef.current) return;
    pairs.forEach((p, i) => {
      _dir.subVectors(p.b, p.a);
      const length = _dir.length();
      _v3.addVectors(p.a, p.b).multiplyScalar(0.5);
      _dir.normalize();
      _q.setFromUnitVectors(_up, _dir);
      _scale.set(1, length, 1);
      _m4.compose(_v3, _q, _scale);
      meshRef.current.setMatrixAt(i, _m4);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [pairs]);
  return (
    <instancedMesh ref={meshRef} args={[null, null, pairs.length]}>
      <cylinderGeometry args={[0.022, 0.022, 1, 8]} />
      <meshStandardMaterial
        color={COL.violet}
        emissive={COL.violet}
        emissiveIntensity={1.6}
        metalness={0.4}
        roughness={0.3}
      />
    </instancedMesh>
  );
}

function DNANucleotides({ nucleotides }) {
  const meshARef = useRef();
  const meshBRef = useRef();
  const aPositions = useMemo(() => nucleotides.filter(n => n.isA).map(n => n.pos), [nucleotides]);
  const bPositions = useMemo(() => nucleotides.filter(n => !n.isA).map(n => n.pos), [nucleotides]);
  useEffect(() => {
    [meshARef, meshBRef].forEach((ref, mi) => {
      if (!ref.current) return;
      const positions = mi === 0 ? aPositions : bPositions;
      positions.forEach((p, i) => {
        _m4.makeTranslation(p.x, p.y, p.z);
        ref.current.setMatrixAt(i, _m4);
      });
      ref.current.instanceMatrix.needsUpdate = true;
    });
  }, [aPositions, bPositions]);
  return (
    <>
      <instancedMesh ref={meshARef} args={[null, null, aPositions.length]}>
        <sphereGeometry args={[0.085, 14, 14]} />
        <meshStandardMaterial
          color={COL.amberPale}
          emissive={COL.amber}
          emissiveIntensity={3}
          metalness={0.4}
          roughness={0.25}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh ref={meshBRef} args={[null, null, bPositions.length]}>
        <sphereGeometry args={[0.085, 14, 14]} />
        <meshStandardMaterial
          color={COL.bluePale}
          emissive={COL.blueDeep}
          emissiveIntensity={3}
          metalness={0.4}
          roughness={0.25}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  );
}

/* ─── Protein α-helix ribbons (multiple, palette-matched) ─────────────── */
function ProteinRibbon({ pos, color, emissiveColor, scale, speed, turns = 4 }) {
  const groupRef = useRef();
  const curve = useMemo(() => {
    const r = 0.34;
    const h = 1.9;
    const samples = 90;
    const pts = [];
    for (let i = 0; i < samples; i++) {
      const t = i / (samples - 1);
      const angle = t * turns * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * r, (t - 0.5) * h, Math.sin(angle) * r));
    }
    return new THREE.CatmullRomCurve3(pts);
  }, [turns]);
  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * speed;
  });
  return (
    <group ref={groupRef} position={pos} scale={scale}>
      <mesh>
        <tubeGeometry args={[curve, 110, 0.058, 10, false]} />
        <meshPhysicalMaterial
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={1.2}
          roughness={0.25}
          metalness={0.5}
          clearcoat={0.7}
        />
      </mesh>
      {/* Outer halo tube */}
      <mesh>
        <tubeGeometry args={[curve, 80, 0.14, 8, false]} />
        <meshBasicMaterial
          color={emissiveColor}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ─── RNA loop — closed lemniscate curve with bead atoms ──────────────── */
function RNALoop({ pos, scale = 1, color = COL.violet, speed = 0.5 }) {
  const groupRef = useRef();
  const curve = useMemo(() => {
    const pts = [];
    const N = 32;
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      const r = 0.95 + Math.cos(t * 2) * 0.22;
      pts.push(new THREE.Vector3(Math.cos(t) * r, Math.sin(t * 2) * 0.48, Math.sin(t) * r * 0.72));
    }
    return new THREE.CatmullRomCurve3(pts, true);
  }, []);
  const beadPositions = useMemo(() => {
    const N = 20;
    return Array.from({ length: N }, (_, i) => {
      const p = curve.getPoint(i / N);
      return [p.x, p.y, p.z];
    });
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
        <tubeGeometry args={[curve, 110, 0.042, 10, true]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.0}
          roughness={0.3}
          metalness={0.5}
          clearcoat={0.6}
        />
      </mesh>
      {beadPositions.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={2.2}
            metalness={0.4}
            roughness={0.25}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ─── Orbiting tracers with motion trails ─────────────────────────────── */
function OrbitingTracer({ radius = 3.4, axisTilt = 0.5, speed = 0.6, color = COL.bluePale }) {
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
    <Trail width={0.45} length={6} color={color} attenuation={(t) => t * t}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </Trail>
  );
}

/* ─── Nebula plane (warmer, brighter — fixes "too dark" feedback) ─────── */
function Nebula() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const g = c.getContext("2d");
    // Cool blue lobe
    const g1 = g.createRadialGradient(380, 220, 0, 380, 220, 400);
    g1.addColorStop(0, "rgba(96, 165, 250, 0.65)");
    g1.addColorStop(0.35, "rgba(59, 130, 246, 0.32)");
    g1.addColorStop(1, "rgba(0, 0, 0, 0)");
    g.fillStyle = g1;
    g.fillRect(0, 0, 1024, 512);
    // Warm amber lobe (right of frame, picks up the DNA gold)
    const g2 = g.createRadialGradient(720, 300, 0, 720, 300, 320);
    g2.addColorStop(0, "rgba(251, 191, 36, 0.45)");
    g2.addColorStop(0.45, "rgba(245, 158, 11, 0.18)");
    g2.addColorStop(1, "rgba(0, 0, 0, 0)");
    g.fillStyle = g2;
    g.fillRect(0, 0, 1024, 512);
    // Violet accent lobe (centre)
    const g3 = g.createRadialGradient(540, 180, 0, 540, 180, 220);
    g3.addColorStop(0, "rgba(167, 139, 250, 0.35)");
    g3.addColorStop(0.5, "rgba(124, 58, 237, 0.14)");
    g3.addColorStop(1, "rgba(0, 0, 0, 0)");
    g.fillStyle = g3;
    g.fillRect(0, 0, 1024, 512);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
  return (
    <mesh position={[0, 0, -18]} scale={[52, 28, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent fog={false} />
    </mesh>
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
function CameraRig({ phaseRef, pulseSpeedRef }) {
  const { camera } = useThree();
  const desiredPos = useRef(new THREE.Vector3(0, 0.8, 12));
  const desiredLook = useRef(new THREE.Vector3(-0.5, 0, 0));
  const currentLook = useRef(new THREE.Vector3(-0.5, 0, 0));
  const lastPhase = useRef(0);
  const lastActiveIdx = useRef(-1);
  const burstSpike = useRef(0);

  const waypoints = useMemo(
    () => [
      // p=0.0 ── Top of page: wide opening establishing shot
      { pos: [0.8, 0.8, 12.5], look: [-0.5, 0, 0], fov: 54 },
      // p=0.2 ── About: close hero on DNA, "introducing self"
      { pos: [1.4, 0.4, 4.4], look: [-0.4, 0, 0], fov: 38 },
      // p=0.4 ── Research: orbit on neural cluster from the left
      { pos: [-3.6, 1.6, 4.8], look: [-2.0, 0.5, 0], fov: 42 },
      // p=0.6 ── Publication: DNA macro detail, slight right-side angle
      { pos: [2.6, -0.2, 3.4], look: [0.2, 0, 0], fov: 30 },
      // p=0.8 ── Projects: crane top-down survey of the composition
      { pos: [-2.2, 5.4, 7.8], look: [-0.4, -0.8, 0], fov: 48 },
      // p=1.0 ── Skills: final wide pull-back closer
      { pos: [2.6, 1.4, 14], look: [-0.5, 0, 0], fov: 58 },
    ],
    []
  );

  useFrame((state, dt) => {
    const p = Math.min(Math.max(phaseRef?.current ?? 0, 0), 1);

    // Scroll velocity → pulse speed
    const dp = Math.abs(p - lastPhase.current);
    lastPhase.current = p;
    const scrollVel = Math.min(dp * 60, 1);

    // Section change detection — discrete segment index
    const segCount = waypoints.length - 1;
    const activeIdx = Math.min(Math.floor(p * segCount), segCount - 1);
    if (activeIdx !== lastActiveIdx.current && lastActiveIdx.current >= 0) {
      burstSpike.current = 1;
    }
    lastActiveIdx.current = activeIdx;

    // Decay the spike
    burstSpike.current *= Math.exp(-3.2 * dt);

    pulseSpeedRef.current = 1 + scrollVel * 2.5 + burstSpike.current * 4;

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

    // Critical-damped follow
    const k = 1 - Math.exp(-2.8 * dt);
    camera.position.lerp(desiredPos.current, k);
    currentLook.current.lerp(desiredLook.current, k);
    camera.lookAt(currentLook.current);

    // Handheld jitter
    const tNow = state.clock.elapsedTime;
    camera.position.x += Math.sin(tNow * 0.7) * 0.014;
    camera.position.y += Math.cos(tNow * 0.5) * 0.011;

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
    return document.documentElement.getAttribute("data-theme") !== "light";
  });
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setDark(document.documentElement.getAttribute("data-theme") !== "light");
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  // Lifted from #070b1c → #0a1024 (brighter base with subtle blue tint).
  const bgColor = dark ? "#0a1024" : "#101a36";
  const fogColor = dark ? "#0a1024" : "#101a36";
  return (
    <>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[fogColor, 11, 32]} />
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Composition
   ════════════════════════════════════════════════════════════════════════ */
export default function BgScene3D({ phaseRef }) {
  const pulseSpeedRef = useRef(1);

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0.8, 0.8, 12.5], fov: 54, near: 0.1, far: 140 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0, zIndex: 0 }}
    >
      <Suspense fallback={null}>
        <Theme />

        {/* HDR environment so PhysicalMaterials get real reflections */}
        <Environment preset="night" environmentIntensity={1.0} />

        {/* Lighting: ambient + hemisphere fill + warm key + colour rims */}
        <ambientLight intensity={0.32} />
        <hemisphereLight color={COL.blue} groundColor={COL.amber} intensity={0.45} />
        <directionalLight position={[6, 8, 4]} intensity={0.95} color="#fff2dc" />
        <pointLight position={[-6, 2, -4]} intensity={2.6} color={COL.blue} distance={22} />
        <pointLight position={[3, -2, 5]} intensity={1.8} color={COL.amber} distance={16} />
        <pointLight position={[0, 0, 0]} intensity={1.0} color={COL.violet} distance={7} />

        <CameraRig phaseRef={phaseRef} pulseSpeedRef={pulseSpeedRef} />

        {/* Distant starfield */}
        <Stars radius={60} depth={35} count={2200} factor={3.5} fade speed={0.5} />

        {/* Coloured nebula plane far behind the scene */}
        <Nebula />

        {/* Main subjects: neural cluster + central DNA */}
        <NeuralBrain pulseSpeedRef={pulseSpeedRef} />
        <DNAHelix />

        {/* Protein α-helix ribbons (Float-wrapped, palette-matched) */}
        <Float speed={1.3} rotationIntensity={0.7} floatIntensity={0.9}>
          <ProteinRibbon
            pos={[-4.6, 1.6, -1]}
            color={COL.amberPale}
            emissiveColor={COL.amber}
            scale={0.85}
            speed={0.5}
            turns={4.5}
          />
        </Float>
        <Float speed={1.0} rotationIntensity={0.5} floatIntensity={0.7}>
          <ProteinRibbon
            pos={[5.2, -1.2, -2]}
            color={COL.bluePale}
            emissiveColor={COL.blueDeep}
            scale={0.7}
            speed={-0.6}
            turns={5}
          />
        </Float>
        <Float speed={1.6} rotationIntensity={0.8} floatIntensity={0.6}>
          <ProteinRibbon
            pos={[3.8, 2.8, -3]}
            color={COL.amberPale}
            emissiveColor={COL.amberDeep}
            scale={0.55}
            speed={0.7}
            turns={3.5}
          />
        </Float>
        <Float speed={1.1} rotationIntensity={0.6} floatIntensity={0.8}>
          <ProteinRibbon
            pos={[-3.4, -2.4, -2.4]}
            color={COL.bluePale}
            emissiveColor={COL.blue}
            scale={0.7}
            speed={-0.45}
            turns={5.5}
          />
        </Float>

        {/* RNA loops */}
        <Float speed={0.9} rotationIntensity={0.4} floatIntensity={0.5}>
          <RNALoop pos={[4.2, 1.4, 1.2]} scale={0.7} color={COL.violet} speed={0.4} />
        </Float>
        <Float speed={1.2} rotationIntensity={0.6} floatIntensity={0.6}>
          <RNALoop pos={[-3.8, -0.4, 2]} scale={0.55} color={COL.violetDeep} speed={-0.55} />
        </Float>

        {/* Long-tail orbiting tracers */}
        <OrbitingTracer radius={3.6} axisTilt={0.5} speed={0.45} color={COL.amber} />
        <OrbitingTracer radius={3.4} axisTilt={-0.3} speed={-0.55} color={COL.bluePale} />
        <OrbitingTracer radius={4.0} axisTilt={0.7} speed={0.32} color={COL.violet} />

        {/* Filmic post chain — no ref on <Bloom>: React 19 puts refs into the
           props bag, which @react-three/postprocessing then JSON.stringifies
           in a useMemo dep. Three.js Object3D has circular parent↔children
           refs, so the stringify throws on every scroll-driven re-render and
           tears down the React tree. Constant intensity here, no ref needed. */}
        <EffectComposer multisampling={0} disableNormalPass>
          <Bloom
            intensity={1.7}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.3}
            mipmapBlur
          />
          <ChromaticAberration offset={[0.0009, 0.0014]} radialModulation={false} modulationOffset={0} />
          <Vignette eskil={false} offset={0.2} darkness={0.55} />
          <Noise opacity={0.035} premultiply blendFunction={BlendFunction.SCREEN} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
