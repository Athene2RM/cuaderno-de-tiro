import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { CuadernoDB, setMeta } from './db';
import { exportBackup, exportShotsCsv, importBackup, LAST_BACKUP_KEY } from './backup';

async function seed(db: CuadernoDB) {
  await db.weapons.put({
    id: 'w1', name: 'La Negra', brand: 'Weihrauch', model: 'HW100', type: 'carabina', propulsion: 'pcp',
    caliberMm: 4.5, optics: 'visor', createdAt: '2026-10-01T00:00:00Z',
  });
  await db.sessions.put({ id: 's1', startedAt: '2026-10-01T10:00:00Z', place: 'La finca', notes: '', weather: { windSpeedMs: 2 } });
  await db.series.put({
    id: 'r1', sessionId: 's1', weaponId: 'w1', distanceM: 10, targetId: 'issf-rifle-10', plannedShots: 2,
    position: 'banco', support: 'reposo', createdAt: '2026-10-01T10:05:00Z',
  });
  await db.shots.bulkPut([
    { id: 'x1', seriesId: 'r1', order: 1, x: 0, y: 0 },
    { id: 'x2', seriesId: 'r1', order: 2, x: 2.55, y: 0, flinch: true },
  ]);
  await db.photos.put({ id: 'ph1', createdAt: '2026-10-01T00:00:00Z', blob: new Blob([new Uint8Array([1, 2, 3, 250])], { type: 'image/jpeg' }) });
}

describe('copias de seguridad', () => {
  it('exporta e importa todos los datos, fotos incluidas', async () => {
    const a = new CuadernoDB('backup-a');
    await seed(a);
    await setMeta(LAST_BACKUP_KEY, 'x', a);
    const json = JSON.parse(JSON.stringify(await exportBackup(a)));
    expect(json.tables.meta).toEqual([]);

    const b = new CuadernoDB('backup-b');
    await b.weapons.put({ id: 'old', name: 'Borrar', brand: '', model: '', type: 'pistola', propulsion: 'co2', caliberMm: 4.5, optics: 'abiertas', createdAt: '' });
    await importBackup(json, b);

    expect(await b.weapons.toArray()).toEqual(await a.weapons.toArray());
    expect(await b.shots.count()).toBe(2);
    const photo = await b.photos.get('ph1');
    expect(photo!.blob.type).toBe('image/jpeg');
    expect([...new Uint8Array(await photo!.blob.arrayBuffer())]).toEqual([1, 2, 3, 250]);
  });

  it('rechaza archivos que no son copias', async () => {
    await expect(importBackup({ hola: 1 }, new CuadernoDB('backup-c'))).rejects.toThrow(/no es una copia/);
  });

  it('CSV con un disparo por fila y su puntuación', async () => {
    const d = new CuadernoDB('backup-d');
    await seed(d);
    const lines = (await exportShotsCsv(d)).trim().split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('La Negra');
    expect(lines[1]).toContain(',10,10.9,');
    expect(lines[2]).toContain(',9,9.9,');
  });
});
