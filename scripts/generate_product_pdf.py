from __future__ import annotations

import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "superpowers" / "specs" / "2026-10-14-microapp-recetas-diabetes-design.md"
OUTPUT = ROOT / "output" / "pdf" / "documentacion-producto-microapp-diabetes-v1.pdf"

PAGE_W, PAGE_H = A4
MARGIN_X = 19 * mm
TOP = 23 * mm
BOTTOM = 18 * mm

INK = colors.HexColor("#18342F")
TEAL = colors.HexColor("#137A68")
TEAL_DARK = colors.HexColor("#0B5549")
MINT = colors.HexColor("#E8F4F0")
MINT_2 = colors.HexColor("#D1EAE2")
CORAL = colors.HexColor("#EE7D62")
CREAM = colors.HexColor("#FAF8F2")
GRAY = colors.HexColor("#5E6D69")
LIGHT_GRAY = colors.HexColor("#E4E9E7")
WHITE = colors.white


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("AppRegular", r"C:\Windows\Fonts\arial.ttf"))
    pdfmetrics.registerFont(TTFont("AppBold", r"C:\Windows\Fonts\arialbd.ttf"))
    pdfmetrics.registerFont(TTFont("AppItalic", r"C:\Windows\Fonts\ariali.ttf"))


def footer(canvas, doc) -> None:
    canvas.saveState()
    if doc.page > 1:
        canvas.setStrokeColor(MINT_2)
        canvas.setLineWidth(0.7)
        canvas.line(MARGIN_X, 13 * mm, PAGE_W - MARGIN_X, 13 * mm)
        canvas.setFont("AppRegular", 8)
        canvas.setFillColor(GRAY)
        canvas.drawString(MARGIN_X, 8.5 * mm, "Microapp de recetas para personas con diabetes")
        canvas.drawRightString(PAGE_W - MARGIN_X, 8.5 * mm, f"Página {doc.page - 1}")
    canvas.restoreState()


