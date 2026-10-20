// Contraste de colores para el tema: qué tinta usar sobre el acento y cuándo
// el acento no se lee como texto sobre el fondo elegido.

/** Convierte '#rgb' o '#rrggbb' en [r, g, b] de 0 a 255. */
export function parseHex(hex: string): [number, number, number] | undefined {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return undefined;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** Luminancia relativa WCAG (0 negro, 1 blanco). */
export function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Relación de contraste WCAG entre dos colores (de 1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Tinta casi negra o blanca, la que mejor se lea sobre el color dado. */
export function inkOn(color: string): string {
  const dark = '#1b1f24';
  const light = '#ffffff';
  return contrastRatio(color, dark) >= contrastRatio(color, light) ? dark : light;
}

/**
 * Color para texto e iconos de acento sobre el fondo: el propio acento si se
 * lee (contraste de 3:1 o más) y, si no, el color de texto normal.
 */
export function accentInk(accent: string, bg: string, text: string): string {
  return contrastRatio(accent, bg) >= 3 ? accent : text;
}

/** Convierte 'rgb(r, g, b)' (lo que devuelve getComputedStyle) o un hex a '#rrggbb'. */
export function toHex(color: string): string | undefined {
  const c = color.trim();
  if (parseHex(c)) {
    const rgb = parseHex(c)!;
    return '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  const m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(c);
  if (!m) return undefined;
  return '#' + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('');
}
