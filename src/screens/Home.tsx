import { useLiveQuery } from 'dexie-react-hooks';
import { getMeta } from '../db/db';
import { LAST_BACKUP_KEY } from '../db/backup';
import { initials, useAll, useOpenSession, useProfile } from '../ui/data';
import { Card, Empty, PhotoView, Stat } from '../ui/components';
import { date, dateTime, int, num, weaponExtras } from '../ui/format';
import { FIRING_ACTIONS, OPTICS, PROPULSION, WEAPON_TYPES } from '../ui/labels';
import { caliberInches } from '../lib/units';
import { isHandgun } from '../lib/weapons';
import { navigate } from '../ui/router';
import { badges, bestGroups, bestScores, shootingStreak, shotCountByWeapon, shotsSince, type Context } from '../lib/summary';
import { profileTags } from '../lib/profile';
import { startSession } from './actions';

const BACKUP_EVERY_DAYS = 30;

export function maintenanceAlerts(ctx: Context): { weaponId: string; text: string }[] {
  const out: { weaponId: string; text: string }[] = [];
  for (const w of ctx.weapons) {
    if (w.archived || !w.maintenanceEveryShots) continue;
    const since = shotsSince(ctx, w.id, w.lastMaintenanceOn);
    if (since >= w.maintenanceEveryShots) {
      out.push({ weaponId: w.id, text: `${w.name}: ${int(since)} disparos desde la última revisión` });
    }
  }
  return out;
}

