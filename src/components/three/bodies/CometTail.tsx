import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlanetBody } from '@/data/bodies';
import { planetPosition } from '@/lib/body-position';
import { useSolarSystemStore } from '@/store/solarSystemStore';
export default function CometTail({ body, radius }: { body: PlanetBody; radius: number }) {
  const group = useRef<THREE.Group>(null);
  const axis = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const s = useSolarSystemStore.getState();
    const physical = planetPosition(body, s.epochMs, s.elapsedTime, true);
    const distanceAU = Math.hypot(...physical) / 150;
    if (!group.current) return;
    group.current.visible = distanceAU < 4;
    direction.set(...planetPosition(body, s.epochMs, s.elapsedTime, s.isRealisticScale)).normalize();
    group.current.quaternion.setFromUnitVectors(axis, direction);
    group.current.scale.setScalar(Math.max(0.1, 1 - distanceAU / 4));
  });
  return <group ref={group}>
    <mesh position={[0, radius * 22, 0]} rotation={[0, 0, Math.PI]}>
      <coneGeometry args={[radius * 7, radius * 44, 16, 1, true]} />
      <meshBasicMaterial color="#94e5ff" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  </group>;
}
