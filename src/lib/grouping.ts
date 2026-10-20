// Métricas de agrupación a partir de impactos en mm desde el centro de la diana.
// Ejes: x positivo a la derecha, y positivo hacia arriba.

import { mmToMoa, mmToMrad } from './units';

export interface Point {
  x: number;
  y: number;
}

export interface GroupMetrics {
  count: number;
  /** Punto medio de impacto (PMI). */
  mpi: Point;
  /** Distancia del PMI al centro de la diana. */
  mpiOffset: number;
  /** Dispersión extrema centro a centro. */
  extremeSpread: number;
  /** Radio medio respecto al PMI. */
  meanRadius: number;
  /** Desviación típica muestral horizontal y vertical. */
  sdX: number;
  sdY: number;
  /** Radio que contiene la mitad de los impactos, medido desde el PMI. */
  cep50: number;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function mean(values: number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Desviación típica muestral (n − 1). Con menos de dos valores es 0. */
export function sampleSd(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const sq = values.reduce((s, v) => s + (v - m) ** 2, 0);
  return Math.sqrt(sq / (values.length - 1));
}

export function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function meanPoint(points: Point[]): Point {
  return { x: mean(points.map((p) => p.x)), y: mean(points.map((p) => p.y)) };
}

export function extremeSpread(points: Point[]): number {
  let max = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      max = Math.max(max, distance(points[i], points[j]));
    }
  }
  return max;
}

/**
 * Convierte una medida de bordes exteriores (calibre incluido) a centro a centro.
 */
export function outsideToCenterSpread(outsideMm: number, caliberMm: number): number {
  return Math.max(0, outsideMm - caliberMm);
}

export function groupMetrics(points: Point[]): GroupMetrics | null {
  if (points.length === 0) return null;
  const mpi = meanPoint(points);
  const radii = points.map((p) => distance(p, mpi));
  return {
    count: points.length,
    mpi,
    mpiOffset: Math.hypot(mpi.x, mpi.y),
    extremeSpread: extremeSpread(points),
    meanRadius: mean(radii),
    sdX: sampleSd(points.map((p) => p.x)),
    sdY: sampleSd(points.map((p) => p.y)),
    cep50: median(radii),
  };
}

export interface AngularMetrics {
  extremeSpread: number;
  meanRadius: number;
  sdX: number;
  sdY: number;
  cep50: number;
  mpiOffset: number;
}

/** Las métricas lineales expresadas en MOA o mrad a la distancia dada. */
export function toAngular(m: GroupMetrics, distanceM: number, unit: 'moa' | 'mrad'): AngularMetrics {
  const f = unit === 'moa' ? (v: number) => mmToMoa(v, distanceM) : (v: number) => mmToMrad(v, distanceM);
  return {
    extremeSpread: f(m.extremeSpread),
    meanRadius: f(m.meanRadius),
    sdX: f(m.sdX),
    sdY: f(m.sdY),
    cep50: f(m.cep50),
    mpiOffset: f(m.mpiOffset),
  };
}
