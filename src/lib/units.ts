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

export const MM_PER_INCH = 25.4;

// Calibres habituales con su nombre en pulgadas, que no siempre es la
// conversión exacta (.177 es 4,5 mm; 4,5 mm son 0,1772").
const INCH_CALIBERS: [number, string][] = [
  [4.5, '.177'],
  [5, '.20'],
  [5.5, '.22'],
  [6.35, '.25'],
  [7.62, '.30'],
  [9, '.357'],
  [11.43, '.45'],
  [12.7, '.50'],
];

/** Calibre en formato de pulgadas (.177, .22…) a partir de los mm. */
export function caliberInches(mm: number): string {
  if (!(mm > 0)) return '';
  const known = INCH_CALIBERS.find(([m]) => Math.abs(m - mm) < 0.05);
  if (known) return known[1];
  return (mm / MM_PER_INCH).toFixed(3).replace(/^0/, '');
}
