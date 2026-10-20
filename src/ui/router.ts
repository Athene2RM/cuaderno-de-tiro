import { useEffect, useState } from 'react';

// Enrutado por hash: funciona en GitHub Pages sin configurar el servidor.

function current(): string[] {
  return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
}

export function useRoute(): string[] {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const onChange = () => {
      setRoute(current());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(path: string, replace = false): void {
  const hash = '#' + (path.startsWith('/') ? path : '/' + path);
  if (replace) {
    history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = hash;
  }
}

export function back(fallback = '/'): void {
  if (history.length > 1) history.back();
  else navigate(fallback, true);
}
