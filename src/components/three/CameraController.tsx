import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useSolarSystemStore } from "@/store/solarSystemStore";
import { getBodyById } from "@/data/bodies";
import { getScaledRadius } from "@/lib/orbital-mechanics";
import { planetPosition, moonPosition, moonOrbitRadius } from "@/lib/body-position";
import { simulationDays } from "@/lib/simulation-time";
import { useAscendOnZoomOut } from "./layers/useAscendOnZoomOut";
import { usePublishDistance } from "./layers/usePublishDistance";

function selectedPose(id: string, realistic: boolean) {
  const body = getBodyById(id);
  const clock = useSolarSystemStore.getState();
  if (!body || body.type === "star") return null;
  const radius = getScaledRadius(body.radius, realistic);
  if (body.type === "planet") return {
    position: new THREE.Vector3(...planetPosition(body, clock.epochMs, clock.elapsedTime, realistic)),
    radius: radius * (body.rings?.outerRadius ?? 1)
  };
  const parent = getBodyById(body.parentId);
  if (parent?.type !== "planet") return null;
  const position = new THREE.Vector3(...planetPosition(parent, clock.epochMs, clock.elapsedTime, realistic));
  position.add(new THREE.Vector3(...moonPosition(body, moonOrbitRadius(body, parent, realistic), simulationDays(clock.epochMs, clock.elapsedTime))));
  return { position, radius };
}

export default function CameraController() {
  const { selectedPlanetId, isRealisticScale, freeMode, transitionFrom, infoPanelOpen } = useSolarSystemStore();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera, size } = useThree();
  const follow = useRef(false);
  const flight = useRef<{ start: THREE.Vector3; target: THREE.Vector3; elapsed: number } | null>(null);
  const projectionOffset = useRef(new THREE.Vector2());
  const solarMaxDistance = isRealisticScale ? 30000 : 1400;
  useAscendOnZoomOut(controlsRef, {
    maxDistance: solarMaxDistance, threshold: 0.95,
    enabled: !selectedPlanetId && !freeMode && transitionFrom === null,
    isActive: true, layer: "solar"
  });
  usePublishDistance(controlsRef);

  useEffect(() => {
    camera.position.set(0, 50, 95);
    controlsRef.current?.target.set(0, 0, 0);
    controlsRef.current?.update();
    return () => {
      if (camera instanceof THREE.PerspectiveCamera) camera.clearViewOffset();
    };
  }, [camera]);

  // Reframe on selection, scale/date changes, and responsive layout changes.
  // Simulation ticks never restart the flight. Frame updates read the live date.
  const epochMs = useSolarSystemStore((s) => s.epochMs);
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || (!selectedPlanetId && freeMode)) return;
    follow.current = !!selectedPlanetId;
    flight.current = { start: camera.position.clone(), target: controls.target.clone(), elapsed: 0 };
  }, [selectedPlanetId, isRealisticScale, freeMode, epochMs, size.width, size.height, infoPanelOpen, camera]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const cancelFlight = () => { flight.current = null; };
    controls.addEventListener("start", cancelFlight);
    return () => controls.removeEventListener("start", cancelFlight);
  }, []);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls || !(camera instanceof THREE.PerspectiveCamera)) return;
    const panel = !!selectedPlanetId && infoPanelOpen;
    const mobile = size.width <= 768;
    // Move the optical center into the unobscured scene without moving the
    // orbit pivot away from the body. Closing the card smoothly recenters it.
    const x = panel && !mobile ? Math.min(200, size.width * 0.22) : 0;
    const y = panel && mobile ? size.height * 0.18 : 0;
    projectionOffset.current.lerp(new THREE.Vector2(x, y), 1 - Math.exp(-delta * 10));
    camera.setViewOffset(size.width, size.height, projectionOffset.current.x, projectionOffset.current.y, size.width, size.height);

    const pose = selectedPlanetId ? selectedPose(selectedPlanetId, isRealisticScale) : null;
    if (flight.current) {
      const f = flight.current;
      f.elapsed += delta;
      const t = Math.min(1, f.elapsed / 0.85);
      const ease = t * t * (3 - 2 * t);
      let target = new THREE.Vector3();
      let destination = new THREE.Vector3(0, 50, 95);
      if (pose) {
        target = pose.position;
        const availableWidth = size.width - (panel && !mobile ? 400 : 40);
        const availableHeight = size.height * (panel && mobile ? 0.35 : 0.65);
        const diameter = Math.min(availableWidth * 0.82, availableHeight);
        const angularRadius = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * diameter / size.height);
        const distance = pose.radius / Math.sin(angularRadius);
        const sunward = pose.position.clone().negate().normalize();
        const side = new THREE.Vector3(-sunward.z, 0, sunward.x).normalize();
        const direction = sunward.multiplyScalar(0.85).addScaledVector(side, 0.5);
        direction.y += 0.4;
        destination = pose.position.clone().add(direction.normalize().multiplyScalar(distance));
      }
      camera.position.lerpVectors(f.start, destination, ease);
      controls.target.lerpVectors(f.target, target, ease);
      if (t === 1) flight.current = null;
    } else if (pose && follow.current) {
      const shift = pose.position.clone().sub(controls.target);
      camera.position.add(shift);
      controls.target.copy(pose.position);
    }
    controls.update();
  });

  return <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.08}
    enablePan={!selectedPlanetId} screenSpacePanning
    maxDistance={solarMaxDistance} minDistance={isRealisticScale ? 0.02 : 0.5}
    maxPolarAngle={freeMode ? Math.PI : Math.PI / 2 - 0.01}
    mouseButtons={freeMode && !selectedPlanetId
      ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
      : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
    touches={freeMode && !selectedPlanetId
      ? { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }
      : { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }} />;
}
