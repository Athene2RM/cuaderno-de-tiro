import Dexie, { type EntityTable } from 'dexie';
import type {
  CustomTargetRecord,
  Lot,
  Meta,
  Pellet,
  Photo,
  Profile,
  Series,
  Session,
  Shot,
  Weapon,
} from './types';

export class CuadernoDB extends Dexie {
  profile!: EntityTable<Profile, 'id'>;
  weapons!: EntityTable<Weapon, 'id'>;
  pellets!: EntityTable<Pellet, 'id'>;
  lots!: EntityTable<Lot, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  series!: EntityTable<Series, 'id'>;
  shots!: EntityTable<Shot, 'id'>;
  targets!: EntityTable<CustomTargetRecord, 'id'>;
  photos!: EntityTable<Photo, 'id'>;
  meta!: EntityTable<Meta, 'key'>;

  constructor(name = 'cuaderno-tiro') {
    super(name);
    // Solo se indexan los campos por los que se filtra u ordena.
    this.version(1).stores({
      profile: 'id',
      weapons: 'id, name, type, propulsion, archived',
      pellets: 'id, brand, shape, caliberMm',
      lots: 'id, pelletId',
      sessions: 'id, startedAt, endedAt',
      series: 'id, sessionId, weaponId, lotId, distanceM, position, support, targetId, createdAt',
      shots: 'id, seriesId, [seriesId+order]',
      targets: 'id',
      photos: 'id',
      meta: 'key',
    });
  }
}

export const db = new CuadernoDB();

export const TABLES = [
  'profile',
  'weapons',
  'pellets',
  'lots',
  'sessions',
  'series',
  'shots',
  'targets',
  'photos',
  'meta',
] as const;

export type TableName = (typeof TABLES)[number];

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export const DEFAULT_PROFILE: Profile = {
  id: 'me',
  name: '',
  nickname: '',
  club: 'La finca',
  bio: '',
  prefs: {
    theme: 'system',
    highContrast: false,
    accent: '#e8a33d',
    darkBackground: '#101418',
    angularUnit: 'moa',
    windUnit: 'ms',
    weightUnit: 'gr',
  },
};

export async function getProfile(database: CuadernoDB = db): Promise<Profile> {
  const p = await database.profile.get('me');
  return p ? { ...DEFAULT_PROFILE, ...p, prefs: { ...DEFAULT_PROFILE.prefs, ...p.prefs } } : DEFAULT_PROFILE;
}

export type ProfilePatch = Partial<Omit<Profile, 'id' | 'prefs'>> & { prefs?: Partial<Profile['prefs']> };

/**
 * Aplica un cambio parcial al perfil. Lee y escribe en la misma transacción,
 * para que dos cambios seguidos (p. ej. fondo y acento) no se pisen entre sí.
 */
export async function updateProfile(patch: ProfilePatch, database: CuadernoDB = db): Promise<Profile> {
  return database.transaction('rw', database.profile, async () => {
    const p = await getProfile(database);
    const next: Profile = { ...p, ...patch, id: 'me', prefs: { ...p.prefs, ...patch.prefs } };
    await database.profile.put(next);
    return next;
  });
}

export async function getMeta<T>(key: string, database: CuadernoDB = db): Promise<T | undefined> {
  return (await database.meta.get(key))?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown, database: CuadernoDB = db): Promise<void> {
  await database.meta.put({ key, value });
}

/** Borra una serie con sus disparos y su foto. */
export async function deleteSeries(id: string, database: CuadernoDB = db): Promise<void> {
  await database.transaction('rw', [database.series, database.shots, database.photos], async () => {
    const s = await database.series.get(id);
    if (s?.photoId) await database.photos.delete(s.photoId);
    await database.shots.where('seriesId').equals(id).delete();
    await database.series.delete(id);
  });
}

/** Borra una sesión con todas sus series. */
export async function deleteSession(id: string, database: CuadernoDB = db): Promise<void> {
  const ids = await database.series.where('sessionId').equals(id).primaryKeys();
  for (const sid of ids) await deleteSeries(sid, database);
  await database.sessions.delete(id);
}

/** Pide al navegador que no borre los datos por falta de espacio. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
