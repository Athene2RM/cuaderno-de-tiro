// Resúmenes que cruzan entidades: métricas de una serie, récords, contadores
// e insignias. Funciones puras sobre arrays para poder probarlas sin la base de datos.

import type { Lot, Pellet, Series, Session, Shot, Weapon } from '../db/types';
import { groupMetrics, type GroupMetrics } from './grouping';
import { scoreShot, seriesScore, type SeriesScore, type Target } from './targets';
import { mmToMoa } from './units';

export interface SeriesSummary {
  metrics: GroupMetrics | null;
  score: SeriesScore | null;
  /** Disparos que cuentan: los fallidos no entran en agrupación y puntúan 0. */
  counted: number;
}

export function caliberFor(weapon?: Weapon, pellet?: Pellet): number {
  return pellet?.headSizeMm ?? pellet?.caliberMm ?? weapon?.caliberMm ?? 4.5;
}

export function summarizeSeries(shots: Shot[], target: Target | undefined, caliberMm: number): SeriesSummary {
  const valid = shots.filter((s) => !s.misfire);
  const metrics = groupMetrics(valid);
  const score = target
    ? seriesScore(
        shots.map((s) => (s.misfire ? { score: 0, decimal: 0 } : scoreShot(target, s, caliberMm))),
        target,
      )
    : null;
  return { metrics, score, counted: valid.length };
}

export interface Context {
  weapons: Weapon[];
  pellets: Pellet[];
  lots: Lot[];
  sessions: Session[];
  series: Series[];
  shots: Shot[];
  targets: Target[];
}

export function shotsBySeries(shots: Shot[]): Map<string, Shot[]> {
  const m = new Map<string, Shot[]>();
  for (const s of shots) {
    const list = m.get(s.seriesId);
    if (list) list.push(s);
    else m.set(s.seriesId, [s]);
  }
  for (const list of m.values()) list.sort((a, b) => a.order - b.order);
  return m;
}

export interface BestGroup {
  weaponId: string;
  distanceM: number;
  seriesId: string;
  extremeSpreadMm: number;
  moa: number;
  shots: number;
  date: string;
}

/** Mejor agrupación (menor dispersión extrema, con 3 disparos o más) por arma y distancia. */
export function bestGroups(ctx: Context, minShots = 3): BestGroup[] {
  const bySeries = shotsBySeries(ctx.shots);
  const best = new Map<string, BestGroup>();
  for (const s of ctx.series) {
    const valid = (bySeries.get(s.id) ?? []).filter((x) => !x.misfire);
    if (valid.length < minShots) continue;
    const m = groupMetrics(valid)!;
    const key = `${s.weaponId}|${s.distanceM}`;
    const cur = best.get(key);
    if (!cur || m.extremeSpread < cur.extremeSpreadMm) {
      best.set(key, {
        weaponId: s.weaponId,
        distanceM: s.distanceM,
        seriesId: s.id,
        extremeSpreadMm: m.extremeSpread,
        moa: mmToMoa(m.extremeSpread, s.distanceM),
        shots: valid.length,
        date: s.createdAt,
      });
    }
  }
  return [...best.values()].sort((a, b) => a.moa - b.moa);
}

export interface BestScore {
  targetId: string;
  seriesId: string;
  total: number;
  decimalTotal: number | null;
  shots: number;
  date: string;
}

/** Mejor puntuación por tipo de diana y número de disparos. */
export function bestScores(ctx: Context): BestScore[] {
  const bySeries = shotsBySeries(ctx.shots);
  const lotMap = new Map(ctx.lots.map((l) => [l.id, l]));
  const pelletMap = new Map(ctx.pellets.map((p) => [p.id, p]));
  const weaponMap = new Map(ctx.weapons.map((w) => [w.id, w]));
  const best = new Map<string, BestScore>();
  for (const s of ctx.series) {
    const target = ctx.targets.find((t) => t.id === s.targetId);
    const shots = bySeries.get(s.id) ?? [];
    if (!target || !shots.length) continue;
    const lot = s.lotId ? lotMap.get(s.lotId) : undefined;
    const pellet = lot ? pelletMap.get(lot.pelletId) : undefined;
    const sum = summarizeSeries(shots, target, caliberFor(weaponMap.get(s.weaponId), pellet));
    if (!sum.score) continue;
    const key = `${s.targetId}|${shots.length}`;
    const cur = best.get(key);
    const better =
      !cur ||
      sum.score.total > cur.total ||
      (sum.score.total === cur.total && (sum.score.decimalTotal ?? 0) > (cur.decimalTotal ?? 0));
    if (better) {
      best.set(key, {
        targetId: s.targetId,
        seriesId: s.id,
        total: sum.score.total,
        decimalTotal: sum.score.decimalTotal,
        shots: shots.length,
        date: s.createdAt,
      });
    }
  }
  return [...best.values()];
}

