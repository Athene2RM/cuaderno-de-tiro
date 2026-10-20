import { describe, expect, it } from 'vitest';
import { addAccessory, moveWeapon, nextSortOrder, sortWeapons, sortWeaponsArchivedLast } from './weapons';

const w = (id: string, name: string, sortOrder?: number, archived?: boolean) => ({ id, name, sortOrder, archived });

describe('sortWeapons', () => {
  it('respeta el orden manual y deja detrás las que no lo tienen, por nombre', () => {
    const list = [w('a', 'Zeta'), w('b', 'Beta', 1), w('c', 'Alfa'), w('d', 'Delta', 0)];
    expect(sortWeapons(list).map((x) => x.id)).toEqual(['d', 'b', 'c', 'a']);
  });

  it('sin orden manual queda por nombre, como antes', () => {
    expect(sortWeapons([w('a', 'Weihrauch'), w('b', 'Air Arms')]).map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('puede poner las archivadas al final sin perder el orden', () => {
    const list = [w('a', 'A', 0, true), w('b', 'B', 1), w('c', 'C', 2)];
    expect(sortWeaponsArchivedLast(list).map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('moveWeapon', () => {
  const sorted = [w('a', 'A'), w('b', 'B'), w('c', 'C')];

  it('intercambia con la vecina y numera todas', () => {
    expect([...moveWeapon(sorted, 'c', -1)]).toEqual([['a', 0], ['c', 1], ['b', 2]]);
    expect([...moveWeapon(sorted, 'a', 1)]).toEqual([['b', 0], ['a', 1], ['c', 2]]);
  });

  it('no sale de los extremos', () => {
    expect([...moveWeapon(sorted, 'a', -1)]).toEqual([['a', 0], ['b', 1], ['c', 2]]);
    expect([...moveWeapon(sorted, 'c', 1)]).toEqual([['a', 0], ['b', 1], ['c', 2]]);
  });
});

describe('nextSortOrder', () => {
  it('va detrás de la última posición usada', () => {
    expect(nextSortOrder([])).toBe(0);
    expect(nextSortOrder([w('a', 'A'), w('b', 'B', 3)])).toBe(4);
  });
});

describe('addAccessory', () => {
  it('limpia espacios y no repite', () => {
    expect(addAccessory([], '  Linterna   láser verde ')).toEqual(['Linterna láser verde']);
    expect(addAccessory(['Bípode'], 'bípode')).toEqual(['Bípode']);
    expect(addAccessory(['Bípode'], '   ')).toEqual(['Bípode']);
  });
});
