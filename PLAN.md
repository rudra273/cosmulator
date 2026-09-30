# Cosmulator — Project Roadmap

Living document. Crossed-off items are shipped. New ideas go at the bottom of
the relevant section. Keep this file short — link to PR descriptions or
`/Users/rudrapratapmohanty/.claude/plans/` planning notes for detail.

Last updated: 2026-09-30

---

## Shipped

- **Solar System layer** — 8 planets + Sun + Earth's Moon, real-positions
  mode (J2000 ephemeris, Kepler solver), stylized + realistic-scale toggle.
- **Stellar Neighborhood layer** — Sun + ~15 nearby stars, sprite billboards.
- **Galaxy layer** — NASA Milky Way artist concept on a flat disc mesh, alpha
  baked into the texture, particle sparkle on top, Solar System marker on its
  arm, orbits to edge-on, arm labels (Norma / Sagittarius / Perseus / Outer /
  Orion Spur) rotating with the disc, **Sagittarius A\* black hole** at the
  galactic center with a stylized event-horizon + photon-ring + accretion-
  glow shader. Asset: `public/textures/milky-way-face-on.webp`.
- **Universe layer** — NASA Hubble Ultra Deep Field on an inside-out skybox
  sphere wrapping the camera, clickable Milky Way marker in front. Asset:
  `public/textures/hubble-deep-field.webp`.
- **Multi-scale transitions** — Solar ↔ Stellar ↔ Galaxy ↔ Universe with
  anchor-matched handoffs (see Phase 0/1 below).
- **Stellar background field** — ~200 colored point-cloud dots with real
  stellar-class color distribution (M dwarfs dominate, O/B rare) fills the
  Stellar Neighborhood layer between the named labeled stars, so the layer
  reads as a real neighborhood rather than a sparse diagram.
- **About / Credits panel** — `ABOUT` button in the HUD top-right cluster
  (next to SYSTEMS) opens a glass-panel sheet with NASA / ESA / STScI
  image attribution, data sources, library credits, and a link to NASA's
  media usage guidelines. Mutually exclusive with the planet info panel.
  Mobile bottom-sheet with swipe-to-dismiss; desktop right card.
  Components: `src/components/ui/CreditsPanel.tsx`.
- **Mobile responsiveness** — HUD, planet info panel (swipe-to-dismiss),
  Explore mode, top button row sizing.
- **Modular architecture** — `CelestialBody` discriminated-union component,
  per-layer files under `src/components/three/layers/`.
- **Cloudflare Workers deploy config** — `open-next.config.ts`, wrangler.

---

## Beyond the Solar System — rebuild plan (2026-09-30)

The Solar layer is now mostly correct; everything above it is not. Root
cause: every layer is an independent diagram with its own invented scale, so
nothing lines up between layers and nothing is anchored to real data.

### Audit — what is wrong today

**Transitions**
- Descend Galaxy → Stellar snaps the camera to the Stellar pose while the
  galaxy is still fading out; each layer is centred on its own origin, so for
  ~2 s the user stares at Sgr A* instead of the Sun.
- Ascend Stellar → Galaxy shrinks the Sun at the origin while the galaxy fades
  in centred on the same origin — the Sun visually *becomes* the galactic
  centre instead of the Orion Spur marker. Camera dolly is a linear lerp
  between fixed poses; the 0.15 shrink is arbitrary.
- Wheel momentum chains layers: one fast scroll goes Solar → Stellar → Galaxy.
- Solar layer has no opacity, so Stellar → Solar pops.
- Warp streaks read as "flying forward", not "zooming out".
- `useCrossfade` calls `setState` every rAF for 1.8 s (re-renders all layers).

**Stellar Neighborhood** — invented positions (Vega looks closer than
α Cen; Deneb at 2,600 ly sits beside Sirius), random directions, 200 square
background points, stars not clickable, HUD calibration disagrees with labels,
no heliopause / Voyager / Oort bridge from 50 AU to light-years.

**Galaxy** — 800 px texture, luminance-derived alpha kills faint arms; arm
labels + Sun marker + 8k sparkle particles use a procedural spiral that does
not match the painted arms; Sgr A* drawn ~2,100 ly wide; disc spins once per
~5 min unrelated to sim time; completely flat; disc ≈ 71k ly radius and Sun at
≈ 32k ly (real ~50k / ~26k); no LMC/SMC, globulars, nebulae.

**Universe** — HUDF (a pencil beam of 13-Gyr-old galaxies) stretched over the
whole sky at 1024 px; Milky Way is an orange blob indistinguishable from the
background; jumps from 10⁵ ly straight to 10⁹ ly — no Local Group, Laniakea
or cosmic web.

### Phase 0 — One scale model (foundation) — ✅ core shipped
- `src/data/scales.ts`: layer order, light-years per scene unit per layer,
  and **anchors** (the object two adjacent layers share: Sun ↔ Sun,
  Sun ↔ Orion Spur marker, Milky Way ↔ Milky Way). HUD readout and transitions
  read from here — no per-file constants.
- Real catalogs (HYG, McConnachie 2012 Local Group, 2MRS slice) land with
  their phases below, with credits. Stellar + Universe LY_PER_UNIT are
  placeholders until then.
- Tests: `tests/scale-transition.test.cjs` (anchor continuity, units).
- Files: `src/data/scales.ts`, `src/data/galaxy.ts`, `src/lib/scale-transition.ts`.

