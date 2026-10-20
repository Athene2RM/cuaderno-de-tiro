// Clics de visor sugeridos para llevar el PMI al centro.

import type { Point } from './grouping';
import { angularToMm, type AngularUnit } from './units';

export interface ClickCorrection {
  /** Positivo: subir (UP). Negativo: bajar. */
  up: number;
  /** Positivo: derecha (R). Negativo: izquierda. */
  right: number;
}

export function suggestClicks(
  mpi: Point,
  distanceM: number,
  clickValue: number,
  clickUnit: AngularUnit,
): ClickCorrection | null {
  if (!(distanceM > 0) || !(clickValue > 0)) return null;
  const clickMm = angularToMm(clickValue, distanceM, clickUnit);
  // Math.round(-0) da -0; lo normalizamos para que la UI no muestre "-0".
  const r = (v: number) => Math.round(v) || 0;
  return { up: r(-mpi.y / clickMm), right: r(-mpi.x / clickMm) };
}
