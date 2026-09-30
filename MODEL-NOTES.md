# Solar-system exploration

- Choose a world in the selector. Its detail card links to its siblings and a camera view of the whole moon system. The outer-system option frames Neptune, Pluto and the Kuiper Belt before the existing zoom-out transition to nearby stars.
- Real distances and real sizes are independent. With both enabled, all dimensions use 150 scene units per AU. Otherwise orbital distances and body sizes are independently exaggerated for visibility. Real distances with exaggerated sizes can put a satellite inside its oversized parent; select both real controls to inspect the physical proportions.
- Compare sizes uses linear diameter ratios, including moons and dwarf planets. It does not represent separation.
- Arrow keys cycle worlds when the scene has focus. Space pauses/resumes; Escape returns to the overview. In the planet rail, arrows/Home/End move focus and Enter selects. Native selectors and date inputs retain their own keyboard behavior.
- Every planet and the Moon show 512 × 256 preview imagery; the inspected body swaps in its full-size maps, keeping GPU memory phone-friendly. Bodies without imagery use procedural surfaces. The inspected body uses a 96-segment sphere, others 48. Screen labels prioritize the selected object and omit overlapping labels. Moons are labeled within their selected system.

## Model and limitations

The Moon uses a precessing low-precision ellipse, including nodal regression and apsidal motion, from [Paul Schlyter’s published model](https://stjarnhimlen.se/comp/ppcomp.html). Its mean rotation is synchronous; orbital eccentricity produces optical libration. Its pole is tilted 6.68° from the orbit normal, opposite the ecliptic normal. The orbit path and camera use the same model. Solar perturbations and physical libration are omitted, so this is not an eclipse prediction tool.

Earth and Moon cast analytic eclipse shadows with angular-disc overlap (umbra, penumbra and annularity). Shadows follow the displayed geometry, so exaggerated modes exaggerate eclipses too. Earth's separate cloud shell shares the eclipse lighting and drifts with simulation time. Atmospheric refraction and red lunar-eclipse scattering are not modeled.

Other satellite radii and periods are rounded from [JPL satellite physical parameters](https://ssd.jpl.nasa.gov/sats/phys_par/) and [mean elements](https://ssd.jpl.nasa.gov/sats/elem/). Phases are illustrative; equatorial planes share the parent’s display pole. Triton’s inclination makes its orbit retrograde. Pluto–Charon is parent-centered, not a barycentric integration.

Ceres, Pluto, Halley and 67P use fixed approximate two-body elements. Comet nuclei use equivalent spherical sizes and illustrative anti-solar tails inside 4 AU. Comet orbits, spin phases and activity are not precision predictions. The Kuiper Belt is a sparse illustrative particle distribution from 30–50 AU, not an object catalog. Background stars are decorative.

Sources: [NASA Kuiper Belt facts](https://science.nasa.gov/solar-system/kuiper-belt/facts/), [NASA comet fact sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/cometfact.html), [NASA Pluto and dwarf planets](https://science.nasa.gov/dwarf-planets/).