export function shotCountByWeapon(ctx: Context): Map<string, number> {
  const seriesWeapon = new Map(ctx.series.map((s) => [s.id, s.weaponId]));
  const counts = new Map<string, number>();
  for (const sh of ctx.shots) {
    const w = seriesWeapon.get(sh.seriesId);
    if (w) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return counts;
}

/** Disparos registrados desde una fecha (ISO, día incluido) para un arma. */
export function shotsSince(ctx: Context, weaponId: string, sinceIso?: string): number {
  const ids = new Set(
    ctx.series.filter((s) => s.weaponId === weaponId && (!sinceIso || s.createdAt >= sinceIso)).map((s) => s.id),
  );
  return ctx.shots.filter((s) => ids.has(s.seriesId)).length;
}

export function remainingByLot(ctx: Context): Map<string, number> {
  const seriesLot = new Map(ctx.series.map((s) => [s.id, s.lotId]));
  const used = new Map<string, number>();
  for (const sh of ctx.shots) {
    const l = seriesLot.get(sh.seriesId);
    if (l) used.set(l, (used.get(l) ?? 0) + 1);
  }
  return new Map(ctx.lots.map((l) => [l.id, l.quantity - (used.get(l.id) ?? 0)]));
}

/** Balín (por id) con más disparos en un arma. */
export function favoritePellet(ctx: Context, weaponId: string): string | undefined {
  const lotPellet = new Map(ctx.lots.map((l) => [l.id, l.pelletId]));
  const seriesPellet = new Map(
    ctx.series.filter((s) => s.weaponId === weaponId && s.lotId).map((s) => [s.id, lotPellet.get(s.lotId!)]),
  );
  const counts = new Map<string, number>();
  for (const sh of ctx.shots) {
    const p = seriesPellet.get(sh.seriesId);
    if (p) counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  let best: string | undefined;
  let max = 0;
  for (const [p, n] of counts) if (n > max) [best, max] = [p, n];
  return best;
}

function localDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export interface Streak {
  current: number;
  longest: number;
  days: number;
}

/** Racha de días consecutivos con sesión. La actual cuenta si incluye hoy o ayer. */
export function shootingStreak(sessionStarts: string[], now = new Date()): Streak {
  const days = [...new Set(sessionStarts.map(localDay))].map(dayNumber).sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] === days[i - 1] + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  const today = dayNumber(localDay(now.toISOString()));
  const last = days[days.length - 1];
  const current = last !== undefined && today - last <= 1 ? run : 0;
  return { current, longest, days: days.length };
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  earned: boolean;
}

export function badges(ctx: Context): Badge[] {
  const total = ctx.shots.length;
  const groups = bestGroups(ctx);
  const scores = bestScores(ctx);
  const sub1moa25 = groups.some((g) => g.distanceM >= 25 && g.moa < 1 && g.shots >= 5);
  const hundred = scores.some((s) => s.total >= 100);
  return [
    { id: 'first-session', title: 'Primera sesión', description: 'Registrar una sesión', earned: ctx.sessions.length > 0 },
    { id: 'shots-100', title: '100 disparos', description: 'Registrar 100 disparos', earned: total >= 100 },
    { id: 'shots-1000', title: '1.000 disparos', description: 'Registrar 1.000 disparos', earned: total >= 1000 },
    { id: 'shots-10000', title: '10.000 disparos', description: 'Registrar 10.000 disparos', earned: total >= 10000 },
    { id: 'score-100', title: 'Serie de 100', description: 'Primera serie de 100 puntos', earned: hundred },
    {
      id: 'sub-moa-25',
      title: 'Bajo 1 MOA a 25 m',
      description: 'Agrupación de 5 o más disparos bajo 1 MOA a 25 m o más',
      earned: sub1moa25,
    },
    {
      id: 'sessions-50',
      title: '50 sesiones',
      description: 'Registrar 50 sesiones',
      earned: ctx.sessions.length >= 50,
    },
  ];
}
