import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILE } from '../db/db';
import { addTag, autoTags, profileTags } from './profile';

describe('etiquetas del perfil', () => {
  it('saca las automáticas de los datos del perfil', () => {
    expect(autoTags({ startedShootingOn: '2019-04-01', dominantHand: 'zurdo', dominantEye: 'diestro', shootingGlasses: true })).toEqual([
      'Tirando desde 2019',
      'Zurdo',
      'Ojo derecho',
      'Gafas de tiro',
    ]);
    expect(autoTags({})).toEqual([]);
  });

  it('usa las escritas a mano aunque estén vacías', () => {
    const p = { ...DEFAULT_PROFILE, dominantHand: 'diestro' as const };
    expect(profileTags(p)).toEqual(['Diestro']);
    expect(profileTags({ ...p, tags: ['Cazador de latas'] })).toEqual(['Cazador de latas']);
    expect(profileTags({ ...p, tags: [] })).toEqual([]);
  });

  it('añade sin vacías ni repetidas', () => {
    expect(addTag(['Diestro'], '  café   antes de tirar ')).toEqual(['Diestro', 'café antes de tirar']);
    expect(addTag(['Diestro'], '   ')).toEqual(['Diestro']);
    expect(addTag(['Diestro'], 'diestro')).toEqual(['Diestro']);
    expect(addTag([], 'x'.repeat(60))[0]).toHaveLength(40);
  });
});
