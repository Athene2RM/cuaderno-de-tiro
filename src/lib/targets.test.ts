import { describe, expect, it } from 'vitest';
import { customRingTarget, findTarget, scoreShot, seriesScore, type Target } from './targets';

const rifle = findTarget('issf-rifle-10')!;
const pistol = findTarget('issf-pistol-10')!;
const ft25 = findTarget('ft-25')!;
const silhouette = findTarget('silhouette')!;
const CAL = 4.5;

describe('ISSF carabina 10 m', () => {
  it('centro perfecto es 10,9', () => {
    expect(scoreShot(rifle, { x: 0, y: 0 }, CAL)).toEqual({ score: 10, decimal: 10.9 });
  });

  it('balín tocando la línea del 10 es 10,0', () => {
    // radio del 10 (0,25) + radio del balín (2,25)
    expect(scoreShot(rifle, { x: 2.5, y: 0 }, CAL)).toEqual({ score: 10, decimal: 10 });
  });

  it('justo fuera del 10 es 9,9', () => {
    expect(scoreShot(rifle, { x: 2.55, y: 0 }, CAL)).toEqual({ score: 9, decimal: 9.9 });
  });

  it('las décimas son de 0,25 mm', () => {
    expect(scoreShot(rifle, { x: 0, y: 1.0 }, CAL).decimal).toBe(10.6);
  });

  it('el balín que toca el anillo 1 puntúa 1', () => {
    // radio del 1 = 22,75; tocando = 22,75 + 2,25 = 25
    expect(scoreShot(rifle, { x: 25, y: 0 }, CAL).score).toBe(1);
    expect(scoreShot(rifle, { x: 25.1, y: 0 }, CAL)).toEqual({ score: 0, decimal: 0 });
  });

  it('impacto diagonal usa la distancia radial', () => {
    // 3 y 4 → 5 mm del centro: 5 − 2,25 = 2,75 → dentro del 9 (radio 2,75)
    expect(scoreShot(rifle, { x: 3, y: 4 }, CAL)).toEqual({ score: 9, decimal: 9 });
  });
});

describe('ISSF pistola 10 m', () => {
  it('centro es 10,9 y el 10 llega a 8 mm', () => {
    expect(scoreShot(pistol, { x: 0, y: 0 }, CAL)).toEqual({ score: 10, decimal: 10.9 });
    expect(scoreShot(pistol, { x: 0, y: -8 }, CAL)).toEqual({ score: 10, decimal: 10 });
    expect(scoreShot(pistol, { x: 0, y: -8.1 }, CAL).score).toBe(9);
  });

  it('las décimas son de 0,8 mm', () => {
    expect(scoreShot(pistol, { x: 4, y: 0 }, CAL).decimal).toBe(10.5);
  });
});

describe('Field Target', () => {
  it('abate solo si el balín pasa limpio por la zona', () => {
    // zona de 25 mm: radio 12,5 − 2,25 = 10,25
    expect(scoreShot(ft25, { x: 10.25, y: 0 }, CAL).score).toBe(2);
    expect(scoreShot(ft25, { x: 10.3, y: 0 }, CAL).score).toBe(1);
  });

  it('no tiene puntuación decimal', () => {
    expect(scoreShot(ft25, { x: 0, y: 0 }, CAL).decimal).toBeNull();
  });

  it('fuera de la chapa es 0', () => {
    expect(scoreShot(ft25, { x: 70, y: 0 }, CAL).score).toBe(0);
  });
});

describe('silueta', () => {
  it('impacto dentro del rectángulo', () => {
    expect(scoreShot(silhouette, { x: 20, y: 25 }, CAL).score).toBe(1);
    expect(scoreShot(silhouette, { x: 22.3, y: 0 }, CAL).score).toBe(0);
  });
});

describe('diana personalizada', () => {
  const t: Target = customRingTarget('custom-1', 'Mía', [
    { diameter: 30, value: 3 },
    { diameter: 10, value: 5 },
    { diameter: 60, value: 1 },
  ]);

  it('ordena los anillos y puntúa', () => {
    expect(t.kind === 'rings' && t.rings.map((r) => r.value)).toEqual([5, 3, 1]);
    expect(scoreShot(t, { x: 0, y: 0 }, CAL).score).toBe(5);
    expect(scoreShot(t, { x: 15, y: 0 }, CAL).score).toBe(3);
    expect(scoreShot(t, { x: 33, y: 0 }, CAL).score).toBe(0);
  });
});

describe('puntuación de serie', () => {
  it('suma total, media y decimal', () => {
    const shots = [
      { x: 0, y: 0 },
      { x: 2.55, y: 0 },
      { x: 3, y: 4 },
    ].map((p) => scoreShot(rifle, p, CAL));
    const s = seriesScore(shots, rifle);
    expect(s.total).toBe(28);
    expect(s.mean).toBeCloseTo(28 / 3);
    expect(s.decimalTotal).toBe(29.8);
    expect(s.max).toBe(30);
  });
});
