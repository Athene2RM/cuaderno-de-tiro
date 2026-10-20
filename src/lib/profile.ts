// Etiquetas del perfil que se muestran en Inicio.

import type { Profile } from '../db/types';

export const MAX_TAG_LENGTH = 40;

/** Etiquetas que salen de los datos del perfil, si no se han escrito a mano. */
export function autoTags(p: Pick<Profile, 'startedShootingOn' | 'dominantHand' | 'dominantEye' | 'shootingGlasses'>): string[] {
  const out: string[] = [];
  if (p.startedShootingOn) out.push(`Tirando desde ${p.startedShootingOn.slice(0, 4)}`);
  if (p.dominantHand) out.push(p.dominantHand === 'zurdo' ? 'Zurdo' : 'Diestro');
  if (p.dominantEye) out.push(`Ojo ${p.dominantEye === 'zurdo' ? 'izquierdo' : 'derecho'}`);
  if (p.shootingGlasses) out.push('Gafas de tiro');
  return out;
}

/** Las etiquetas escritas a mano mandan; sin ellas se usan las automáticas. */
export function profileTags(p: Profile): string[] {
  return p.tags ?? autoTags(p);
}

/** Añade una etiqueta limpia de espacios, sin vacías ni repetidas. */
export function addTag(tags: string[], text: string): string[] {
  const t = text.trim().replace(/\s+/g, ' ').slice(0, MAX_TAG_LENGTH);
  if (!t || tags.some((x) => x.toLowerCase() === t.toLowerCase())) return tags;
  return [...tags, t];
}
