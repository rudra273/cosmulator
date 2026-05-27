# Texture Credits

## `milky-way-face-on.webp`

**Source:** NASA's Goddard Space Flight Center — Scientific Visualization Studio
**Page:** https://svs.gsfc.nasa.gov/14935/
**Original asset:** `Milky_Way_Anatomy_Infographic_Simple_Final.jpg` (4320×2160, 1.2 MB)

**Local processing** (run via ffmpeg + cwebp):
1. `crop=1150:1150:765:465` — tight crop around the face-on disc, deliberately
   excluding most of the infographic annotation labels.
2. `scale=1024:1024:flags=lanczos` — downsize to 1024² (plenty for our on-screen
   size at the galaxy camera distance; keeps the bundle small).
3. `vignette=PI/4` — soften the corners so any residual leader lines fade out.
4. WebP quality 85 → ~190 KB.

The shader applies a further radial alpha mask (`smoothstep(0.62, 0.82, d)` in
`src/lib/shaders/galaxyDisc.glsl.ts`) so the square texture composites as a
circular disc.

**Credit line (use anywhere this image is shown publicly):**
> Milky Way visualization courtesy of NASA's Goddard Space Flight Center
