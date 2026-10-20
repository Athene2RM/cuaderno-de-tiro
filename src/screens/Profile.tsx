import { useEffect, useState } from 'react';
import type { Profile } from '../db/types';
import { badges, bestGroups, shootingStreak } from '../lib/summary';
import { Card, Page, PhotoPicker, PhotoView, SaveState, Segmented, Stat, TextInput, Toggle } from '../ui/components';
import { initials, saveProfile, useAll, useLoadedProfile } from '../ui/data';
import { int, num } from '../ui/format';
import { useAutosave } from '../ui/autosave';

const HANDS = [
  { value: 'diestro' as const, label: 'Derecha' },
  { value: 'zurdo' as const, label: 'Izquierda' },
];

export function ProfileScreen() {
  const ctx = useAll();
  const stored = useLoadedProfile();
  const [p, setP] = useState<Profile>();

  useEffect(() => {
    if (stored && !p) setP(stored);
  }, [p, stored]);
  // Los ajustes (tema, colores, unidades) se cambian en Equipo: aquí no se
  // guardan para no devolverlos a como estaban al abrir esta pantalla.
  const { status, saveNow } = useAutosave(p, ({ prefs: _prefs, ...rest }) => saveProfile(rest));

  if (!ctx || !p) return null;
  const set = (patch: Partial<Profile>) => setP({ ...p, ...patch });
  const best = bestGroups(ctx)[0];
  const streak = shootingStreak(ctx.sessions.map((s) => s.startedAt));
  const earned = badges(ctx);

  return (
    <Page title="Perfil" onBack actions={<SaveState status={status} />}>
      <div className="profile-head">
        <PhotoView photoId={p.coverPhotoId} className="cover" alt="" />
        <PhotoView photoId={p.avatarPhotoId} className="avatar xl" alt="" fallback={initials(p)} />
      </div>
      <div className="row center">
        <PhotoPicker label="Foto de perfil" circle onPicked={(avatarPhotoId) => set({ avatarPhotoId })} />
        <PhotoPicker label="Portada" onPicked={(coverPhotoId) => set({ coverPhotoId })} />
      </div>

      <Card>
        <div className="stats-grid">
          <Stat label="disparos" value={int(ctx.shots.length)} />
          <Stat label="sesiones" value={int(ctx.sessions.length)} />
          <Stat
            label="mejor agrupación"
            value={best ? `${num(best.moa, 2)} MOA` : '–'}
            sub={best ? `${num(best.extremeSpreadMm)} mm a ${num(best.distanceM, 0)} m` : undefined}
          />
          <Stat label="racha de días" value={streak.current} sub={`récord ${streak.longest}`} />
        </div>
      </Card>

      <h2>Insignias</h2>
      <div className="badges">
        {earned.map((b) => (
          <div key={b.id} className={`badge-card ${b.earned ? 'earned' : ''}`} title={b.description}>
            <span className="badge-icon">{b.earned ? '🏅' : '○'}</span>
            <span>{b.title}</span>
          </div>
        ))}
      </div>

      <h2>Sobre ti</h2>
      <Card>
        <TextInput label="Nombre" value={p.name} onChange={(name) => set({ name })} />
        <TextInput label="Apodo de tirador" value={p.nickname} onChange={(nickname) => set({ nickname })} />
        <TextInput label="Club o lugar de tiro" value={p.club} onChange={(club) => set({ club })} />
        <TextInput label="Biografía" multiline value={p.bio} onChange={(bio) => set({ bio })} />
        <label className="field">
          <span className="field-label">Empecé a tirar el</span>
          <input type="date" value={p.startedShootingOn ?? ''} onChange={(e) => set({ startedShootingOn: e.target.value || undefined })} />
        </label>
        <Segmented label="Mano dominante" value={p.dominantHand} onChange={(dominantHand) => set({ dominantHand })} options={HANDS} allowNone />
        <Segmented label="Ojo dominante" value={p.dominantEye} onChange={(dominantEye) => set({ dominantEye })} options={HANDS} allowNone />
        <Toggle label="Uso gafas de tiro" value={p.shootingGlasses} onChange={(shootingGlasses) => set({ shootingGlasses })} />
        <div className="save-bar">
          <button className="btn" onClick={() => void saveNow()}>
            Guardar
          </button>
          <SaveState status={status} />
        </div>
      </Card>
      <p className="muted center">Los cambios también se guardan solos mientras escribes.</p>
      <p className="muted center">Las preferencias de unidades y tema están en Equipo › Ajustes.</p>
    </Page>
  );
}
