import { useCallback, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useSolarSystemStore } from '@/store/solarSystemStore';
import { getBodyById } from '@/data/bodies';
const labels = new Map<string, HTMLButtonElement>();
export default function SceneLabel({ id, name, radius, onSelect }: { id: string; name: string; radius: number; onSelect: (id: string) => void }) {
  const register = useCallback((element: HTMLButtonElement | null) => {
    if (element) labels.set(id, element);
    else labels.delete(id);
  }, [id]);
  const selected = useSolarSystemStore(s => s.selectedPlanetId === id);
  return <Html position={[0, radius * 1.4, 0]} center zIndexRange={[4, 0]}>
    <button ref={register} className={`scene-label ${selected ? 'selected' : ''}`} onClick={() => onSelect(id)}>{name}</button>
  </Html>;
}
// One screen-space pass, ten times a second. Hidden labels keep their bounds,
// so they can reappear as soon as the camera makes room. Selection wins ties.
export function LabelLayout() {
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    elapsed.current += delta;
    if (elapsed.current < 0.1) return;
    elapsed.current = 0;
    const s = useSolarSystemStore.getState();
    const selectedBody = getBodyById(s.selectedPlanetId);
    const system = selectedBody?.type === 'moon' ? selectedBody.parentId : s.selectedPlanetId;
    const priority = (id: string) => id === s.selectedPlanetId ? 0 : getBodyById(id)?.type === 'moon' ? 2 : 1;
    const ordered = [...labels].sort(([a], [b]) => priority(a) - priority(b));
    const occupied: DOMRect[] = Array.from(document.querySelectorAll('.info-panel, .hud-bottom, .hud-top')).map(e => e.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0);
    for (const [id, element] of ordered) {
      const body = getBodyById(id);
      const inSystem = body?.type !== 'moon' || body.parentId === system;
      const rect = element.getBoundingClientRect();
      const valid = inSystem && rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
      const collision = occupied.some(r => rect.left < r.right + 6 && rect.right + 6 > r.left && rect.top < r.bottom + 6 && rect.bottom + 6 > r.top);
      const visible = valid && !collision;
      element.style.visibility = visible ? 'visible' : 'hidden';
      if (visible) occupied.push(rect);
    }
  });
  return null;
}
