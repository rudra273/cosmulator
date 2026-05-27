# Cosmulator — Project Roadmap

Living document. Crossed-off items are shipped. New ideas go at the bottom of
the relevant section. Keep this file short — link to PR descriptions or
`/Users/rudrapratapmohanty/.claude/plans/` planning notes for detail.

Last updated: 2026-05-27

---

## Shipped

- **Solar System layer** — 8 planets + Sun + Earth's Moon, real-positions
  mode (J2000 ephemeris, Kepler solver), stylized + realistic-scale toggle.
- **Stellar Neighborhood layer** — Sun + ~15 nearby stars, sprite billboards.
- **Galaxy layer** — NASA Milky Way artist concept on a flat disc mesh, alpha
  baked into the texture, particle sparkle on top, Solar System marker on its
  arm, orbits to edge-on. Asset: `public/textures/milky-way-face-on.webp`.
- **Universe layer** — NASA Hubble Ultra Deep Field on an inside-out skybox
  sphere wrapping the camera, clickable Milky Way marker in front. Asset:
  `public/textures/hubble-deep-field.webp`.
- **Multi-scale cross-fade** — Solar ↔ Stellar ↔ Galaxy ↔ Universe with
  ascend-on-zoom-out + marker descent. Per-layer camera poses + OrbitControls.
- **Mobile responsiveness** — HUD, planet info panel (swipe-to-dismiss),
  Explore mode, top button row sizing.
- **Modular architecture** — `CelestialBody` discriminated-union component,
  per-layer files under `src/components/three/layers/`.
- **Cloudflare Workers deploy config** — `open-next.config.ts`, wrangler.

---

## Next up (priority order)

### ~~1. Universe layer — NASA-image treatment~~ ✅ shipped

Replaced procedural sprite shell with an inside-out skybox sphere textured
with NASA's Hubble Ultra Deep Field (1024² WebP, 116 KB, from SVS HUDF
print release). Sphere tilted -π/3 around X so the spherical-UV pole pinch
sits behind the default Universe camera, out of view. Milky Way marker
stays as a billboard sprite in front of the deep field.

### 1. Arm labels on the Galaxy disc

Overlay `<Html>` labels for Norma / Sagittarius / Perseus / Outer / Orion Spur
at known angular positions on the painted disc. Fade in when zoomed close;
hide when zoomed far so they don't compete with the painting at overview.

**Why first:** matches the educational schematic the user originally shared
as reference (image 2). Low effort, low risk — just HTML elements positioned
in 3D with `<Html>` from drei (already used for the Solar System marker).

**Critical files:** `src/components/three/layers/GalaxyLayer.tsx` only.

### 2. Black hole at the galactic center (Sagittarius A*)

Visible when zoomed deep into the Galaxy center. Gravitational-lensing
fragment shader on a small sphere positioned at the bar's center, with the
NASA texture warped behind it. Real "wow" feature.

**Why second:** harder than arm labels (custom lensing shader), but a defining
feature that makes the Galaxy layer feel complete. Reference: the Interstellar
Gargantua / EHT M87 imagery for visual target.

**Critical files:** new `src/components/three/layers/BlackHole.tsx`, new
`src/lib/shaders/blackHole.glsl.ts`, wire into `GalaxyLayer.tsx`.

### 3. More moons + comets

- **Galilean moons** of Jupiter (Io, Europa, Ganymede, Callisto). Well-known
  orbital elements; same Kepler solver as the existing planets.
- **Titan** + Enceladus around Saturn.
- **One or two comets** with eccentric orbits and a procedural dust+ion tail
  that points away from the Sun.

**Why third:** depth in the Solar System layer (the one users spend most
time in), but lower marginal visual impact than 1–2.

**Critical files:** `src/data/bodies.ts`, `src/components/three/CelestialBody.tsx`,
maybe a new `Comet.tsx` for the tail.

### 4. About / Credits panel

Visible UI element listing data + asset sources (NASA Goddard SVS for the
galaxy, Stellarium / Hipparcos for star positions, JPL ephemeris for planets).
Prerequisite for public sharing — the NASA license requires visible attribution.

Right now credits live only in `public/textures/CREDITS.md`.

**Why fourth:** not visually exciting but blocks public launch. Small modal
or footer link.

**Critical files:** new `src/components/ui/CreditsPanel.tsx`, wire into
`page.tsx` or the HUD.

### 5. Performance + production polish

Before shipping publicly:

- Production build profile (`next build` + look at bundle sizes).
- Lighthouse pass; target 90+ on Performance + Best Practices.
- Real-device mobile test (iOS Safari, Android Chrome) — watch for thermal
  throttling on the Galaxy layer (textured disc + particles).
- WebGL context-loss recovery: today the canvas just dies if the context is
  lost; should auto-restart.
- Texture loading flicker — galaxy disc currently snaps in once the WebP
  loads; could fade in over ~200ms.

**Critical files:** `next.config.ts`, `src/components/three/SceneRoot.tsx`
(top-level Canvas), individual layer components.

---

## Polish tier (any time, none blocking)

- **Real planet surface textures** — Mercury, Venus, Mars from NASA. Same
  trick as the galaxy. Earth has one already; the others are placeholders.
- **Saturn ring system** — textured thin disc with the Cassini Division.
- **Asteroid belt** — particle ring between Mars and Jupiter.
- **Click a star in Stellar layer** — show info panel like planets do
  (mass, spectral class, distance, planets if known exoplanets).
- **Stronger Earth atmosphere shader** — the Fresnel rim is there but subtle.
- **Sound design** — ambient drone per layer, subtle UI clicks. Optional.
- **Keyboard shortcuts** — WASD to fly, arrow keys for orbit, number keys 1–4
  for layer jump.
- **URL deep-linking** — `?scale=galaxy&focus=sun` so a view is shareable.
- **Toggleable scale ring** on the Galaxy disc (the 6 kpc ring from the
  reference schematic image 2).
- **Exoplanet markers** in the Stellar layer for confirmed exoplanet host stars.

---

## Explicitly out of scope

- Photoreal ray-traced rendering. We're a stylized real-time WebGL build.
- Full N-body gravity simulation. Kepler-on-rails is enough for visualization.
- VR / WebXR. Not on the roadmap.
- A "spaceship" first-person mode. Orbit camera stays.
- User accounts / saved tours. Static site.

---

## Working notes

- Per-task planning notes live in
  `/Users/rudrapratapmohanty/.claude/plans/` (one file per task; current
  one is `i-want-to-make-ticklish-tiger.md`).
- The Galaxy layer (`src/components/three/layers/GalaxyLayer.tsx`) is the
  most heavily-iterated file in the project — many of its idioms (stable
  uniforms via `useState`, `useEffect`-driven ref mutations for opacity)
  are the reference pattern for new shader-based components.
- NASA asset attribution is required wherever public — see
  `public/textures/CREDITS.md`.
