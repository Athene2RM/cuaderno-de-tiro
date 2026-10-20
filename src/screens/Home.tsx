import { useLiveQuery } from 'dexie-react-hooks';
import { getMeta } from '../db/db';
import { LAST_BACKUP_KEY } from '../db/backup';
import { initials, useAll, useOpenSession, useProfile } from '../ui/data';
import { Card, Empty, PhotoView, Stat } from '../ui/components';
import { date, dateTime, int, num } from '../ui/format';
import { navigate } from '../ui/router';
import { bestGroups, bestScores, shotsSince, type Context } from '../lib/summary';
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
  const weaponName = (id: string) => ctx.weapons.find((w) => w.id === id)?.name ?? '—';
  const targetName = (id: string) => ctx.targets.find((t) => t.id === id)?.name ?? id;

  return (
    <section className="page">
      <div className="hero" onClick={() => navigate('/perfil')}>
        <PhotoView photoId={profile.avatarPhotoId} className="avatar lg" alt="" fallback={initials(profile)} />
        <div>
          <h1>{profile.nickname || profile.name || 'Bienvenido'}</h1>
          <p className="muted">{profile.club}</p>
        </div>
      </div>

      {open ? (
        <button className="btn huge" onClick={() => navigate(`/sesion/${open.id}`)}>
          Continuar sesión
        </button>
      ) : (
        <button className="btn huge" onClick={startSession}>
          Nueva sesión
        </button>
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
    </section>
  );
}
