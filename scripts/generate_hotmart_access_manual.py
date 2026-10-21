from __future__ import annotations

from pathlib import Path

from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "manual-acceso-mi-semana-de-recetas.pdf"
ICON = ROOT / "public" / "icons" / "icon-512.png"
APP_URL = "https://mi-semana-de-recetas.franrodriguezmkt.workers.dev"

PAGE_W, PAGE_H = A4
MARGIN = 19 * mm

INK = colors.HexColor("#18342F")
TEAL = colors.HexColor("#137A68")
TEAL_DARK = colors.HexColor("#0B5549")
MINT = colors.HexColor("#E8F4F0")
MINT_2 = colors.HexColor("#D1EAE2")
CORAL = colors.HexColor("#EE7D62")
CREAM = colors.HexColor("#FAF8F2")
GRAY = colors.HexColor("#5E6D69")
WHITE = colors.white


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("AppRegular", r"C:\Windows\Fonts\arial.ttf"))
    pdfmetrics.registerFont(TTFont("AppBold", r"C:\Windows\Fonts\arialbd.ttf"))


def footer(canvas, doc) -> None:
    canvas.saveState()
    canvas.setStrokeColor(MINT_2)
    canvas.setLineWidth(0.6)
    canvas.line(MARGIN, 13 * mm, PAGE_W - MARGIN, 13 * mm)
    canvas.setFont("AppRegular", 8)
    canvas.setFillColor(GRAY)
    canvas.drawString(MARGIN, 8.5 * mm, "Mi Semana de Recetas | Manual de acceso y uso")
    canvas.drawRightString(PAGE_W - MARGIN, 8.5 * mm, f"Página {doc.page}")
    canvas.restoreState()


def cover(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFillColor(CREAM)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    canvas.setFillColor(TEAL_DARK)
    canvas.rect(0, PAGE_H - 96 * mm, PAGE_W, 96 * mm, stroke=0, fill=1)
    canvas.setFillColor(TEAL)
    canvas.circle(PAGE_W - 18 * mm, PAGE_H - 24 * mm, 36 * mm, stroke=0, fill=1)
    canvas.setFillColor(CORAL)
    canvas.circle(PAGE_W - 46 * mm, PAGE_H - 82 * mm, 10 * mm, stroke=0, fill=1)

    canvas.setFillColor(WHITE)
    canvas.setFont("AppBold", 10)
    canvas.drawString(MARGIN, PAGE_H - 23 * mm, "MANUAL DE ACCESO, USO Y AUTORÍA")
    canvas.setFont("AppBold", 28)
    canvas.drawString(MARGIN, PAGE_H - 46 * mm, "Mi Semana")
    canvas.drawString(MARGIN, PAGE_H - 60 * mm, "de Recetas")
    canvas.setFont("AppRegular", 12)
    canvas.drawString(MARGIN, PAGE_H - 76 * mm, "Menús y compras, en un solo lugar")

    if ICON.exists():
        canvas.drawImage(str(ICON), PAGE_W - 73 * mm, PAGE_H - 74 * mm, 42 * mm, 42 * mm, mask="auto")

    canvas.setFillColor(INK)
    canvas.setFont("AppBold", 16)
    canvas.drawString(MARGIN, PAGE_H - 126 * mm, "Tu acceso comienza con el correo de compra")
    canvas.setFillColor(GRAY)
    canvas.setFont("AppRegular", 10.5)
    text = canvas.beginText(MARGIN, PAGE_H - 141 * mm)
    text.setLeading(16)
    text.textLine("Abre la aplicación desde el navegador e ingresa el mismo")
    text.textLine("correo que utilizaste en Hotmart. No necesitas un APK ni")
    text.textLine("el código de la transacción.")
    canvas.drawText(text)

    canvas.setFillColor(WHITE)
    canvas.roundRect(MARGIN, 48 * mm, PAGE_W - 2 * MARGIN, 54 * mm, 5 * mm, stroke=0, fill=1)
    canvas.setFillColor(TEAL_DARK)
    canvas.setFont("AppBold", 11)
    canvas.drawString(MARGIN + 8 * mm, 86 * mm, "ACCESO WEB")
    canvas.setFont("AppRegular", 9)
    canvas.setFillColor(GRAY)
    canvas.drawString(MARGIN + 8 * mm, 76 * mm, "Escanea el código o abre la dirección en tu celular.")
    canvas.setFont("AppBold", 8.3)
    canvas.setFillColor(TEAL_DARK)
    canvas.drawString(MARGIN + 8 * mm, 62 * mm, APP_URL)

    widget = qr.QrCodeWidget(APP_URL)
    bounds = widget.getBounds()
    size = 36 * mm
    drawing = Drawing(size, size, transform=[size / (bounds[2] - bounds[0]), 0, 0, size / (bounds[3] - bounds[1]), 0, 0])
    drawing.add(widget)
    drawing.drawOn(canvas, PAGE_W - MARGIN - size - 7 * mm, 55 * mm)

    canvas.setFillColor(GRAY)
    canvas.setFont("AppRegular", 8.5)
    canvas.drawString(MARGIN, 26 * mm, "Aplicación web instalable (PWA) - Versión 1.0 - 20 de octubre de 2026")
    canvas.drawString(MARGIN, 20 * mm, "Productor y autor: Franrodriguezmkt")
    canvas.restoreState()


def styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title", parent=base["Heading1"], fontName="AppBold", fontSize=21,
            leading=25, textColor=TEAL_DARK, spaceAfter=5 * mm,
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Heading2"], fontName="AppBold", fontSize=13.5,
            leading=17, textColor=TEAL, spaceBefore=4 * mm, spaceAfter=2 * mm,
        ),
        "body": ParagraphStyle(
            "body", parent=base["BodyText"], fontName="AppRegular", fontSize=9.4,
            leading=13.7, textColor=INK, spaceAfter=2.4 * mm,
        ),
        "bullet": ParagraphStyle(
            "bullet", parent=base["BodyText"], fontName="AppRegular", fontSize=9.1,
            leading=13, textColor=INK, leftIndent=6 * mm, firstLineIndent=-3.5 * mm,
            bulletIndent=1.5 * mm, spaceAfter=1.2 * mm,
        ),
        "step_n": ParagraphStyle(
            "step_n", fontName="AppBold", fontSize=14, leading=18, textColor=WHITE,
            alignment=TA_CENTER,
        ),
        "step": ParagraphStyle(
            "step", fontName="AppRegular", fontSize=8.8, leading=12.2, textColor=INK,
        ),
        "note": ParagraphStyle(
            "note", fontName="AppRegular", fontSize=8.7, leading=12.4, textColor=TEAL_DARK,
            backColor=MINT, borderColor=MINT_2, borderWidth=0.7, borderPadding=8,
            spaceBefore=3 * mm, spaceAfter=3 * mm,
        ),
    }


