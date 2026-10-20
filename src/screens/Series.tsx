import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, deleteSeries, newId, nowIso } from '../db/db';
import type { Series, Shot } from '../db/types';
import { suggestClicks } from '../lib/corrections';
import { toAngular } from '../lib/grouping';
import type { Context } from '../lib/summary';
import { caliberFor, summarizeSeries } from '../lib/summary';
import { scoreShot } from '../lib/targets';
import { useAutosave } from '../ui/autosave';
import {
  Card, Empty, NumberInput, Page, PhotoPicker, PhotoView, Segmented, Select, Stat, TextInput, Toggle, confirmAction,
} from '../ui/components';
import { pelletName, useAll, useProfile } from '../ui/data';
import { num } from '../ui/format';
import { options, POSITIONS, SUPPORTS } from '../ui/labels';
import { navigate } from '../ui/router';
import { TargetView } from '../ui/TargetView';
import { WeatherForm } from '../ui/WeatherForm';
import { getSeriesDefaults, rememberSeriesDefaults } from './actions';

function lotOptions(ctx: Context) {
  return ctx.lots.map((l) => ({ value: l.id, label: pelletName(ctx, l.id) }));
}

function SeriesFields({ value, set, ctx }: { value: Series; set: (p: Partial<Series>) => void; ctx: Context }) {
  const weapons = ctx.weapons.filter((w) => !w.archived || w.id === value.weaponId);
  const weapon = ctx.weapons.find((w) => w.id === value.weaponId);
  return (
    <>
      <Select
        label="Arma"
        value={value.weaponId || undefined}
        onChange={(weaponId) => set({ weaponId })}
        options={weapons.map((w) => ({ value: w.id, label: w.name }))}
      />
      <Select
        label="Balín y lote"
        value={value.lotId}
        onChange={(lotId) => set({ lotId })}
        options={lotOptions(ctx)}
        empty="Sin especificar"
      />
      <div className="grid2">
        <NumberInput label="Distancia" unit="m" value={value.distanceM} onChange={(v) => set({ distanceM: v ?? 0 })} step={5} />
        <NumberInput label="Disparos" value={value.plannedShots} onChange={(v) => set({ plannedShots: v ?? 0 })} step={1} />
      </div>
      <Select
        label="Diana"
        value={value.targetId}
        onChange={(targetId) => set({ targetId })}
        options={ctx.targets.map((t) => ({ value: t.id, label: t.name }))}
      />
      <Segmented label="Posición" value={value.position} onChange={(v) => v && set({ position: v })} options={options(POSITIONS)} />
      <Segmented
        label="Apoyo"
        value={value.support}
        onChange={(v) => v && set({ support: v })}
        options={options(SUPPORTS).filter((o) =>
          weapon?.type === 'pistola' ? true : o.value !== 'dosManos' && o.value !== 'unaMano',
        )}
      />
      <div className="grid2">
        <NumberInput label="Clics elevación" allowNegative value={value.clicksElevation} onChange={(v) => set({ clicksElevation: v })} step={1} />
        <NumberInput label="Clics deriva" allowNegative value={value.clicksWindage} onChange={(v) => set({ clicksWindage: v })} step={1} />
      </div>
      {weapon?.propulsion === 'pcp' && (
        <NumberInput label="Presión del depósito al empezar" unit="bar" value={value.tankPressureBar} onChange={(v) => set({ tankPressureBar: v })} />
      )}
    </>
  );
}

