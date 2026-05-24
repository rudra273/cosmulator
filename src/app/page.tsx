"use client";

import dynamic from "next/dynamic";
import HUD from "@/components/ui/HUD";
import LoadingScreen from "@/components/ui/LoadingScreen";

// Import the 3D Solar System Canvas dynamically with SSR disabled.
// This is critical because Three.js/WebGL require browser APIs (window, WebGLContext).
const SolarSystemScene = dynamic(
  () => import("@/components/three/SolarSystemScene"),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="main-viewport">
      {/* Background Ambient Nebula Glows */}
      <div className="nebula-glow nebula-cyan" />
      <div className="nebula-glow nebula-purple" />

      {/* Dynamic 3D Solar System Canvas Scene */}
      <SolarSystemScene />

      {/* DOM HUD UI Overlay (Controls, Info Panels, Nav) */}
      <HUD />

      {/* Dynamic Animated Entry Loading Screen */}
      <LoadingScreen />
    </main>
  );
}
