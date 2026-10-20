# Cuaderno de tiro – Especificación

20 de octubre de 2026

## Resumen y objetivos

Una webapp instalable (PWA), de uso personal y sin conexión, para registrar sesiones de tiro deportivo con armas de aire comprimido (carabina y pistola) y analizar la precisión con rigor.

Objetivos:

- Registrar cada sesión con todas las variables que influyen en el disparo: arma, balín, distancia, posición, apoyo y meteorología.
- Marcar cada impacto sobre la diana y calcular puntuación, agrupación y desviación automáticamente.
- Dar mucho peso a las estadísticas: filtrar y comparar la precisión según cualquier condición registrada.
- Funcionar sin cobertura en la finca, con los datos guardados en el móvil y copia de seguridad exportable.

Fuera de alcance: cuentas de usuario, servidor propio, sincronización en la nube y cualquier uso comercial.

## Stack técnico y arquitectura

Todo corre en el navegador del móvil; no hay servidor. Propuesta de stack (Claude Code puede ajustarla si ve algo mejor):

| Pieza | Elección | Motivo |
| --- | --- | --- |
| Base | Vite + TypeScript | Rápido, tipado, fácil de mantener |
| Interfaz | React (o Svelte) + CSS propio | Componentes para formularios y diana interactiva |
| Datos | IndexedDB vía Dexie.js | Base de datos local, robusta y con consultas |
| Gráficas | Chart.js o ECharts | Líneas, barras, dispersión y mapas de calor |
| Offline | vite-plugin-pwa (service worker + manifest) | Instalable y usable sin cobertura |
| Alojamiento | GitHub Pages | Gratis y con HTTPS, requisito para PWA y cámara |

Requisitos generales:

- Diseño pensado para móvil en vertical, con botones grandes para usar en el puesto de tiro, incluso con guantes.
- Modo oscuro y modo de alto contraste para pleno sol.
- Unidades métricas por defecto (m, m/s, J, g, °C, hPa), con el peso del balín también en grains, que es como lo indican muchos fabricantes.
- Meteorología opcionalmente autocompletada con Open-Meteo cuando haya conexión, siempre editable a mano.

## Modelo de datos

Siete entidades: Perfil, Arma, Balín, Lote de balines, Sesión, Serie y Disparo. La meteorología va dentro de la sesión, con posibilidad de sobrescribirla por serie si cambia el viento.

### Perfil

Un único perfil, el tuyo, presentado con el cuidado de una app social aunque no salga del móvil.

- Foto de perfil, recortable en círculo desde la cámara o la galería, y foto de portada opcional.
- Nombre y apodo de tirador, club o lugar de tiro (por defecto, la finca) y una breve biografía.
- Fecha de inicio en el tiro, mano y ojo dominantes, y si usa gafas de tiro.
- Tarjeta de estadísticas destacadas: total de disparos, sesiones, mejor agrupación y racha de días de tiro.
- Insignias o hitos por gusto, por ejemplo 1.000 disparos, primera serie de 100 puntos o primera agrupación bajo 1 MOA a 25 m.
- Preferencias: unidades, tema claro u oscuro y color de acento.

### Arma

| Campo | Tipo / valores | Notas |
| --- | --- | --- |
| Nombre propio, marca, modelo | texto | |
| Tipo | carabina · pistola | |
| Sistema de propulsión | PCP · muelle/pistón · gas ram · CO2 · aire precargado (SSP) · multibombeo | Clave: el CO2 varía mucho con la temperatura y el PCP con la presión |
| Calibre | 4,5 mm (.177) · 5,5 mm (.22) · 6,35 mm (.25) · otro | |
| Energía nominal | J | La fuerza se mide en julios de energía en boca, no en newtons |
| Longitud de cañón, estriado | mm, paso | Opcional |
| Óptica | miras abiertas · punto rojo · visor | Aumentos, retícula (MOA/MRAD), valor del clic |
| Altura del eje óptico | mm sobre el ánima | Necesaria para la trayectoria |
| Distancia de cero | m | |
| Presión de llenado y de trabajo | bar | Solo PCP |
| Contador de disparos y fecha de mantenimiento | automático | Avisos de limpieza o revisión |

Cada arma lleva un nombre propio elegido por ti y una foto, y la app la muestra así en todas las listas, filtros y gráficas, como una ficha con su foto, nombre y cifras principales: disparos totales, mejor agrupación y balín favorito.

### Balín

| Campo | Tipo / valores | Notas |
| --- | --- | --- |
| Marca y modelo | texto | |
| Forma | wadcutter (plano) · domed (redondo) · pointed · hollow point · slug · otro | |
| Calibre | mm | Incluido el diámetro real de cabeza si se conoce, por ejemplo 4,52 |
| Peso | g y grains | Conversión automática: 1 gr = 0,0648 g |
| Coeficiente balístico (BC) | número | Opcional, para el cálculo de trayectoria |

Un **lote** es una caja concreta (balín + número de lote + fecha de compra + cantidad), porque la precisión puede variar entre lotes del mismo modelo.

