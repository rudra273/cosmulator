import { useEffect, useRef } from 'react';
import { useSolarSystemStore } from '@/store/solarSystemStore';
import { PLANETS, SMALL_WORLDS, MOONS, BODIES, getBodyById } from '@/data/bodies';
export default function PlanetSelector() {
  const selected = useSolarSystemStore(s => s.selectedPlanetId);
  const free = useSolarSystemStore(s => s.freeMode);
  const select = useSolarSystemStore(s => s.selectPlanet);
  const overview = useSolarSystemStore(s => s.returnToOverview);
  const explore = useSolarSystemStore(s => s.enterFreeMode);
  const outer = useSolarSystemStore(s => s.outerSystem);
  const showOuter = useSolarSystemStore(s => s.exploreOuterSystem);
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rail.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selected]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, select, textarea, dialog, [contenteditable="true"]') || e.altKey || e.ctrlKey || e.metaKey) return;
      const s = useSolarSystemStore.getState();
      if (s.viewScale !== 'solar' || s.transitionFrom) return;
      if (e.key === 'Escape') { s.returnToOverview(); return; }
      if (target.closest('button')) return;
      if (e.code === 'Space') { e.preventDefault(); s.togglePaused(); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const bodies = BODIES.filter(b => b.type !== 'star');
        const at = bodies.findIndex(b => b.id === s.selectedPlanetId);
        const next = at < 0 ? (e.key === 'ArrowRight' ? 0 : bodies.length - 1) : (at + (e.key === 'ArrowRight' ? 1 : -1) + bodies.length) % bodies.length;
        s.selectPlanet(bodies[next].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  const body = getBodyById(selected);
  const parentId = body?.type === 'moon' ? body.parentId : selected;
  return <nav aria-label="Explore bodies" className="body-navigation">
    <div className="glass-panel planet-rail" ref={rail} onKeyDown={e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (index < 0) return;
      e.preventDefault();
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (index + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].focus();
    }}>
      <button className={`hud-btn ${free && !selected ? 'active' : ''}`} onClick={explore}>Explore</button>
      <button className={`hud-btn ${!selected && !free ? 'active' : ''}`} onClick={overview}>Solar System</button>
      {PLANETS.map(planet => <button key={planet.id} aria-pressed={selected === planet.id} className={`hud-btn ${parentId === planet.id ? 'active' : ''}`} onClick={() => select(planet.id)}>
        <span className="body-dot" style={{ background: planet.baseColor }} />{planet.name}
      </button>)}
    </div>
    <div className="picker-row glass-panel">
      <label htmlFor="body-picker">Explore a world</label>
      <select id="body-picker" className="body-picker" value={selected ?? (outer ? 'outer-system' : '')} onChange={e => e.target.value === 'outer-system' ? showOuter() : e.target.value ? select(e.target.value) : overview()}>
        <option value="">Solar System overview</option>
        <option value="outer-system">Outer system · Kuiper Belt (30–50 AU)</option>
        <optgroup label="Planets">{PLANETS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</optgroup>
        <optgroup label="Moons">{MOONS.map(b => <option key={b.id} value={b.id}>{b.name} · {getBodyById(b.parentId)?.name}</option>)}</optgroup>
        <optgroup label="Dwarf planets & comets">{SMALL_WORLDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</optgroup>
      </select>
      <span className="keyboard-hint">← → worlds · Space pause · Esc overview</span>
    </div>
  </nav>;
}
