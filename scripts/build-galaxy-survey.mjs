// Builds public/data/2mrs-cz12000.bin from the 2MASS Redshift Survey
// (Huchra et al. 2012, ApJS 199, 26) via VizieR J/ApJS/199/26/table3:
//
//   curl -o 2mrs.tsv "https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-source=J/ApJS/199/26/table3&-out=GLON&-out=GLAT&-out=cz&-out.max=unlimited"
//   node scripts/build-galaxy-survey.mjs 2mrs.tsv
//
// Keeps galaxies with 0 < cz ≤ 12,000 km/s (~560 million ly at H0 = 70).
// Format (little-endian): "2MRS", uint32 count, then 6 bytes per galaxy:
//   uint16 l/360·65535 · int16 b/90·32767 · uint16 cz (km/s)
// Layout must match src/lib/galaxy-survey.ts.
import { readFileSync, writeFileSync } from "node:fs";

const MAX_CZ = 12000;
const [input, output = "public/data/2mrs-cz12000.bin"] = process.argv.slice(2);
if (!input) throw new Error("usage: node scripts/build-galaxy-survey.mjs 2mrs.tsv [out.bin]");

const rows = [];
for (const line of readFileSync(input, "utf8").split("\n")) {
  if (!line.trim() || line.startsWith("#") || line.startsWith("-")) continue;
  const [l, b, cz] = line.split("\t").map(Number);
  if (Number.isFinite(l) && Number.isFinite(b) && cz > 0 && cz <= MAX_CZ) rows.push([l, b, cz]);
}

const buf = Buffer.alloc(8 + rows.length * 6);
buf.write("2MRS", 0, "ascii");
buf.writeUInt32LE(rows.length, 4);
rows.forEach(([l, b, cz], i) => {
  const o = 8 + i * 6;
  buf.writeUInt16LE(Math.round((l / 360) * 65535) % 65536, o);
  buf.writeInt16LE(Math.round((b / 90) * 32767), o + 2);
  buf.writeUInt16LE(Math.round(cz), o + 4);
});
writeFileSync(output, buf);
console.log(`${rows.length} galaxies → ${output} (${buf.length} bytes)`);
