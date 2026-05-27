# Texture Credits

## `milky-way-face-on.webp`

**Source:** NASA's Goddard Space Flight Center — Scientific Visualization Studio
**Page:** https://svs.gsfc.nasa.gov/14935/
**Original asset:** `MW_Anatomy.gif` (800×800 animated GIF, 7.6 MB) — first
frame of the Milky Way tilt animation. This is the same NASA artist concept
used in the "Milky Way Anatomy" infographic, rendered face-on, with **no
annotation labels or leader lines** (those exist only on the static
infographic, not the animation).

**Local processing** (ffmpeg + cwebp):

1. Extract frame 0 of the GIF:
   ```
   ffmpeg -y -i mw_anatomy.gif -vsync 0 -frames:v 1 mw_face_on.png
   ```
2. Derive an alpha channel from per-pixel luminance so the dark sky around
   the painted galaxy becomes transparent (no more visible square/disc plate
   behind the artwork). RGB is preserved; alpha is
   `clip((0.299*R + 0.587*G + 0.114*B − 10) * 5, 0, 255)` — anything below
   luma 10/255 (≈0.04) goes to alpha 0, anything above ~61/255 (≈0.24) hits
   alpha 255, with a soft ramp in between:
   ```
   ffmpeg -y -i mw_face_on.png \
     -vf "format=rgba,geq=\
       r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':\
       a='clip((0.299*r(X,Y)+0.587*g(X,Y)+0.114*b(X,Y)-10)*5,0,255)'" \
     mw_alpha.png
   ```
3. Encode to WebP with the alpha channel preserved:
   ```
   cwebp -q 88 -alpha_q 90 mw_alpha.png -o milky-way-face-on.webp
   ```

Resulting file ≈164 KB. The shader (`src/lib/shaders/galaxyDisc.glsl.ts`)
samples the texture and uses its baked alpha directly — no procedural radial
mask needed.

**Credit line (use anywhere this image is shown publicly):**
> Milky Way visualization courtesy of NASA's Goddard Space Flight Center

---

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
