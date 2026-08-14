import io
import pypdfium2
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

buf = io.BytesIO()
doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'FIRTitle',
    parent=styles['Heading1'],
    fontName='Helvetica-Bold',
    fontSize=14,
    leading=17,
    alignment=1,
    textColor=colors.HexColor("#0f172a")
)
section_style = ParagraphStyle(
    'FIRSection',
    parent=styles['Heading2'],
    fontName='Helvetica-Bold',
    fontSize=10.5,
    leading=14,
    textColor=colors.HexColor("#1e293b"),
    spaceBefore=8,
    spaceAfter=4
)
body_style = ParagraphStyle(
    'FIRBody',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=8.5,
    leading=12,
    textColor=colors.HexColor("#334155")
)

story = []
story.append(Paragraph("CYBER CRIME INCIDENT REPORT &amp; FORENSIC DOSSIER", title_style))
story.append(Spacer(1, 4))
story.append(Paragraph("Official Forensic AI Analysis Report | NETRA Autonomous Verification Engine", body_style))
story.append(Spacer(1, 8))
story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#f59e0b"), spaceAfter=10))

# Visual Anomaly Evidence Section
story.append(Paragraph("1. Flagged Forensic Keyframe Visual Evidence (Anomaly Localization)", section_style))
story.append(Paragraph("The neural detection pipeline localized significant generative/spatial manipulation anomalies at the following timestamp coordinates:", body_style))
story.append(Spacer(1, 6))

img_path = '/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/test_annotated_frame.jpg'
rl_img = RLImage(img_path, width=240, height=160)

caption_text = """<b>Keyframe #59 @ 00:01.97</b><br/><br/>
<b>Neural Anomaly Index:</b> 99.2% (CRITICAL)<br/>
<b>Localized Region:</b> Eyewear / Specular Glare Discontinuity<br/>
<b>Detector Subsystem:</b> GenD ViT-L/14 + Spatial SBI<br/>
<b>Forensic Finding:</b> Discontinuity in specular reflection curvature across spectacle lens plane indicates synthetic latent inpainting.
"""
caption_para = Paragraph(caption_text, body_style)

img_table = Table([[rl_img, caption_para]], colWidths=[250, 270])
img_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('TOPPADDING', (0,0), (-1,-1), 8),
    ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ('LEFTPADDING', (0,0), (-1,-1), 8),
    ('RIGHTPADDING', (0,0), (-1,-1), 8),
]))
story.append(img_table)
story.append(Spacer(1, 10))

# Legal Provisions
story.append(Paragraph("2. Applicable Legal Provisions under Indian Law", section_style))
story.append(Paragraph("&bull; Information Technology Act 2000 — Section 66D (Cheating by personation using computer resource)", body_style))
story.append(Paragraph("&bull; Bharatiya Nyaya Sanhita 2023 — Section 318(4) (Cheating and dishonestly inducing delivery of property)", body_style))

doc.build(story)

# Render PDF to image using pypdfium2
pdf_bytes = buf.getvalue()
pdf_path = '/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/test_fir_visual.pdf'
with open(pdf_path, 'wb') as f:
    f.write(pdf_bytes)

pdf = pypdfium2.PdfDocument(pdf_path)
page = pdf[0]
image = page.render(scale=2).to_pil()
out_png = '/Users/iamsparsh00321/Desktop/newantigravworkfolder/netra/test_fir_visual_page1.png'
image.save(out_png)
print('PDF generated and rendered to image successfully:', out_png)
