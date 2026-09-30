import { useShallow } from "zustand/react/shallow";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import type { Group } from "three";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { generateOrbitPath, type OrbitalPlane } from "@/lib/orbital-mechanics";
import { focusSpread } from "@/lib/body-position";

interface OrbitPathProps {
  distance: number;
  eccentricity: number;
  color: string;
  isHovered: boolean;
  isSelected: boolean;
  // Tilts the orbit line onto the body's true plane. Bodies without ephemeris
  // omit this and get a flat XZ ring (defensive fallback).
  orbitalPlane?: OrbitalPlane;
}

// Elliptical orbit line for any body orbiting the sun.
export default function OrbitPath({
  distance,
  eccentricity,
  color,
  isHovered,
  isSelected,
  orbitalPlane
}: OrbitPathProps) {
  const { showOrbits, isRealisticScale } = useSolarSystemStore(useShallow(s => ({ showOrbits: s.showOrbits, isRealisticScale: s.isRealisticScale })));

  // Re-generate orbit coordinates when scale, distance, or plane changes.
  const orbitPoints = useMemo(() => {
    return generateOrbitPath(distance, eccentricity, isRealisticScale, 180, orbitalPlane);
  }, [distance, eccentricity, isRealisticScale, orbitalPlane]);

  // Follows the focus spread (planet positions scale about the Sun too).
  const groupRef = useRef<Group>(null);
  useFrame(() => groupRef.current?.scale.setScalar(isRealisticScale ? 1 : focusSpread.value));

  if (!showOrbits) return null;

  // Enhance orbit opacity when hovered or selected
  const opacity = isSelected ? 0.8 : isHovered ? 0.5 : 0.18;
  const lineWidth = isSelected ? 2.0 : isHovered ? 1.5 : 1.0;

  return (
    <group ref={groupRef}><Line
      points={orbitPoints}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
      // Dashed lines give a nice sci-fi grid overlay effect
      dashed={!isSelected && !isHovered}
      dashScale={0.8}
      dashSize={0.5}
      gapSize={0.5}
    /></group>
  );
}
