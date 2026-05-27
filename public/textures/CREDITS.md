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
1. Extract frame 0 of the GIF (`-vsync 0 -frames:v 1`) — clean face-on view.
2. `vignette=PI/4` — soften the corners so the square texture composites
   cleanly with the radial alpha mask in the shader.
3. WebP quality 88 → ~72 KB.

The shader applies a circular alpha mask
(`smoothstep(0.62, 0.82, d)` in `src/lib/shaders/galaxyDisc.glsl.ts`) so the
square texture composites as a disc.

**Credit line (use anywhere this image is shown publicly):**
> Milky Way visualization courtesy of NASA's Goddard Space Flight Center