### Phase 1 — Transition engine — ✅ core shipped
- Anchor-matched handoff: during a transition the outgoing layer is rendered
  in the incoming layer's coordinates (positioned at the shared anchor,
  scaled so the view is identical at t = 0). No cut, no jump to origin.
- Log-distance camera interpolation (constant perceived zoom speed), target
  glides from anchor to the new layer's centre.
- Descend flies to the clicked marker (fixes the Sgr A* bug).
- Wheel detent: ascend only arms after ~400 ms of wheel idle in a new layer.
- Galaxy spin removed (real period 230 Myr) so anchors are stable.
- Warp streaks dropped; HTML labels hidden mid-transition.
- Engine: `src/components/three/layers/useScaleTransition.ts`.
- Follow-ups: Solar `uOpacity` (it still scales without fading), drive the
  fade from a ref instead of React state, and `usePublishDistance` in the
  Solar layer was seen reporting 0 (cause not yet confirmed).

### Phase 2 — Real Stellar Neighborhood + "star level" — 🟡 in progress
Done:
- 58 real stars (`src/data/stars.ts`): J2000 RA/Dec → galactic → scene,
  aligned with the Galaxy layer (galactic north up, toward Sagittarius =
  toward Sgr A*); log-compressed radius (`stellarRadius`, 450·log10(1+ly)).
- Sprite size from absolute magnitude, colour from spectral class.
- Constellation figures (Orion, Big Dipper, Southern Cross, Summer / Winter
  Triangles) and 10 / 100 / 1,000 ly rings, each toggleable in the HUD.
- Round shader-point background field, log-uniform in distance and
  flattened to the galactic plane (decorative, not a catalog).
- Click a star → camera flies to it + `StarInfoPanel` (distance, when the
  light left, luminosity, size vs Sun, known planets).
- HUD readout inverts the log compression. Tests: `tests/stellar.test.cjs`.
- Planet-system diagram in the star card for 10 hosts (`src/data/exoplanets.ts`):
  animated orbits, habitable zone from bolometric luminosity, Mercury's
  orbit for scale; data checked against Kepler's third law in tests.
- Oort Cloud shell (0.03–1.6 ly) around the Sun, shown with the rings.

- 8,714 naked-eye HYG stars (V ≤ 6.5) as the background field: 8 bytes
  per star, `public/data/hyg-naked-eye.bin` ≈ 70 KB, fetched once;
  `scripts/build-star-catalog.mjs` regenerates it. CC BY-SA 4.0 credit in
  `public/data/CREDITS.md` and the About panel.
- Solar layer: heliopause ring (~120 AU) and Voyager 1/2 at their real
  directions, moving with the simulation date (`src/lib/heliosphere.ts`).

- Verified in headless Chrome (desktop 1280×800 and phone 390×844):
  full zoom loop Solar → Universe → Solar, star cards, no console errors.
- HUD readout in the Stellar layer describes the log view (or the focused
  star's real distance) instead of a meaningless camera distance.
- Labels fade out while pulling back; portrait screens get a wider FOV
  above the Solar layer so the whole galaxy fits on a phone.

### Phase 3 — Galaxy rebuild — 🟡 in progress
Done:
- NASA/JPL-Caltech/R. Hurt face-on illustration (PIA10748): 2048 px WebP
  (215 KB) on desktop, 1024 px (48 KB) on phones; alpha from brightness in
  the shader, plus the missing linear→sRGB conversion (the old disc, star
  sprites and Sgr A* all rendered too dark without it).
- Scale measured from the image via its Wikimedia annotation: ~135,600 ly
  across, Sun on the Orion Spur ~26,150 ly from Sgr A*; arm names at the
  annotation's anchors (`src/data/galaxy.ts`).
- Sparkle sampled from the texture's bright arm pixels; 3D bulge cloud
  along the bar; camera may orbit below the disc.
- Sgr A* shrunk to a symbol. ω Cen, 47 Tuc, M13, Carina and Eagle nebulae,
  LMC, SMC and the Sagittarius Dwarf at real l/b/distance.

Still to do:
- Click-in S-star orbit view around Sgr A* (S2, 16 yr).
- Rotation tied to sim time + the Sun's galactic orbit line.
- Stellar halo / full globular cluster population.

### Phase 4 — Replace "Universe" with three layers — 🟡 in progress
1. ✅ Local Group (`localGroup` layer, 1,000 ly/unit): Milky Way at true size
   (the Galaxy layer's disc, so the handoff is exact), Andromeda and
   Triangulum as discs tilted to their measured inclinations (artwork
   illustrative), 18 dwarfs at real l/b/distance (McConnachie 2012).
   Tests check RA/Dec ↔ l/b agreement and disc inclinations.
2. ✅ Cosmic web (`cosmicWeb` layer, 200,000 ly/unit): 33,566 2MRS galaxies
   (cz ≤ 12,000 km/s, ~560 Mly; 201 KB), Virgo / Norma (Great Attractor) /
   Perseus / Coma / Shapley labels, 100–500 Mly rings, Zone of Avoidance and
   Laniakea notes. Point size capped in the shared shader.
3. Observable Universe (46.5 Gly): Planck CMB shell, look-back-time ruler;
   HUDF as a clickable "window", not wallpaper.

### Phase 5 — Navigation
Clickable scale ladder + live scale bar, keys 1–7, URL deep links, one
unified info panel (planets / stars / galaxies).

### Phase 6 — Performance + production polish
WebGL context-loss recovery, lazy per-layer assets with texture fade-in,
real-device mobile pass, Lighthouse 90+, credits for every new dataset.

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
