import { useEffect, useState } from 'react';
import { db, newId, nowIso } from '../db/db';

export function loadImage(src: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(src);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo guardar la imagen.'))), 'image/jpeg', quality),
  );
}

/** Reduce una foto para que no llene el almacenamiento del móvil. */
export async function shrinkImage(file: Blob, maxSide = 1600): Promise<Blob> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvasToBlob(canvas);
}

export interface Crop {
  /** Centro del recorte en fracciones de la imagen (0–1). */
  cx: number;
  cy: number;
  /** Lado del recorte como fracción del lado corto de la imagen (0–1]. */
  size: number;
}

export async function cropSquare(img: HTMLImageElement, crop: Crop, out = 512): Promise<Blob> {
  const short = Math.min(img.naturalWidth, img.naturalHeight);
  const side = short * crop.size;
  const sx = crop.cx * img.naturalWidth - side / 2;
  const sy = crop.cy * img.naturalHeight - side / 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = out;
  canvas.getContext('2d')!.drawImage(img, sx, sy, side, side, 0, 0, out, out);
  return canvasToBlob(canvas, 0.9);
}

export async function savePhoto(blob: Blob): Promise<string> {
  const id = newId();
  await db.photos.put({ id, blob, createdAt: nowIso() });
  return id;
}

/** URL temporal para mostrar una foto guardada. */
export function usePhotoUrl(photoId?: string): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let alive = true;
    let created: string | undefined;
    setUrl(undefined);
    if (photoId) {
      db.photos.get(photoId).then((p) => {
        if (!alive || !p) return;
        created = URL.createObjectURL(p.blob);
        setUrl(created);
      });
    }
    return () => {
      alive = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [photoId]);
  return url;
}