def step_row(number: str, text: str, s) -> Table:
    number_cell = Table([[Paragraph(number, s["step_n"])]], colWidths=[12 * mm], rowHeights=[12 * mm])
    number_cell.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), TEAL),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOX", (0, 0), (-1, -1), 0, TEAL),
    ]))
    row = Table([[number_cell, Paragraph(text, s["step"])]], colWidths=[16 * mm, PAGE_W - 2 * MARGIN - 16 * mm])
    row.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (0, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return row


def build() -> None:
    register_fonts()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    s = styles()

    frame = Frame(MARGIN, 18 * mm, PAGE_W - 2 * MARGIN, PAGE_H - 38 * mm, id="main", leftPadding=0, rightPadding=0)
    doc = BaseDocTemplate(
        str(OUTPUT), pagesize=A4, title="Mi Semana de Recetas - Manual de acceso, uso y autoría",
        author="Franrodriguezmkt", subject="Manual entregable del producto digital",
    )
    doc.addPageTemplates([PageTemplate(id="pages", frames=[frame], onPage=lambda c, d: cover(c, d) if d.page == 1 else footer(c, d))])

    story = [Spacer(1, PAGE_H - 46 * mm), PageBreak()]
    story.append(Paragraph("Cómo entrar y empezar", s["title"]))
    for number, text in [
        ("1", "Finaliza la compra en Hotmart."),
        ("2", f"Abre <b>{APP_URL}</b> desde tu navegador."),
        ("3", "Escribe el mismo correo utilizado en la compra. No hace falta ingresar el código de transacción."),
        ("4", "Revisa tu correo y escribe el código de seis dígitos recibido."),
        ("5", "Configura tus preferencias y genera tu primera semana de recetas."),
    ]:
        story.extend([step_row(number, text, s), Spacer(1, 1.5 * mm)])

    story.append(Paragraph("Qué incluye", s["h2"]))
    for item in [
        "Recetas organizadas por desayuno, almuerzo, cena, snack y postre.",
        "Planificación semanal automática según tus preferencias y cantidad de personas.",
        "Cambio de recetas dentro del menú y lista de compras agrupada.",
        "Acceso desde celular, tableta o computadora mediante un navegador actualizado.",
    ]:
        story.append(Paragraph(item, s["bullet"], bulletText="-"))

    story.append(Paragraph("Uso básico", s["h2"]))
    story.append(Paragraph(
        "En <b>Semana</b>, define tus preferencias y genera el menú. Cambia cualquier receta que no quieras conservar. "
        "Después abre <b>Compras</b> para revisar los ingredientes del menú activo y marcarlos mientras compras. "
        "En <b>Recetas</b> puedes buscar preparaciones y consultar sus ingredientes y pasos.", s["body"],
    ))

    story.append(Paragraph("Agregar a la pantalla de inicio", s["h2"]))
    story.append(Paragraph(
        "En Android, abre el menú del navegador y selecciona <b>Agregar a pantalla de inicio</b> o <b>Instalar aplicación</b>. "
        "En iPhone o iPad, usa <b>Compartir</b> y después <b>Agregar a inicio</b>. El nombre puede variar según el navegador.", s["body"],
    ))

    story.append(Paragraph(
        "Si el correo de acceso tarda, revisa también spam, promociones o correo no deseado. El acceso es personal y queda vinculado al correo de compra.", s["note"],
    ))

    story.append(Paragraph("Información importante", s["h2"]))
    story.append(Paragraph(
        "La información de recetas y planificación es educativa y general. Este producto no diagnostica, trata ni controla la diabetes y no reemplaza las indicaciones de médicos o nutricionistas. Ante alergias, medicación o necesidades particulares, consulta a un profesional de la salud.", s["body"],
    ))

    story.append(Paragraph("Autoría", s["h2"]))
    story.append(Paragraph(
        "La estructura del producto, sus textos, experiencia de planificación y documentación pertenecen a <b>Franrodriguezmkt</b>. Las referencias utilizadas para elaborar el contenido educativo se registran dentro del proyecto del producto.", s["body"],
    ))
    doc.build(story)


if __name__ == "__main__":
    build()
    print(OUTPUT)