def cover(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFillColor(CREAM)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    canvas.setFillColor(TEAL_DARK)
    canvas.rect(0, PAGE_H - 74 * mm, PAGE_W, 74 * mm, stroke=0, fill=1)
    canvas.setFillColor(TEAL)
    canvas.circle(PAGE_W - 23 * mm, PAGE_H - 29 * mm, 34 * mm, stroke=0, fill=1)
    canvas.setFillColor(CORAL)
    canvas.circle(PAGE_W - 49 * mm, PAGE_H - 63 * mm, 11 * mm, stroke=0, fill=1)

    canvas.setFillColor(WHITE)
    canvas.setFont("AppBold", 10)
    canvas.drawString(MARGIN_X, PAGE_H - 24 * mm, "DOCUMENTO DE PRODUCTO")
    canvas.setFont("AppBold", 27)
    canvas.drawString(MARGIN_X, PAGE_H - 42 * mm, "Microapp de recetas")
    canvas.drawString(MARGIN_X, PAGE_H - 54 * mm, "para personas con diabetes")

    canvas.setFillColor(INK)
    canvas.setFont("AppBold", 16)
    canvas.drawString(MARGIN_X, PAGE_H - 105 * mm, "Del menú semanal a la lista de compras")
    canvas.setFont("AppRegular", 11)
    canvas.setFillColor(GRAY)
    text = canvas.beginText(MARGIN_X, PAGE_H - 120 * mm)
    text.setLeading(17)
    text.textLine("Especificación funcional, experiencia de acceso,")
    text.textLine("arquitectura técnica y plan de lanzamiento.")
    canvas.drawText(text)

    cards = [
        ("45", "recetas iniciales"),
        ("260", "páginas revisadas"),
        ("$0", "infraestructura inicial estimada"),
    ]
    card_y = PAGE_H - 168 * mm
    card_gap = 5 * mm
    card_w = (PAGE_W - 2 * MARGIN_X - 2 * card_gap) / 3
    for i, (number, label) in enumerate(cards):
        x = MARGIN_X + i * (card_w + card_gap)
        canvas.setFillColor(WHITE)
        canvas.roundRect(x, card_y, card_w, 34 * mm, 4 * mm, stroke=0, fill=1)
        canvas.setFillColor(TEAL_DARK)
        canvas.setFont("AppBold", 20)
        canvas.drawCentredString(x + card_w / 2, card_y + 20 * mm, number)
        canvas.setFillColor(GRAY)
        canvas.setFont("AppRegular", 8.5)
        canvas.drawCentredString(x + card_w / 2, card_y + 10 * mm, label)

    canvas.setFillColor(TEAL_DARK)
    canvas.roundRect(MARGIN_X, 26 * mm, PAGE_W - 2 * MARGIN_X, 32 * mm, 4 * mm, stroke=0, fill=1)
    canvas.setFillColor(WHITE)
    canvas.setFont("AppBold", 10)
    canvas.drawString(MARGIN_X + 7 * mm, 46 * mm, "DECISION CENTRAL")
    canvas.setFont("AppRegular", 9.5)
    canvas.drawString(MARGIN_X + 7 * mm, 36 * mm, "Recetas + planificador automático + lista de compras. Sin control clínico.")

    canvas.setFillColor(GRAY)
    canvas.setFont("AppRegular", 8.5)
    canvas.drawString(MARGIN_X, 16 * mm, "Versión 1 - 14 de octubre de 2026")
    canvas.restoreState()


def create_styles():
    styles = getSampleStyleSheet()
    return {
        "h1": ParagraphStyle(
            "H1",
            parent=styles["Heading1"],
            fontName="AppBold",
            fontSize=21,
            leading=25,
            textColor=TEAL_DARK,
            spaceBefore=2 * mm,
            spaceAfter=5 * mm,
            keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=styles["Heading2"],
            fontName="AppBold",
            fontSize=14,
            leading=18,
            textColor=TEAL,
            spaceBefore=5 * mm,
            spaceAfter=2.5 * mm,
            keepWithNext=True,
        ),
        "h3": ParagraphStyle(
            "H3",
            parent=styles["Heading3"],
            fontName="AppBold",
            fontSize=10.5,
            leading=14,
            textColor=INK,
            spaceBefore=3.5 * mm,
            spaceAfter=1.5 * mm,
            keepWithNext=False,
        ),
        "h4": ParagraphStyle(
            "H4",
            parent=styles["Heading4"],
            fontName="AppBold",
            fontSize=9.6,
            leading=13,
            textColor=INK,
            spaceBefore=3 * mm,
            spaceAfter=1.2 * mm,
            keepWithNext=False,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=styles["BodyText"],
            fontName="AppRegular",
            fontSize=9.2,
            leading=13.2,
            textColor=INK,
            spaceAfter=2.5 * mm,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=styles["BodyText"],
            fontName="AppRegular",
            fontSize=8.9,
            leading=12.5,
            textColor=INK,
            leftIndent=6 * mm,
            firstLineIndent=-3.5 * mm,
            bulletIndent=1.5 * mm,
            spaceAfter=1.1 * mm,
        ),
        "number": ParagraphStyle(
            "Number",
            parent=styles["BodyText"],
            fontName="AppRegular",
            fontSize=8.9,
            leading=12.5,
            textColor=INK,
            leftIndent=7 * mm,
            firstLineIndent=-4.5 * mm,
            spaceAfter=1.1 * mm,
        ),
        "quote": ParagraphStyle(
            "Quote",
            parent=styles["BodyText"],
            fontName="AppBold",
            fontSize=11,
            leading=16,
            textColor=TEAL_DARK,
            backColor=MINT,
            borderColor=TEAL,
            borderWidth=1,
            borderPadding=8,
            leftIndent=3 * mm,
            rightIndent=3 * mm,
            spaceBefore=2 * mm,
            spaceAfter=4 * mm,
        ),
        "code": ParagraphStyle(
            "Code",
            fontName="Courier",
            fontSize=7.4,
            leading=10,
            textColor=INK,
            backColor=colors.HexColor("#F2F5F4"),
            borderColor=LIGHT_GRAY,
            borderWidth=0.5,
            borderPadding=7,
            leftIndent=2 * mm,
            rightIndent=2 * mm,
            spaceBefore=2 * mm,
            spaceAfter=4 * mm,
        ),
        "table": ParagraphStyle(
            "Table",
            fontName="AppRegular",
            fontSize=7.5,
            leading=9.5,
            textColor=INK,
        ),
        "table_head": ParagraphStyle(
            "TableHead",
            fontName="AppBold",
            fontSize=7.5,
            leading=9.5,
            textColor=WHITE,
        ),
    }


def inline_markup(text: str) -> str:
    corrections = {
        "aplicacion": "aplicación", "aplicaciones": "aplicaciones",
        "alimentacion": "alimentación", "automatico": "automático", "automatica": "automática",
        "automaticamente": "automáticamente", "autenticacion": "autenticación",
        "busqueda": "búsqueda", "categoria": "categoría", "categorias": "categorías",
        "clinico": "clínico", "codigo": "código", "codigos": "códigos",
        "comunicacion": "comunicación", "configuracion": "configuración",
        "confirmacion": "confirmación", "decision": "decisión", "descripcion": "descripción",
        "diagnostico": "diagnóstico", "diseno": "diseño", "educacion": "educación",
        "ejecucion": "ejecución", "eliminacion": "eliminación", "estadistica": "estadística",
        "funcion": "función", "generacion": "generación", "generara": "generará",
        "informacion": "información", "integracion": "integración", "logica": "lógica",
        "medicacion": "medicación", "medico": "médico", "menu": "menú", "menus": "menús",
        "metodo": "método", "minima": "mínima", "minimo": "mínimo",
        "navegacion": "navegación", "notificacion": "notificación", "notificaciones": "notificaciones",
        "numero": "número", "nutricion": "nutrición", "nutricional": "nutricional",
        "opcion": "opción", "pagina": "página", "paginas": "páginas",
        "pedira": "pedirá",
        "politica": "política", "practica": "práctica", "practicas": "prácticas",
        "preparacion": "preparación", "publicacion": "publicación", "publica": "pública",
        "publico": "público", "recomendacion": "recomendación", "recomendaciones": "recomendaciones",
        "revision": "revisión", "sesion": "sesión", "sera": "será", "seran": "serán",
        "tecnica": "técnica", "tecnico": "técnico", "telefono": "teléfono",
        "tipografia": "tipografía", "transaccion": "transacción", "unicamente": "únicamente",
        "validacion": "validación", "version": "versión", "vinculacion": "vinculación",
    }

    def fix_word(match):
        word = match.group(0)
        fixed = corrections.get(word.lower(), word)
        if word[:1].isupper():
            fixed = fixed[:1].upper() + fixed[1:]
        return fixed

    text = re.sub(r"\b[A-Za-zÁÉÍÓÚáéíóúÑñ]+\b", fix_word, text)
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`(.+?)`", r"<font name='Courier'>\1</font>", text)
    return text


def parse_table(lines, start, styles):
    raw = []
    i = start
    while i < len(lines) and lines[i].strip().startswith("|"):
        raw.append(lines[i].strip())
        i += 1
    rows = []
    for idx, line in enumerate(raw):
        cells = [c.strip() for c in line.strip("|").split("|")]
        if idx == 1 and all(re.fullmatch(r":?-{3,}:?", c.replace(" ", "")) for c in cells):
            continue
        style = styles["table_head"] if not rows else styles["table"]
        rows.append([Paragraph(inline_markup(c), style) for c in cells])
    usable = PAGE_W - 2 * MARGIN_X
    col_count = max(len(r) for r in rows)
    if col_count == 3:
        widths = [usable * 0.46, usable * 0.12, usable * 0.42]
    else:
        widths = [usable / col_count] * col_count
    table = Table(rows, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), TEAL_DARK),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.35, LIGHT_GRAY),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, MINT]),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table, i


