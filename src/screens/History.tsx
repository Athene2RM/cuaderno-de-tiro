import { useState } from 'react';
import { Card, Empty, Page, Select, Stat } from '../ui/components';
import { useAll } from '../ui/data';
import { dateTime, num } from '../ui/format';
import { navigate } from '../ui/router';
import { shotsBySeries } from '../lib/summary';

export function History() {
  const ctx = useAll();
  const [q, setQ] = useState('');
  const [weaponId, setWeaponId] = useState<string>();
  if (!ctx) return null;

  const bySeries = shotsBySeries(ctx.shots);
  const needle = q.trim().toLowerCase();
  const rows = [...ctx.sessions]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .map((s) => {
      const series = ctx.series.filter((x) => x.sessionId === s.id);
      const weapons = [...new Set(series.map((x) => x.weaponId))]
        .map((id) => ctx.weapons.find((w) => w.id === id)?.name)
        .filter(Boolean) as string[];
      const shots = series.reduce((n, x) => n + (bySeries.get(x.id)?.length ?? 0), 0);
      return { s, series, weapons, shots };
    })
    .filter((r) => !weaponId || r.series.some((x) => x.weaponId === weaponId))
    .filter(
      (r) =>
        !needle ||
        [r.s.place, r.s.notes, ...r.weapons, dateTime(r.s.startedAt)].some((t) => t?.toLowerCase().includes(needle)),
    );

  return (
    <Page title="Historial">
      <input className="search" placeholder="Buscar por lugar, notas, arma o fecha" value={q} onChange={(e) => setQ(e.target.value)} />
      <Select
        label="Arma"
        value={weaponId}
        onChange={setWeaponId}
        empty="Todas"
        options={ctx.weapons.map((w) => ({ value: w.id, label: w.name }))}
      />
      {rows.length === 0 && <Empty>{ctx.sessions.length ? 'Ninguna sesión coincide.' : 'Aún no hay sesiones.'}</Empty>}
      {rows.map(({ s, series, weapons, shots }) => (
        <Card key={s.id} onClick={() => navigate(`/sesion/${s.id}`)}>
          <div className="record">
            <strong>{dateTime(s.startedAt)}</strong>
            {!s.endedAt && <span className="badge">en curso</span>}
          </div>
          <span className="muted">
            {s.place}
            {weapons.length > 0 && ` · ${weapons.join(', ')}`}
          </span>
          <div className="stats-row">
            <Stat label="series" value={series.length} />
            <Stat label="disparos" value={shots} />
            <Stat label="viento" value={s.weather.windSpeedMs !== undefined ? `${num(s.weather.windSpeedMs)} m/s` : '–'} />
            <Stat label="temp." value={s.weather.temperatureC !== undefined ? `${num(s.weather.temperatureC)} °C` : '–'} />
          </div>
        </Card>
      ))}
    </Page>
  );
}
