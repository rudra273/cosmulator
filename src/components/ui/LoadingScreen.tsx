import { useEffect, useState } from "react";

export default function LoadingScreen() {
  const [mounted, setMounted] = useState(true);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Keep visible for at least 1.8 seconds for smooth onboarding visual
    const timer = setTimeout(() => {
      setVisible(false);
      // Wait for fadeout transition to finish
      const exitTimer = setTimeout(() => setMounted(false), 800);
      return () => clearTimeout(exitTimer);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#030408",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: visible ? "all" : "none",
        fontFamily: "'Orbitron', sans-serif"
      }}
    >
      {/* Dynamic Animated Orbiting Loading Ring */}
      <div style={{ position: "relative", width: "120px", height: "120px", marginBottom: "32px" }}>
        
        {/* Core star */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            backgroundColor: "#ffb700",
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 20px #ffb700, 0 0 40px #ff7700"
          }}
        />
        
        {/* Orbit ring 1 (Cyan) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            border: "1px dashed rgba(0, 240, 255, 0.2)",
            borderRadius: "50%",
            animation: "spin 5s linear infinite"
          }}
        >
          {/* Orbiting planet 1 */}
          <div
            style={{
              position: "absolute",
              top: "-5px",
              left: "50%",
              width: "10px",
              height: "10px",
              backgroundColor: "#00f0ff",
              borderRadius: "50%",
              transform: "translateX(-50%)",
              boxShadow: "0 0 8px #00f0ff"
            }}
          />
        </div>

        {/* Orbit ring 2 (Purple) */}
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            right: "20px",
            bottom: "20px",
            border: "1px dashed rgba(171, 38, 255, 0.2)",
            borderRadius: "50%",
            animation: "spinReverse 3s linear infinite"
          }}
        >
          {/* Orbiting planet 2 */}
          <div
            style={{
              position: "absolute",
              top: "-4px",
              left: "50%",
              width: "8px",
              height: "8px",
              backgroundColor: "#ab26ff",
              borderRadius: "50%",
              transform: "translateX(-50%)",
              boxShadow: "0 0 8px #ab26ff"
            }}
          />
        </div>

      </div>

      {/* Futuristic Typography */}
      <h1
        style={{
          fontSize: "18px",
          fontWeight: 700,
          color: "#ffffff",
          letterSpacing: "4px",
          textTransform: "uppercase",
          marginBottom: "12px",
          textAlign: "center"
        }}
      >
        Initializing Solar System
      </h1>
      <p
        style={{
          fontSize: "10px",
          color: "#a0aec0",
          letterSpacing: "2.5px",
          textTransform: "uppercase",
          opacity: 0.7
        }}
      >
        Solving Keplerian Mechanics...
      </p>

      {/* Orbit keyframe injection */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spinReverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
