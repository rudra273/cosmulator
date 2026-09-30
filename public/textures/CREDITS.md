# Texture Credits

## `milky-way-2048.webp`, `milky-way-1024.webp`

**Source:** NASA/JPL-Caltech/R. Hurt (SSC/Caltech) — "A Roadmap to the Milky
Way" artist concept, Photojournal PIA10748 (5600 × 5600 JPEG,
https://photojournal.jpl.nasa.gov/catalog/PIA10748).

**Local processing:** resized with Lanczos to 2048² (desktop) and 1024²
(phones) and encoded as WebP (quality 82 / 80) with Pillow — 215 KB and
48 KB. No alpha channel: the disc shader derives opacity from brightness.

**Overlay positions** (Sun, arm names) are measured from the Wikimedia
annotation of the same image, File:Milky_Way_Arms_ssc2008-10.svg (see
`src/data/galaxy.ts`).

## `hubble-deep-field.webp`

**Source:** NASA's Goddard Space Flight Center — Scientific Visualization Studio
**Page:** https://svs.gsfc.nasa.gov/30946
**Original asset:** `hudf-hst-6200x6200_print.jpg` (1024×1024, 258 KB) — the
Hubble Ultra Deep Field print-quality release. This is the canonical NASA/ESA
Hubble Ultra Deep Field assembled from 800+ exposures, showing ~10,000 distant
galaxies in a single patch of sky.

**Local processing** (cwebp only — image is already 1024² and the black sky
background is already pure black, so no alpha bake needed):

```
cwebp -q 85 hudf-hst-6200x6200_print.jpg -o hubble-deep-field.webp
```

Resulting file ≈116 KB. Used as a skybox: mapped to the inner surface of a
large `sphereGeometry` in `src/components/three/layers/UniverseLayer.tsx` so
the camera is wrapped in deep-field galaxies in every direction.

**Credit line (use anywhere this image is shown publicly):**
> Hubble Ultra Deep Field: NASA, ESA, and the HUDF team (STScI)

## `cmb-wmap-1024.webp`

**Source:** NASA / WMAP Science Team — WMAP 9-year Internal Linear
Combination (ILC) temperature map, Mollweide projection in galactic
coordinates, from NASA's LAMBDA archive
(https://lambda.gsfc.nasa.gov/product/wmap/dr5/m_images.html,
`ilc_9yr_temp_2048.png`).

**Local processing:** resized to 1024 × 512 with Lanczos and encoded as WebP
(quality 78) with Pillow — 124 KB. The shader maps it onto the sky directly
from the Mollweide projection (`src/lib/shaders/cmb.glsl.ts`).

(ESA's Planck maps are sharper but under the ESA Standard Licence, which
restricts redistribution, so the public-domain WMAP map is used instead.)
