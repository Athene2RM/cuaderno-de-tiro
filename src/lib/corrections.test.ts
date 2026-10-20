import { describe, expect, it } from 'vitest';
import { suggestClicks } from './corrections';

describe('clics sugeridos', () => {
  it('PMI bajo y a la izquierda pide subir y derecha', () => {
    // 1/4 MOA a 25 m ≈ 1,818 mm por clic
    const c = suggestClicks({ x: -3.64, y: -7.27 }, 25, 0.25, 'moa')!;
    expect(c).toEqual({ up: 4, right: 2 });
  });

  it('en mrad', () => {
    // 0,1 mrad a 30 m = 3 mm por clic
    expect(suggestClicks({ x: 9, y: 6 }, 30, 0.1, 'mrad')).toEqual({ up: -2, right: -3 });
  });

  it('centrado no pide clics', () => {
    expect(suggestClicks({ x: 0.1, y: -0.1 }, 25, 0.25, 'moa')).toEqual({ up: 0, right: 0 });
  });

  it('sin valor de clic no sugiere nada', () => {
    expect(suggestClicks({ x: 1, y: 1 }, 25, 0, 'moa')).toBeNull();
  });
});
