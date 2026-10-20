import { useEffect, useState } from 'react';
import { db, newId, nowIso } from '../db/db';
import type { Weapon } from '../db/types';
import { shotsSince } from '../lib/summary';
import { addAccessory, MAX_ACCESSORY_LENGTH, nextSortOrder } from '../lib/weapons';
import {
  Card, Empty, NumberInput, Page, PhotoPicker, PhotoView, Segmented, Select, TextInput, Toggle, confirmAction,
} from '../ui/components';
import { useAll } from '../ui/data';
import { int } from '../ui/format';
import { CALIBERS, OPTICS, options, PROPULSION, WEAPON_TYPES } from '../ui/labels';
import { back } from '../ui/router';

function blank(): Weapon {
  return {
    id: newId(),
    name: '',
    brand: '',
    model: '',
    type: 'carabina',
    propulsion: 'pcp',
    caliberMm: 4.5,
    optics: 'visor',
    clickUnit: 'moa',
    reticle: 'moa',
    createdAt: nowIso(),
  };
}

export function WeaponForm({ id }: { id?: string }) {
  const ctx = useAll();
  const isNew = !id || id === 'nueva';
  const [w, setW] = useState<Weapon>();
  const [newAccessory, setNewAccessory] = useState('');

  useEffect(() => {
    if (w || !ctx) return;
    setW(isNew ? blank() : ctx.weapons.find((x) => x.id === id));
  }, [ctx, id, isNew, w]);

  if (!ctx) return null;
  if (!w) return <Page title="Arma" onBack><Empty>Esta arma no existe.</Empty></Page>;

  const set = (p: Partial<Weapon>) => setW({ ...w, ...p });
  const otherCaliber = !CALIBERS.some((c) => c.value === w.caliberMm);
  const since = isNew ? 0 : shotsSince(ctx, w.id, w.lastMaintenanceOn);
  const used = ctx.series.some((s) => s.weaponId === w.id);
  const accessories = w.accessories ?? [];
  const pushAccessory = () => {
    set({ accessories: addAccessory(accessories, newAccessory) });
    setNewAccessory('');
  };

  const save = async () => {
    // Un complemento escrito pero sin pulsar «Añadir» también se guarda.
    const acc = addAccessory(accessories, newAccessory);
    await db.weapons.put({
      ...w,
      name: w.name.trim() || [w.brand, w.model].filter(Boolean).join(' ') || 'Sin nombre',
      accessories: acc.length ? acc : undefined,
      // Las armas nuevas van al final del orden manual.
      sortOrder: w.sortOrder ?? (isNew ? nextSortOrder(ctx.weapons) : undefined),
    });
    back('/equipo');
  };

  return (
    <Page title={isNew ? 'Nueva arma' : w.name} onBack>
      <Card className="center">
        <PhotoView photoId={w.photoId} className="weapon-photo lg" alt={w.name} fallback="Sin foto" />
        <PhotoPicker label={w.photoId ? 'Cambiar foto' : 'Añadir foto'} onPicked={(photoId) => set({ photoId })} />
      </Card>
      <Card>
        <TextInput label="Nombre propio" value={w.name} onChange={(name) => set({ name })} placeholder="p. ej. La Negra" />
        <div className="grid2">
          <TextInput label="Marca" value={w.brand} onChange={(brand) => set({ brand })} />
          <TextInput label="Modelo" value={w.model} onChange={(model) => set({ model })} />
        </div>
        <Segmented label="Tipo" value={w.type} onChange={(type) => type && set({ type })} options={options(WEAPON_TYPES)} />
        <Select label="Sistema de propulsión" value={w.propulsion} onChange={(propulsion) => set({ propulsion })} options={options(PROPULSION)} />
        <Segmented
          label="Calibre"
          value={otherCaliber ? -1 : w.caliberMm}
          onChange={(v) => v !== undefined && set({ caliberMm: v === -1 ? 0 : v })}
          options={[...CALIBERS, { value: -1, label: 'Otro' }]}
        />
        {otherCaliber && <NumberInput label="Calibre" unit="mm" value={w.caliberMm || undefined} onChange={(v) => set({ caliberMm: v ?? 0 })} />}
        <NumberInput label="Energía nominal" unit="J" value={w.nominalEnergyJ} onChange={(nominalEnergyJ) => set({ nominalEnergyJ })} />
        <div className="grid2">
          <NumberInput label="Longitud de cañón" unit="mm" value={w.barrelLengthMm} onChange={(barrelLengthMm) => set({ barrelLengthMm })} />
          <TextInput label="Paso de estriado" value={w.twist} onChange={(twist) => set({ twist })} placeholder="1:450 mm" />
        </div>
        <div className="grid2">
          <NumberInput
            label="Cargador"
            unit="balines"
            value={w.magazineCapacity}
            onChange={(magazineCapacity) => set({ magazineCapacity })}
          />
          <NumberInput
            label="Peso"
            unit="kg"
            value={w.weightG !== undefined ? w.weightG / 1000 : undefined}
            onChange={(v) => set({ weightG: v !== undefined ? Math.round(v * 1000) : undefined })}
          />
        </div>
      </Card>

      <h2>Complementos</h2>
      <Card>
        {accessories.length > 0 && (
          <div className="chips left">
            {accessories.map((a) => (
              <button
                key={a}
                className="chip removable"
                onClick={() => set({ accessories: accessories.filter((x) => x !== a) })}
                aria-label={`Quitar ${a}`}
              >
                {a} <span aria-hidden>✕</span>
              </button>
            ))}
          </div>
        )}
        <form
          className="tag-add"
          onSubmit={(e) => {
            e.preventDefault();
            pushAccessory();
          }}
        >
          <input
            value={newAccessory}
            maxLength={MAX_ACCESSORY_LENGTH}
            placeholder="Ej.: Linterna/láser verde"
            onChange={(e) => setNewAccessory(e.target.value)}
            aria-label="Nuevo complemento"
          />
          <button className="btn small" type="submit" disabled={!newAccessory.trim()}>
            Añadir
          </button>
        </form>
        <span className="field-hint">Linterna, láser, bípode, moderador, empuñadura… Toca uno para quitarlo.</span>
      </Card>

      <h2>Óptica</h2>
      <Card>
        <Segmented label="Tipo" value={w.optics} onChange={(optics) => optics && set({ optics })} options={options(OPTICS)} />
        {w.optics === 'visor' && (
          <>
            <TextInput label="Aumentos" value={w.magnification} onChange={(magnification) => set({ magnification })} placeholder="4-16×50" />
            <Segmented
              label="Retícula"
              value={w.reticle}
              onChange={(reticle) => set({ reticle })}
              allowNone
              options={[
                { value: 'moa', label: 'MOA' },
                { value: 'mrad', label: 'MRAD' },
              ]}
            />
          </>
        )}
        {w.optics !== 'abiertas' && (
          <div className="grid2">
            <NumberInput label="Valor del clic" value={w.clickValue} onChange={(clickValue) => set({ clickValue })} hint="p. ej. 0,25 MOA o 0,1 mrad" />
            <Segmented
              label="Unidad del clic"
              value={w.clickUnit}
              onChange={(clickUnit) => clickUnit && set({ clickUnit })}
              options={[
                { value: 'moa', label: 'MOA' },
                { value: 'mrad', label: 'mrad' },
              ]}
            />
          </div>
        )}
        <div className="grid2">
          <NumberInput label="Altura del eje óptico" unit="mm" value={w.sightHeightMm} onChange={(sightHeightMm) => set({ sightHeightMm })} />
          <NumberInput label="Distancia de cero" unit="m" value={w.zeroDistanceM} onChange={(zeroDistanceM) => set({ zeroDistanceM })} />
        </div>
      </Card>

      {w.propulsion === 'pcp' && (
        <>
          <h2>Presión</h2>
          <Card>
            <div className="grid2">
              <NumberInput label="Llenado" unit="bar" value={w.fillPressureBar} onChange={(fillPressureBar) => set({ fillPressureBar })} />
              <NumberInput label="Trabajo" unit="bar" value={w.workingPressureBar} onChange={(workingPressureBar) => set({ workingPressureBar })} />
            </div>
          </Card>
        </>
      )}

      <h2>Mantenimiento</h2>
      <Card>
        <NumberInput
          label="Disparos antes de usar la app"
          value={w.initialShotCount}
          onChange={(initialShotCount) => set({ initialShotCount })}
        />
        <label className="field">
          <span className="field-label">Última limpieza o revisión</span>
          <input type="date" value={w.lastMaintenanceOn?.slice(0, 10) ?? ''} onChange={(e) => set({ lastMaintenanceOn: e.target.value || undefined })} />
        </label>
        <NumberInput
          label="Avisar cada"
          unit="disparos"
          value={w.maintenanceEveryShots}
          onChange={(maintenanceEveryShots) => set({ maintenanceEveryShots })}
          hint={!isNew && `${int(since)} disparos registrados desde la última revisión`}
        />
        <button className="btn secondary small" onClick={() => set({ lastMaintenanceOn: new Date().toISOString().slice(0, 10) })}>
          Revisada hoy
        </button>
        <Toggle label="Archivada (ya no la uso)" value={w.archived} onChange={(archived) => set({ archived })} />
      </Card>

      <button className="btn huge" onClick={save}>
        Guardar
      </button>
      {!isNew && (
        <button
          className="btn secondary danger"
          onClick={async () => {
            const msg = used
              ? 'Esta arma tiene series registradas. Mejor archívala. ¿Borrarla igualmente? Sus series quedarán sin arma.'
              : '¿Borrar esta arma?';
            if (confirmAction(msg)) {
              await db.weapons.delete(w.id);
              back('/equipo');
            }
          }}
        >
          Borrar arma
        </button>
      )}
    </Page>
  );
}
