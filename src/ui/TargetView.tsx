import { useRef, useState, type PointerEvent } from 'react';
import type { Point } from '../lib/grouping';
import type { Target } from '../lib/targets';

export interface DrawnShot extends Point {
  id: string;
  order: number;
  misfire?: boolean;
}

interface Props {
  target: Target;
  shots: DrawnShot[];
  caliberMm: number;
  mpi?: Point | null;
  selectedId?: string;
  onAdd?: (p: Point) => void;
  onSelect?: (id: string | undefined) => void;
}

const ZOOMS = [1, 2, 4, 8];
const TAP_SLOP_PX = 8;

/**
 * Diana dibujada a escala en mm. Tocar añade un impacto, arrastrar desplaza la
 * vista cuando hay zoom. El eje y del modelo va hacia arriba; el del SVG, hacia abajo.
 */
export function TargetView({ target, shots, caliberMm, mpi, selectedId, onAdd, onSelect }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<Point>({ x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; center: Point; moved: boolean } | null>(null);

  const half = target.cardSize / 2 / zoom;
  const limit = target.cardSize / 2;
  const clampCenter = (c: Point, h = half): Point => ({
    x: Math.max(-limit + h, Math.min(limit - h, c.x)),
    y: Math.max(-limit + h, Math.min(limit - h, c.y)),
  });

  const toMm = (e: PointerEvent): Point => {
    const r = svg.current!.getBoundingClientRect();
    return {
      x: center.x - half + ((e.clientX - r.left) / r.width) * 2 * half,
      y: center.y + half - ((e.clientY - r.top) / r.height) * 2 * half,
    };
  };

  const setZoomAround = (z: number, around: Point = center) => {
    setZoom(z);
    setCenter(clampCenter(around, target.cardSize / 2 / z));
  };

  const onDown = (e: PointerEvent) => {
    svg.current!.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, center, moved: false };
  };

  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (!d.moved && Math.hypot(dx, dy) < TAP_SLOP_PX) return;
    d.moved = true;
    if (zoom === 1) return;
    const r = svg.current!.getBoundingClientRect();
    const mmPerPx = (2 * half) / r.width;
    setCenter(clampCenter({ x: d.center.x - dx * mmPerPx, y: d.center.y + dy * mmPerPx }));
  };

  const onUp = (e: PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved) return;
    const p = toMm(e);
    const rc = caliberMm / 2;
    const hit = [...shots].reverse().find((s) => Math.hypot(s.x - p.x, s.y - p.y) <= rc);
    if (hit) {
      onSelect?.(hit.id === selectedId ? undefined : hit.id);
      return;
    }
    if (onAdd) {
      onAdd({ x: round2(p.x), y: round2(p.y) });
    } else {
      onSelect?.(undefined);
    }
  };

  const rc = caliberMm / 2;
  const label = Math.max(caliberMm * 0.55, 1.2);
  const stroke = target.cardSize / 400 / Math.sqrt(zoom);

  return (
    <div className="target-wrap">
      <svg
        ref={svg}
        className="target"
        viewBox={`${center.x - half} ${-center.y - half} ${2 * half} ${2 * half}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => (drag.current = null)}
        role="img"
        aria-label={`Diana ${target.name}`}
      >
        <rect x={-limit} y={-limit} width={2 * limit} height={2 * limit} className="t-card" />
        <TargetFace target={target} stroke={stroke} />
        {mpi && shots.length > 1 && (
          <g className="t-mpi">
            <line x1={mpi.x - rc * 1.4} x2={mpi.x + rc * 1.4} y1={-mpi.y} y2={-mpi.y} strokeWidth={stroke * 1.5} />
            <line x1={mpi.x} x2={mpi.x} y1={-mpi.y - rc * 1.4} y2={-mpi.y + rc * 1.4} strokeWidth={stroke * 1.5} />
          </g>
        )}
        {shots.map((s) => (
          <g key={s.id} className={`t-shot ${s.id === selectedId ? 'selected' : ''} ${s.misfire ? 'misfire' : ''}`}>
            <circle cx={s.x} cy={-s.y} r={rc} strokeWidth={stroke * 1.5} />
            <text x={s.x} y={-s.y} fontSize={label} dominantBaseline="central" textAnchor="middle">
              {s.order}
            </text>
          </g>
        ))}
      </svg>
      <div className="zoom-bar">
        {ZOOMS.map((z) => (
          <button
            key={z}
            type="button"
            className={z === zoom ? 'on' : ''}
            onClick={() => setZoomAround(z, z === 1 ? { x: 0, y: 0 } : (mpi ?? center))}
          >
            {z}×
          </button>
        ))}
      </div>
    </div>
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function TargetFace({ target, stroke }: { target: Target; stroke: number }) {
  if (target.kind === 'silhouette') {
    return (
      <rect
        x={-target.width / 2}
        y={-target.height / 2}
        width={target.width}
        height={target.height}
        className="t-black"
        rx={2}
      />
    );
  }
  const black = target.blackDiameter ?? 0;
  const rings = [...target.rings].sort((a, b) => b.diameter - a.diameter);
  return (
    <g>
      {black > 0 && <circle r={black / 2} className="t-black" />}
      {rings.map((r) => {
        const onBlack = r.diameter <= black + 1e-6;
        if (r.gauge === 'clean') return <circle key={r.diameter} r={r.diameter / 2} className="t-killzone" />;
        return (
          <circle
            key={r.diameter}
            r={r.diameter / 2}
            className={onBlack ? 't-ring-light' : 't-ring-dark'}
            strokeWidth={stroke}
          />
        );
      })}
      {target.decimal && target.decimal.tenRadius < 1 && <circle r={target.decimal.tenRadius} className="t-dot" />}
      {target.kind === 'rings' && target.decimal && <RingNumbers target={target} />}
    </g>
  );
}

function RingNumbers({ target }: { target: Extract<Target, { kind: 'rings' }> }) {
  const w = target.decimal!.ringWidth;
  const black = target.blackDiameter ?? 0;
  return (
    <g className="t-numbers">
      {target.rings
        .filter((r) => r.value >= 1 && r.value <= 8)
        .map((r) => {
          const pos = r.diameter / 2 - w / 2;
          const light = r.diameter <= black + 1e-6;
          return (
            <g key={r.value} className={light ? 'light' : 'dark'} fontSize={w * 0.6}>
              <text x={0} y={-pos} textAnchor="middle" dominantBaseline="central">{r.value}</text>
              <text x={0} y={pos} textAnchor="middle" dominantBaseline="central">{r.value}</text>
              <text x={-pos} y={0} textAnchor="middle" dominantBaseline="central">{r.value}</text>
              <text x={pos} y={0} textAnchor="middle" dominantBaseline="central">{r.value}</text>
            </g>
          );
        })}
    </g>
  );
}