def markdown_to_flowables(text: str, styles):
    lines = text.splitlines()
    story = []
    i = 0
    paragraph_buffer = []
    in_code = False
    code_lines = []

    def flush_paragraph():
        if paragraph_buffer:
            joined = " ".join(part.strip() for part in paragraph_buffer)
            story.append(Paragraph(inline_markup(joined), styles["body"]))
            paragraph_buffer.clear()

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if stripped.startswith("```"):
            flush_paragraph()
            if in_code:
                story.append(Preformatted("\n".join(code_lines), styles["code"]))
                code_lines = []
                in_code = False
            else:
                in_code = True
            i += 1
            continue
        if in_code:
            code_lines.append(line)
            i += 1
            continue

        if i < 7 and (stripped.startswith("#") or stripped.startswith("Fecha:") or stripped.startswith("Estado:") or stripped.startswith("Nombre comercial:")):
            i += 1
            continue

        if not stripped:
            flush_paragraph()
            i += 1
            continue

        if stripped.startswith("|"):
            flush_paragraph()
            table, i = parse_table(lines, i, styles)
            story.extend([Spacer(1, 1.5 * mm), table, Spacer(1, 3 * mm)])
            continue

        if stripped.startswith("#### "):
            flush_paragraph()
            story.append(Paragraph(inline_markup(stripped[5:]), styles["h4"]))
        elif stripped.startswith("### "):
            flush_paragraph()
            story.append(Paragraph(inline_markup(stripped[4:]), styles["h3"]))
        elif stripped.startswith("## "):
            flush_paragraph()
            heading = stripped[3:]
            if (
                heading.startswith("11. Modelo de datos")
                or heading.startswith("14. Manejo de errores")
                or heading.startswith("15. Pruebas")
            ):
                story.append(PageBreak())
            story.append(Paragraph(inline_markup(heading), styles["h1"]))
        elif stripped.startswith("# "):
            flush_paragraph()
            story.append(Paragraph(inline_markup(stripped[2:]), styles["h1"]))
        elif stripped.startswith("> "):
            flush_paragraph()
            story.append(Paragraph(inline_markup(stripped[2:]), styles["quote"]))
        elif re.match(r"^-\s+", stripped):
            flush_paragraph()
            content = re.sub(r"^-\s+", "", stripped)
            story.append(Paragraph(inline_markup(content), styles["bullet"], bulletText="-"))
        elif re.match(r"^\d+\.\s+", stripped):
            flush_paragraph()
            match = re.match(r"^(\d+)\.\s+(.*)$", stripped)
            story.append(Paragraph(inline_markup(match.group(2)), styles["number"], bulletText=match.group(1) + "."))
        else:
            paragraph_buffer.append(stripped)
        i += 1

    flush_paragraph()
    return story


def build_pdf() -> None:
    register_fonts()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    styles = create_styles()

    frame = Frame(
        MARGIN_X,
        BOTTOM,
        PAGE_W - 2 * MARGIN_X,
        PAGE_H - TOP - BOTTOM,
        id="main",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )
    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=MARGIN_X,
        rightMargin=MARGIN_X,
        topMargin=TOP,
        bottomMargin=BOTTOM,
        title="Microapp de recetas para personas con diabetes - Documento de producto v1",
        author="Proyecto de microapp de recetas",
        subject="Especificacion funcional y tecnica",
    )
    doc.addPageTemplates(
        [
            PageTemplate(id="content", frames=[frame], onPage=lambda c, d: (cover(c, d) if d.page == 1 else footer(c, d)))
        ]
    )

    markdown = SOURCE.read_text(encoding="utf-8")
    content = markdown_to_flowables(markdown, styles)
    story = [Spacer(1, PAGE_H - TOP - BOTTOM - 4 * mm), PageBreak()]
    story.extend(content)
    doc.build(story)


if __name__ == "__main__":
    build_pdf()
    print(OUTPUT)
