import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_PROFILE, getProfile, updateProfile, type ProfilePatch } from '../db/db';
import type { Profile } from '../db/types';
import { BUILTIN_TARGETS, customRingTarget, type Target } from '../lib/targets';
import type { Context } from '../lib/summary';

/**
 * Todos los datos en memoria. Para un uso personal (miles de disparos) es
 * más sencillo y rápido que consultar por pantalla.
 */
export function useAll(): Context | undefined {
  return useLiveQuery(async () => {
    const [weapons, pellets, lots, sessions, series, shots, custom] = await Promise.all([
      db.weapons.toArray(),
      db.pellets.toArray(),
      db.lots.toArray(),
      db.sessions.toArray(),
      db.series.toArray(),
      db.shots.toArray(),
      db.targets.toArray(),
    ]);
    const targets: Target[] = [...BUILTIN_TARGETS, ...custom.map((t) => customRingTarget(t.id, t.name, t.rings))];
    return { weapons, pellets, lots, sessions, series, shots, targets };
  });
}

export function useProfile(): Profile {
  return useLiveQuery(() => getProfile(), [], DEFAULT_PROFILE) ?? DEFAULT_PROFILE;
}

/** Como useProfile, pero `undefined` mientras carga, para formularios que lo editan. */
export function useLoadedProfile(): Profile | undefined {
  return useLiveQuery(() => getProfile());
}

export async function saveProfile(patch: ProfilePatch): Promise<void> {
  await updateProfile(patch);
}

export function useOpenSession() {
  return useLiveQuery(async () => {
    const open = await db.sessions.filter((s) => !s.endedAt).toArray();
    return open.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null;
  });
}

export function pelletName(ctx: Context, lotId?: string): string {
  if (!lotId) return 'Sin balín';
  const lot = ctx.lots.find((l) => l.id === lotId);
  const p = lot && ctx.pellets.find((x) => x.id === lot.pelletId);
  return p ? `${p.brand} ${p.model}`.trim() + (lot.lotNumber ? ` · ${lot.lotNumber}` : '') : 'Balín borrado';
}

export function initials(p: Profile): string {
  const src = (p.nickname || p.name || '?').trim();
  return src
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}
