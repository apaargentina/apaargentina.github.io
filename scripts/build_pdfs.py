#!/usr/bin/env python3
"""Genera los PDF de directorios a partir de los CSV de _data/.

  _data/delegaciones.csv -> assets/docs/directorio-delegados.pdf
  _data/grupos.csv       -> assets/docs/directorio-grupos.pdf

Usa Chromium (Playwright) para imprimir HTML a PDF.
Uso local:  pip install playwright && playwright install chromium && python scripts/build_pdfs.py
"""
import base64
import csv
import html
import sys
import unicodedata
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "_data"
OUT = ROOT / "assets" / "docs"
LOGO = ROOT / "assets" / "img" / "logo.png"

ACCENT = "#E87838"
INK = "#090201"
MID = "#584D36"
TINT = "#F8DCC8"
ZEBRA = "#FFF5EE"
LINE = "#BBB7AC"
SITE = "apargentina.org.ar"
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def esc(s):
    return html.escape((s or "").strip())


def leer(nombre):
    with open(DATA / nombre, newline="", encoding="utf-8-sig") as f:
        return [{k: (v or "").strip() for k, v in row.items() if k} for row in csv.DictReader(f)
                if any((v or "").strip() for v in row.values())]


def clave(s):
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def partes(s):
    return [p.strip() for p in s.split(";") if p.strip()]


def mails(s):
    return "".join(f'<div class="mail">{esc(m)}</div>' for m in partes(s))


def web(s):
    return "".join(f'<div class="mail">{esc(w)}</div>' for w in partes(s))


def vacio():
    return '<span class="nd">—</span>'


def contacto_delegacion(r):
    out = mails(r.get("email", ""))
    if r.get("telefono"):
        out += f'<div>Tel.: {esc(r["telefono"])}</div>'
    return out or vacio()


def fila_delegacion(r):
    inst = f'<div>{esc(r["institucion"])}</div>' if r.get("institucion") else ""
    dire = f'<div class="dir">{esc(r["direccion"])}</div>' if r.get("direccion") else ""
    return (f'<tr><td class="strong">{esc(r["delegacion"])}</td>'
            f'<td>{esc(r.get("delegado")) or vacio()}</td>'
            f'<td>{(inst + dire) or vacio()}</td>'
            f'<td>{contacto_delegacion(r)}</td></tr>')


def fila_grupo(r):
    linea = f'<div class="linea">{esc(r["linea"])}</div>' if r.get("linea") else ""
    ciudad, prov = r.get("ciudad", ""), r.get("provincia", "")
    lugar = ciudad if clave(ciudad) == clave(prov) else ", ".join(x for x in (ciudad, prov) if x)
    contacto = mails(r.get("email", "")) + web(r.get("web", ""))
    return (f'<tr><td class="strong">{esc(r["grupo"])}{linea}</td>'
            f'<td>{esc(r.get("responsable")) or vacio()}</td>'
            f'<td>{esc(r.get("institucion")) or vacio()}</td>'
            f'<td>{esc(lugar) or vacio()}</td>'
            f'<td>{contacto or vacio()}</td></tr>')


