import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cropSquare, loadImage, savePhoto, shrinkImage, usePhotoUrl, type Crop } from './image';
import { back } from './router';

export function parseNumber(s: string): number | undefined {
  const t = s.trim().replace(',', '.');
  if (t === '' || t === '-' || t === '.') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function show(n?: number): string {
  return n === undefined ? '' : String(n).replace('.', ',');
}

export function Page({ title, children, actions, onBack }: { title: string; children: ReactNode; actions?: ReactNode; onBack?: boolean }) {
  return (
    <section className="page">
      <div className="page-head">
        {onBack && (
          <button className="icon-btn" onClick={() => back()} aria-label="Volver">
            ‹
          </button>
        )}
        <h1>{title}</h1>
        <div className="page-actions">{actions}</div>
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div className={`card ${onClick ? 'clickable' : ''} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function TextInput({
  label, value, onChange, placeholder, multiline, type = 'text',
}: {
  label: string; value: string | undefined; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; type?: string;
}) {
  return (
    <Field label={label}>
      {multiline ? (
        <textarea value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} rows={3} />
      ) : (
        <input type={type} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}

/** Campo numérico que acepta coma decimal y deja el campo vacío como `undefined`. */
export function NumberInput({
  label, value, onChange, unit, hint, step, allowNegative,
}: {
  label: string; value: number | undefined; onChange: (v: number | undefined) => void; unit?: string; hint?: ReactNode;
  step?: number; allowNegative?: boolean;
}) {
  const [text, setText] = useState(show(value));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(show(value));
    }
  }, [value]);
  const set = (t: string) => {
    setText(t);
    const n = parseNumber(t);
    last.current = n;
    onChange(n);
  };
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
        {unit && step !== undefined && ` (${unit})`}
      </label>
      <div className={`with-unit ${step !== undefined ? 'stepper' : ''}`}>
        {step !== undefined && (
          <button type="button" className="step" onClick={() => set(show(round((value ?? 0) - step)))} aria-label={`${label}: menos`}>
            −
          </button>
        )}
        <input id={id} inputMode={allowNegative ? 'text' : 'decimal'} value={text} onChange={(e) => set(e.target.value)} />
        {step !== undefined && (
          <button type="button" className="step" onClick={() => set(show(round((value ?? 0) + step)))} aria-label={`${label}: más`}>
            +
          </button>
        )}
        {unit && step === undefined && <span className="unit">{unit}</span>}
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function Select<T extends string | number>({
  label, value, onChange, options, empty,
}: {
  label: string; value: T | undefined; onChange: (v: T) => void; options: { value: T; label: string }[]; empty?: string;
}) {
  return (
    <Field label={label}>
      <select
        value={value === undefined ? '' : String(value)}
        onChange={(e) => {
          const o = options.find((x) => String(x.value) === e.target.value);
          if (o) onChange(o.value);
          else if (e.target.value === '') onChange(undefined as unknown as T);
        }}
      >
        {(empty !== undefined || value === undefined) && <option value="">{empty ?? 'Elegir…'}</option>}
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** Botones grandes para elegir una opción, cómodos con guantes. */
export function Segmented<T extends string | number>({
  label, value, onChange, options, allowNone,
}: {
  label: string; value: T | undefined; onChange: (v: T | undefined) => void; options: { value: T; label: string }[];
  allowNone?: boolean;
}) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="segmented">
        {options.map((o) => (
          <button
            type="button"
            key={String(o.value)}
            className={o.value === value ? 'on' : ''}
            onClick={() => onChange(allowNone && o.value === value ? undefined : o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean | undefined; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function Scale({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void }) {
  return (
    <Segmented
      label={label}
      value={value}
      onChange={onChange}
      allowNone
      options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
    />
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function PhotoView({ photoId, className, alt, fallback }: { photoId?: string; className?: string; alt: string; fallback?: ReactNode }) {
  const url = usePhotoUrl(photoId);
  if (!url) return <div className={`photo-fallback ${className ?? ''}`}>{fallback}</div>;
  return <img src={url} className={className} alt={alt} />;
}

/** Elegir una foto de la cámara o la galería. Devuelve el id de la foto guardada. */
export function PhotoPicker({
  label, onPicked, capture, circle,
}: {
  label: string; onPicked: (photoId: string) => void; capture?: boolean; circle?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [cropping, setCropping] = useState<Blob>();
  const [busy, setBusy] = useState(false);
  const handle = async (file?: File) => {
    if (!file) return;
    if (circle) {
      setCropping(file);
      return;
    }
    setBusy(true);
    try {
      onPicked(await savePhoto(await shrinkImage(file)));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button type="button" className="btn secondary" onClick={() => input.current?.click()} disabled={busy}>
        {busy ? 'Guardando…' : label}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture={capture ? 'environment' : undefined}
        hidden
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {cropping && (
        <CircleCropper
          file={cropping}
          onCancel={() => setCropping(undefined)}
          onDone={async (blob) => {
            setCropping(undefined);
            onPicked(await savePhoto(blob));
          }}
        />
      )}
    </>
  );
}

/** Recorte circular: arrastrar para encuadrar y deslizador para acercar. */
function CircleCropper({ file, onDone, onCancel }: { file: Blob; onDone: (b: Blob) => void; onCancel: () => void }) {
  const [img, setImg] = useState<HTMLImageElement>();
  const [url, setUrl] = useState<string>();
  const [crop, setCrop] = useState<Crop>({ cx: 0.5, cy: 0.5, size: 1 });
  const drag = useRef<{ x: number; y: number; crop: Crop } | null>(null);
  const VIEW = 280;

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    loadImage(file).then(setImg);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  if (!img || !url) return null;
  const short = Math.min(img.naturalWidth, img.naturalHeight);
  const scale = VIEW / (short * crop.size);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const clamp = (c: Crop): Crop => {
    const halfW = (short * c.size) / 2 / img.naturalWidth;
    const halfH = (short * c.size) / 2 / img.naturalHeight;
    return { ...c, cx: Math.min(1 - halfW, Math.max(halfW, c.cx)), cy: Math.min(1 - halfH, Math.max(halfH, c.cy)) };
  };

  return (
    <div className="modal">
      <div className="modal-body">
        <h2>Encuadra la foto</h2>
        <div
          className="cropper"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={(e) => {
            (e.target as Element).setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, crop };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            setCrop(
              clamp({
                ...d.crop,
                cx: d.crop.cx - (e.clientX - d.x) / w,
                cy: d.crop.cy - (e.clientY - d.y) / h,
              }),
            );
          }}
          onPointerUp={() => (drag.current = null)}
        >
          <img
            src={url}
            alt=""
            draggable={false}
            style={{ width: w, height: h, left: VIEW / 2 - crop.cx * w, top: VIEW / 2 - crop.cy * h }}
          />
          <div className="cropper-mask" />
        </div>
        <input
          type="range"
          min={0.2}
          max={1}
          step={0.01}
          value={1.2 - crop.size}
          onChange={(e) => setCrop(clamp({ ...crop, size: 1.2 - Number(e.target.value) }))}
          aria-label="Zoom"
        />
        <div className="row">
          <button className="btn secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn" onClick={async () => onDone(await cropSquare(img, crop))}>
            Usar foto
          </button>
        </div>
      </div>
    </div>
  );
}

export function confirmAction(message: string): boolean {
  return window.confirm(message);
}
