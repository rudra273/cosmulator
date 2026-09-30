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
  // Hidden during scale transitions: LabelLayout stops when Solar is outgoing,
  // and screen-space labels would otherwise freeze over the shrinking system.
  const inTransition = useSolarSystemStore(s => s.transitionFrom !== null);
  // The wrappers drei adds around each label are click-through: a hidden
  // label (e.g. the Moon's, which sits right on top of Earth's) must not
  // swallow clicks meant for the visible one beneath it.
  return <Html position={[0, radius * 1.4, 0]} center zIndexRange={[4, 0]} wrapperClass="scene-label-wrap" style={{ pointerEvents: 'none' }}>
    <button ref={register} className={`scene-label ${selected ? 'selected' : ''}`} style={inTransition ? { display: 'none' } : undefined} onClick={() => onSelect(id)}>{name}</button>
  </Html>;
}
// One screen-space pass, ten times a second. Hidden labels keep their bounds,
// so they can reappear as soon as the camera makes room. Planet labels are
// never dropped for overlapping each other; smaller bodies make way for them.
export function LabelLayout() {
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    elapsed.current += delta;
    if (elapsed.current < 0.1) return;
    elapsed.current = 0;
    const s = useSolarSystemStore.getState();
    const selectedBody = getBodyById(s.selectedPlanetId);
    const system = selectedBody?.type === 'moon' ? selectedBody.parentId : s.selectedPlanetId;
    // Selection, then Earth (the viewer's reference point), planets, small
    // worlds, moons. Without explicit tiers Map order decided, so Earth lost
    // every overlap with Mercury or Venus in the crowded inner system.
    const priority = (id: string) => {
      if (id === s.selectedPlanetId) return 0;
      if (id === 'earth') return 1;
      const body = getBodyById(id);
      return body?.type === 'moon' ? 4 : body?.type === 'planet' && body.category ? 3 : 2;
    };
    const ordered = [...labels].sort(([a], [b]) => priority(a) - priority(b));
    const overlaps = (rect: DOMRect, rects: DOMRect[]) => rects.some(r => rect.left < r.right + 6 && rect.right + 6 > r.left && rect.top < r.bottom + 6 && rect.bottom + 6 > r.top);
    const panels = Array.from(document.querySelectorAll('.info-panel, .hud-bottom, .hud-top')).map(e => e.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0);
    const placed: DOMRect[] = [];
    for (const [id, element] of ordered) {
      const body = getBodyById(id);
      const inSystem = body?.type !== 'moon' || body.parentId === system;
      const rect = element.getBoundingClientRect();
      const valid = inSystem && rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
      // Major planets and the selection always keep their label, even when it
      // overlaps another; only small worlds and moons yield to crowding.
      const alwaysShown = priority(id) <= 2;
      const visible = valid && !overlaps(rect, panels) && (alwaysShown || !overlaps(rect, placed));
      element.style.visibility = visible ? 'visible' : 'hidden';
      if (visible) placed.push(rect);
    }
  });
  return null;
}