### Sesión

- Fecha y hora de inicio y fin, lugar (por defecto, la finca) y notas.
- Estado físico opcional: descanso, cansancio, cafeína (escala 1–5), útil para cruzar con la precisión.
- **Meteorología:**
    - Viento: velocidad media y ráfagas (m/s o km/h) y dirección relativa al disparo en formato reloj (12 = de cara, 3 = desde la derecha, 6 = de espaldas, 9 = desde la izquierda).
    - Constancia del viento: calma · constante · racheado · variable.
    - Temperatura (°C), humedad relativa (%) y presión atmosférica (hPa).
    - Luz: sol directo, nublado, contraluz o sol lateral, y precipitación.

### Serie

- Arma, lote de balines, distancia (m), tipo de diana y número de disparos.
- Posición: tendido · sentado · rodilla · de pie · banco.
- Apoyo: libre · bípode · saco · trípode · banco con reposo · a dos manos o una mano (pistola).
- Clics de corrección aplicados en el visor (elevación y deriva).
- Velocidades medidas con cronógrafo, si se dispone de él, y presión del depósito al empezar (PCP).
- Meteorología propia, si difiere de la de la sesión.

### Disparo

- Orden dentro de la serie.
- Coordenadas del impacto (x, y) en mm desde el centro, marcadas tocando sobre la diana dibujada a escala.
- Puntuación, calculada automáticamente según la diana, con puntuación decimal opcional.
- Velocidad (m/s), si se mide.
- Marcas opcionales: disparo fallido, "tirón" consciente o primer disparo en frío.

### Dianas predefinidas

ISSF carabina aire 10 m, ISSF pistola aire 10 m, Field Target (zona de abatimiento), siluetas metálicas y diana personalizada (diámetro de anillos y valores). Cada diana guarda sus medidas reales en mm para poder puntuar y medir a escala.

## Cálculos balísticos y métricas de precisión

Cada serie calcula automáticamente estas métricas a partir de las coordenadas de los impactos. Las distancias angulares permiten comparar series tiradas a distancias distintas.

### Energía y velocidad

Energía en boca a partir de la velocidad medida y el peso del balín (m en kg, v en m/s):

```
E = ½ · m · v²
```

- Por serie: velocidad media, desviación típica (SD) y dispersión extrema (ES) de velocidades. Una SD alta suele explicar dispersión vertical a distancia.
- Energía media y su comparación con la nominal del arma.
- PCP: curva de velocidad frente a número de disparo desde el llenado, para localizar la meseta de presión estable.
- CO2: velocidad frente a temperatura.

### Agrupación

| Métrica | Qué mide |
| --- | --- |
| Punto medio de impacto (PMI) | Centro de la agrupación; su desplazamiento respecto al centro de la diana indica un error de reglaje |
| Dispersión extrema (ES) | Distancia entre los dos impactos más alejados, centro a centro (resta el calibre a la medida de bordes exteriores) |
| Radio medio (MR) | Distancia media de cada impacto al PMI; más estable estadísticamente que la ES |
| Desviación típica horizontal y vertical | Separa la dispersión lateral (viento, cante) de la vertical (velocidad, respiración) |
| CEP 50 % | Radio del círculo que contiene la mitad de los disparos |
| Puntuación total, media y decimal | Según la diana de la serie |

Todas en mm y también en unidades angulares, para comparar distancias:

```
MOA  = tamaño (mm) / (distancia (m) × 0,2909)
mrad = tamaño (mm) / distancia (m)
```

### Correcciones sugeridas

A partir del PMI y del valor de clic del visor, la app propone cuántos clics de elevación y deriva aplicar para centrar.

### Trayectoria (fase posterior)

Con BC, velocidad, altura del visor y distancia de cero, una calculadora balística sencilla estima la caída y la deriva por viento a cada distancia. Los impactos reales sirven para validar y ajustar el BC. El viento cruzado efectivo se obtiene de la dirección en formato reloj: a las 3 o las 9 actúa el 100 %, a la 1, 5, 7 o 11 alrededor del 50 %, y a las 2, 4, 8 o 10 alrededor del 87 %.

## Estadísticas, filtros y comparativas

La pantalla de análisis es el núcleo de la app: un panel de filtros combinables y una métrica a elegir (por defecto, el radio medio en MOA), que alimentan todas las gráficas.

### Filtros

Arma, balín y lote, distancia (rango), posición, apoyo, tipo de diana, rango de fechas, franja horaria, velocidad del viento (rango), dirección del viento (sector reloj), constancia del viento, temperatura (rango), luz y estado físico. Los filtros se pueden guardar como "vistas", por ejemplo "Carabina, 25 m, tendido, viento < 2 m/s".

### Comparativas "A frente a B"

Elegir una variable y comparar sus valores lado a lado con media, mediana y número de series, por ejemplo:

