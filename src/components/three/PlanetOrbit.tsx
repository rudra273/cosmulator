import { useMemo } from "react";
import { Line } from "@react-three/drei";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { generateOrbitPath } from "@/lib/orbital-mechanics";

interface PlanetOrbitProps {
  distance: number;
  eccentricity: number;
  color: string;
  isHovered: boolean;
  isSelected: boolean;
}

export default function PlanetOrbit({
  distance,
  eccentricity,
  color,
  isHovered,
  isSelected
}: PlanetOrbitProps) {
  const { showOrbits, isRealisticScale } = useSolarSystemStore();

  // Re-generate orbit coordinates when scale or distance parameters change
  const orbitPoints = useMemo(() => {
    return generateOrbitPath(distance, eccentricity, isRealisticScale, 180);
  }, [distance, eccentricity, isRealisticScale]);

  if (!showOrbits) return null;

  // Enhance orbit opacity when hovered or selected
  const opacity = isSelected ? 0.8 : isHovered ? 0.5 : 0.18;
  const lineWidth = isSelected ? 2.0 : isHovered ? 1.5 : 1.0;

  return (
    <Line
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
    />
  );
}
