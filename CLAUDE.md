# Cuaderno de tiro

PWA personal y offline para registrar tiro con aire comprimido. La especificación completa está en `SPEC.md`; léela antes de añadir funciones y respeta sus fases.

## Comandos

- `npm run dev`: servidor de Vite accesible en la red local (`--host`) para probar en el móvil.
- `npm test`: tests de Vitest (cálculos, resúmenes y copias de seguridad).
- `npm run build`: comprobación de tipos y build de producción en `dist/`.
- `node scripts/icons.mjs`: regenera los PNG de los iconos desde `public/icon.svg` (necesita Playwright).

## Estructura

- `src/lib/`: lógica pura y testeada, sin React ni Dexie. Unidades y conversiones (`units.ts`), agrupación (`grouping.ts`), dianas y puntuación (`targets.ts`), clics sugeridos (`corrections.ts`), récords, contadores e insignias (`summary.ts`).
- `src/db/`: esquema de Dexie (`db.ts`), tipos de las entidades (`types.ts`) y copias JSON/CSV (`backup.ts`).
- `src/ui/`: componentes compartidos, la diana interactiva (`TargetView.tsx`), enrutado por hash y hooks de datos.
- `src/screens/`: una pantalla por archivo.

## Convenciones

- Interfaz, comentarios y mensajes en español. Identificadores de código en inglés.
- Unidades métricas siempre en el modelo: mm, m, m/s, g, J, °C, hPa, bar. Las conversiones (grains, km/h, MOA, mrad) se hacen solo al mostrar o al leer un campo.
- Coordenadas de impacto en mm desde el centro de la diana, x a la derecha e y hacia arriba. El SVG invierte la y al dibujar.
- Ids de texto (`crypto.randomUUID()`), para que importar copias no choque.
- Cualquier cálculo nuevo va en `src/lib/` con sus tests.
- Cambios de esquema: añadir una nueva `this.version(n)` en `db.ts` con su migración; nunca editar la versión 1 ya publicada. Si cambia la forma de los datos, subir `BACKUP_VERSION` y mantener la importación de copias antiguas.
- Diseño para móvil en vertical: botones de 48 px o más, nada de interacciones finas sin alternativa (la diana tiene zoom y ajuste con flechas).
- Los colores salen de las variables CSS de `styles.css`; el modo oscuro y el alto contraste solo redefinen variables.
- Enrutado por hash (`#/ruta`) para que funcione en GitHub Pages sin configurar el servidor.

## Reglas de dominio que no son obvias

- Puntuación ISSF: un impacto puntúa el anillo si el balín toca la línea (distancia al centro menos el radio del balín). La decimal es 10,0 justo al tocar el 10 y sube una décima por cada décima parte del ancho de anillo, con máximo 10,9.
- Field Target: la zona de abatimiento solo cuenta si el balín pasa entero (sin tocar el borde).
- El calibre para puntuar es el diámetro de cabeza del balín si se conoce; si no, el calibre del balín o del arma.
- La dispersión extrema es centro a centro. El CEP 50 % es la mediana de las distancias al PMI.
- Los disparos marcados como fallidos puntúan 0 y no entran en la agrupación.
- El primer disparo de cada serie se marca como "primero en frío" por defecto.

## Publicación

Cada push a `main` ejecuta los tests y publica en GitHub Pages (`.github/workflows/deploy.yml`) con base `/cuaderno-tiro/`. En el repositorio, Settings › Pages › Source debe estar en "GitHub Actions".
