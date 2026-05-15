import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, Noise } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useRef, useMemo, useEffect, Suspense, useState } from "react";
import * as THREE from "three";

/**
 * BgScene3D — a cinematic 3D backdrop for the portfolio.
 *
 * Inside a single r3f Canvas:
 *   - A floating cluster of "neural-net" nodes connected by line segments.
 *   - A slowly rotating DNA double helix (two intertwined tubes + base-pair
 *     line segments).
 *   - Drifting protein helices.
 *   - A starfield of cosmic-dust particles.
 *   - Volumetric fog for depth fall-off + dark navy background.
 *   - Bloom, vignette, and grain post-passes for "film" mood.
 *
 * Camera choreography is scroll-driven via `phaseRef` (0..1 page progress,
 * written by the portfolio's scroll handler). Five waypoints define a
 * director-style move set — opening wide, dolly-in to network, side-orbit
 * round the DNA, crane up-and-over, pull back to a wide closer. Each frame
 * lerps between adjacent waypoints with smoothstep + critical-damped
 * follow, so scrolls of any speed read as smooth filmic motion.
 */

// ─── Neural network: layered emissive spheres + line connections ─────────
function NeuralNet({ pulseSpeedRef }) {
  const groupRef = useRef();
  const sphereRefs = useRef([]);

  const { nodes, edgePositions } = useMemo(() => {
    const layers = [5, 7, 9, 7, 5, 3];
    const ns = [];
    const layerStarts = [0];
    layers.forEach((count, layer) => {
      const x = (layer - (layers.length - 1) / 2) * 1.4;
      for (let i = 0; i < count; i++) {
        const ratio = count === 1 ? 0 : i / (count - 1) - 0.5;
        const y = ratio * (3.2 + layer * 0.06);
        const z = Math.sin((ratio + 0.5) * Math.PI) * 0.4 - 0.2;
        ns.push({
          pos: new THREE.Vector3(x, y, z),
          layer,
          basePhase: Math.random() * Math.PI * 2,
        });
      }
      if (layer < layers.length - 1) layerStarts.push(layerStarts[layer] + count);
    });

    const positions = [];
    for (let layer = 0; layer < layers.length - 1; layer++) {
      const aStart = layerStarts[layer];
      const bStart = layerStarts[layer + 1];
      for (let a = 0; a < layers[layer]; a++) {
        for (let b = 0; b < layers[layer + 1]; b++) {
          const dist = Math.abs((a + 0.5) / layers[layer] - (b + 0.5) / layers[layer + 1]);
          if (dist < 0.4 || (a + b + layer) % 4 === 0) {
            const A = ns[aStart + a].pos;
            const B = ns[bStart + b].pos;
            positions.push(A.x, A.y, A.z, B.x, B.y, B.z);
          }
        }
      }
    }
    return { nodes: ns, edgePositions: new Float32Array(positions) };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const wave = pulseSpeedRef?.current ?? 1;
    sphereRefs.current.forEach((m, i) => {
      if (!m) return;
      const n = nodes[i];
      // Subtle bob in place
      m.position.y = n.pos.y + Math.sin(t * 0.8 + n.basePhase) * 0.05;
      // Travelling activation wave across layers — pulse intensity rolls
      // through the network left → right.
      const layerWave = Math.sin(t * 1.2 * wave - n.layer * 0.7);
      const intensity = 0.9 + Math.max(0, layerWave) * 1.8;
      m.material.emissiveIntensity = intensity;
    });
    if (groupRef.current) groupRef.current.rotation.y = Math.sin(t * 0.07) * 0.18;
  });

  return (
    <group ref={groupRef}>
      {nodes.map((n, i) => (
        <mesh
          key={i}
          ref={(el) => (sphereRefs.current[i] = el)}
          position={n.pos}
        >
          <sphereGeometry args={[0.085, 18, 18]} />
          <meshStandardMaterial
            color="#9cc8ff"
            emissive="#5aa6ff"
            emissiveIntensity={1.2}
            roughness={0.35}
            metalness={0.2}
          />
        </mesh>
      ))}
      {/* edges as a single LineSegments — way cheaper than per-edge meshes */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={edgePositions.length / 3}
            array={edgePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#5aa6ff" transparent opacity={0.18} />
      </lineSegments>
    </group>
  );
}

// ─── DNA double helix: two tubes + base-pair line segments ───────────────
function DNAHelix() {
  const groupRef = useRef();

  const { curveA, curveB, basePairs } = useMemo(() => {
    const turns = 3.4;
    const samples = 120;
    const radius = 0.62;
    const height = 4.6;
    const ptsA = [];
    const ptsB = [];
    const pairs = [];
    for (let i = 0; i < samples; i++) {
      const t = i / (samples - 1);
      const angle = t * turns * Math.PI * 2;
      const y = (t - 0.5) * height;
      const a = new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      const b = new THREE.Vector3(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius);
      ptsA.push(a);
      ptsB.push(b);
      if (i % 5 === 0) pairs.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    return {
      curveA: new THREE.CatmullRomCurve3(ptsA),
      curveB: new THREE.CatmullRomCurve3(ptsB),
      basePairs: new Float32Array(pairs),
    };
  }, []);

  useFrame((_, dt) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * 0.22;
      groupRef.current.rotation.x = Math.sin(performance.now() * 0.00018) * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <mesh>
        <tubeGeometry args={[curveA, 140, 0.045, 10, false]} />
        <meshStandardMaterial
          color="#ff9a5a"
          emissive="#ff7a30"
          emissiveIntensity={1.6}
          roughness={0.3}
          metalness={0.3}
        />
      </mesh>
      <mesh>
        <tubeGeometry args={[curveB, 140, 0.045, 10, false]} />
        <meshStandardMaterial
          color="#9ccfff"
          emissive="#4a96f5"
          emissiveIntensity={1.6}
          roughness={0.3}
          metalness={0.3}
        />
      </mesh>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={basePairs.length / 3}
            array={basePairs}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#c5b8ff" transparent opacity={0.55} />
      </lineSegments>
    </group>
  );
}

// ─── Protein helices: small alpha-helix coils drifting in space ──────────
function Proteins() {
  const groupRef = useRef();
  const helices = useMemo(() => {
    return [
      { pos: [-4.5, 1.8, -1.5], colorA: "#ffb37a", scale: 0.7, speed: 0.4 },
      { pos: [4.8, -1.4, -2.2], colorA: "#7ad4ff", scale: 0.55, speed: 0.6 },
      { pos: [3.4, 2.5, -3.2], colorA: "#ffae6a", scale: 0.5, speed: -0.5 },
      { pos: [-3.8, -2.2, -2.8], colorA: "#9fc8ff", scale: 0.6, speed: -0.35 },
    ].map((h) => {
      const turns = 4;
      const samples = 60;
      const radius = 0.35;
      const height = 1.6;
      const pts = [];
      for (let i = 0; i < samples; i++) {
        const t = i / (samples - 1);
        const angle = t * turns * Math.PI * 2;
        const y = (t - 0.5) * height;
        pts.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
      }
      return { ...h, curve: new THREE.CatmullRomCurve3(pts) };
    });
  }, []);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      child.rotation.y += dt * helices[i].speed;
      child.position.y = helices[i].pos[1] + Math.sin(performance.now() * 0.0004 + i * 1.5) * 0.18;
    });
  });

  return (
    <group ref={groupRef}>
      {helices.map((h, i) => (
        <mesh key={i} position={h.pos} scale={h.scale}>
          <tubeGeometry args={[h.curve, 80, 0.04, 8, false]} />
          <meshStandardMaterial
            color={h.colorA}
            emissive={h.colorA}
            emissiveIntensity={1.1}
            roughness={0.4}
            metalness={0.25}
          />
        </mesh>
      ))}
    </group>
  );
}

