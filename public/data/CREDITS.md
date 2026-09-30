# Data Credits

## `hyg-naked-eye.bin`

**Source:** HYG Database v4.1 — David Nash / astronexus,
https://github.com/astronexus/HYG-Database (`hyg/CURRENT/hygdata_v41.csv`).

**License:** [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
This file is a derived work and is distributed under the same license.

**Changes:** kept stars with V ≤ 6.5 and a known distance (8,714 stars);
stored RA, Dec, log distance, V magnitude and B−V index in 8 bytes per star
(~70 KB). Regenerate with `node scripts/build-star-catalog.mjs hygdata_v41.csv`.

## `2mrs-cz12000.bin`

**Source:** 2MASS Redshift Survey — Huchra, J. P. et al. 2012, ApJS 199, 26,
retrieved from VizieR (CDS, Strasbourg), catalogue J/ApJS/199/26 (table3).
This research has made use of the VizieR catalogue access tool, CDS,
Strasbourg, France.

**Changes:** kept galactic longitude, latitude and recession velocity for
galaxies with 0 < cz ≤ 12,000 km/s (33,566 galaxies, ~560 million ly at
H0 = 70), 6 bytes per galaxy (~200 KB). Regenerate with
`node scripts/build-galaxy-survey.mjs 2mrs.tsv` (download command inside).
