// Wet bulb (Stull 2011) and Delta T. Use when: you need Delta T (dry minus wet bulb, deg C) from temperature and humidity.

/** Wet-bulb temperature in deg C from dry bulb (deg C) and RH (%). Valid roughly 5-99% RH, -20..50 C. */
export function wetBulbC(tC: number, rhPct: number): number {
  const rh = rhPct;
  return (
    tC * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(tC + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
    4.686035
  );
}

/** Delta T in deg C: dry bulb minus wet bulb. Use when: checking evaporation / droplet survival. */
export function deltaTC(tC: number, rhPct: number): number {
  return tC - wetBulbC(tC, rhPct);
}
