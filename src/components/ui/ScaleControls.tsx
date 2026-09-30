import { useEffect, useRef, useState } from 'react';
import { BODIES } from '@/data/bodies';
import { useSolarSystemStore } from '@/store/solarSystemStore';
export default function ScaleControls() {
  const realDistances = useSolarSystemStore(s => s.isRealisticScale);
  const realSizes = useSolarSystemStore(s => s.realSizes);
  const toggleDistances = useSolarSystemStore(s => s.toggleScale);
  const toggleSizes = useSolarSystemStore(s => s.toggleSizes);
  const [left, setLeft] = useState('earth');
  const [right, setRight] = useState('jupiter');
  const dialog = useRef<HTMLDialogElement>(null);
  const a = BODIES.find(b => b.id === left)!;
  const b = BODIES.find(b => b.id === right)!;
  const max = Math.max(a.radius, b.radius);
  useEffect(() => { const d = dialog.current; return () => d?.close(); }, []);
  return <>
    <button className={`hud-btn ${realDistances ? 'active' : ''}`} aria-pressed={realDistances} onClick={toggleDistances}>Real distances</button>
    <button className={`hud-btn ${realSizes ? 'active' : ''}`} aria-pressed={realSizes} onClick={toggleSizes}>Real sizes</button>
    <button className="hud-btn" onClick={() => dialog.current?.showModal()}>Compare sizes</button>
    <dialog ref={dialog} className="scale-dialog glass-panel" aria-labelledby="compare-title">
      <form method="dialog"><button className="hud-btn">Close comparison ×</button></form>
      <h2 id="compare-title">Worlds, side by side</h2>
      <p>Diameters share one linear scale. Distances between them are not represented.</p>
      <div className="compare-grid">{[a, b].map((body, index) => <div key={index}>
        <select aria-label={index === 0 ? 'First body' : 'Second body'} value={body.id} onChange={e => (index === 0 ? setLeft : setRight)(e.target.value)}>
          {BODIES.map(body => <option key={body.id} value={body.id}>{body.name}</option>)}
        </select>
        <div className="compare-stage"><span style={{ width: `${body.radius / max * 100}%`, aspectRatio: '1', background: `radial-gradient(circle at 30% 30%, ${body.baseColor}, #080d18)` }} /></div>
        <strong>{(body.radius * 2).toLocaleString()} km</strong>
      </div>)}</div>
      <p>{b.name} is {(b.radius / a.radius).toLocaleString(undefined, { maximumFractionDigits: 3 })}× {a.name}’s diameter.</p>
      <p>In the scene, exaggerated sizes enlarge small worlds and compress size differences. Compressed distances also spread out moon systems. Enable both real controls for one physical scale; small bodies may be tiny or hidden inside exaggerated neighbors when only real distances is enabled.</p>
    </dialog>
  </>;
}
