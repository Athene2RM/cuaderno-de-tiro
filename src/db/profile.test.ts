import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { CuadernoDB, getProfile, updateProfile } from './db';

describe('perfil', () => {
  it('dos cambios de ajustes seguidos no se pisan', async () => {
    const db = new CuadernoDB('perfil-a');
    // Sin esperar entre uno y otro, como dos toques rápidos en Ajustes.
    await Promise.all([
      updateProfile({ prefs: { darkBackground: '#000000', theme: 'dark' } }, db),
      updateProfile({ prefs: { accent: '#4caf6a' } }, db),
    ]);
    const p = await getProfile(db);
    expect(p.prefs).toMatchObject({ darkBackground: '#000000', theme: 'dark', accent: '#4caf6a', windUnit: 'ms' });
  });

  it('guardar los datos personales no toca los ajustes', async () => {
    const db = new CuadernoDB('perfil-b');
    await updateProfile({ prefs: { accent: '#a46be8' } }, db);
    await updateProfile({ name: 'Rafa', club: 'Club de tiro' }, db);
    const p = await getProfile(db);
    expect(p.name).toBe('Rafa');
    expect(p.club).toBe('Club de tiro');
    expect(p.prefs.accent).toBe('#a46be8');
    expect(p.id).toBe('me');
  });
});
