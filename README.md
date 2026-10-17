# Sitio web — Asociación Parasitológica Argentina

Sitio estático hecho con [Jekyll](https://jekyllrb.com/) y publicado en GitHub Pages
(`apargentina.org.ar`). Cada vez que se sube un cambio a la rama `main`, GitHub reconstruye
y publica el sitio solo; el avance se ve en la pestaña **Actions** del repositorio.

## ¿Dónde se edita cada cosa?

| Quiero cambiar… | Archivo |
|---|---|
| Comisión Directiva y otras comisiones | `_data/comisiones.csv` |
| Delegaciones (mapa y lista) | `_data/delegaciones.csv` |
| Grupos de investigación (mapa y lista) | `_data/grupos.csv` |
| Convenios (badges) | `_config.yml` → bloque `convenios` |
| Correos del directorio de Contacto | `_config.yml` → bloque `contactos` |
| Precios, vigencia y formularios de Asociate | `_config.yml` → bloque `asociate` |
| Links de redes, Estatutos, formulario de nuevos grupos, revista | `_config.yml` (arriba) |
| Una novedad, evento, curso o convocatoria | un archivo nuevo en `_posts/` |
| Menú de navegación | `_config.yml` → `nav` |

Las tablas `.csv` se explican en [`_data/TABLAS.md`](_data/TABLAS.md).
En `_config.yml`, un valor vacío (`""`) deja el botón o link atenuado y sin destino. Después de
editar `_config.yml` hay que esperar el despliegue completo: ese archivo solo se lee al construir el sitio.

## Estructura del repositorio

```
_config.yml            ← datos generales, links, precios, contactos, menú
_data/                 ← tablas CSV editables + TABLAS.md
_includes/             ← piezas reutilizables (header, footer, tarjetas, archivo por categoría…)
_layouts/              ← plantillas: default / page / post
_posts/                ← novedades, eventos, cursos, convocatorias (YYYY-MM-DD-titulo.md)
pages/                 ← asociacion, eventos, formacion-convocatorias, asociate, contacto
index.html             ← inicio
assets/
  css/main.css         ← todo el diseño (mobile-first; cortes en 700 px y 1100 px)
  js/main.js           ← menú, carrusel, filtros, toggle de Asociate, botón Copiar
  js/map.js            ← mapa de delegaciones y grupos (Leaflet)
  geo/                 ← contornos de provincias y partidos (IGN) para el mapa — no tocar
  docs/                ← PDFs: estatutos, bases de apoyos, convenios, directorios (automáticos)
  img/
    logo.png, favicon.svg
    homepage_carrousel/ ← imágenes del carrusel de inicio
    personas/          ← fotos de delegados/as y de integrantes de comisiones
    grupos/            ← fotos de grupos de investigación
    noticias/          ← imágenes de las entradas de _posts
scripts/build_pdfs.py  ← genera los PDF de directorios a partir de los CSV
.github/workflows/     ← automatizaciones (PDFs)
```

## Imágenes: dónde guardarlas y cómo escribirlas

Subir el archivo a la carpeta que corresponde (en GitHub: **Add file → Upload files**) y escribir
**solo su nombre** en la celda del CSV o en el encabezado de la entrada. La misma regla vale para todo:

| Se escribe… | Se usa… |
|---|---|
| `perez.jpg` | `assets/img/<carpeta del tipo>/perez.jpg` |
| `assets/img/otra-carpeta/perez.jpg` | esa ruta, desde la raíz del sitio |
| `https://…/foto.jpg` | esa URL de imagen |

| Para… | Carpeta | Dónde se escribe | Tamaño recomendado |
|---|---|---|---|
| Delegados/as e integrantes de comisiones | `assets/img/personas/` | columna `foto` de `delegaciones.csv` y `comisiones.csv` | cuadrada, 400×400 px |
| Grupos de investigación | `assets/img/grupos/` | columna `foto` de `grupos.csv` | cuadrada, 400×400 px |
| Imagen de una entrada | `assets/img/noticias/` | `imagen:` en el encabezado del post | horizontal, 1200×675 px (16:9) |

Consejos:
- Nombres en minúsculas, sin espacios ni tildes: `maria-perez.jpg`.
- JPG para fotos, PNG si tiene transparencia o texto. Idealmente menos de 300 KB (se puede achicar en squoosh.app).
- **No pegar el link de la página de GitHub** (`github.com/…/blob/…`) ni el de ImgBB u otro sitio de pruebas.
  El sitio corrige los de GitHub, pero lo correcto es subir la imagen al repositorio.
- Sin foto, las tarjetas muestran un ícono (persona o edificio) y las entradas, el logo de la APA.

### Imágenes dentro del texto de una entrada

Subir la imagen a `assets/img/noticias/` y, donde corresponda en el texto de la entrada, escribir:

```markdown
![Descripción breve de la imagen](/assets/img/noticias/nombre-de-la-imagen.jpg)
```

La descripción es importante: la leen los lectores de pantalla y se ve si la imagen no carga.

## Entradas (`_posts/`)

Crear un archivo `_posts/AAAA-MM-DD-titulo-corto.md` (la fecha del nombre es la fecha de la entrada):

```yaml
---
layout: post
title: "Título de la entrada"
date: 2026-07-15
categories: ["Eventos", "Congreso", "Chagas"]
imagen: nombre-de-la-imagen.jpg        # opcional, va en assets/img/noticias/
excerpt: "Resumen breve para las tarjetas."
---

Contenido en Markdown…
```

### Categorías

Se escriben **siempre entre corchetes y con comillas**. La primera categoría de sección decide la página:

- `"Eventos"` → aparece en **Eventos**.
- `"Formación y Convocatorias"` → aparece en **Formación y Convocatorias**.
- Cualquier otra categoría de la lista se convierte sola en un **botón de filtro** de esa página
  (en orden alfabético). Si ninguna entrada de la página la usa, no aparece el botón.

El texto es **estricto**: se ve tal cual está entre comillas, y `"Zoología"`, `"zoologia"` y `"ZOOLOGIA"`
son tres categorías distintas (tres botones). Escribir `"eventos"` en vez de `"Eventos"` deja la entrada
fuera de la página: después de publicar, revisar que aparezca. Sin corchetes ni comillas
(`categories: Eventos Chagas`) Jekyll separa por espacios, así que no usarlo.
Las entradas también salen en las tarjetas de novedades de Inicio.

## PDFs de directorios (automáticos)

`assets/docs/directorio-delegados.pdf` y `assets/docs/directorio-grupos.pdf` **no se editan a mano**:
cuando alguien cambia `_data/delegaciones.csv` o `_data/grupos.csv`, una automatización los regenera
y los guarda en el repositorio (aparece un commit de `github-actions[bot]`). Se puede seguir en
**Actions → "Generar PDFs de directorios"**, o lanzar a mano con **Run workflow**.
Requisito en GitHub: Settings → Actions → General → Workflow permissions → **Read and write permissions**.
Como el bot también sube commits, antes de subir cambios desde el computador hay que hacer `git pull`.
