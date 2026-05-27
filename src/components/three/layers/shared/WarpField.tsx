import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface WarpFieldProps {
  /** 0→1 transition progress. The field fades in 0–0.25, holds, then fades
   *  out 0.75–1.0. Streaks elongate with progress so the motion reads as
   *  "we're going faster" until the new layer settles. */
  progress: number;
  /** Number of warp particles. Default 700 — dense enough to read as a
   *  starfield streaming past, sparse enough to render at 60fps on mobile. */
  count?: number;
}

// Streak geometry: each particle is two vertices (head + tail). We pack them
// as a LineSegments buffer; the head sits at the particle's world position,
// the tail sits behind it along the camera's local -Z (which is the camera's
// forward direction). As the warp accelerates we lengthen the tail, turning
// dots into streaks.
const TUBE_RADIUS = 1500; // particles distributed inside this radius of the camera
const TUBE_LENGTH = 4000; // particles distributed along this length ahead of camera
const STREAK_BASE = 2;    // minimum streak length (almost a dot)
const STREAK_PEAK = 180;  // maximum streak length at peak warp

// Same stellar-class palette as StellarBackgroundField, biased a little
// bluer/whiter for warp readability.
const PALETTE: [number, number, number][] = [
  [0.61, 0.71, 1.0],   // blue
  [0.79, 0.84, 1.0],   // white-blue
  [0.97, 0.97, 1.0],   // white
  [1.0, 0.96, 0.92],   // pale yellow
  [1.0, 0.82, 0.63],   // orange
  [1.0, 0.62, 0.44],   // red
];

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Warp tunnel — colorful star streaks streaming past the camera during an
 * ascend transition. Mounted attached to the camera so the streaks always
 * surround the viewer regardless of where the camera is in world space.
 *
 * Two parts:
 *  - Dense static colored dots in a cylindrical volume around the camera
 *    (rendered as the line segments' "head" vertices at full alpha).
 *  - A "tail" vertex behind each head along the camera-forward axis; tail
 *    length scales with `progress` so the dots become streaks at peak warp.
 *
 * Fades in 0→0.25 of progress, holds, fades out 0.75→1.0 so it doesn't
 * compete with the layer cross-fade at the endpoints.
 */
export default function WarpField({ progress, count = 700 }: WarpFieldProps) {
  const { camera } = useThree();
  const linesRef = useRef<THREE.LineSegments | null>(null);

  // Build the buffer once: each particle is a head + tail vertex pair.
  // We store the head's *local-to-camera* base position; per-frame we
  // animate it down the tube (z drift) and recompute the tail offset.
  const { headsBase, colors, geometry } = useMemo(() => {
    const rng = mulberry32(0xa17eba11);
    const heads = new Float32Array(count * 3);
    const positions = new Float32Array(count * 6); // 2 verts × 3 floats
    const cols = new Float32Array(count * 6);

    for (let i = 0; i < count; i++) {
      // Cylindrical distribution: radius around camera axis, z along it.
      // z goes negative because in camera-local space, -Z is forward.
      const r = Math.sqrt(rng()) * TUBE_RADIUS;
      const theta = rng() * Math.PI * 2;
      const x = Math.cos(theta) * r;
      const y = Math.sin(theta) * r;
      const z = -rng() * TUBE_LENGTH;
      heads[i * 3 + 0] = x;
      heads[i * 3 + 1] = y;
      heads[i * 3 + 2] = z;

      // Initialize both vertices to the head position; the per-frame
      // update will overwrite vertex B (the tail) with the streaked one.
      positions[i * 6 + 0] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = z;
      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = y;
      positions[i * 6 + 5] = z;

      const c = PALETTE[Math.floor(rng() * PALETTE.length)];
      // Head vertex full-color; tail vertex same color but the line's
      // alpha-along-length is handled in vertex alpha via a custom shader
      // would be cleaner — for now we rely on additive blending to make
      // overlapping streaks bright at the head.
      cols[i * 6 + 0] = c[0];
      cols[i * 6 + 1] = c[1];
      cols[i * 6 + 2] = c[2];
      cols[i * 6 + 3] = c[0] * 0.4;
      cols[i * 6 + 4] = c[1] * 0.4;
      cols[i * 6 + 5] = c[2] * 0.4;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    return { headsBase: heads, colors: cols, geometry: g };
  }, [count]);

  // Material opacity tracks the in/out fade envelope of progress.
  const matRef = useRef<THREE.LineBasicMaterial | null>(null);

  useEffect(() => () => geometry.dispose(), [geometry]);

  // Per-frame animation: drift each head down the tube (so dots stream
  // toward the camera), wrap around when they pass the camera plane,
  // recompute the tail position based on current streak length.
  const driftZRef = useRef(0);
  useFrame((_, delta) => {
    if (linesRef.current === null) return;
    // Drift speed scales with progress so the streaming accelerates
    // during the warp. Capped delta so a stalled frame doesn't teleport
    // particles.
    const dt = Math.min(delta, 0.05);
    const speed = 400 + progress * 2600;
    driftZRef.current += speed * dt;

    // Fade envelope: in over 0–0.25, hold 0.25–0.75, out over 0.75–1.0.
    const fadeIn = Math.min(1, progress / 0.25);
    const fadeOut = 1 - Math.max(0, (progress - 0.75) / 0.25);
    const envelope = Math.min(fadeIn, fadeOut);
    if (matRef.current) {
      matRef.current.opacity = envelope;
    }

    // Streak length: grows with progress, peaks in the middle of the warp.
    const streakLen = STREAK_BASE + (STREAK_PEAK - STREAK_BASE) * progress;

    const posAttr = linesRef.current.geometry.getAttribute(
      "position"
    ) as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const drift = driftZRef.current;

    for (let i = 0; i < count; i++) {
      // Head Z drifts toward camera (+Z in local space). Wrap when it
      // passes behind the camera.
      let z = headsBase[i * 3 + 2] + drift;
      // Wrap into [-TUBE_LENGTH, 0]: any z > 0 cycles back to z - TUBE_LENGTH.
      z = ((z % TUBE_LENGTH) + TUBE_LENGTH) % TUBE_LENGTH - TUBE_LENGTH;
      const x = headsBase[i * 3 + 0];
      const y = headsBase[i * 3 + 1];

      // Head vertex
      arr[i * 6 + 0] = x;
      arr[i * 6 + 1] = y;
      arr[i * 6 + 2] = z;
      // Tail vertex — behind the head along -Z (camera-forward, so the
      // streak trails away from the camera as the head approaches).
      arr[i * 6 + 3] = x;
      arr[i * 6 + 4] = y;
      arr[i * 6 + 5] = z - streakLen;
    }
    posAttr.needsUpdate = true;
  });

  // Attach to the camera so the warp field is always around the viewer
  // regardless of which layer's coordinate system we're transitioning
  // through. The camera is in the root scene, not under any layer group,
  // so attaching this as a child of camera means we render in
  // camera-local space — exactly what the local-Z tube assumes.
  useEffect(() => {
    const ls = linesRef.current;
    if (!ls) return;
    camera.add(ls);
    return () => {
      camera.remove(ls);
    };
  }, [camera]);

  // `colors` reference kept so React doesn't GC the typed array between
  // renders. Geometry already owns a BufferAttribute pointing at it.
  void colors;

  return (
    // We return the LineSegments via a ref-only mount; it's reparented to
    // the camera in the effect above. The JSX element here is just to
    // create the THREE object with the right material/geometry.
    <lineSegments ref={linesRef} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial
        ref={matRef}
        vertexColors
        transparent
        opacity={0}
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </lineSegments>
  );
}