export function NewSeries({ sessionId }: { sessionId: string }) {
  const ctx = useAll();
  const defaults = useLiveQuery(getSeriesDefaults);
  const [draft, setDraft] = useState<Series>();

  useEffect(() => {
    if (!ctx || !defaults || draft) return;
    const active = ctx.weapons.filter((w) => !w.archived);
    const weapon = active.find((w) => w.id === defaults.weaponId) ?? active[0];
    const pistol = weapon?.type === 'pistola';
    setDraft({
      id: newId(),
      sessionId,
      weaponId: weapon?.id ?? '',
      lotId: ctx.lots.some((l) => l.id === defaults.lotId)
        ? defaults.lotId
        : ctx.lots.find((l) => ctx.pellets.find((p) => p.id === l.pelletId)?.caliberMm === weapon?.caliberMm)?.id,
      distanceM: defaults.distanceM ?? 10,
      targetId:
        defaults.targetId && ctx.targets.some((t) => t.id === defaults.targetId)
          ? defaults.targetId
          : pistol
            ? 'issf-pistol-10'
            : 'issf-rifle-10',
      plannedShots: defaults.plannedShots ?? 5,
      position: defaults.position ?? (pistol ? 'pie' : 'banco'),
      support: defaults.support ?? (pistol ? 'dosManos' : 'reposo'),
      createdAt: nowIso(),
    });
  }, [ctx, defaults, draft, sessionId]);

  if (!ctx || !draft) return null;
  if (!ctx.weapons.some((w) => !w.archived)) {
    return (
      <Page title="Nueva serie" onBack>
        <Empty>Primero da de alta un arma.</Empty>
        <button className="btn huge" onClick={() => navigate('/equipo/arma/nueva')}>
          Añadir arma
        </button>
      </Page>
    );
  }
  const set = (p: Partial<Series>) => setDraft({ ...draft, ...p });
  const valid = draft.weaponId && draft.distanceM > 0 && draft.plannedShots > 0;
  return (
    <Page title="Nueva serie" onBack>
      <Card>
        <SeriesFields value={draft} set={set} ctx={ctx} />
      </Card>
      <button
        className="btn huge"
        disabled={!valid}
        onClick={async () => {
          const s = { ...draft, createdAt: nowIso() };
          await db.series.put(s);
          await rememberSeriesDefaults(s);
          navigate(`/serie/${s.id}`, true);
        }}
      >
        Empezar a marcar impactos
      </button>
    </Page>
  );
}

