import { describe, expect, it } from 'vitest';
import { caliberInches, gramsToGrains, grainsToGrams, kmhToMs, mmToMoa, mmToMrad, muzzleEnergy } from './units';

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

describe('caliberInches', () => {
  it('usa el nombre habitual de los calibres conocidos', () => {
    expect(caliberInches(4.5)).toBe('.177');
    expect(caliberInches(5.5)).toBe('.22');
    expect(caliberInches(6.35)).toBe('.25');
    expect(caliberInches(9)).toBe('.357');
  });

  it('convierte los demás a milésimas de pulgada', () => {
    expect(caliberInches(4.4)).toBe('.173');
    expect(caliberInches(0)).toBe('');
  });
});
