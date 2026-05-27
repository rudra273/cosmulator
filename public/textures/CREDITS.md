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
