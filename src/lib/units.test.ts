import { describe, expect, it } from 'vitest';
import { gramsToGrains, grainsToGrams, kmhToMs, mmToMoa, mmToMrad, muzzleEnergy } from './units';

describe('unidades', () => {
  it('grains y gramos', () => {
    expect(grainsToGrams(8.44)).toBeCloseTo(0.5469, 4);
    expect(gramsToGrains(0.547)).toBeCloseTo(8.441, 3);
  });

  it('energía en boca', () => {
    // 0,547 g a 175 m/s ≈ 8,38 J
    expect(muzzleEnergy(0.547, 175)).toBeCloseTo(8.376, 3);
  });

  it('MOA y mrad', () => {
    expect(mmToMoa(29.09, 100)).toBeCloseTo(1);
    expect(mmToMrad(10, 25)).toBeCloseTo(0.4);
  });

  it('km/h a m/s', () => {
    expect(kmhToMs(36)).toBeCloseTo(10);
  });
});
