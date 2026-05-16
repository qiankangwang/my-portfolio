import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Sparkles, Float, Environment, Trail } from "@react-three/drei";
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

/* ─── Atmosphere plane ─ soft pastel lobes that integrate with the light
   backdrop instead of fighting it. Lower opacity than before — the airy
   feel comes from the bg + fog, not a saturated nebula. ─────────────── */
function Nebula() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const g = c.getContext("2d");
    // Cool blue lobe
    const g1 = g.createRadialGradient(380, 220, 0, 380, 220, 420);
    g1.addColorStop(0, "rgba(147, 197, 253, 0.28)");
    g1.addColorStop(0.4, "rgba(96, 165, 250, 0.14)");
    g1.addColorStop(1, "rgba(0, 0, 0, 0)");
    g.fillStyle = g1;
    g.fillRect(0, 0, 1024, 512);
    // Warm amber lobe (right of frame, picks up the DNA gold)
    const g2 = g.createRadialGradient(720, 300, 0, 720, 300, 340);
    g2.addColorStop(0, "rgba(253, 224, 174, 0.22)");
    g2.addColorStop(0.45, "rgba(251, 191, 36, 0.08)");
    g2.addColorStop(1, "rgba(0, 0, 0, 0)");
    g.fillStyle = g2;
    g.fillRect(0, 0, 1024, 512);
    // Violet accent lobe (centre)
    const g3 = g.createRadialGradient(540, 180, 0, 540, 180, 240);
    g3.addColorStop(0, "rgba(196, 181, 253, 0.18)");
    g3.addColorStop(0.5, "rgba(167, 139, 250, 0.06)");
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
function CameraRig({ phaseRef }) {
  const { camera } = useThree();
  const desiredPos = useRef(new THREE.Vector3(0.6, 1.0, 10.5));
  const desiredLook = useRef(new THREE.Vector3(-1.0, 0, 0));
  const currentLook = useRef(new THREE.Vector3(-1.0, 0, 0));
  // Low-pass-filtered phase: phaseRef can jump on wheel ticks (discrete
  // scroll events), and feeding those jumps directly into the camera lerp
  // produces visible micro-jolts. Smoothing the phase itself removes them
  // at the source so the camera glides instead of pulses.
  const smoothedPhase = useRef(0);

  // All waypoints stay close enough to the network that it reads as the
  // hero in every section. Look targets biased -1.0 X so the network sits
  // on the LEFT half of the canvas, leaving breathing room on the right
  // for the glass card panel.
  const waypoints = useMemo(
    () => [
      // p=0.0 ── About: opening shot, network fills the upper-left
      { pos: [0.6, 1.0, 10.5], look: [-1.0, 0, 0], fov: 50 },
      // p=0.2 ── drift around to the near-left face
      { pos: [-2.0, 1.3, 8.2], look: [-1.2, 0.2, 0], fov: 46 },
      // p=0.4 ── Research: orbit upper-left, network filling frame
      { pos: [-4.2, 2.2, 6.8], look: [-1.4, 0.4, 0], fov: 46 },
      // p=0.6 ── Publication: ease right past the network, side-DNA glances in
      { pos: [2.6, 0.9, 8.6], look: [-0.2, -0.2, -0.4], fov: 44 },
      // p=0.8 ── Projects: crane up + back, network mid-frame from above
      { pos: [-1.0, 3.6, 9.5], look: [-1.0, -0.5, 0], fov: 48 },
      // p=1.0 ── Skills: closer wide shot, not a far pull-back
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
      camera={{ position: [0.6, 1.0, 10.5], fov: 50, near: 0.1, far: 140 }}
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

        {/* Stars are invisible on a light backdrop — Sparkles inside the
           neural cluster carries the "particles in the volume" feel. */}
        <Sparkles
          count={140}
          scale={[8, 6, 6]}
          size={2.2}
          speed={0.35}
          color={COL.blue}
          noise={0.5}
        />

        {/* Coloured nebula plane far behind the scene */}
        <Nebula />

        {/* Primary subject: neural network (AI side of AI+Bio research) */}
        <NeuralBrain />
        {/* Side motif: DNA helix tucked behind-right of the network as a
           supporting "Bio" signal, scaled down so it doesn't compete with
           the network for visual weight. */}
        <group position={[4.4, -0.6, -1.8]} scale={0.42} rotation={[0.2, 0.4, 0.15]}>
          <DNAHelix />
        </group>

        {/* Two small bio motifs (protein helix + RNA loop), pushed back and
           down-scaled — supporting "Bio" signal next to the dominant neural
           network. More than this clutters the network's silhouette. */}
        <Float speed={1.1} rotationIntensity={0.5} floatIntensity={0.7}>
          <ProteinRibbon
            pos={[-5.2, 1.4, -2.6]}
            color={COL.amberPale}
            emissiveColor={COL.amber}
            scale={0.55}
            speed={0.45}
            turns={4.5}
          />
        </Float>
        <Float speed={0.9} rotationIntensity={0.4} floatIntensity={0.5}>
          <RNALoop pos={[-3.6, -2.6, -1.5]} scale={0.45} color={COL.violet} speed={0.4} />
        </Float>

        {/* Two long-tail tracers orbiting the neural cluster — reinforces
           the "network has activity" feel without the 3rd amber trail. */}
        <OrbitingTracer radius={4.0} axisTilt={0.5} speed={0.4} color={COL.bluePale} />
        <OrbitingTracer radius={3.7} axisTilt={-0.35} speed={-0.5} color={COL.violet} />

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
