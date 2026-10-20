import { useEffect, useRef } from 'react';

/**
 * Guarda los cambios con un pequeño retardo para no escribir en cada tecla, y
 * guarda lo pendiente al salir de la pantalla.
 */
export function useAutosave<T>(value: T | undefined, save: (v: T) => void, delay = 400): void {
  const pending = useRef<T | undefined>(undefined);
  const saveRef = useRef(save);
  saveRef.current = save;
  const first = useRef(true);

  useEffect(() => {
    if (value === undefined) return;
    // El primer valor viene de la base de datos: no hace falta guardarlo.
    if (first.current) {
      first.current = false;
      return;
    }
    pending.current = value;
    const t = setTimeout(() => {
      pending.current = undefined;
      saveRef.current(value);
    }, delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  useEffect(
    () => () => {
      if (pending.current !== undefined) saveRef.current(pending.current);
    },
    [],
  );
}
