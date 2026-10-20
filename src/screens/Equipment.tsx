import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getMeta, requestPersistentStorage } from '../db/db';
import { exportBackup, exportShotsCsv, importBackup, LAST_BACKUP_KEY, markBackupDone } from '../db/backup';
import { bestGroups, favoritePellet, remainingByLot, shotCountByWeapon } from '../lib/summary';
import { Card, Empty, Page, PhotoView, SaveState, Segmented, Stat, Toggle, confirmAction } from '../ui/components';
import type { SaveStatus } from '../ui/autosave';
import { saveProfile, useAll, useProfile } from '../ui/data';
import { date, int, num, weaponExtras } from '../ui/format';
import { FIRING_ACTIONS, PELLET_SHAPES, PROPULSION, WEAPON_TYPES } from '../ui/labels';
import { navigate } from '../ui/router';
import { caliberInches, gramsToGrains } from '../lib/units';
import { isHandgun, moveWeapon, sortWeaponsArchivedLast } from '../lib/weapons';

function download(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

const ACCENTS = [
  '#e8a33d',
  '#3d9be8',
  '#4caf6a',
  '#e85b3d',
  '#a46be8',
  // Tonos militares
  '#2a2f2a',
  '#4a4f48',
  '#7d7f73',
  '#dcd9cf',
];

const DARK_BACKGROUNDS = [
  { value: '#101418', label: 'Azul noche (original)' },
  { value: '#000000', label: 'Negro' },
  { value: '#1c1c1c', label: 'Gris oscuro' },
  { value: '#2b2b2b', label: 'Gris' },
  { value: '#141916', label: 'Verde militar' },
];

export function Equipment() {
  const ctx = useAll();
  const profile = useProfile();
  const lastBackup = useLiveQuery(() => getMeta<string>(LAST_BACKUP_KEY));
  const [persisted, setPersisted] = useState<boolean>();
  const [message, setMessage] = useState<string>();
  const [ordering, setOrdering] = useState(false);
  const [prefsStatus, setPrefsStatus] = useState<SaveStatus>('idle');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(false));
  }, []);

  if (!ctx) return null;
  const counts = shotCountByWeapon(ctx);
  const groups = bestGroups(ctx);
  const remaining = remainingByLot(ctx);
  const prefs = profile.prefs;
  // Solo se envía lo que cambia: mandar todos los ajustes que se ven en
  // pantalla podía deshacer un cambio anterior que aún no se había pintado.
  const setPrefs = (p: Partial<typeof prefs>) => {
    setPrefsStatus('saving');
    saveProfile({ prefs: p }).then(
      () => setPrefsStatus('saved'),
      (e) => {
        console.error('No se pudieron guardar los ajustes', e);
        setPrefsStatus('error');
      },
    );
  };
  const weapons = sortWeaponsArchivedLast(ctx.weapons);
  // Guarda la posición de todas, para que las que no tenían orden queden fijas.
  const move = async (id: string, delta: -1 | 1) => {
    const order = moveWeapon(weapons, id, delta);
    await db.transaction('rw', db.weapons, async () => {
      for (const [wid, sortOrder] of order) await db.weapons.update(wid, { sortOrder });
    });
  };

  const doExport = async () => {
    const data = await exportBackup();
    download(JSON.stringify(data), `cuaderno-tiro-${stamp()}.json`, 'application/json');
    await markBackupDone();
    setMessage('Copia exportada. Guárdala fuera del móvil (Drive, correo, ordenador).');
  };

  const doImport = async (file?: File) => {
    if (!file) return;
    if (!confirmAction('Importar sustituye TODOS los datos de este móvil por los de la copia. ¿Continuar?')) return;
    try {
      await importBackup(JSON.parse(await file.text()));
      setMessage('Copia importada.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo importar el archivo.');
    }
  };

  return (
    <Page title="Equipo">
      <div className="section-head">
        <h2>Armas</h2>
        <div className="head-actions">
          {weapons.length > 1 && (
            <button className={`btn small ${ordering ? '' : 'secondary'}`} onClick={() => setOrdering(!ordering)}>
              {ordering ? 'Hecho' : 'Ordenar'}
            </button>
          )}
          {!ordering && (
            <button className="btn small" onClick={() => navigate('/equipo/arma/nueva')}>
              + Arma
            </button>
          )}
        </div>
      </div>
      {ordering && <p className="muted small">Usa las flechas para colocar las armas en el orden que quieras. Se aplica en toda la app.</p>}
      {weapons.length === 0 && <Empty>Añade tu primera arma para empezar a registrar series.</Empty>}
      {weapons.map((w) => {
        const best = groups.filter((g) => g.weaponId === w.id).sort((a, b) => a.moa - b.moa)[0];
        const fav = ctx.pellets.find((p) => p.id === favoritePellet(ctx, w.id));
        const extras = weaponExtras(w);
        const i = weapons.indexOf(w);
        return (
          <Card
            key={w.id}
            className={`weapon-card ${w.archived ? 'archived' : ''}`}
            onClick={ordering ? undefined : () => navigate(`/equipo/arma/${w.id}`)}
          >
            <PhotoView photoId={w.photoId} className="weapon-photo" alt={w.name} fallback={isHandgun(w.type) ? '🔫' : '︻デ═一'} />
            <div className="weapon-info">
              <strong>{w.name}</strong>
              <span className="muted">
                {[w.brand, w.model].filter(Boolean).join(' ')} · {[WEAPON_TYPES[w.type], PROPULSION[w.propulsion], w.action && FIRING_ACTIONS[w.action], caliberInches(w.caliberMm)]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {extras && <span className="muted small">{extras}</span>}
              {!ordering && (
                <div className="stats-row">
                  <Stat label="disparos" value={int((w.initialShotCount ?? 0) + (counts.get(w.id) ?? 0))} />
                  <Stat label="mejor" value={best ? `${num(best.moa, 2)} MOA` : '–'} sub={best ? `${num(best.distanceM, 0)} m` : undefined} />
                  <Stat label="favorito" value={fav ? fav.model || fav.brand : '–'} />
                </div>
              )}
            </div>
            {ordering && (
              <div className="order-buttons">
                <button className="icon-btn" disabled={i === 0} onClick={() => move(w.id, -1)} aria-label={`Subir ${w.name}`}>
                  ▲
                </button>
                <button className="icon-btn" disabled={i === weapons.length - 1} onClick={() => move(w.id, 1)} aria-label={`Bajar ${w.name}`}>
                  ▼
                </button>
              </div>
            )}
          </Card>
        );
      })}

      <div className="section-head">
        <h2>Balines y lotes</h2>
        <button className="btn small" onClick={() => navigate('/equipo/balin/nuevo')}>
          + Balín
        </button>
      </div>
      {ctx.pellets.length === 0 && <Empty>Añade los balines que uses y, dentro de cada uno, sus lotes o cajas.</Empty>}
      {ctx.pellets.map((p) => {
        const lots = ctx.lots.filter((l) => l.pelletId === p.id);
        return (
          <Card key={p.id}>
            <div className="card-head" onClick={() => navigate(`/equipo/balin/${p.id}`)}>
              <strong>
                {p.brand} {p.model}
              </strong>
              <span className="muted">
                {PELLET_SHAPES[p.shape]} · {num(p.headSizeMm ?? p.caliberMm, 2)} mm · {num(gramsToGrains(p.weightG), 2)} gr
              </span>
            </div>
            {lots.map((l) => (
              <div key={l.id} className="lot-row" onClick={() => navigate(`/equipo/lote/${l.id}`)}>
                <span>Lote {l.lotNumber || 'sin número'}</span>
                <span className="muted">
                  {int(remaining.get(l.id))} de {int(l.quantity)} · {date(l.purchasedOn)}
                </span>
              </div>
            ))}
            <button className="btn small secondary" onClick={() => navigate(`/equipo/lote/nuevo/${p.id}`)}>
              + Lote
            </button>
          </Card>
        );
      })}

      <div className="section-head">
        <h2>Dianas personalizadas</h2>
        <button className="btn small" onClick={() => navigate('/equipo/diana/nueva')}>
          + Diana
        </button>
      </div>
      {ctx.targets
        .filter((t) => !('builtin' in t && t.builtin))
        .map((t) => (
          <Card key={t.id} onClick={() => navigate(`/equipo/diana/${t.id}`)}>
            <strong>{t.name}</strong>
          </Card>
        ))}

      <div className="section-head">
        <h2>Ajustes</h2>
        <SaveState status={prefsStatus} />
      </div>
      <Card>
        <Segmented
          label="Tema"
          value={prefs.theme}
          onChange={(theme) => theme && setPrefs({ theme })}
          options={[
            { value: 'system', label: 'Automático' },
            { value: 'light', label: 'Claro' },
            { value: 'dark', label: 'Oscuro' },
          ]}
        />
        <Toggle label="Alto contraste (pleno sol)" value={prefs.highContrast} onChange={(highContrast) => setPrefs({ highContrast })} />
        <div className="field">
          <span className="field-label">Fondo oscuro</span>
          <div className="accents swatches">
            {DARK_BACKGROUNDS.map((b) => (
              <button
                key={b.value}
                className={b.value === prefs.darkBackground ? 'on' : ''}
                style={{ background: b.value }}
                // Los fondos son todos oscuros: elegir uno pasa el tema a oscuro.
                onClick={() => setPrefs({ darkBackground: b.value, theme: 'dark' })}
                aria-label={`Fondo ${b.label}`}
                title={b.label}
              />
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">Color de acento</span>
          <div className="accents">
            {ACCENTS.map((c) => (
              <button
                key={c}
                className={c === prefs.accent ? 'on' : ''}
                style={{ background: c }}
                onClick={() => setPrefs({ accent: c })}
                aria-label={`Acento ${c}`}
              />
            ))}
          </div>
        </div>
        <Segmented
          label="Unidad angular"
          value={prefs.angularUnit}
          onChange={(angularUnit) => angularUnit && setPrefs({ angularUnit })}
          options={[
            { value: 'moa', label: 'MOA' },
            { value: 'mrad', label: 'mrad' },
          ]}
        />
        <Segmented
          label="Viento"
          value={prefs.windUnit}
          onChange={(windUnit) => windUnit && setPrefs({ windUnit })}
          options={[
            { value: 'ms', label: 'm/s' },
            { value: 'kmh', label: 'km/h' },
          ]}
        />
        <Segmented
          label="Peso del balín"
          value={prefs.weightUnit}
          onChange={(weightUnit) => weightUnit && setPrefs({ weightUnit })}
          options={[
            { value: 'gr', label: 'grains' },
            { value: 'g', label: 'gramos' },
          ]}
        />
      </Card>

      <h2>Copias de seguridad</h2>
      <Card>
        <p className="muted">
          Los datos solo están en este móvil. Última copia: {lastBackup ? date(lastBackup) : 'nunca'}.
        </p>
        {message && <p className="notice">{message}</p>}
        <button className="btn" onClick={doExport}>
          Exportar todo (JSON con fotos)
        </button>
        <button className="btn secondary" onClick={() => fileInput.current?.click()}>
          Importar copia
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            doImport(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button
          className="btn secondary"
          onClick={async () => download(await exportShotsCsv(), `cuaderno-tiro-disparos-${stamp()}.csv`, 'text/csv')}
        >
          Exportar disparos a CSV
        </button>
        <p className="muted">
          Almacenamiento persistente: {persisted === undefined ? '…' : persisted ? 'concedido' : 'no concedido'}
          {persisted === false && (
            <>
              {' · '}
              <button className="link" onClick={async () => setPersisted(await requestPersistentStorage())}>
                Solicitar
              </button>
            </>
          )}
        </p>
      </Card>
    </Page>
  );
}
