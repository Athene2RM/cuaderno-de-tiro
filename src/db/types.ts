// Entidades guardadas en IndexedDB. Todas usan un id de texto (UUID) para que
// las copias de seguridad se puedan importar sin colisiones.

import type { AngularUnit } from '../lib/units';
import type { Ring } from '../lib/targets';

export type ThemeMode = 'system' | 'light' | 'dark';
export type Hand = 'diestro' | 'zurdo';

export interface Profile {
  id: 'me';
  name: string;
  nickname: string;
  club: string;
  bio: string;
  startedShootingOn?: string;
  dominantHand?: Hand;
  dominantEye?: Hand;
  shootingGlasses?: boolean;
  avatarPhotoId?: string;
  coverPhotoId?: string;
  prefs: {
    theme: ThemeMode;
    highContrast: boolean;
    accent: string;
    angularUnit: AngularUnit;
    windUnit: 'ms' | 'kmh';
    weightUnit: 'g' | 'gr';
  };
}

export type WeaponType = 'carabina' | 'pistola';
export type Propulsion = 'pcp' | 'muelle' | 'gasram' | 'co2' | 'ssp' | 'multibombeo';
export type Optics = 'abiertas' | 'puntoRojo' | 'visor';

export interface Weapon {
  id: string;
  name: string;
  brand: string;
  model: string;
  type: WeaponType;
  propulsion: Propulsion;
  caliberMm: number;
  nominalEnergyJ?: number;
  barrelLengthMm?: number;
  twist?: string;
  optics: Optics;
  magnification?: string;
  reticle?: AngularUnit;
  clickValue?: number;
  clickUnit?: AngularUnit;
  sightHeightMm?: number;
  zeroDistanceM?: number;
  fillPressureBar?: number;
  workingPressureBar?: number;
  /** Disparos hechos antes de usar la app; la app suma los registrados. */
  initialShotCount?: number;
  lastMaintenanceOn?: string;
  /** Aviso de mantenimiento cada N disparos desde la última revisión. */
  maintenanceEveryShots?: number;
  photoId?: string;
  archived?: boolean;
  createdAt: string;
}

export type PelletShape = 'wadcutter' | 'domed' | 'pointed' | 'hollowpoint' | 'slug' | 'otro';

export interface Pellet {
  id: string;
  brand: string;
  model: string;
  shape: PelletShape;
  caliberMm: number;
  headSizeMm?: number;
  weightG: number;
  bc?: number;
  createdAt: string;
}

export interface Lot {
  id: string;
  pelletId: string;
  lotNumber: string;
  purchasedOn?: string;
  quantity: number;
  createdAt: string;
}

export type WindConstancy = 'calma' | 'constante' | 'racheado' | 'variable';
export type Light = 'sol' | 'nublado' | 'contraluz' | 'lateral';

export interface Weather {
  windSpeedMs?: number;
  windGustMs?: number;
  /** Dirección en formato reloj, 1–12. 12 = de cara. */
  windClock?: number;
  windConstancy?: WindConstancy;
  temperatureC?: number;
  humidityPct?: number;
  pressureHpa?: number;
  light?: Light;
  precipitation?: boolean;
}

export interface Session {
  id: string;
  startedAt: string;
  endedAt?: string;
  place: string;
  notes: string;
  rest?: number;
  fatigue?: number;
  caffeine?: number;
  weather: Weather;
}

export type Position = 'tendido' | 'sentado' | 'rodilla' | 'pie' | 'banco';
export type Support = 'libre' | 'bipode' | 'saco' | 'tripode' | 'reposo' | 'dosManos' | 'unaMano';

export interface Series {
  id: string;
  sessionId: string;
  weaponId: string;
  lotId?: string;
  distanceM: number;
  targetId: string;
  plannedShots: number;
  position: Position;
  support: Support;
  clicksElevation?: number;
  clicksWindage?: number;
  tankPressureBar?: number;
  weather?: Weather;
  photoId?: string;
  notes?: string;
  createdAt: string;
}

export interface Shot {
  id: string;
  seriesId: string;
  order: number;
  x: number;
  y: number;
  velocityMs?: number;
  misfire?: boolean;
  flinch?: boolean;
  coldBore?: boolean;
}

export interface CustomTargetRecord {
  id: string;
  name: string;
  rings: Ring[];
}

export interface Photo {
  id: string;
  blob: Blob;
  createdAt: string;
}

export interface Meta {
  key: string;
  value: unknown;
}
