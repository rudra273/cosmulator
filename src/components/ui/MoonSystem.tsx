import { getBodyById, getMoonsOfPlanet } from '@/data/bodies';
import { useSolarSystemStore } from '@/store/solarSystemStore';
export default function MoonSystem({ bodyId }: { bodyId: string }) {
  const select = useSolarSystemStore(s => s.selectPlanet);
  const explore = useSolarSystemStore(s => s.exploreMoonSystem);
  const body = getBodyById(bodyId);
  const parentId = body?.type === 'moon' ? body.parentId : bodyId;
  const moons = getMoonsOfPlanet(parentId);
  if (!moons.length) return null;
  return <section aria-label="Moon system" className="moon-system">
    <button className="hud-btn" onClick={() => explore(parentId)}>Explore {getBodyById(parentId)?.name}’s moons</button>
    <div className="moon-links">
      <button className="hud-btn" onClick={() => select(parentId)}>{getBodyById(parentId)?.name}</button>
      {moons.map(m => <button key={m.id} className={`hud-btn ${m.id === bodyId ? 'active' : ''}`} onClick={() => select(m.id)}>{m.name}</button>)}
    </div>
  </section>;
}
