// Dianas con sus medidas reales en mm y su puntuación.

import type { Point } from './grouping';

export interface Ring {
  /** Diámetro exterior de la zona en mm. */
  diameter: number;
  value: number;
  /**
   * 'touch': puntúa si el balín toca la línea (regla ISSF).
   * 'clean': el balín debe quedar entero dentro (zona de abatimiento de Field Target).
   */
  gauge?: 'touch' | 'clean';
}

export interface RingTarget {
  id: string;
  name: string;
  kind: 'rings';
  rings: Ring[];
  /** Puntuación decimal ISSF: radio del 10 y ancho de cada anillo. */
  decimal?: { tenRadius: number; ringWidth: number };
  /** Diámetro de la zona negra de puntería, solo para dibujar. */
  blackDiameter?: number;
  /** Tamaño de la cartulina, para dibujar. */
  cardSize: number;
  builtin?: boolean;
}

export interface SilhouetteTarget {
  id: string;
  name: string;
  kind: 'silhouette';
  width: number;
  height: number;
  value: number;
  cardSize: number;
  builtin?: boolean;
}

export type Target = RingTarget | SilhouetteTarget;

export interface ShotScore {
  score: number;
  decimal: number | null;
}

function issfRings(tenDiameter: number, ringWidth: number): Ring[] {
  return Array.from({ length: 10 }, (_, i) => ({
    value: 10 - i,
    diameter: tenDiameter + 2 * ringWidth * i,
  }));
}

function fieldTarget(kz: number): RingTarget {
  return {
    id: `ft-${kz}`,
    name: `Field Target · zona ${kz} mm`,
    kind: 'rings',
    rings: [
      { diameter: kz, value: 2, gauge: 'clean' },
      { diameter: 120, value: 1 },
    ],
    blackDiameter: 120,
    cardSize: 140,
    builtin: true,
  };
}

export const BUILTIN_TARGETS: Target[] = [
  {
    id: 'issf-rifle-10',
    name: 'ISSF carabina aire 10 m',
    kind: 'rings',
    rings: issfRings(0.5, 2.5),
    decimal: { tenRadius: 0.25, ringWidth: 2.5 },
    blackDiameter: 30.5,
    cardSize: 80,
    builtin: true,
  },
  {
    id: 'issf-pistol-10',
    name: 'ISSF pistola aire 10 m',
    kind: 'rings',
    rings: issfRings(11.5, 8),
    decimal: { tenRadius: 5.75, ringWidth: 8 },
    blackDiameter: 59.5,
    cardSize: 170,
    builtin: true,
  },
  fieldTarget(15),
  fieldTarget(25),
  fieldTarget(40),
  {
    id: 'silhouette',
    name: 'Silueta metálica',
    kind: 'silhouette',
    width: 40,
    height: 50,
    value: 1,
    cardSize: 80,
    builtin: true,
  },
];

export function findTarget(id: string, custom: Target[] = []): Target | undefined {
  return BUILTIN_TARGETS.find((t) => t.id === id) ?? custom.find((t) => t.id === id);
}

/** Crea una diana personalizada a partir de diámetros y valores. */
export function customRingTarget(id: string, name: string, rings: Ring[]): RingTarget {
  const sorted = [...rings].sort((a, b) => a.diameter - b.diameter);
  const outer = sorted.length ? sorted[sorted.length - 1].diameter : 50;
  return { id, name, kind: 'rings', rings: sorted, cardSize: Math.ceil(outer * 1.15), blackDiameter: undefined };
}

const EPS = 1e-9;

/** Puntuación de un impacto. `caliberMm` es el diámetro del balín. */
export function scoreShot(target: Target, p: Point, caliberMm: number): ShotScore {
  const rc = caliberMm / 2;
  if (target.kind === 'silhouette') {
    const hit = Math.abs(p.x) - rc <= target.width / 2 + EPS && Math.abs(p.y) - rc <= target.height / 2 + EPS;
    return { score: hit ? target.value : 0, decimal: null };
  }
  const d = Math.hypot(p.x, p.y);
  let score = 0;
  for (const ring of target.rings) {
    const r = ring.diameter / 2;
    const inside = ring.gauge === 'clean' ? d + rc <= r + EPS : d - rc <= r + EPS;
    if (inside && ring.value > score) score = ring.value;
  }
  let decimal: number | null = null;
  if (target.decimal) {
    const { tenRadius, ringWidth } = target.decimal;
    // 10,0 justo cuando el balín toca la línea del 10; cada décima es 1/10 del ancho de anillo.
    const raw = 11 - (d - rc - tenRadius + ringWidth) / ringWidth;
    decimal = score === 0 ? 0 : Math.min(10.9, Math.floor(raw * 10 + EPS) / 10);
  }
  return { score, decimal };
}

export interface SeriesScore {
  total: number;
  mean: number;
  decimalTotal: number | null;
  max: number;
}

export function maxShotValue(target: Target): number {
  return target.kind === 'silhouette' ? target.value : Math.max(...target.rings.map((r) => r.value));
}

export function seriesScore(scores: ShotScore[], target: Target): SeriesScore {
  const total = scores.reduce((s, x) => s + x.score, 0);
  const hasDecimal = !!(target.kind === 'rings' && target.decimal);
  const decimalTotal = hasDecimal ? Math.round(scores.reduce((s, x) => s + (x.decimal ?? 0), 0) * 10) / 10 : null;
  return {
    total,
    mean: scores.length ? total / scores.length : 0,
    decimalTotal,
    max: maxShotValue(target) * scores.length,
  };
}
