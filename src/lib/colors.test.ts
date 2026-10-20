import { describe, expect, it } from 'vitest';
import { accentInk, contrastRatio, inkOn, luminance, parseHex, toHex } from './colors';

describe('colores', () => {
  it('lee hex cortos y largos', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
    expect(parseHex('#141916')).toEqual([20, 25, 22]);
    expect(parseHex('rojo')).toBeUndefined();
  });

  it('luminancia y contraste WCAG', () => {
    expect(luminance('#000000')).toBe(0);
    expect(luminance('#ffffff')).toBeCloseTo(1);
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1);
  });

  it('tinta sobre el acento', () => {
    expect(inkOn('#e8a33d')).toBe('#1b1f24');
    expect(inkOn('#dcd9cf')).toBe('#1b1f24');
    expect(inkOn('#2a2f2a')).toBe('#ffffff');
    expect(inkOn('#4a4f48')).toBe('#ffffff');
  });

  it('el acento oscuro no se usa como texto sobre fondo oscuro', () => {
    expect(accentInk('#2a2f2a', '#141916', '#e9ecef')).toBe('#e9ecef');
    expect(accentInk('#dcd9cf', '#141916', '#e9ecef')).toBe('#dcd9cf');
    expect(accentInk('#e8a33d', '#000000', '#ffffff')).toBe('#e8a33d');
  });

  it('normaliza colores calculados', () => {
    expect(toHex('rgb(20, 25, 22)')).toBe('#141916');
    expect(toHex(' #ABC')).toBe('#aabbcc');
    expect(toHex('transparent')).toBeUndefined();
  });
});
