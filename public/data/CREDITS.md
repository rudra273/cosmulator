# Data Credits

## `hyg-naked-eye.bin`

**Source:** HYG Database v4.1 — David Nash / astronexus,
https://github.com/astronexus/HYG-Database (`hyg/CURRENT/hygdata_v41.csv`).

**License:** [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
This file is a derived work and is distributed under the same license.

**Changes:** kept stars with V ≤ 6.5 and a known distance (8,714 stars);
stored RA, Dec, log distance, V magnitude and B−V index in 8 bytes per star
(~70 KB). Regenerate with `node scripts/build-star-catalog.mjs hygdata_v41.csv`.