- Precisión por posición: tendido, sentado, rodilla, de pie.
- Balín A frente a balín B con la misma arma y distancia, para elegir el más preciso.
- Con y sin apoyo, o bípode frente a saco.
- Por sector de viento: cuánto abre la agrupación el viento de las 3 frente al de las 12.
- Mañana frente a tarde, o por temperatura (especialmente con CO2).

Cada comparativa avisa cuando hay pocos datos, por ejemplo con menos de 5 series por grupo, para no sacar conclusiones de ruido. Opcionalmente, una prueba estadística sencilla (t de Welch o Mann-Whitney) indica si la diferencia es probablemente real.

### Gráficas

- Evolución temporal de la métrica elegida, con media móvil, para ver el progreso.
- Dispersión de precisión frente a viento, frente a temperatura o frente a distancia, con línea de tendencia y coeficiente de correlación.
- Mapa de calor de impactos superpuestos sobre la diana: revela sesgos sistemáticos, como tirar abajo a la izquierda.
- Desplazamiento del PMI según la dirección del viento: medida real de la deriva.
- Puntuación según el orden del disparo dentro de la serie: detecta fatiga o el efecto del primer disparo en frío.
- Dispersión horizontal frente a vertical por posición, para saber si el problema es de pulso o de respiración.
- Velocidad por disparo desde el llenado (PCP) y SD de velocidad frente a dispersión vertical.

### Récords y resúmenes

Mejor agrupación por arma y distancia, mejor puntuación por diana, total de disparos por arma y balines restantes por lote.

## Pantallas y flujo de uso

Cinco pestañas en una barra inferior: Inicio, Sesión, Historial, Análisis y Equipo. La pestaña Sesión contiene también la pantalla de cada serie. El perfil se abre tocando tu foto en la cabecera.

| Pantalla | Contenido |
| --- | --- |
| Inicio | Cabecera con tu foto y nombre, botón grande "Nueva sesión", última sesión, récords y avisos de mantenimiento |
| Sesión en curso | Meteo de la sesión, lista de series y botón "Nueva serie" |
| Serie | Diana a escala donde se toca cada impacto, con métricas en vivo (PMI, MR, puntuación) y foto de la diana |
| Historial | Sesiones por fecha, con búsqueda y filtros rápidos |
| Análisis | Filtros, comparativas y gráficas descritas arriba |
| Equipo | Armas, balines y lotes, más ajustes y copias de seguridad |

Flujo típico en el puesto de tiro:

1. Pulsar "Nueva sesión"; la meteo se autocompleta si hay conexión o se introduce a mano.
2. Crear una serie: la app recuerda el último arma, balín, distancia y posición para no repetirlos.
3. Disparar la serie y, al ir a la diana, tocar cada impacto sobre la diana dibujada; con zoom y ajuste fino para precisión de milímetro.
4. Opcionalmente, hacer una foto de la diana real y adjuntarla a la serie.
5. Revisar las métricas y la corrección de clics sugerida, y pasar a la siguiente serie.
6. Cerrar la sesión con unas notas.

Mejora posterior: detectar los impactos automáticamente a partir de la foto, con la diana como referencia de escala.

## Copias de seguridad, fases e instrucciones para Claude Code

Los datos viven solo en el móvil, así que la copia de seguridad es obligatoria desde la primera versión.

### Copias de seguridad

- Exportar todo a un archivo JSON (incluidas las fotos) e importarlo de nuevo, para restaurar o cambiar de móvil.
- Exportar series y disparos a CSV para analizarlos en una hoja de cálculo.
- Recordatorio si han pasado más de 30 días desde la última copia.
- Solicitar almacenamiento persistente al navegador, para que Android no borre los datos por falta de espacio.

### Fases de desarrollo

1. **Base:** estructura PWA, perfil, fichas de armas (con nombre y foto) y balines, sesiones, series, diana interactiva con puntuación y métricas de agrupación, exportar e importar JSON.
2. **Análisis:** filtros, vistas guardadas, comparativas A frente a B y las gráficas principales.
3. **Meteo y velocidad:** autocompletado con Open-Meteo, datos de cronógrafo, energía y curvas de PCP y CO2.
4. **Extras:** calculadora balística, correcciones de clics, mapa de calor, pruebas estadísticas y detección de impactos por foto.

### Cómo llevarlo a Claude Code

1. Crear una carpeta o repositorio nuevo, por ejemplo `cuaderno-tiro`, separado del proyecto actual.
2. Guardar este archivo como `SPEC.md` en la raíz.
3. Pedirle a Claude Code que lea `SPEC.md`, cree un `CLAUDE.md` con las convenciones del proyecto y empiece por la fase 1.
4. Probar en el móvil durante el desarrollo con el servidor local de Vite en la red de casa.
5. Al terminar cada fase, publicar en GitHub Pages e instalarla desde Chrome con "Añadir a pantalla de inicio".

Petición inicial sugerida para Code: *"Lee SPEC.md. Es una PWA personal y offline para registrar tiro con aire comprimido. Propón la estructura del proyecto y el esquema de Dexie, y luego implementa la fase 1 con tests para los cálculos de agrupación y puntuación."*
