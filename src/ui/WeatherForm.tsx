import type { Weather } from '../db/types';
import { kmhToMs, msToKmh } from '../lib/units';
import { NumberInput, Segmented, Toggle } from './components';
import { LIGHT, options, WIND_CONSTANCY } from './labels';

const CLOCK = Array.from({ length: 12 }, (_, i) => i + 1);

export function WeatherForm({
  value, onChange, windUnit,
}: {
  value: Weather; onChange: (w: Weather) => void; windUnit: 'ms' | 'kmh';
}) {
  const set = (patch: Partial<Weather>) => onChange({ ...value, ...patch });
  const toUi = (ms?: number) => (ms === undefined ? undefined : windUnit === 'kmh' ? round1(msToKmh(ms)) : ms);
  const fromUi = (v?: number) => (v === undefined ? undefined : windUnit === 'kmh' ? kmhToMs(v) : v);
  const unit = windUnit === 'kmh' ? 'km/h' : 'm/s';

  return (
    <div className="weather">
      <div className="grid2">
        <NumberInput label="Viento medio" unit={unit} value={toUi(value.windSpeedMs)} onChange={(v) => set({ windSpeedMs: fromUi(v) })} />
        <NumberInput label="Ráfagas" unit={unit} value={toUi(value.windGustMs)} onChange={(v) => set({ windGustMs: fromUi(v) })} />
      </div>
      <div className="field">
        <span className="field-label">Dirección del viento (reloj: 12 de cara, 3 desde la derecha)</span>
        <div className="clock">
          {CLOCK.map((h) => {
            const a = (h / 12) * 2 * Math.PI;
            return (
              <button
                type="button"
                key={h}
                className={value.windClock === h ? 'on' : ''}
                style={{ left: `${50 + 40 * Math.sin(a)}%`, top: `${50 - 40 * Math.cos(a)}%` }}
                onClick={() => set({ windClock: value.windClock === h ? undefined : h })}
              >
                {h}
              </button>
            );
          })}
          <span className="clock-center" aria-hidden>
            ▲
          </span>
        </div>
      </div>
      <Segmented
        label="Constancia del viento"
        value={value.windConstancy}
        onChange={(v) => set({ windConstancy: v })}
        options={options(WIND_CONSTANCY)}
        allowNone
      />
      <div className="grid3">
        <NumberInput label="Temperatura" unit="°C" allowNegative value={value.temperatureC} onChange={(v) => set({ temperatureC: v })} />
        <NumberInput label="Humedad" unit="%" value={value.humidityPct} onChange={(v) => set({ humidityPct: v })} />
        <NumberInput label="Presión" unit="hPa" value={value.pressureHpa} onChange={(v) => set({ pressureHpa: v })} />
      </div>
      <Segmented label="Luz" value={value.light} onChange={(v) => set({ light: v })} options={options(LIGHT)} allowNone />
      <Toggle label="Precipitación" value={value.precipitation} onChange={(v) => set({ precipitation: v })} />
    </div>
  );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
