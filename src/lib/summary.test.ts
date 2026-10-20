import { describe, expect, it } from 'vitest';
import type { Lot, Pellet, Series, Session, Shot, Weapon } from '../db/types';
import { BUILTIN_TARGETS } from './targets';
import {
  badges,
  bestGroups,
  bestScores,
  favoritePellet,
  remainingByLot,
  shootingStreak,
  shotCountByWeapon,
  summarizeSeries,
  type Context,
} from './summary';

const weapon = (id: string): Weapon => ({
  id, name: id, brand: '', model: '', type: 'carabina', propulsion: 'pcp', caliberMm: 4.5, optics: 'visor', createdAt: '',
});
const pellet = (id: string): Pellet => ({ id, brand: id, model: '', shape: 'domed', caliberMm: 4.5, weightG: 0.547, createdAt: '' });
const lot = (id: string, pelletId: string, quantity: number): Lot => ({ id, pelletId, lotNumber: id, quantity, createdAt: '' });
const series = (id: string, weaponId: string, lotId: string, distanceM: number, createdAt = '2026-10-01T10:00:00Z'): Series => ({
  id, sessionId: 's', weaponId, lotId, distanceM, targetId: 'issf-rifle-10', plannedShots: 5,
  position: 'banco', support: 'reposo', createdAt,
});
const shots = (seriesId: string, pts: [number, number][]): Shot[] =>
  pts.map(([x, y], i) => ({ id: `${seriesId}-${i}`, seriesId, order: i + 1, x, y }));

function ctx(): Context {
  return {
    weapons: [weapon('w1'), weapon('w2')],
    pellets: [pellet('p1'), pellet('p2')],
    lots: [lot('l1', 'p1', 500), lot('l2', 'p2', 250)],
    sessions: [{ id: 's', startedAt: '2026-10-01T10:00:00Z', place: '', notes: '', weather: {} } as Session],
    series: [series('a', 'w1', 'l1', 25), series('b', 'w1', 'l2', 25), series('c', 'w2', 'l1', 10)],
    shots: [
      ...shots('a', [[0, 0], [10, 0], [5, 5]]),
      ...shots('b', [[0, 0], [4, 0], [2, 1], [1, 1]]),
      ...shots('c', [[0, 0], [1, 0]]),
    ],
    targets: BUILTIN_TARGETS,
  };
}

describe('resumen de serie', () => {
  it('los fallidos no entran en la agrupación y puntúan 0', () => {
    const list = shots('x', [[0, 0], [1, 0], [40, 40]]);
    list[2].misfire = true;
    const s = summarizeSeries(list, BUILTIN_TARGETS[0], 4.5);
    expect(s.counted).toBe(2);
    expect(s.metrics!.extremeSpread).toBe(1);
    expect(s.score!.total).toBe(20);
    expect(s.score!.max).toBe(30);
  });
});

describe('récords', () => {
  it('mejor agrupación por arma y distancia, ignorando series cortas', () => {
    const g = bestGroups(ctx());
    expect(g).toHaveLength(1);
    expect(g[0].seriesId).toBe('b');
    expect(g[0].extremeSpreadMm).toBe(4);
  });

  it('mejor puntuación por diana y número de disparos', () => {
    const s = bestScores(ctx());
    expect(s.map((x) => x.shots).sort()).toEqual([2, 3, 4]);
  });
});

describe('contadores', () => {
  it('disparos por arma', () => {
    const c = shotCountByWeapon(ctx());
    expect(c.get('w1')).toBe(7);
    expect(c.get('w2')).toBe(2);
  });

  it('balines restantes por lote', () => {
    const r = remainingByLot(ctx());
    expect(r.get('l1')).toBe(495);
    expect(r.get('l2')).toBe(246);
  });

  it('balín favorito de un arma', () => {
    expect(favoritePellet(ctx(), 'w1')).toBe('p2');
  });
});

describe('racha de días', () => {
  const now = new Date(2026, 9, 20, 18);
  const at = (d: number) => new Date(2026, 9, d, 10).toISOString();

  it('cuenta días consecutivos y la racha actual', () => {
    const s = shootingStreak([at(10), at(11), at(12), at(12), at(19), at(20)], now);
    expect(s).toEqual({ current: 2, longest: 3, days: 5 });
  });

  it('la racha actual se pierde si el último día es anterior a ayer', () => {
    expect(shootingStreak([at(15), at(16)], now).current).toBe(0);
  });

  it('sin sesiones', () => {
    expect(shootingStreak([], now)).toEqual({ current: 0, longest: 0, days: 0 });
  });
});

describe('insignias', () => {
  it('primera sesión ganada, 1.000 disparos no', () => {
    const b = badges(ctx());
    expect(b.find((x) => x.id === 'first-session')!.earned).toBe(true);
    expect(b.find((x) => x.id === 'shots-1000')!.earned).toBe(false);
  });
});
