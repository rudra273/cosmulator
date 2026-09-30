import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useShallow } from "zustand/react/shallow";
import * as THREE from "three";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { getScaledDistance } from "@/lib/orbital-mechanics";
import { focusSpread } from "@/lib/body-position";
import { simulationDays } from "@/lib/simulation-time";
import { HELIOPAUSE_AU, VOYAGERS, VOYAGER_MODEL_START_YEAR, eclipticSceneDirection, probeDistanceAU } from "@/lib/heliosphere";

const DIRECTIONS = VOYAGERS.map((v) => eclipticSceneDirection(v.raHours, v.decDeg));

/**
 * The Solar System's outer edge: the heliopause (drawn as a ring in the
 * ecliptic at ~120 AU — the real boundary is comet-shaped, blunt toward the
 * interstellar wind) and both Voyagers, which have crossed it. Probe
 * positions follow the simulation date.
 */
export default function Heliosphere() {
  const { isRealisticScale, showOrbits, showLabels, inTransition } = useSolarSystemStore(useShallow((s) => ({
    isRealisticScale: s.isRealisticScale,
    showOrbits: s.showOrbits,
    showLabels: s.showLabels,
    inTransition: s.transitionFrom !== null
  })));
  const ringRef = useRef<THREE.LineLoop | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const labelRefs = useRef<(THREE.Group | null)[]>([]);
  const heliopauseLabelRef = useRef<THREE.Group | null>(null);

  // Unit circle; scaled per frame so it follows the scale mode and focus spread.
  const ring = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i <= 256; i++) {
      const a = (i / 256) * Math.PI * 2;
      pts.push(Math.cos(a), 0, Math.sin(a));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  const probeGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(VOYAGERS.length * 3), 3));
    return g;
  }, []);

  useFrame(() => {
    const s = useSolarSystemStore.getState();
    const spread = s.isRealisticScale ? 1 : focusSpread.value;
    const radius = getScaledDistance(HELIOPAUSE_AU, s.isRealisticScale) * spread;
    ringRef.current?.scale.setScalar(radius);
    heliopauseLabelRef.current?.position.set(0, 0, radius);

    const year = 2000 + simulationDays(s.epochMs, s.elapsedTime) / 365.25;
    const visible = year >= VOYAGER_MODEL_START_YEAR;
    if (pointsRef.current) pointsRef.current.visible = visible;
    const attr = probeGeometry.getAttribute("position") as THREE.BufferAttribute;
    VOYAGERS.forEach((v, i) => {
      const r = getScaledDistance(probeDistanceAU(v, year), s.isRealisticScale) * spread;
      const [x, y, z] = DIRECTIONS[i];
      attr.setXYZ(i, x * r, y * r, z * r);
      const label = labelRefs.current[i];
      if (label) {
        label.position.set(x * r, y * r, z * r);
        label.visible = visible;
      }
    });
    attr.needsUpdate = true;
  });

  const labelsOn = showLabels && !inTransition;

  return (
    <>
      <lineLoop ref={ringRef} geometry={ring} visible={showOrbits}>
        <lineBasicMaterial color="#7fa6d6" transparent opacity={0.35} depthWrite={false} />
      </lineLoop>
      <group ref={heliopauseLabelRef}>
        {labelsOn && showOrbits && (
          <Html center zIndexRange={[4, 0]}>
            <div style={{ color: "rgba(150, 185, 230, 0.85)", fontSize: 9, letterSpacing: 1, whiteSpace: "nowrap", pointerEvents: "none", textTransform: "uppercase" }}>
              Heliopause · ~{HELIOPAUSE_AU} AU
            </div>
          </Html>
        )}
      </group>

      <points ref={pointsRef} geometry={probeGeometry} frustumCulled={false}>
        <pointsMaterial color="#e8f6ff" size={isRealisticScale ? 4 : 5} sizeAttenuation={false} />
      </points>
      {VOYAGERS.map((v, i) => (
        <group key={v.id} ref={(g) => { labelRefs.current[i] = g; }}>
          {labelsOn && (
            <Html center zIndexRange={[4, 0]} style={{ transform: "translateY(-14px)" }}>
              <div className="scene-label" style={{ cursor: "default" }} title={`Crossed the heliopause ${v.crossed}. Approximate position.`}>
                {v.name}
              </div>
            </Html>
          )}
        </group>
      ))}
    </>
  );
}
