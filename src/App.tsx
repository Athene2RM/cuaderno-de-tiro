import { useEffect } from 'react';
import { initials, useProfile } from './ui/data';
import { PhotoView } from './ui/components';
import { navigate, useRoute } from './ui/router';
import { Home } from './screens/Home';
import { SessionScreen, CurrentSession } from './screens/Session';
import { SeriesScreen, NewSeries } from './screens/Series';
import { History } from './screens/History';
import { Analysis } from './screens/Analysis';
import { Equipment } from './screens/Equipment';
import { WeaponForm } from './screens/WeaponForm';
import { PelletForm, LotForm } from './screens/PelletForm';
import { TargetForm } from './screens/TargetForm';
import { ProfileScreen } from './screens/Profile';
import type { Profile } from './db/types';
import { accentInk, inkOn, toHex } from './lib/colors';

const TABS = [
  { path: '', label: 'Inicio', icon: '⌂' },
  { path: 'sesion', label: 'Sesión', icon: '◎' },
  { path: 'historial', label: 'Historial', icon: '☰' },
  { path: 'analisis', label: 'Análisis', icon: '▤' },
  { path: 'equipo', label: 'Equipo', icon: '⚙' },
];

function tabFor(route: string[]): string {
  const r = route[0] ?? '';
  if (r === 'serie') return 'sesion';
  if (r === 'perfil') return '';
  return r;
}

function useTheme(profile: Profile) {
  useEffect(() => {
    const root = document.documentElement;
    const { theme, highContrast, accent, darkBackground } = profile.prefs;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    root.toggleAttribute('data-contrast', highContrast);
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--bg-dark', darkBackground);

    // La tinta sobre el acento, el acento como texto y el color de la barra del
    // sistema dependen del fondo real, que en "Automático" cambia con el móvil.
    const apply = () => {
      const css = getComputedStyle(root);
      const bg = toHex(css.getPropertyValue('--bg')) ?? '#101418';
      const text = toHex(css.getPropertyValue('--text')) ?? '#e9ecef';
      root.style.setProperty('--on-accent', inkOn(accent));
      root.style.setProperty('--accent-ink', accentInk(accent, bg, text));
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
    };
    apply();
    const media = matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [profile.prefs]);
}

export function App() {
  const route = useRoute();
  const profile = useProfile();
  useTheme(profile);
  const tab = tabFor(route);

  return (
    <div className="app">
      {/* En Inicio el perfil ya ocupa la cabecera de la página. */}
      {route.length > 0 && (
        <header className="top">
          <button className="avatar-btn" onClick={() => navigate('/perfil')} aria-label="Perfil">
            <PhotoView photoId={profile.avatarPhotoId} className="avatar sm" alt="" fallback={initials(profile)} />
          </button>
          <span className="top-title">{profile.nickname || profile.name || 'Cuaderno de Tiro'}</span>
        </header>
      )}
      <main>
        <Screen route={route} />
      </main>
      <nav className="tabs">
        {TABS.map((t) => (
          <a key={t.path} href={`#/${t.path}`} className={t.path === tab ? 'on' : ''}>
            <span className="tab-icon" aria-hidden>
              {t.icon}
            </span>
            {t.label}
          </a>
        ))}
      </nav>
    </div>
  );
}

function Screen({ route }: { route: string[] }) {
  const [a, b, c] = route;
  switch (a) {
    case undefined:
      return <Home />;
    case 'sesion':
      return b ? <SessionScreen id={b} /> : <CurrentSession />;
    case 'serie':
      return b === 'nueva' && c ? <NewSeries sessionId={c} /> : b ? <SeriesScreen id={b} /> : <Home />;
    case 'historial':
      return <History />;
    case 'analisis':
      return <Analysis />;
    case 'equipo':
      if (b === 'arma') return <WeaponForm id={c} />;
      if (b === 'balin') return <PelletForm id={c} />;
      if (b === 'lote') return <LotForm id={c} pelletId={route[3]} />;
      if (b === 'diana') return <TargetForm id={c} />;
      return <Equipment />;
    case 'perfil':
      return <ProfileScreen />;
    default:
      return <Home />;
  }
}
