// Builds public/data/hyg-naked-eye.bin from the HYG star database.
//
//   curl -LO https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv
//   node scripts/build-star-catalog.mjs hygdata_v41.csv
//
// Keeps naked-eye stars (V ≤ 6.5) with a known distance. HYG is CC BY-SA 4.0
// (David Nash / astronexus); the output is a derived work under the same
// license — see public/data/CREDITS.md.
//
// Format (little-endian): "HYG1", uint32 count, then 8 bytes per star:
//   uint16 RA/24·65535 · int16 Dec/90·32767 · uint16 log10(ly)/4·65535
//   int8 V·10 · int8 (B−V)·50 (−128 = unknown)
// Layout must match src/lib/star-catalog.ts.
import { readFileSync, writeFileSync } from "node:fs";

const MAX_MAG = 6.5;
const LY_PER_PC = 3.26156;

function parseLine(line) {
  const out = [];
  let cur = "", quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const [input, output = "public/data/hyg-naked-eye.bin"] = process.argv.slice(2);
if (!input) throw new Error("usage: node scripts/build-star-catalog.mjs hygdata_v41.csv [out.bin]");
const lines = readFileSync(input, "utf8").split("\n");
const head = parseLine(lines[0]);
const col = (name) => head.indexOf(name);
const [iRa, iDec, iDist, iMag, iCi, iProper] = ["ra", "dec", "dist", "mag", "ci", "proper"].map(col);

const stars = [];
for (const line of lines.slice(1)) {
  if (!line) continue;
  const r = parseLine(line);
  if (r[iProper] === "Sol") continue;
  const mag = Number(r[iMag]), pc = Number(r[iDist]);
  if (!(mag <= MAX_MAG) || !(pc > 0) || pc >= 100000) continue;
  stars.push({ ra: Number(r[iRa]), dec: Number(r[iDec]), ly: pc * LY_PER_PC, mag, ci: r[iCi] === "" ? null : Number(r[iCi]) });
}

const buf = Buffer.alloc(8 + stars.length * 8);
buf.write("HYG1", 0, "ascii");
buf.writeUInt32LE(stars.length, 4);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));
stars.forEach((s, i) => {
  const o = 8 + i * 8;
  buf.writeUInt16LE(clamp((s.ra / 24) * 65535, 0, 65535), o);
  buf.writeInt16LE(clamp((s.dec / 90) * 32767, -32767, 32767), o + 2);
  buf.writeUInt16LE(clamp((Math.log10(s.ly) / 4) * 65535, 0, 65535), o + 4);
  buf.writeInt8(clamp(s.mag * 10, -127, 127), o + 6);
  buf.writeInt8(s.ci === null ? -128 : clamp(s.ci * 50, -127, 127), o + 7);
});
writeFileSync(output, buf);
console.log(`${stars.length} stars → ${output} (${buf.length} bytes)`);
