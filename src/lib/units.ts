// Conversiones y fórmulas básicas. Todo el modelo guarda unidades métricas:
// mm, m, m/s, g, J, °C, hPa, bar.

export const GRAMS_PER_GRAIN = 0.0648;

export function grainsToGrams(gr: number): number {
  return gr * GRAMS_PER_GRAIN;
}

export function gramsToGrains(g: number): number {
  return g / GRAMS_PER_GRAIN;
}

/** Energía en boca en julios: E = ½ · m · v², con m en gramos y v en m/s. */
export function muzzleEnergy(massGrams: number, velocityMs: number): number {
  return 0.5 * (massGrams / 1000) * velocityMs * velocityMs;
}

/** Tamaño lineal (mm) a MOA a una distancia en metros. */
export function mmToMoa(sizeMm: number, distanceM: number): number {
  return sizeMm / (distanceM * 0.2909);
}

/** Tamaño lineal (mm) a milirradianes a una distancia en metros. */
export function mmToMrad(sizeMm: number, distanceM: number): number {
  return sizeMm / distanceM;
}

export function moaToMm(moa: number, distanceM: number): number {
  return moa * distanceM * 0.2909;
}

export function mradToMm(mrad: number, distanceM: number): number {
  return mrad * distanceM;
}

export function kmhToMs(kmh: number): number {
  return kmh / 3.6;
}

export function msToKmh(ms: number): number {
  return ms * 3.6;
}

export type AngularUnit = 'moa' | 'mrad';

export function mmToAngular(sizeMm: number, distanceM: number, unit: AngularUnit): number {
  return unit === 'moa' ? mmToMoa(sizeMm, distanceM) : mmToMrad(sizeMm, distanceM);
}

export function angularToMm(value: number, distanceM: number, unit: AngularUnit): number {
  return unit === 'moa' ? moaToMm(value, distanceM) : mradToMm(value, distanceM);
}
