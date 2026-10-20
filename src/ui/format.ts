const nf = (digits: number) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const cache = new Map<number, Intl.NumberFormat>();

export function num(v: number | undefined | null, digits = 1): string {
  if (v === undefined || v === null || Number.isNaN(v)) return '–';
  let f = cache.get(digits);
  if (!f) cache.set(digits, (f = nf(digits)));
  return f.format(v);
}

export function int(v: number | undefined | null): string {
  if (v === undefined || v === null || Number.isNaN(v)) return '–';
  return new Intl.NumberFormat('es-ES').format(v);
}

export function date(iso?: string): string {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function dateTime(iso?: string): string {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function time(iso?: string): string {
  if (!iso) return '–';
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/** Valor para un <input type="datetime-local"> en hora local. */
export function toLocalInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export function fromLocalInput(v: string): string | undefined {
  return v ? new Date(v).toISOString() : undefined;
}