def pagina(titulo, subtitulo, columnas, filas, fecha):
    logo = ""
    if LOGO.exists():
        b64 = base64.b64encode(LOGO.read_bytes()).decode()
        logo = f'<img class="logo" src="data:image/png;base64,{b64}" alt="">'
    ths = "".join(f'<th style="width:{w}%">{esc(n)}</th>' for n, w in columnas)
    return f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
  @page {{ size: A4 landscape; margin: 22mm 12mm 18mm; }}
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; font-family: 'PT Sans', 'Liberation Sans', 'DejaVu Sans', Arial, sans-serif;
         font-size: 13pt; line-height: 1.35; color: {INK}; }}
  .titulo {{ display: flex; align-items: center; gap: 18px; margin: 0 0 14px;
            padding-bottom: 12px; border-bottom: 3px solid {ACCENT}; }}
  .logo {{ height: 54px; width: auto; }}
  h1 {{ font-family: 'PT Serif', Georgia, 'Liberation Serif', serif; font-size: 25pt; line-height: 1.15; margin: 0; }}
  .sub {{ color: {MID}; font-size: 12pt; margin-top: 3px; }}
  table {{ width: 100%; border-collapse: collapse; table-layout: fixed; }}
  thead {{ display: table-header-group; }}
  th {{ background: {TINT}; color: {INK}; text-align: left; font-size: 12.5pt; padding: 9px 10px;
       border-bottom: 3px solid {ACCENT}; }}
  td {{ padding: 9px 10px; vertical-align: top; border-bottom: 1px solid {LINE}; overflow-wrap: anywhere; }}
  tr {{ break-inside: avoid; }}
  tbody tr:nth-child(even) td {{ background: {ZEBRA}; }}
  .strong {{ font-weight: 700; }}
  .dir, .linea {{ color: {MID}; font-size: 12pt; margin-top: 2px; font-weight: 400; }}
  .linea {{ font-style: italic; }}
  .nd {{ color: {LINE}; }}
</style></head><body>
  <div class="titulo">{logo}<div><h1>{esc(titulo)}</h1><div class="sub">{esc(subtitulo)} · Actualizado al {fecha}</div></div></div>
  <table><thead><tr>{ths}</tr></thead><tbody>{''.join(filas)}</tbody></table>
</body></html>"""


HEADER = f"""<div style="width:100%;font-family:Arial,sans-serif;-webkit-print-color-adjust:exact;">
  <div style="height:7px;background:{ACCENT};"></div>
  <div style="padding:6px 12mm 0;font-size:10px;color:{MID};letter-spacing:.06em;text-transform:uppercase;">Asociación Parasitológica Argentina</div>
</div>"""

FOOTER = f"""<div style="width:100%;font-family:Arial,sans-serif;font-size:10px;color:{MID};-webkit-print-color-adjust:exact;">
  <div style="margin:0 12mm;border-top:2px solid {ACCENT};padding-top:5px;display:flex;justify-content:space-between;">
    <span>{SITE}</span><span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
  </div>
</div>"""


def imprimir(browser, contenido, destino):
    page = browser.new_page()
    page.set_content(contenido, wait_until="load")
    page.pdf(path=str(destino), format="A4", landscape=True, print_background=True,
             display_header_footer=True, header_template=HEADER, footer_template=FOOTER,
             prefer_css_page_size=True)
    page.close()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    h = datetime.now(ZoneInfo("America/Argentina/Buenos_Aires"))
    fecha = f"{h.day} de {MESES[h.month - 1]} de {h.year}"

    delegaciones = [r for r in leer("delegaciones.csv") if r.get("delegacion")]
    grupos = [r for r in leer("grupos.csv") if r.get("grupo")]
    grupos.sort(key=lambda r: (clave(r.get("provincia", "")), clave(r.get("ciudad", "")), clave(r["grupo"])))

    with sync_playwright() as p:
        browser = p.chromium.launch()
        imprimir(browser, pagina(
            "Directorio de Delegados/as", "Delegaciones regionales",
            [("Delegación", 20), ("Delegado/a", 18), ("Institución y dirección", 34), ("Contacto", 28)],
            [fila_delegacion(r) for r in delegaciones], fecha),
            OUT / "directorio-delegados.pdf")
        imprimir(browser, pagina(
            "Directorio de Grupos de Investigación", "Grupos de investigación en parasitología",
            [("Grupo", 25), ("Responsable", 15), ("Institución", 24), ("Ubicación", 12), ("Contacto", 24)],
            [fila_grupo(r) for r in grupos], fecha),
            OUT / "directorio-grupos.pdf")
        browser.close()
    print(f"OK: {len(delegaciones)} delegaciones, {len(grupos)} grupos -> {OUT}")


if __name__ == "__main__":
    sys.exit(main())