export function Home() {
  const ctx = useAll();
  const profile = useProfile();
  const open = useOpenSession();
  const lastBackup = useLiveQuery(() => getMeta<string>(LAST_BACKUP_KEY), [], undefined);
  if (!ctx) return null;

  const last = [...ctx.sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  const lastSeries = last ? ctx.series.filter((s) => s.sessionId === last.id) : [];
  const lastShots = lastSeries.reduce((n, s) => n + ctx.shots.filter((x) => x.seriesId === s.id).length, 0);
  const groups = bestGroups(ctx).slice(0, 4);
  const scores = bestScores(ctx)
    .sort((a, b) => b.total / b.shots - a.total / a.shots)
    .slice(0, 3);
  const alerts = maintenanceAlerts(ctx);
  const backupDays = lastBackup ? (Date.now() - new Date(lastBackup).getTime()) / 86400000 : Infinity;
  const needsBackup = ctx.shots.length > 0 && backupDays > BACKUP_EVERY_DAYS;
  const counts = shotCountByWeapon(ctx);
  const allGroups = bestGroups(ctx);
  const best = [...allGroups].sort((a, b) => a.moa - b.moa)[0];
  const streak = shootingStreak(ctx.sessions.map((s) => s.startedAt));
  const earned = badges(ctx).filter((b) => b.earned);
  const weapons = ctx.weapons.filter((w) => !w.archived);
  const facts = profileTags(profile);
  const title = profile.nickname || profile.name || 'Bienvenido';
  const weaponName = (id: string) => ctx.weapons.find((w) => w.id === id)?.name ?? '—';
  const targetName = (id: string) => ctx.targets.find((t) => t.id === id)?.name ?? id;

  return (
    <section className="page">
      <div className="profile-head home-head">
        <PhotoView photoId={profile.coverPhotoId} className="cover" alt="" />
        <button className="btn small edit-profile" onClick={() => navigate('/perfil')}>
          Editar perfil
        </button>
        <button className="avatar-btn" onClick={() => navigate('/perfil')} aria-label="Perfil">
          <PhotoView photoId={profile.avatarPhotoId} className="avatar xl" alt="" fallback={initials(profile)} />
        </button>
      </div>
      <div className="profile-id">
        <h1>{title}</h1>
        {profile.nickname && profile.name && <p className="muted">{profile.name}</p>}
        {profile.club && <p className="profile-club">{profile.club}</p>}
        {profile.bio && <p className="profile-bio">{profile.bio}</p>}
        {facts.length > 0 && (
          <div className="chips">
            {facts.map((f) => (
              <span key={f} className="chip">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="profile-stats">
        <Stat label="disparos" value={int(ctx.shots.length)} />
        <Stat label="sesiones" value={int(ctx.sessions.length)} />
        <Stat label="mejor" value={best ? num(best.moa, 2) : '–'} sub={best ? `MOA a ${num(best.distanceM, 0)} m` : undefined} />
        <Stat label="racha" value={streak.current} sub={`récord ${streak.longest}`} />
      </div>

      {earned.length > 0 && (
        <div className="badge-strip">
          {earned.map((b) => (
            <span key={b.id} className="chip earned" title={b.description}>
              🏅 {b.title}
            </span>
          ))}
        </div>
      )}

      {needsBackup && (
        <Card className="warn" onClick={() => navigate('/equipo')}>
          {lastBackup
            ? `Han pasado ${Math.floor(backupDays)} días desde la última copia de seguridad.`
            : 'Aún no has hecho ninguna copia de seguridad.'}{' '}
          Tus datos solo están en este móvil. Toca para exportar.
        </Card>
      )}

      {alerts.map((a) => (
        <Card key={a.weaponId} className="warn" onClick={() => navigate(`/equipo/arma/${a.weaponId}`)}>
          🔧 {a.text}
        </Card>
      ))}

      <div className="section-head">
        <h2>Mis armas</h2>
        <button className="btn small" onClick={() => navigate('/equipo')}>
          Ver equipo
        </button>
      </div>
      {weapons.length === 0 && <Empty>Añade tus armas en la pestaña Equipo y aparecerán aquí.</Empty>}
      {weapons.map((w) => {
        const wBest = allGroups.filter((g) => g.weaponId === w.id).sort((a, b) => a.moa - b.moa)[0];
        const shots = (w.initialShotCount ?? 0) + (counts.get(w.id) ?? 0);
        const details = [
          WEAPON_TYPES[w.type],
          PROPULSION[w.propulsion],
          w.action && FIRING_ACTIONS[w.action],
          caliberInches(w.caliberMm),
          w.nominalEnergyJ ? `${num(w.nominalEnergyJ)} J` : '',
          OPTICS[w.optics],
        ]
          .filter(Boolean)
          .join(' · ');
        const extras = weaponExtras(w);
        return (
          <Card key={w.id} className="weapon-card mini" onClick={() => navigate(`/equipo/arma/${w.id}`)}>
            <PhotoView photoId={w.photoId} className="weapon-photo" alt={w.name} fallback={isHandgun(w.type) ? '🔫' : '︻デ═一'} />
            <div className="weapon-info">
              <strong>{w.name}</strong>
              {(w.brand || w.model) && <span className="muted">{[w.brand, w.model].filter(Boolean).join(' ')}</span>}
              <span className="muted small">{details}</span>
              {extras && <span className="muted small">{extras}</span>}
              <span className="small">
                {int(shots)} disparos{wBest ? ` · mejor ${num(wBest.moa, 2)} MOA a ${num(wBest.distanceM, 0)} m` : ''}
              </span>
            </div>
          </Card>
        );
      })}

      <h2>Última sesión</h2>
      {last ? (
        <Card onClick={() => navigate(`/sesion/${last.id}`)}>
          <strong>{dateTime(last.startedAt)}</strong> · {last.place}
          <div className="stats-row">
            <Stat label="series" value={lastSeries.length} />
            <Stat label="disparos" value={lastShots} />
            <Stat label="viento" value={last.weather.windSpeedMs !== undefined ? `${num(last.weather.windSpeedMs)} m/s` : '–'} />
          </div>
        </Card>
      ) : (
        <Empty>Todavía no hay sesiones. Empieza registrando tu equipo en la pestaña Equipo.</Empty>
      )}

      <h2>Récords</h2>
      {groups.length === 0 && scores.length === 0 && <Empty>Los récords aparecen al registrar series de 3 disparos o más.</Empty>}
      {groups.map((g) => (
        <Card key={g.seriesId} onClick={() => navigate(`/serie/${g.seriesId}`)}>
          <div className="record">
            <span>
              <strong>{weaponName(g.weaponId)}</strong> · {num(g.distanceM, 0)} m
            </span>
            <span className="big">{num(g.moa, 2)} MOA</span>
          </div>
          <span className="muted">
            {num(g.extremeSpreadMm)} mm centro a centro · {g.shots} disparos · {date(g.date)}
          </span>
        </Card>
      ))}
      {scores.map((s) => (
        <Card key={s.seriesId} onClick={() => navigate(`/serie/${s.seriesId}`)}>
          <div className="record">
            <span>
              <strong>{targetName(s.targetId)}</strong> · {s.shots} disparos
            </span>
            <span className="big">{s.decimalTotal !== null ? num(s.decimalTotal) : s.total}</span>
          </div>
          <span className="muted">{date(s.date)}</span>
        </Card>
      ))}

      {open ? (
        <button className="btn huge" onClick={() => navigate(`/sesion/${open.id}`)}>
          Continuar sesión
        </button>
      ) : (
        <button className="btn huge" onClick={startSession}>
          Nueva sesión
        </button>
      )}
    </section>
  );
}