// ─── Cosmic-dust particle field ──────────────────────────────────────────
function Particles({ count = 360 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 28;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 18 - 4;
    }
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.elapsedTime * 0.012;
      ref.current.rotation.x = Math.sin(clock.elapsedTime * 0.04) * 0.06;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        color="#9bcaff"
        sizeAttenuation
        transparent
        opacity={0.78}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Camera rig: director-style waypoints, scroll-driven ─────────────────
function CameraRig({ phaseRef, pulseSpeedRef }) {
  const { camera } = useThree();
  const desiredPos = useRef(new THREE.Vector3(0, 0.4, 9.5));
  const desiredLook = useRef(new THREE.Vector3(0, 0, 0));
  const currentLook = useRef(new THREE.Vector3(0, 0, 0));
  const lastPhase = useRef(0);

  const waypoints = useMemo(
    () => [
      // p=0   ── opening wide shot: pull-back, slight low-angle hero
      { pos: [0, 0.6, 9.5], look: [0, 0, 0], fov: 50 },
      // p=0.25 ── dolly forward + tilt right into the network
      { pos: [3.2, 1.1, 5.2], look: [0.4, 0.2, 0], fov: 46 },
      // p=0.5  ── side orbit, DNA fills the frame
      { pos: [1.3, 0.1, 2.4], look: [0, 0, 0], fov: 38 },
      // p=0.75 ── crane up-and-over, looking down through the structure
      { pos: [-2.5, 3.6, 4.2], look: [0, -0.4, 0], fov: 44 },
      // p=1    ── wide closer, slow pull-back with re-tilt
      { pos: [0, 0.5, 11], look: [0, 0, 0], fov: 52 },
    ],
    []
  );

  useFrame((_, dt) => {
    const p = Math.min(Math.max(phaseRef?.current ?? 0, 0), 1);

    // Pulse-speed spikes when the user is actively scrolling — feeds the
    // neural-net component so its activation wave runs faster during motion.
    const dp = Math.abs(p - lastPhase.current);
    lastPhase.current = p;
    const scrollVel = Math.min(dp * 60, 1);
    pulseSpeedRef.current = 1 + scrollVel * 2.5;

    const idx = p * (waypoints.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.min(lo + 1, waypoints.length - 1);
    const u = idx - lo;
    const eased = u * u * (3 - 2 * u); // smoothstep

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

    // Critical-damped follow — frame-rate independent, no spring overshoot.
    const k = 1 - Math.exp(-3 * dt);
    camera.position.lerp(desiredPos.current, k);
    currentLook.current.lerp(desiredLook.current, k);
    camera.lookAt(currentLook.current);
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, fov, k);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

// ─── Theme bridge — read CSS theme attribute, recolor background/fog ─────
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
  const bgColor = dark ? "#04060f" : "#0a1224";
  const fogColor = dark ? "#04060f" : "#0a1224";
  return (
    <>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[fogColor, 7, 22]} />
    </>
  );
}

export default function BgScene3D({ phaseRef }) {
  const pulseSpeedRef = useRef(1);

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.6, 9.5], fov: 50, near: 0.1, far: 100 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0, zIndex: 0 }}
    >
      <Suspense fallback={null}>
        <Theme />

        {/* Lighting: a warm key (sun-side), cool rim (back), gentle fill */}
        <ambientLight intensity={0.18} />
        <directionalLight position={[4, 6, 3]} intensity={0.55} color="#fff2dc" />
        <pointLight position={[-5, 2, -3]} intensity={1.3} color="#4a96f5" distance={14} />
        <pointLight position={[2, -2, 4]} intensity={0.9} color="#ff8a3a" distance={10} />

        <CameraRig phaseRef={phaseRef} pulseSpeedRef={pulseSpeedRef} />

        <NeuralNet pulseSpeedRef={pulseSpeedRef} />
        <DNAHelix />
        <Proteins />
        <Particles count={360} />

        {/* Film-grade post: bloom for emissive glow, vignette for focus, a
           touch of grain so the image isn't sterile. */}
        <EffectComposer multisampling={0} disableNormalPass>
          <Bloom
            intensity={1.15}
            luminanceThreshold={0.32}
            luminanceSmoothing={0.32}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.18} darkness={0.7} />
          <Noise opacity={0.04} premultiply blendFunction={BlendFunction.SCREEN} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
