import { db, getMeta, getProfile, newId, nowIso, setMeta } from '../db/db';
import type { Series, Session } from '../db/types';
import { navigate } from '../ui/router';

export const LAST_SERIES_KEY = 'lastSeriesDefaults';

export type SeriesDefaults = Pick<
  Series,
  'weaponId' | 'lotId' | 'distanceM' | 'targetId' | 'plannedShots' | 'position' | 'support'
>;

export async function startSession(): Promise<void> {
  const profile = await getProfile();
  const session: Session = {
    id: newId(),
    startedAt: nowIso(),
    place: profile.club || 'La finca',
    notes: '',
    weather: {},
  };
  await db.sessions.put(session);
  navigate(`/sesion/${session.id}`);
}

export async function getSeriesDefaults(): Promise<Partial<SeriesDefaults>> {
  return (await getMeta<SeriesDefaults>(LAST_SERIES_KEY)) ?? {};
}

export async function rememberSeriesDefaults(s: Series): Promise<void> {
  const d: SeriesDefaults = {
    weaponId: s.weaponId,
    lotId: s.lotId,
    distanceM: s.distanceM,
    targetId: s.targetId,
    plannedShots: s.plannedShots,
    position: s.position,
    support: s.support,
  };
  await setMeta(LAST_SERIES_KEY, d);
}