export function SeriesScreen({ id }: { id: string }) {
  const stored = useLiveQuery(() => db.series.get(id), [id]);
  const shots = useLiveQuery(() => db.shots.where('seriesId').equals(id).sortBy('order'), [id]);
  const ctx = useAll();
  const profile = useProfile();
  const [draft, setDraft] = useState<Series>();
  const [selected, setSelected] = useState<string>();
  const [step, setStep] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (stored && (!draft || draft.id !== stored.id)) setDraft(stored);
  }, [stored, draft]);
  useAutosave(draft, (d) => db.series.put(d).then(() => rememberSeriesDefaults(d)));

  const weapon = ctx?.weapons.find((w) => w.id === draft?.weaponId);
  const lot = ctx?.lots.find((l) => l.id === draft?.lotId);
  const pellet = lot && ctx?.pellets.find((p) => p.id === lot.pelletId);
  const target = ctx?.targets.find((t) => t.id === draft?.targetId);
  const caliber = caliberFor(weapon, pellet);
  const summary = useMemo(() => summarizeSeries(shots ?? [], target, caliber), [shots, target, caliber]);

  if (stored === undefined || shots === undefined || !ctx) return null;
  if (!stored || !draft) return <Page title="Serie" onBack><Empty>Esta serie no existe.</Empty></Page>;

  const set = (p: Partial<Series>) => setDraft({ ...draft, ...p });
  const sel = shots.find((s) => s.id === selected);
  const unit = profile.prefs.angularUnit;
  const ang = summary.metrics && draft.distanceM > 0 ? toAngular(summary.metrics, draft.distanceM, unit) : null;
  const unitLabel = unit === 'moa' ? 'MOA' : 'mrad';
  const clicks =
    summary.metrics && summary.counted > 0 && weapon?.clickValue
      ? suggestClicks(summary.metrics.mpi, draft.distanceM, weapon.clickValue, weapon.clickUnit ?? 'moa')
      : null;
  const full = shots.length >= draft.plannedShots;

  const addShot = async (p: { x: number; y: number }) => {
    const shot: Shot = { id: newId(), seriesId: id, order: (shots.at(-1)?.order ?? 0) + 1, x: p.x, y: p.y };
    if (shots.length === 0) shot.coldBore = true;
    await db.shots.put(shot);
    setSelected(shot.id);
  };
  const updateShot = (patch: Partial<Shot>) => sel && db.shots.put({ ...sel, ...patch });
  const nudge = (dx: number, dy: number) =>
    sel && updateShot({ x: Math.round((sel.x + dx) * 100) / 100, y: Math.round((sel.y + dy) * 100) / 100 });
  const removeShot = async () => {
    if (!sel) return;
    await db.transaction('rw', db.shots, async () => {
      await db.shots.delete(sel.id);
      const rest = shots.filter((s) => s.id !== sel.id);
      await db.shots.bulkPut(rest.map((s, i) => ({ ...s, order: i + 1 })));
    });
    setSelected(undefined);
  };

  return (
    <Page
      title={`${weapon?.name ?? 'Serie'} · ${num(draft.distanceM, 0)} m`}
      onBack
      actions={
        <button
          className="icon-btn danger"
          aria-label="Borrar serie"
          onClick={async () => {
            if (confirmAction('¿Borrar esta serie y sus disparos?')) {
              await deleteSeries(id);
              navigate(`/sesion/${draft.sessionId}`, true);
            }
          }}
        >
          🗑
        </button>
      }
    >
      <p className="muted">
        {pelletName(ctx, draft.lotId)} · {POSITIONS[draft.position]} · {SUPPORTS[draft.support]}
      </p>

      {target ? (
        <TargetView
          target={target}
          shots={shots}
          caliberMm={caliber}
          mpi={summary.metrics?.mpi}
          selectedId={selected}
          onSelect={setSelected}
          onAdd={full ? undefined : addShot}
        />
      ) : (
        <Empty>La diana de esta serie ya no existe.</Empty>
      )}
      <p className="muted center">
        {full
          ? `Serie completa (${shots.length}/${draft.plannedShots}). Toca un impacto para ajustarlo.`
          : `Toca la diana donde está el impacto ${shots.length + 1} de ${draft.plannedShots}.`}
      </p>

      {sel && (
        <Card className="shot-panel">
          <div className="card-head">
            <strong>Disparo {sel.order}</strong>
            <span className="muted">
              {num(sel.x, 2)}, {num(sel.y, 2)} mm
              {target && !sel.misfire && ` · ${fmtScore(scoreShot(target, sel, caliber))}`}
            </span>
          </div>
          <div className="nudge">
            <span />
            <button onClick={() => nudge(0, step)} aria-label="Arriba">▲</button>
            <span />
            <button onClick={() => nudge(-step, 0)} aria-label="Izquierda">◀</button>
            <button className="step-size" onClick={() => setStep(step === 0.5 ? 0.1 : step === 0.1 ? 1 : 0.5)}>
              {num(step, 1)} mm
            </button>
            <button onClick={() => nudge(step, 0)} aria-label="Derecha">▶</button>
            <span />
            <button onClick={() => nudge(0, -step)} aria-label="Abajo">▼</button>
            <span />
          </div>
          <NumberInput label="Velocidad" unit="m/s" value={sel.velocityMs} onChange={(velocityMs) => updateShot({ velocityMs })} />
          <div className="toggles">
            <Toggle label="Fallido" value={sel.misfire} onChange={(misfire) => updateShot({ misfire })} />
            <Toggle label="Tirón" value={sel.flinch} onChange={(flinch) => updateShot({ flinch })} />
            <Toggle label="Primero en frío" value={sel.coldBore} onChange={(coldBore) => updateShot({ coldBore })} />
          </div>
          <div className="row">
            <button className="btn secondary danger" onClick={removeShot}>
              Borrar disparo
            </button>
            <button className="btn secondary" onClick={() => setSelected(undefined)}>
              Listo
            </button>
          </div>
        </Card>
      )}

      <Card>
        <div className="stats-grid">
          <Stat
            label="puntos"
            value={summary.score ? (summary.score.decimalTotal ?? summary.score.total) : '–'}
            sub={summary.score ? `de ${summary.score.max} · media ${num(summary.score.mean, 2)}` : undefined}
          />
          <Stat label={`radio medio (${unitLabel})`} value={num(ang?.meanRadius, 2)} sub={`${num(summary.metrics?.meanRadius)} mm`} />
          <Stat label={`dispersión ext. (${unitLabel})`} value={num(ang?.extremeSpread, 2)} sub={`${num(summary.metrics?.extremeSpread)} mm c-c`} />
          <Stat label={`CEP 50 % (${unitLabel})`} value={num(ang?.cep50, 2)} sub={`${num(summary.metrics?.cep50)} mm`} />
          <Stat label="DT horizontal" value={`${num(summary.metrics?.sdX)} mm`} />
          <Stat label="DT vertical" value={`${num(summary.metrics?.sdY)} mm`} />
        </div>
        {summary.metrics && (
          <p className="muted">
            PMI {describeOffset(summary.metrics.mpi.x, 'derecha', 'izquierda')},{' '}
            {describeOffset(summary.metrics.mpi.y, 'arriba', 'abajo')}
            {ang && ` (${num(ang.mpiOffset, 2)} ${unitLabel} del centro)`}
          </p>
        )}
        {clicks && (clicks.up !== 0 || clicks.right !== 0) && (
          <p className="clicks">
            Corrección sugerida:{' '}
            {clicks.up !== 0 && `${Math.abs(clicks.up)} clics ${clicks.up > 0 ? 'arriba' : 'abajo'}`}
            {clicks.up !== 0 && clicks.right !== 0 && ' y '}
            {clicks.right !== 0 && `${Math.abs(clicks.right)} clics a la ${clicks.right > 0 ? 'derecha' : 'izquierda'}`}
          </p>
        )}
        {!weapon?.clickValue && summary.metrics && (
          <p className="muted">Añade el valor del clic del visor en la ficha del arma para ver la corrección sugerida.</p>
        )}
      </Card>

      <Card>
        <div className="card-head">
          <strong>Foto de la diana</strong>
          <PhotoPicker label={draft.photoId ? 'Cambiar' : 'Hacer foto'} capture onPicked={(photoId) => set({ photoId })} />
        </div>
        {draft.photoId && <PhotoView photoId={draft.photoId} className="target-photo" alt="Foto de la diana" />}
      </Card>

      <Card>
        <div className="card-head" onClick={() => setShowSettings(!showSettings)}>
          <strong>Ajustes de la serie</strong>
          <span className="muted">{showSettings ? '▴' : '▾'}</span>
        </div>
        {showSettings && (
          <>
            <SeriesFields value={draft} set={set} ctx={ctx} />
            <Toggle
              label="Meteorología propia (si cambió respecto a la sesión)"
              value={!!draft.weather}
              onChange={(on) => set({ weather: on ? {} : undefined })}
            />
            {draft.weather && (
              <WeatherForm value={draft.weather} onChange={(weather) => set({ weather })} windUnit={profile.prefs.windUnit} />
            )}
            <TextInput label="Notas" multiline value={draft.notes} onChange={(notes) => set({ notes })} />
          </>
        )}
      </Card>

      <div className="row">
        <button className="btn secondary" onClick={() => navigate(`/sesion/${draft.sessionId}`)}>
          Volver a la sesión
        </button>
        <button className="btn" onClick={() => navigate(`/serie/nueva/${draft.sessionId}`)}>
          Siguiente serie
        </button>
      </div>
    </Page>
  );
}

function fmtScore(s: { score: number; decimal: number | null }): string {
  return s.decimal !== null ? `${num(s.decimal)} puntos` : `${s.score} ${s.score === 1 ? 'punto' : 'puntos'}`;
}

function describeOffset(v: number, pos: string, neg: string): string {
  if (Math.abs(v) < 0.05) return 'centrado';
  return `${num(Math.abs(v))} mm ${v > 0 ? pos : neg}`;
}
