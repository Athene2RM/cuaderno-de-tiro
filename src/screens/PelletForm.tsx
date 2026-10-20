import { useEffect, useState } from 'react';
import { db, newId, nowIso } from '../db/db';
import type { Lot, Pellet } from '../db/types';
import { gramsToGrains, grainsToGrams } from '../lib/units';
import { Card, Empty, NumberInput, Page, Segmented, Select, TextInput, confirmAction } from '../ui/components';
import { useAll, useProfile } from '../ui/data';
import { num } from '../ui/format';
import { CALIBERS, options, PELLET_SHAPES } from '../ui/labels';
import { back } from '../ui/router';

export function PelletForm({ id }: { id?: string }) {
  const ctx = useAll();
  const profile = useProfile();
  const isNew = !id || id === 'nuevo';
  const [p, setP] = useState<Pellet>();
  const [unit, setUnit] = useState<'g' | 'gr'>(profile.prefs.weightUnit);

  useEffect(() => {
    if (p || !ctx) return;
    setP(
      isNew
        ? { id: newId(), brand: '', model: '', shape: 'domed', caliberMm: 4.5, weightG: 0, createdAt: nowIso() }
        : ctx.pellets.find((x) => x.id === id),
    );
  }, [ctx, id, isNew, p]);

  if (!ctx) return null;
  if (!p) return <Page title="Balín" onBack><Empty>Este balín no existe.</Empty></Page>;

  const set = (patch: Partial<Pellet>) => setP({ ...p, ...patch });
  const weightUi = p.weightG ? (unit === 'gr' ? round(gramsToGrains(p.weightG), 3) : round(p.weightG, 4)) : undefined;
  const used = ctx.lots.some((l) => l.pelletId === p.id);

  return (
    <Page title={isNew ? 'Nuevo balín' : `${p.brand} ${p.model}`} onBack>
      <Card>
        <div className="grid2">
          <TextInput label="Marca" value={p.brand} onChange={(brand) => set({ brand })} placeholder="JSB" />
          <TextInput label="Modelo" value={p.model} onChange={(model) => set({ model })} placeholder="Exact" />
        </div>
        <Select label="Forma" value={p.shape} onChange={(shape) => set({ shape })} options={options(PELLET_SHAPES)} />
        <Select
          label="Calibre"
          value={p.caliberMm}
          onChange={(caliberMm) => set({ caliberMm })}
          options={CALIBERS.some((c) => c.value === p.caliberMm) ? CALIBERS : [...CALIBERS, { value: p.caliberMm, label: `${num(p.caliberMm, 2)} mm` }]}
        />
        <NumberInput
          label="Diámetro real de cabeza"
          unit="mm"
          value={p.headSizeMm}
          onChange={(headSizeMm) => set({ headSizeMm })}
          hint="Opcional, p. ej. 4,52. Se usa para puntuar."
        />
        <div className="grid2">
          <NumberInput
            label="Peso"
            unit={unit === 'gr' ? 'gr' : 'g'}
            value={weightUi}
            onChange={(v) => set({ weightG: v === undefined ? 0 : unit === 'gr' ? grainsToGrams(v) : v })}
            hint={p.weightG ? (unit === 'gr' ? `${num(p.weightG, 3)} g` : `${num(gramsToGrains(p.weightG), 2)} gr`) : undefined}
          />
          <Segmented
            label="Unidad"
            value={unit}
            onChange={(u) => u && setUnit(u)}
            options={[
              { value: 'gr', label: 'grains' },
              { value: 'g', label: 'gramos' },
            ]}
          />
        </div>
        <NumberInput label="Coeficiente balístico (BC)" value={p.bc} onChange={(bc) => set({ bc })} hint="Opcional, para la trayectoria" />
      </Card>
      <button
        className="btn huge"
        disabled={!p.brand.trim() && !p.model.trim()}
        onClick={async () => {
          await db.pellets.put(p);
          back('/equipo');
        }}
      >
        Guardar
      </button>
      {!isNew && (
        <button
          className="btn secondary danger"
          disabled={used}
          onClick={async () => {
            if (confirmAction('¿Borrar este balín?')) {
              await db.pellets.delete(p.id);
              back('/equipo');
            }
          }}
        >
          {used ? 'Tiene lotes: bórralos antes' : 'Borrar balín'}
        </button>
      )}
    </Page>
  );
}

export function LotForm({ id, pelletId }: { id?: string; pelletId?: string }) {
  const ctx = useAll();
  const isNew = !id || id === 'nuevo';
  const [l, setL] = useState<Lot>();

  useEffect(() => {
    if (l || !ctx) return;
    setL(
      isNew
        ? {
            id: newId(),
            pelletId: pelletId ?? ctx.pellets[0]?.id ?? '',
            lotNumber: '',
            quantity: 500,
            purchasedOn: new Date().toISOString().slice(0, 10),
            createdAt: nowIso(),
          }
        : ctx.lots.find((x) => x.id === id),
    );
  }, [ctx, id, isNew, l, pelletId]);

  if (!ctx) return null;
  if (!l) return <Page title="Lote" onBack><Empty>Este lote no existe.</Empty></Page>;
  const set = (patch: Partial<Lot>) => setL({ ...l, ...patch });
  const used = ctx.series.some((s) => s.lotId === l.id);

  return (
    <Page title={isNew ? 'Nuevo lote' : `Lote ${l.lotNumber}`} onBack>
      <Card>
        <Select
          label="Balín"
          value={l.pelletId || undefined}
          onChange={(pelletId) => set({ pelletId })}
          options={ctx.pellets.map((p) => ({ value: p.id, label: `${p.brand} ${p.model}` }))}
        />
        <TextInput label="Número de lote" value={l.lotNumber} onChange={(lotNumber) => set({ lotNumber })} />
        <label className="field">
          <span className="field-label">Fecha de compra</span>
          <input type="date" value={l.purchasedOn ?? ''} onChange={(e) => set({ purchasedOn: e.target.value || undefined })} />
        </label>
        <NumberInput label="Cantidad" unit="balines" value={l.quantity} onChange={(v) => set({ quantity: v ?? 0 })} />
      </Card>
      <button
        className="btn huge"
        disabled={!l.pelletId}
        onClick={async () => {
          await db.lots.put(l);
          back('/equipo');
        }}
      >
        Guardar
      </button>
      {!isNew && (
        <button
          className="btn secondary danger"
          onClick={async () => {
            const msg = used ? 'Este lote tiene series. Si lo borras, quedarán sin balín. ¿Borrar?' : '¿Borrar este lote?';
            if (confirmAction(msg)) {
              await db.lots.delete(l.id);
              back('/equipo');
            }
          }}
        >
          Borrar lote
        </button>
      )}
    </Page>
  );
}

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
