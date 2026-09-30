// Fact cards for objects without their own panel. Pure: builds InfoCard data
// from the catalogues.

import type { InfoCard } from "../store/solarSystemStore";
import type { LocalGroupMember } from "./localGroup";
import type { CosmicLandmark } from "./cosmicWeb";
import type { GalacticObject } from "./galaxy";
import { S_STARS, SGR_A_MASS_SUNS, periodYears, pericentreAu, semiMajorAu, speedKmS, type SStar } from "./sStars";
import { czToMly } from "../lib/galaxy-survey";

const fmtLy = (ly: number) =>
  ly >= 1e6 ? `${+(ly / 1e6).toPrecision(3)} million light-years` : `${Math.round(ly).toLocaleString()} light-years`;

const KIND_NAME: Record<LocalGroupMember["kind"], string> = {
  spiral: "Spiral galaxy",
  elliptical: "Elliptical galaxy",
  irregular: "Irregular galaxy",
  "dwarf spheroidal": "Dwarf spheroidal galaxy"
};

export function localGroupCard(m: LocalGroupMember): InfoCard {
  return {
    title: m.name,
    kind: `${KIND_NAME[m.kind]} · Local Group`,
    color: m.kind === "spiral" ? "#cfd9ff" : "#b8c6e0",
    body: m.note + (m.disc ? " Its disc is tilted to the measured angle; the artwork is the Milky Way's, used for illustration." : ""),
    facts: [
      ["Distance", fmtLy(m.distanceMly * 1e6)],
      ["Light you see left it", `${+(m.distanceMly).toPrecision(3)} million years ago`],
      ["Size", `~${m.diameterKly.toLocaleString()},000 light-years across`],
      ["Sky position (galactic l, b)", `${m.lDeg.toFixed(1)}°, ${m.bDeg.toFixed(1)}°`]
    ]
  };
}

export function cosmicLandmarkCard(c: CosmicLandmark): InfoCard {
  const mly = czToMly(c.czKmS);
  return {
    title: c.name,
    kind: "Cosmic web landmark",
    color: "#ffe9c8",
    body: c.note,
    facts: [
      ["Distance", fmtLy(mly * 1e6)],
      ["Receding at", `${c.czKmS.toLocaleString()} km/s`],
      ["Sky position (galactic l, b)", `${c.lDeg.toFixed(1)}°, ${c.bDeg.toFixed(1)}°`]
    ]
  };
}

const OBJECT_KIND: Record<GalacticObject["kind"], string> = {
  globular: "Globular cluster",
  nebula: "Nebula · star-forming region",
  "dwarf galaxy": "Satellite galaxy"
};

export function galacticObjectCard(o: GalacticObject): InfoCard {
  return {
    title: o.name,
    kind: OBJECT_KIND[o.kind],
    color: o.kind === "nebula" ? "#ff7fae" : o.kind === "globular" ? "#ffe6b0" : "#c9d6ff",
    body: o.note,
    facts: [
      ["Distance from the Sun", fmtLy(o.distanceLy)],
      ["Sky position (galactic l, b)", `${o.lDeg.toFixed(1)}°, ${o.bDeg.toFixed(1)}°`]
    ]
  };
}

export function sStarCard(s: SStar, nowYear: number): InfoCard {
  const peri = pericentreAu(s);
  return {
    title: s.name,
    kind: "S-star · orbiting Sagittarius A*",
    color: s.id === "s2" ? "#ffc861" : "#7fb4ff",
    body: s.note ?? "A young, hot star on a tight orbit around the Milky Way's central black hole, tracked since the 1990s.",
    facts: [
      ["Orbit", `${periodYears(s).toFixed(1)} years`],
      ["Closest approach", `${Math.round(peri).toLocaleString()} AU (${Math.round(peri / 30)}× Neptune's distance)`],
      ["Farthest", `${Math.round(semiMajorAu(s) * (1 + s.e)).toLocaleString()} AU`],
      ["Top speed", `${Math.round(speedKmS(s, peri)).toLocaleString()} km/s`],
      ["Eccentricity", s.e.toFixed(3)],
      ["Next closest approach", `${nextPericentreYear(s, nowYear)}`]
    ]
  };
}

/** First pericentre passage at or after `year`. */
export function nextPericentreYear(s: SStar, year: number): number {
  const P = periodYears(s);
  return Math.round(s.tPeriYear + Math.ceil((year - s.tPeriYear) / P) * P);
}

export function sgrACard(): InfoCard {
  return {
    title: "Sagittarius A*",
    kind: "Supermassive black hole",
    color: "#ffb060",
    body: "The Milky Way's central black hole. Its mass was weighed from the S-star orbits (2020 Nobel Prize in Physics: Genzel and Ghez), and the Event Horizon Telescope imaged its shadow in 2022.",
    facts: [
      ["Mass", `${(SGR_A_MASS_SUNS / 1e6).toFixed(1)} million Suns`],
      ["Event horizon", "~0.17 AU (25 million km) across"],
      ["Distance from the Sun", "~26,000 light-years"],
      ["Stars tracked here", `${S_STARS.length} shown`]
    ]
  };
}
