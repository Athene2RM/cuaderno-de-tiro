// Copias de seguridad: exportar e importar todo en JSON (fotos incluidas en
// base64) y exportar series y disparos a CSV.

import { db, nowIso, setMeta, TABLES, type CuadernoDB, type TableName } from './db';
import type { Photo } from './types';
import { findTarget, customRingTarget, scoreShot, type Target } from '../lib/targets';

export const BACKUP_FORMAT = 'cuaderno-tiro';
export const BACKUP_VERSION = 1;
export const LAST_BACKUP_KEY = 'lastBackupAt';

interface SerializedPhoto {
  id: string;
  createdAt: string;
  type: string;
  base64: string;
}

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  tables: Partial<Record<TableName, unknown[]>>;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function serializePhoto(p: Photo): Promise<SerializedPhoto> {
  const bytes = new Uint8Array(await p.blob.arrayBuffer());
  return { id: p.id, createdAt: p.createdAt, type: p.blob.type, base64: bytesToBase64(bytes) };
}

export async function exportBackup(database: CuadernoDB = db): Promise<Backup> {
  const tables: Backup['tables'] = {};
  for (const name of TABLES) {
    if (name === 'photos') {
      const photos = await database.photos.toArray();
      tables.photos = await Promise.all(photos.map(serializePhoto));
    } else if (name === 'meta') {
      // El registro de la última copia no viaja en la copia.
      tables.meta = (await database.meta.toArray()).filter((m) => m.key !== LAST_BACKUP_KEY);
    } else {
      tables[name] = await database.table(name).toArray();
    }
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: nowIso(), tables };
}

export function validateBackup(data: unknown): Backup {
  const b = data as Backup;
  if (!b || b.format !== BACKUP_FORMAT || typeof b.tables !== 'object') {
    throw new Error('El archivo no es una copia de Cuaderno de tiro.');
  }
  if (b.version > BACKUP_VERSION) {
    throw new Error('La copia es de una versión más nueva de la app. Actualiza la app antes de importarla.');
  }
  return b;
}

/** Sustituye todos los datos por los de la copia. */
export async function importBackup(data: unknown, database: CuadernoDB = db): Promise<void> {
  const backup = validateBackup(data);
  const photos = ((backup.tables.photos ?? []) as SerializedPhoto[]).map(
    (p): Photo => ({ id: p.id, createdAt: p.createdAt, blob: new Blob([base64ToBytes(p.base64)], { type: p.type }) }),
  );
  await database.transaction('rw', TABLES.map((t) => database.table(t)), async () => {
    for (const name of TABLES) {
      const table = database.table(name);
      const keep = name === 'meta' ? await database.meta.get(LAST_BACKUP_KEY) : undefined;
      await table.clear();
      const rows = name === 'photos' ? photos : (backup.tables[name] ?? []);
      if (rows.length) await table.bulkPut(rows);
      if (keep) await database.meta.put(keep);
    }
  });
}

export async function markBackupDone(database: CuadernoDB = db): Promise<void> {
  await setMeta(LAST_BACKUP_KEY, nowIso(), database);
}

function csvCell(v: unknown): string {
  if (v === undefined || v === null) return '';
  const s = String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

/** Un CSV con un disparo por fila y todas las condiciones de su serie y sesión. */
export async function exportShotsCsv(database: CuadernoDB = db): Promise<string> {
  const [sessions, series, shots, weapons, pellets, lots, customTargets] = await Promise.all([
    database.sessions.toArray(),
    database.series.toArray(),
    database.shots.toArray(),
    database.weapons.toArray(),
    database.pellets.toArray(),
    database.lots.toArray(),
    database.targets.toArray(),
  ]);
  const custom: Target[] = customTargets.map((t) => customRingTarget(t.id, t.name, t.rings));
  const byId = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));
  const sessionMap = byId(sessions);
  const weaponMap = byId(weapons);
  const pelletMap = byId(pellets);
  const lotMap = byId(lots);
  const seriesMap = byId(series);

  const header = [
    'sesion_inicio', 'lugar', 'serie_id', 'arma', 'balin', 'lote', 'distancia_m', 'diana', 'posicion', 'apoyo',
    'viento_ms', 'rafagas_ms', 'viento_reloj', 'constancia_viento', 'temperatura_c', 'humedad_pct', 'presion_hpa', 'luz',
    'orden', 'x_mm', 'y_mm', 'puntuacion', 'puntuacion_decimal', 'velocidad_ms', 'fallido', 'tiron', 'primer_frio',
  ];
  const rows: unknown[][] = [header];
  const sorted = [...shots].sort((a, b) => {
    const sa = seriesMap.get(a.seriesId)?.createdAt ?? '';
    const sb = seriesMap.get(b.seriesId)?.createdAt ?? '';
    return sa.localeCompare(sb) || a.order - b.order;
  });
  for (const shot of sorted) {
    const s = seriesMap.get(shot.seriesId);
    if (!s) continue;
    const session = sessionMap.get(s.sessionId);
    const weapon = weaponMap.get(s.weaponId);
    const lot = s.lotId ? lotMap.get(s.lotId) : undefined;
    const pellet = lot ? pelletMap.get(lot.pelletId) : undefined;
    const target = findTarget(s.targetId, custom);
    const w = { ...session?.weather, ...s.weather };
    const caliber = pellet?.headSizeMm ?? pellet?.caliberMm ?? weapon?.caliberMm ?? 4.5;
    const score = target && !shot.misfire ? scoreShot(target, shot, caliber) : undefined;
    rows.push([
      session?.startedAt, session?.place, s.id, weapon?.name, pellet ? `${pellet.brand} ${pellet.model}` : '',
      lot?.lotNumber, s.distanceM, target?.name ?? s.targetId, s.position, s.support,
      w.windSpeedMs, w.windGustMs, w.windClock, w.windConstancy, w.temperatureC, w.humidityPct, w.pressureHpa, w.light,
      shot.order, shot.x.toFixed(2), shot.y.toFixed(2), score?.score, score?.decimal, shot.velocityMs,
      shot.misfire ? 1 : 0, shot.flinch ? 1 : 0, shot.coldBore ? 1 : 0,
    ]);
  }
  return csv(rows);
}
