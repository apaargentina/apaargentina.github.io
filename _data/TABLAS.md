# Tablas editables del sitio

Estos archivos CSV alimentan la página "La Asociación". Se pueden editar directamente en GitHub
(lápiz ✏️ → editar → "Commit changes"). La primera fila son los nombres de las columnas y **no se cambia**.
Si un dato tiene coma, va entre comillas: `"Hola, mundo"`. Las celdas vacías están permitidas.
Para varios valores en una misma celda (provincias, mails) se separan con punto y coma: `Salta; Jujuy`.

| Archivo | Qué alimenta | Columnas |
|---|---|---|
| `comisiones.csv` | Comisión Directiva y demás comisiones | `comision`, `cargo`, `nombre`, `foto` |
| `delegaciones.csv` | Mapa de delegaciones (polígonos) y su lista | `delegacion`, `descripcion`, `provincias`, `partidos`, `delegado`, `institucion`, `direccion`, `email`, `telefono`, `foto` |
| `grupos.csv` | Mapa de grupos (puntos) y su lista | `grupo`, `institucion`, `responsable`, `linea`, `ciudad`, `provincia`, `lat`, `lon`, `email`, `web`, `foto` |

## Delegaciones: cómo se define el territorio (sin GeoJSON)

- **`provincias`**: nombres de provincias separados por `;`. Se pintan completas.
  Se escriben como siempre (con o sin tildes, mayúsculas indiferentes). Se aceptan `Tierra del Fuego` y `CABA`.
- **`partidos`**: para delegaciones que son **parte de la provincia de Buenos Aires**.
  Nombres de partidos separados por `;` (ej. `La Plata; Berisso; Ensenada`). El nombre debe ser el oficial
  (ej. `General Pueyrredón` para Mar del Plata, `Bahía Blanca`, `Adolfo Gonzales Chaves`).
  El valor especial `resto` significa "todos los partidos de Buenos Aires que no estén en otra delegación".
  Un partido o provincia no puede estar en dos delegaciones.
- Si un nombre está mal escrito, **ese territorio simplemente no se pinta**. Para revisar, abrir el sitio,
  apretar F12 y mirar la pestaña "Consola": avisa qué nombres no encontró.
- **`email`**: puede haber varios, separados por `;`.

## Grupos

- `lat` y `lon` son las coordenadas (en Google Maps: clic derecho sobre el lugar → copiar el primer número de cada par).
  Con punto decimal, ej. `-34.9050`. Varios grupos en la misma institución pueden usar las mismas coordenadas:
  el mapa los agrupa y los separa al hacer zoom.
- Las filas actuales son **de prueba** (laboratorios de las delegaciones y dos "Grupo de ejemplo"); reemplazarlas por los reales.

## Fotos

Subir la imagen a la carpeta del tipo y escribir **solo el nombre del archivo** en la columna `foto`:

| Tabla | Carpeta | Ejemplo en la celda |
|---|---|---|
| `delegaciones.csv`, `comisiones.csv` | `assets/img/personas/` | `espinoza.jpg` |
| `grupos.csv` | `assets/img/grupos/` | `lab-parasitologia.jpg` |

- Si la foto está en otra carpeta, escribir la ruta desde la raíz del sitio (ej. `assets/img/otra/foto.jpg`).
  También se acepta una URL de imagen.
- **No pegar el link de la página de GitHub** (el que se ve al abrir el archivo en github.com): es una página, no la imagen.
- Recomendado: cuadradas, ~400×400 px, nombres en minúsculas sin espacios ni tildes. Sin foto se muestra un ícono genérico (persona o edificio).
- Más detalles sobre imágenes en el `README.md`.

## PDFs de directorios

Los PDF "Directorio de Delegados/as" y "Directorio de grupos de investigación" se generan solos al guardar
`delegaciones.csv` o `grupos.csv` (tarda 1-2 minutos). Quedan ordenados así: delegaciones, en el orden del archivo;
grupos, por provincia, ciudad y nombre. Si un CSV tiene un error de formato, la automatización falla y avisa por mail:
en ese caso el PDF anterior se mantiene. Se puede ver en la pestaña **Actions** de GitHub.

## Comisiones y convenios

- **Comisiones**: aparecen en el orden del archivo; para crear una nueva, escribir un nombre nuevo en `comision`.
  Si `cargo` tiene texto se muestra como píldora (Comisión Directiva); si está vacío, no.
- **Convenios**: no están en una tabla; se editan en `_config.yml`, bloque `convenios` (nombre y url de cada uno).