// Pure navigation helpers: routes between scale layers (through every layer
// in between, so each hop is an anchor-matched transition), keyboard
// shortcuts and URL parameters.

import { BRANCH_PARENT, LAYER_ORDER, outerOf, type ViewScale } from "../data/scales";

export interface NavStep {
  dir: "ascend" | "descend";
  to: ViewScale;
}

/** `layer` and every layer that contains it, innermost first. */
function outwardChain(layer: ViewScale): ViewScale[] {
  const chain: ViewScale[] = [layer];
  for (let next = outerOf(layer); next; next = outerOf(next)) chain.push(next);
  return chain;
}

/** Hops from one layer to another: out to the nearest layer containing
 *  both, then in. */
export function routeBetween(from: ViewScale, to: ViewScale): NavStep[] {
  if (from === to) return [];
  const up = outwardChain(from), down = outwardChain(to);
  const meet = up.find((l) => down.includes(l));
  if (!meet) return [];
  const steps: NavStep[] = [];
  for (const l of up.slice(1, up.indexOf(meet) + 1)) steps.push({ dir: "ascend", to: l });
  for (const l of down.slice(0, down.indexOf(meet)).reverse()) steps.push({ dir: "descend", to: l });
  return steps;
}

/** Keys 1–6 walk the ladder; 7 is the Galactic Centre. */
export const KEY_LAYERS: ViewScale[] = [...LAYER_ORDER, "galacticCenter"];

export const ALL_LAYERS: ViewScale[] = [...LAYER_ORDER, ...(Object.keys(BRANCH_PARENT) as ViewScale[])];

/** URL value → layer (accepts the internal names, case-insensitive). */
export function parseViewParam(value: string | null): ViewScale | null {
  if (!value) return null;
  const v = value.toLowerCase();
  return ALL_LAYERS.find((l) => l.toLowerCase() === v) ?? null;
}

/** Query string for a view; the Solar System overview is the bare URL. */
export function viewQuery(view: ViewScale, extra: { star?: string | null; planet?: string | null } = {}): string {
  const p = new URLSearchParams();
  if (view !== "solar") p.set("view", view);
  if (view === "stellar" && extra.star) p.set("star", extra.star);
  if (view === "solar" && extra.planet) p.set("planet", extra.planet);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** A "nice" scale-bar length (1, 2 or 5 × 10ⁿ) no longer than `max`. */
export function niceLength(max: number): number {
  if (!(max > 0) || !Number.isFinite(max)) return 0;
  const p = Math.pow(10, Math.floor(Math.log10(max)));
  for (const m of [5, 2, 1]) if (m * p <= max) return m * p;
  return p;
}
