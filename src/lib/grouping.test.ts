import { describe, expect, it } from 'vitest';
import { extremeSpread, groupMetrics, median, outsideToCenterSpread, sampleSd, toAngular } from './grouping';

describe('estadística básica', () => {
  it('desviación típica muestral', () => {
    expect(sampleSd([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(sampleSd([5])).toBe(0);
  });

  it('mediana par e impar', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe('agrupación', () => {
  // Cuadrado de 10 mm de lado centrado en (2, -1).
  const square = [
    { x: -3, y: 4 },
    { x: 7, y: 4 },
    { x: 7, y: -6 },
    { x: -3, y: -6 },
  ];

  it('PMI y desplazamiento', () => {
    const m = groupMetrics(square)!;
    expect(m.mpi.x).toBeCloseTo(2);
    expect(m.mpi.y).toBeCloseTo(-1);
    expect(m.mpiOffset).toBeCloseTo(Math.sqrt(5));
  });

  it('dispersión extrema centro a centro es la diagonal', () => {
    expect(extremeSpread(square)).toBeCloseTo(10 * Math.SQRT2);
  });

  it('radio medio y CEP 50 en un cuadrado son la semidiagonal', () => {
    const m = groupMetrics(square)!;
    expect(m.meanRadius).toBeCloseTo(5 * Math.SQRT2);
    expect(m.cep50).toBeCloseTo(5 * Math.SQRT2);
  });

  it('separa dispersión horizontal y vertical', () => {
    const vertical = [
      { x: 0, y: -5 },
      { x: 0, y: 0 },
      { x: 0, y: 5 },
    ];
    const m = groupMetrics(vertical)!;
    expect(m.sdX).toBe(0);
    expect(m.sdY).toBeCloseTo(5);
  });

  it('un solo disparo no tiene dispersión', () => {
    const m = groupMetrics([{ x: 1, y: 1 }])!;
    expect(m.extremeSpread).toBe(0);
    expect(m.meanRadius).toBe(0);
    expect(m.sdX).toBe(0);
  });

  it('sin disparos devuelve null', () => {
    expect(groupMetrics([])).toBeNull();
  });

  it('bordes exteriores a centro a centro', () => {
    expect(outsideToCenterSpread(12.5, 4.5)).toBe(8);
    expect(outsideToCenterSpread(3, 4.5)).toBe(0);
  });

  it('convierte a MOA y mrad', () => {
    const m = groupMetrics([
      { x: 0, y: 0 },
      { x: 7.2725, y: 0 },
    ])!;
    // 7,2725 mm a 25 m = 1 MOA; = 0,2909 mrad.
    expect(toAngular(m, 25, 'moa').extremeSpread).toBeCloseTo(1, 6);
    expect(toAngular(m, 25, 'mrad').extremeSpread).toBeCloseTo(0.2909, 6);
  });
});
