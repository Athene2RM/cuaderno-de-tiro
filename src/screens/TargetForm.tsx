import { useEffect, useState } from 'react';
import { db, newId } from '../db/db';
import type { CustomTargetRecord } from '../db/types';
import { customRingTarget } from '../lib/targets';
import { Card, Empty, NumberInput, Page, TextInput, confirmAction } from '../ui/components';
import { useAll } from '../ui/data';
import { back } from '../ui/router';
import { TargetView } from '../ui/TargetView';

export function TargetForm({ id }: { id?: string }) {
  const ctx = useAll();
  const isNew = !id || id === 'nueva';
  const [t, setT] = useState<CustomTargetRecord | null>();

  useEffect(() => {
    if (t !== undefined) return;
    if (isNew) {
      setT({
        id: `custom-${newId()}`,
        name: '',
        rings: [
          { diameter: 10, value: 5 },
          { diameter: 30, value: 3 },
          { diameter: 50, value: 1 },
        ],
      });
    } else {
      db.targets.get(id!).then((x) => setT(x ?? null));
    }
  }, [id, isNew, t]);

  if (!ctx || t === undefined) return null;
  if (t === null) return <Page title="Diana" onBack><Empty>Esta diana no existe.</Empty></Page>;

  const setRing = (i: number, patch: Partial<{ diameter: number; value: number }>) =>
    setT({ ...t, rings: t.rings.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const valid = t.name.trim() && t.rings.length > 0 && t.rings.every((r) => r.diameter > 0);
  const used = ctx.series.some((s) => s.targetId === t.id);

  return (
    <Page title={isNew ? 'Nueva diana' : t.name} onBack>
      <Card>
        <TextInput label="Nombre" value={t.name} onChange={(name) => setT({ ...t, name })} />
        {t.rings.map((r, i) => (
          <div className="grid3" key={i}>
            <NumberInput label="Diámetro" unit="mm" value={r.diameter} onChange={(v) => setRing(i, { diameter: v ?? 0 })} />
            <NumberInput label="Valor" value={r.value} onChange={(v) => setRing(i, { value: v ?? 0 })} />
            <button className="btn secondary small" onClick={() => setT({ ...t, rings: t.rings.filter((_, j) => j !== i) })}>
              Quitar
            </button>
          </div>
        ))}
        <button
          className="btn secondary small"
          onClick={() => setT({ ...t, rings: [...t.rings, { diameter: (t.rings.at(-1)?.diameter ?? 0) + 10, value: 0 }] })}
        >
          + Anillo
        </button>
      </Card>
      {valid && <TargetView target={customRingTarget(t.id, t.name, t.rings)} shots={[]} caliberMm={4.5} />}
      <button
        className="btn huge"
        disabled={!valid}
        onClick={async () => {
          await db.targets.put({ ...t, name: t.name.trim() });
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
            if (confirmAction('¿Borrar esta diana?')) {
              await db.targets.delete(t.id);
              back('/equipo');
            }
          }}
        >
          {used ? 'Usada en series: no se puede borrar' : 'Borrar diana'}
        </button>
      )}
    </Page>
  );
}
