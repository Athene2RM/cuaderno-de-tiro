import type {
  Light,
  Optics,
  PelletShape,
  Position,
  Propulsion,
  Support,
  WeaponType,
  WindConstancy,
} from '../db/types';

export const WEAPON_TYPES: Record<WeaponType, string> = { carabina: 'Carabina', pistola: 'Pistola' };

export const PROPULSION: Record<Propulsion, string> = {
  pcp: 'PCP',
  muelle: 'Muelle',
  piston: 'Pistón',
  // Clave antigua "gasram": se mantiene para no migrar las armas guardadas.
  gasram: 'Nitro-pistón (gas ram)',
  co2: 'CO2',
  ssp: 'Aire precargado (SSP)',
  multibombeo: 'Multibombeo',
};

export const OPTICS: Record<Optics, string> = {
  abiertas: 'Miras abiertas',
  puntoRojo: 'Punto rojo',
  visor: 'Visor',
};

export const PELLET_SHAPES: Record<PelletShape, string> = {
  wadcutter: 'Wadcutter (plano)',
  domed: 'Domed (redondo)',
  pointed: 'Pointed',
  hollowpoint: 'Hollow point',
  slug: 'Slug',
  otro: 'Otro',
};

export const POSITIONS: Record<Position, string> = {
  tendido: 'Tendido',
  sentado: 'Sentado',
  rodilla: 'Rodilla',
  pie: 'De pie',
  banco: 'Banco',
};

export const SUPPORTS: Record<Support, string> = {
  libre: 'Libre',
  bipode: 'Bípode',
  saco: 'Saco',
  tripode: 'Trípode',
  reposo: 'Banco con reposo',
  dosManos: 'A dos manos',
  unaMano: 'A una mano',
};

export const WIND_CONSTANCY: Record<WindConstancy, string> = {
  calma: 'Calma',
  constante: 'Constante',
  racheado: 'Racheado',
  variable: 'Variable',
};

export const LIGHT: Record<Light, string> = {
  sol: 'Sol directo',
  nublado: 'Nublado',
  contraluz: 'Contraluz',
  lateral: 'Sol lateral',
};

export const CALIBERS = [
  { value: 4.5, label: '4,5 mm (.177)' },
  { value: 5.5, label: '5,5 mm (.22)' },
  { value: 6.35, label: '6,35 mm (.25)' },
];

export function options<T extends string>(rec: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(rec) as T[]).map((value) => ({ value, label: rec[value] }));
}
