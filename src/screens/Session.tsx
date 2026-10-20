import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, deleteSession, nowIso } from '../db/db';
import type { Session } from '../db/types';
import { caliberFor, shotsBySeries, summarizeSeries } from '../lib/summary';
import { mmToMoa } from '../lib/units';
import { Card, Empty, Page, Scale, TextInput, confirmAction } from '../ui/components';
import { pelletName, useAll, useOpenSession, useProfile } from '../ui/data';
import { dateTime, fromLocalInput, num, time, toLocalInput } from '../ui/format';
import { POSITIONS } from '../ui/labels';
import { navigate } from '../ui/router';
import { WeatherForm } from '../ui/WeatherForm';
import { startSession } from './actions';
import { useAutosave } from '../ui/autosave';

export function CurrentSession() {
  const open = useOpenSession();
  useEffect(() => {
    if (open) navigate(`/sesion/${open.id}`, true);
  }, [open]);
  if (open === undefined || open) return null;
  return (
    <Page title="Sesión">
      <Empty>No hay ninguna sesión abierta.</Empty>
      <button className="btn huge" onClick={startSession}>
        Nueva sesión
      </button>
    </Page>
  );
}

export function SessionScreen({ id }: { id: string }) {
  const stored = useLiveQuery(() => db.sessions.get(id), [id]);
  const ctx = useAll();
  const profile = useProfile();
  const [draft, setDraft] = useState<Session>();
  const [showWeather, setShowWeather] = useState(false);

  useEffect(() => {
    if (stored && (!draft || draft.id !== stored.id)) {
      setDraft(stored);
      setShowWeather(!stored.endedAt && Object.keys(stored.weather).length === 0);
    }
  }, [stored, draft]);
  useAutosave(draft, (d) => db.sessions.put(d));

  if (stored === undefined || !ctx) return null;
  if (!stored || !draft) return <Page title="Sesión" onBack><Empty>Esta sesión no existe.</Empty></Page>;

  const set = (patch: Partial<Session>) => setDraft({ ...draft, ...patch });
  const series = ctx.series.filter((s) => s.sessionId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const bySeries = shotsBySeries(ctx.shots);
  const isOpen = !draft.endedAt;
  const w = draft.weather;

  const close = async () => {
    const d = { ...draft, endedAt: nowIso() };
    setDraft(d);
    await db.sessions.put(d);
  };

  return (
    <Page
      title={isOpen ? 'Sesión en curso' : 'Sesión'}
      onBack={!isOpen}
      actions={
        <button
          className="icon-btn danger"
          aria-label="Borrar sesión"
          onClick={async () => {
            if (confirmAction('¿Borrar esta sesión con todas sus series y disparos?')) {
              await deleteSession(id);
              navigate('/historial', true);
            }
          }}
        >
          🗑
        </button>
      }
    >
      <p className="muted">
        {dateTime(draft.startedAt)}
        {draft.endedAt && ` – ${time(draft.endedAt)}`} · {draft.place}
      </p>

      <Card>
        <div className="card-head" onClick={() => setShowWeather(!showWeather)}>
          <strong>Meteorología</strong>
          <span className="muted">
            {w.windSpeedMs !== undefined ? `${num(w.windSpeedMs)} m/s` : 'sin viento anotado'}
            {w.windClock ? ` a las ${w.windClock}` : ''}
            {w.temperatureC !== undefined ? ` · ${num(w.temperatureC)} °C` : ''} {showWeather ? '▴' : '▾'}
          </span>
        </div>
        {showWeather && <WeatherForm value={w} onChange={(weather) => set({ weather })} windUnit={profile.prefs.windUnit} />}
      </Card>

      <h2>Series</h2>
      {series.length === 0 && <Empty>Aún no hay series en esta sesión.</Empty>}
      {series.map((s, i) => {
        const weapon = ctx.weapons.find((x) => x.id === s.weaponId);
        const lot = ctx.lots.find((l) => l.id === s.lotId);
        const pellet = lot && ctx.pellets.find((p) => p.id === lot.pelletId);
        const target = ctx.targets.find((t) => t.id === s.targetId);
        const shots = bySeries.get(s.id) ?? [];
        const sum = summarizeSeries(shots, target, caliberFor(weapon, pellet));
        return (
          <Card key={s.id} onClick={() => navigate(`/serie/${s.id}`)}>
            <div className="record">
              <span>
                <strong>
                  {i + 1}. {weapon?.name ?? 'Arma borrada'}
                </strong>{' '}
                · {num(s.distanceM, 0)} m · {POSITIONS[s.position]}
              </span>
              <span className="big">
                {sum.score?.decimalTotal ?? sum.score?.total ?? '–'}
              </span>
            </div>
            <span className="muted">
              {pelletName(ctx, s.lotId)} · {shots.length}/{s.plannedShots} disparos
              {sum.metrics && sum.counted > 1 && ` · MR ${num(mmToMoa(sum.metrics.meanRadius, s.distanceM), 2)} MOA`}
            </span>
          </Card>
        );
      })}

      <button className="btn huge" onClick={() => navigate(`/serie/nueva/${id}`)}>
        Nueva serie
      </button>

      <h2>Detalles</h2>
      <Card>
        <TextInput label="Lugar" value={draft.place} onChange={(place) => set({ place })} />
        <div className="grid2">
          <label className="field">
            <span className="field-label">Inicio</span>
            <input
              type="datetime-local"
              value={toLocalInput(draft.startedAt)}
              onChange={(e) => set({ startedAt: fromLocalInput(e.target.value) ?? draft.startedAt })}
            />
          </label>
          {draft.endedAt && (
            <label className="field">
              <span className="field-label">Fin</span>
              <input
                type="datetime-local"
                value={toLocalInput(draft.endedAt)}
                onChange={(e) => set({ endedAt: fromLocalInput(e.target.value) ?? draft.endedAt })}
              />
            </label>
          )}
        </div>
        <Scale label="Descanso (1 poco – 5 mucho)" value={draft.rest} onChange={(rest) => set({ rest })} />
        <Scale label="Cansancio" value={draft.fatigue} onChange={(fatigue) => set({ fatigue })} />
        <Scale label="Cafeína" value={draft.caffeine} onChange={(caffeine) => set({ caffeine })} />
        <TextInput label="Notas" multiline value={draft.notes} onChange={(notes) => set({ notes })} />
      </Card>

      {isOpen ? (
        <button className="btn huge secondary" onClick={close}>
          Cerrar sesión
        </button>
      ) : (
        <button className="btn secondary" onClick={() => set({ endedAt: undefined })}>
          Reabrir sesión
        </button>
      )}
    </Page>
  );
}

