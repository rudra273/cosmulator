// Flat ΛCDM distances and times, integrated numerically. Pure; runs under
// the node test harness. Parameters: Planck 2018 (TT,TE,EE+lowE+lensing),
// H0 = 67.4 km/s/Mpc, Ωm = 0.315, radiation included (Ωr ≈ 9.1e-5).

const H0 = 67.4; // km/s/Mpc
const OMEGA_M = 0.315;
const OMEGA_R = 9.1e-5;
const OMEGA_L = 1 - OMEGA_M - OMEGA_R;
const C_KM_S = 299_792.458;
const MLY_PER_MPC = 3.26156;
// 1/H0 in billions of years: (Mpc in km / H0) seconds → years.
const HUBBLE_TIME_GYR = (3.0856775814913673e19 / H0) / 3.15576e7 / 1e9;

const E = (z: number) => Math.sqrt(OMEGA_M * (1 + z) ** 3 + OMEGA_R * (1 + z) ** 4 + OMEGA_L);

// Integrate in ln(1+z) so high redshifts (the CMB at z ≈ 1100) stay accurate.
function integrate(z: number, f: (z: number) => number, steps = 4000): number {
  const top = Math.log1p(z);
  let sum = 0;
  for (let i = 0; i < steps; i++) {
    const x = ((i + 0.5) / steps) * top;
    const zz = Math.expm1(x);
    sum += f(zz) * (1 + zz);
  }
  return (sum * top) / steps;
}

/** Comoving (present-day) distance to redshift z, in billions of light-years. */
export function comovingDistanceGly(z: number): number {
  return ((C_KM_S / H0) * integrate(z, (zz) => 1 / E(zz)) * MLY_PER_MPC) / 1000;
}

/** How long ago light from redshift z left its source, in billions of years. */
export function lookbackTimeGyr(z: number): number {
  return HUBBLE_TIME_GYR * integrate(z, (zz) => 1 / ((1 + zz) * E(zz)));
}

/** Age of the universe today, in billions of years. */
export function ageOfUniverseGyr(): number {
  return lookbackTimeGyr(1e7);
}

/** Redshift of the cosmic microwave background (last scattering). */
export const CMB_REDSHIFT = 1090;
