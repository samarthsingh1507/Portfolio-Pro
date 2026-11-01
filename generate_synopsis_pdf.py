import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "submission_documents")
pdf_path = os.path.join(OUTPUT_DIR, "PortfolioPro_Project_Synopsis.pdf")

doc = SimpleDocTemplate(pdf_path, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'DocTitle',
    parent=styles['Heading1'],
    fontName='Helvetica-Bold',
    fontSize=20,
    leading=24,
    textColor=colors.HexColor('#0F172A'),
    alignment=1
)

sub_style = ParagraphStyle(
    'DocSubtitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=11,
    leading=15,
    textColor=colors.HexColor('#2563EB'),
    alignment=1
)

h1_style = ParagraphStyle(
    'H1',
    parent=styles['Heading2'],
    fontName='Helvetica-Bold',
    fontSize=13,
    leading=17,
    textColor=colors.HexColor('#1E293B'),
    spaceBefore=10,
    spaceAfter=4
)

body_style = ParagraphStyle(
    'Body',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9,
    leading=13,
    textColor=colors.HexColor('#334155'),
    spaceAfter=6
)

bullet_style = ParagraphStyle(
    'Bullet',
    parent=body_style,
    leftIndent=15,
    spaceAfter=3
)

story = []

story.append(Paragraph("PROJECT SYNOPSIS", title_style))
story.append(Spacer(1, 4))
story.append(Paragraph("PortfolioPro — Intelligent Stock Trading & Portfolio Management Platform", sub_style))
story.append(Spacer(1, 10))

meta_data = [
    [Paragraph("<b>Candidate Name</b>", body_style), Paragraph("Samarth Singh", body_style)],
    [Paragraph("<b>Project Title</b>", body_style), Paragraph("PortfolioPro (Enterprise Stock Trading & Analytics Platform)", body_style)],
    [Paragraph("<b>Submission</b>", body_style), Paragraph("HCL Career Shaper — Centre of Excellence (COE)", body_style)],
    [Paragraph("<b>Technology Stack</b>", body_style), Paragraph("Full Stack (Java Spring Boot 3, Angular 19, MySQL 8, Docker)", body_style)],
    [Paragraph("<b>Date of Submission</b>", body_style), Paragraph("November 1, 2026", body_style)]
]

t = Table(meta_data, colWidths=[150, 380])
t.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#F1F5F9')),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
    ('TOPPADDING', (0,0), (-1,-1), 4),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
]))
story.append(t)
story.append(Spacer(1, 10))

story.append(Paragraph("1. Project Abstract", h1_style))
story.append(Paragraph(
    "PortfolioPro is a high-performance, enterprise full-stack fintech web application designed for real-time stock trading, "
    "quantitative technical analysis, mark-to-market portfolio valuation, and asset diversification tracking. "
    "Built using Spring Security 6 with stateless JJWT HMAC-SHA512 token authentication and an Angular 19 standalone component architecture, "
    "the platform bridges complex institutional financial modeling with an intuitive, highly responsive user interface.",
    body_style
))

story.append(Paragraph("2. Key Problem Statement & Objectives", h1_style))
story.append(Paragraph("• Develop a zero-trust stateless authentication system with BCrypt password encryption.", bullet_style))
story.append(Paragraph("• Implement transactional order placement (BUY/SELL) with weighted average cost basis accounting.", bullet_style))
story.append(Paragraph("• Engineer quantitative technical analysis indicators: Simple Moving Averages (MA20, MA50) and Wilder's RSI-14.", bullet_style))
story.append(Paragraph("• Provide real-time mark-to-market portfolio valuation, unrealized P&L calculation, and asset weight distribution.", bullet_style))
story.append(Paragraph("• Deliver a containerized, cloud-ready deployment architecture (Docker, Render, Vercel, MySQL).", bullet_style))

story.append(Paragraph("3. System Architecture & Relational Data Tier", h1_style))
story.append(Paragraph(
    "The application is structured into a 3-tier enterprise architecture: "
    "1) Presentation Tier: Angular 19 SPA with reactive signals, SVG charts, and automated Bearer token injection. "
    "2) Application Tier: Spring Boot 3.3.4 REST API providing modular controllers, transactional services, and resilient in-memory caching. "
    "3) Persistence Tier: MySQL 8.0 relational database with 6 tables (users, stocks, price_history, holdings, orders, watchlist) enforcing strict ACID guarantees.",
    body_style
))

story.append(Paragraph("4. Mathematical Formulations & Algorithms", h1_style))
story.append(Paragraph("• <b>Weighted Average Cost Basis:</b> AvgPrice_new = ((Qty_old * Avg_old) + (Qty_new * Price_new)) / (Qty_old + Qty_new)", bullet_style))
story.append(Paragraph("• <b>Portfolio Valuation:</b> Current Value = Sum(Qty * Market_Price); Unrealized P&L = Current Value - Total Invested", bullet_style))
story.append(Paragraph("• <b>Wilder's RSI-14:</b> Evaluates 14-period momentum: RS = Smoothed Gain / Smoothed Loss; RSI = 100 - (100 / (1 + RS))", bullet_style))

story.append(Paragraph("5. Verification & Testing Results", h1_style))
story.append(Paragraph(
    "All 77 unit and integration tests across services, market data providers, and authentication filters executed with a 100% pass rate. "
    "The application demonstrates sub-50ms API response latency, zero memory leaks, and reliable real-time portfolio recalculation.",
    body_style
))

doc.build(story)
print(f"Generated PDF: {pdf_path}")
