// Orden manual de las armas y datos de su ficha.

import type { WeaponType } from '../db/types';

/** Pistolas y revólveres: se disparan a una o dos manos y usan dianas de pistola. */
export function isHandgun(type?: WeaponType): boolean {
  return type === 'pistola' || type === 'revolver';
}

interface Sortable {
  id: string;
  name: string;
  sortOrder?: number;
  archived?: boolean;
}

/**
 * Ordena las armas según el orden elegido a mano. Las que aún no tienen
 * posición (creadas antes de existir el orden, o nuevas) van detrás, por nombre.
 */
export function sortWeapons<T extends Sortable>(weapons: readonly T[]): T[] {
  const pos = (w: T) => w.sortOrder ?? Infinity;
  return [...weapons].sort((a, b) => pos(a) - pos(b) || a.name.localeCompare(b.name));
}

/** Como `sortWeapons`, pero con las archivadas al final. */
export function sortWeaponsArchivedLast<T extends Sortable>(weapons: readonly T[]): T[] {
  return sortWeapons(weapons).sort((a, b) => Number(!!a.archived) - Number(!!b.archived));
}

/**
 * Mueve un arma una posición arriba (-1) o abajo (+1) dentro de la lista ya
 * ordenada y devuelve la nueva posición de cada arma, numeradas desde 0.
 */
export function moveWeapon<T extends Sortable>(sorted: readonly T[], id: string, delta: -1 | 1): Map<string, number> {
  const ids = sorted.map((w) => w.id);
  const i = ids.indexOf(id);
  const j = i + delta;
  if (i >= 0 && j >= 0 && j < ids.length) [ids[i], ids[j]] = [ids[j], ids[i]];
  return new Map(ids.map((x, k) => [x, k]));
}

/** Posición para un arma nueva: detrás de todas las que ya tienen orden. */
export function nextSortOrder(weapons: readonly Sortable[]): number {
  return weapons.reduce((max, w) => Math.max(max, (w.sortOrder ?? -1) + 1), 0);
}

export const MAX_ACCESSORY_LENGTH = 60;

/** Añade un complemento escrito a mano, sin repetir ni dejar vacíos. */
export function addAccessory(list: readonly string[], text: string): string[] {
  const t = text.trim().replace(/\s+/g, ' ').slice(0, MAX_ACCESSORY_LENGTH);
  if (!t || list.some((x) => x.toLowerCase() === t.toLowerCase())) return [...list];
  return [...list, t];
}
