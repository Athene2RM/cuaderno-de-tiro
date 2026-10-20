import { useCallback, useEffect, useRef, useState } from 'react';

/** Estado del guardado, para mostrarlo en pantalla. */
export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

/**
 * Guarda los cambios con un pequeño retardo para no escribir en cada tecla, y
 * guarda lo pendiente al salir de la pantalla, al pasar la app a segundo plano
 * o al cerrarla. En el móvil el sistema puede matar la app en segundo plano sin
 * desmontar React, así que esperar al desmontaje no basta.
 *
 * Devuelve el estado y `saveNow`, que guarda ya lo pendiente (botón "Guardar").
 */
export function useAutosave<T>(
  value: T | undefined,
  save: (v: T) => unknown,
  delay = 400,
): { status: SaveStatus; saveNow: () => Promise<void> } {
  const pending = useRef<T | undefined>(undefined);
  const saveRef = useRef(save);
  saveRef.current = save;
  const first = useRef(true);
  const mounted = useRef(true);
  const [status, setStatus] = useState<SaveStatus>('idle');

  const flush = useCallback(async () => {
    const v = pending.current;
    if (v === undefined) return;
    pending.current = undefined;
    if (mounted.current) setStatus('saving');
    try {
      await saveRef.current(v);
      // Si mientras tanto hubo otro cambio, sigue pendiente.
      if (mounted.current) setStatus(pending.current === undefined ? 'saved' : 'pending');
    } catch (e) {
      console.error('No se pudo guardar', e);
      // Se vuelve a intentar con el siguiente cambio o al pulsar Guardar.
      if (pending.current === undefined) pending.current = v;
      if (mounted.current) setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (value === undefined) return;
    // El primer valor viene de la base de datos: no hace falta guardarlo.
    if (first.current) {
      first.current = false;
      return;
    }
    pending.current = value;
    setStatus('pending');
    const t = setTimeout(flush, delay);
    return () => clearTimeout(t);
  }, [value, delay, flush]);

  useEffect(() => {
    mounted.current = true;
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onPageHide = () => void flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      mounted.current = false;
      void flush();
    };
  }, [flush]);

  const saveNow = useCallback(async () => {
    if (pending.current === undefined) {
      // No había nada pendiente: todo está ya guardado.
      setStatus((s) => (s === 'error' ? s : 'saved'));
      return;
    }
    await flush();
  }, [flush]);

  return { status, saveNow };
}
