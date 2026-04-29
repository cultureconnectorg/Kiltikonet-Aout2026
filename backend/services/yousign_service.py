"""
Yousign API v3 service — Signature électronique des chartes d'engagement.
https://developers.yousign.com
"""
import os
import io
import logging
import httpx
from datetime import datetime, timedelta, timezone
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER

logger = logging.getLogger(__name__)

YOUSIGN_API_KEY = os.environ.get("YOUSIGN_API_KEY", "").strip()
# Default to production (the user provided a real prod key).
YOUSIGN_BASE_URL = os.environ.get("YOUSIGN_BASE_URL", "https://api.yousign.app/v3").rstrip("/")
YOUSIGN_WEBHOOK_SECRET = os.environ.get("YOUSIGN_WEBHOOK_SECRET", "").strip()


def _auth_headers(content_type: str = "application/json") -> dict:
    """Build Yousign auth headers."""
    h = {"Authorization": f"Bearer {YOUSIGN_API_KEY}"}
    if content_type:
        h["Content-Type"] = content_type
    return h


def generate_charte_pdf(member_name: str, num_membre: str, niveau: str, frek_id: str) -> bytes:
    """Generate the engagement charter PDF in-memory as bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=25 * mm,
        title=f"Charte d'engagement — {member_name}",
        author="Kilti Konet",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        alignment=TA_CENTER,
        textColor=HexColor("#2D2A26"),
        spaceAfter=14,
    )
    h2_style = ParagraphStyle(
        "H2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        textColor=HexColor("#9B3A2E"),
        spaceBefore=10,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        alignment=TA_JUSTIFY,
        textColor=HexColor("#2D2A26"),
        spaceAfter=6,
    )
    meta_style = ParagraphStyle(
        "Meta",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9,
        textColor=HexColor("#5A554E"),
        spaceAfter=4,
    )

    niveau_label = "Membre Actif" if niveau == "actif" else "Membre Associé"
    today = datetime.now(timezone.utc).strftime("%d/%m/%Y")

    content = []
    content.append(Paragraph("CHARTE D'ENGAGEMENT", title_style))
    content.append(Paragraph("Association Kilti Konet — Loi 1901", body_style))
    content.append(Spacer(1, 8 * mm))

    content.append(Paragraph(f"<b>Membre :</b> {member_name}", meta_style))
    content.append(Paragraph(f"<b>Identifiant culturel :</b> {frek_id}", meta_style))
    content.append(Paragraph(f"<b>Numéro de membre :</b> {num_membre}", meta_style))
    content.append(Paragraph(f"<b>Niveau d'adhésion :</b> {niveau_label}", meta_style))
    content.append(Paragraph(f"<b>Date :</b> {today}", meta_style))
    content.append(Spacer(1, 8 * mm))

    content.append(Paragraph("Préambule", h2_style))
    content.append(Paragraph(
        "Kilti Konet est une association loi 1901 qui œuvre à la structuration, la valorisation "
        "et la défense des industries culturelles caribéennes et afro-descendantes. "
        "En sollicitant son adhésion, le candidat reconnaît avoir pris connaissance des statuts "
        "de l'association et adhérer pleinement aux principes énoncés dans la présente charte.",
        body_style,
    ))

    content.append(Paragraph("Article 1 — Engagements éthiques", h2_style))
    content.append(Paragraph(
        "Le membre s'engage à respecter les valeurs de souveraineté, d'équité et de solidarité "
        "qui fondent l'association. Il s'interdit toute forme de discrimination, harcèlement ou "
        "comportement portant atteinte à l'intégrité d'un autre membre ou de la communauté.",
        body_style,
    ))

    content.append(Paragraph("Article 2 — Authenticité du répertoire culturel", h2_style))
    content.append(Paragraph(
        "Le membre déclare sur l'honneur que les œuvres, projets et productions inscrits à son "
        "répertoire culturel sont authentiques, lui appartiennent ou ont été déclarés avec le "
        "consentement écrit de leurs ayants droit. Toute déclaration mensongère pourra entraîner "
        "la radiation immédiate.",
        body_style,
    ))

    content.append(Paragraph("Article 3 — Participation à la vie associative", h2_style))
    content.append(Paragraph(
        "Le membre s'engage à participer dans la mesure du possible aux Assemblées Générales et "
        "à respecter les décisions prises démocratiquement. Le Membre Actif s'engage en outre à "
        "contribuer activement aux travaux et aux instances de l'association.",
        body_style,
    ))

    content.append(Paragraph("Article 4 — Cotisation", h2_style))
    content.append(Paragraph(
        "Le membre s'engage à régler la cotisation d'entrée et, le cas échéant, la cotisation "
        "annuelle dans les délais prévus par les statuts. Le défaut de paiement entraîne la "
        "suspension des droits de membre jusqu'à régularisation.",
        body_style,
    ))

    content.append(Paragraph("Article 5 — Confidentialité et données", h2_style))
    content.append(Paragraph(
        "Le membre reconnaît que les informations personnelles transmises sont traitées dans le "
        "respect du RGPD. Il s'engage en retour à respecter la confidentialité des informations "
        "auxquelles il pourrait avoir accès dans l'exercice de ses fonctions associatives.",
        body_style,
    ))

    content.append(Paragraph("Article 6 — Loi COEURVOLAN", h2_style))
    content.append(Paragraph(
        "Le membre adhère au cadre éthique COEURVOLAN, qui garantit la protection des créateurs, "
        "le respect de la diversité culturelle et la transparence de la gouvernance.",
        body_style,
    ))

    content.append(Paragraph("Article 7 — Sanctions", h2_style))
    content.append(Paragraph(
        "Tout manquement aux engagements de la présente charte peut entraîner, après examen par "
        "le Conseil d'Administration et selon la gravité des faits, un avertissement, une "
        "suspension temporaire ou la radiation du membre.",
        body_style,
    ))

    content.append(Spacer(1, 12 * mm))
    content.append(Paragraph(
        "<b>Signature électronique du membre — par apposition du présent document.</b>",
        body_style,
    ))
    # Reserve a visible signature zone (the field will be placed by Yousign coords)
    content.append(Spacer(1, 30 * mm))

    doc.build(content)
    pdf_bytes = buf.getvalue()
    buf.close()
    return pdf_bytes


# ═══════════════════════════════════════
# Yousign API client (httpx async)
# ═══════════════════════════════════════

class YousignError(Exception):
    """Yousign API call failed."""
    def __init__(self, status: int, message: str, payload: dict = None):
        super().__init__(f"[{status}] {message}")
        self.status = status
        self.payload = payload or {}


async def _request(method: str, path: str, **kwargs) -> dict:
    if not YOUSIGN_API_KEY:
        raise YousignError(500, "YOUSIGN_API_KEY non configurée")
    url = f"{YOUSIGN_BASE_URL}/{path.lstrip('/')}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            r = await client.request(method, url, **kwargs)
        except httpx.HTTPError as e:
            raise YousignError(502, f"Erreur réseau Yousign: {e}")
    if r.status_code >= 400:
        try:
            err_payload = r.json()
        except Exception:
            err_payload = {"raw": r.text[:500]}
        logger.error(f"Yousign {method} {path} → {r.status_code}: {err_payload}")
        raise YousignError(r.status_code, f"{method} {path} a échoué", err_payload)
    if r.content:
        try:
            return r.json()
        except Exception:
            return {}
    return {}


async def create_signature_request(name: str, due_date_iso: str = None) -> dict:
    """Create a draft Signature Request."""
    payload = {
        "name": name,
        "delivery_mode": "email",
        "ordered_signers": False,
    }
    if due_date_iso:
        payload["expiration_date"] = due_date_iso
    return await _request("POST", "/signature_requests", headers=_auth_headers(), json=payload)


async def upload_document(signature_request_id: str, pdf_bytes: bytes, filename: str = "charte.pdf") -> dict:
    """Upload a document to a Signature Request."""
    url = f"{YOUSIGN_BASE_URL}/signature_requests/{signature_request_id}/documents"
    files = {"file": (filename, pdf_bytes, "application/pdf")}
    data = {"nature": "signable_document", "parse_anchors": "false"}
    headers = {"Authorization": f"Bearer {YOUSIGN_API_KEY}"}
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(url, headers=headers, files=files, data=data)
    if r.status_code >= 400:
        try:
            err_payload = r.json()
        except Exception:
            err_payload = {"raw": r.text[:500]}
        logger.error(f"Yousign upload_document → {r.status_code}: {err_payload}")
        raise YousignError(r.status_code, "Upload Yousign échoué", err_payload)
    return r.json()


async def add_signer(
    signature_request_id: str,
    document_id: str,
    first_name: str,
    last_name: str,
    email: str,
    locale: str = "fr",
) -> dict:
    """Add a signer with a single signature field on the document."""
    payload = {
        "info": {
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "locale": locale,
        },
        "signature_level": "electronic_signature",
        "signature_authentication_mode": "no_otp",
        "fields": [
            {
                "document_id": document_id,
                "type": "signature",
                "page": 2,
                "x": 80,
                "y": 600,
                "width": 200,
                "height": 75,
            }
        ],
    }
    return await _request(
        "POST",
        f"/signature_requests/{signature_request_id}/signers",
        headers=_auth_headers(),
        json=payload,
    )


async def activate_signature_request(signature_request_id: str) -> dict:
    """Activate the Signature Request — triggers email + signature link."""
    return await _request(
        "POST",
        f"/signature_requests/{signature_request_id}/activate",
        headers=_auth_headers(),
        json={},
    )


async def get_signature_request(signature_request_id: str) -> dict:
    """Retrieve the current state of a Signature Request."""
    return await _request(
        "GET",
        f"/signature_requests/{signature_request_id}",
        headers=_auth_headers(),
    )


async def initiate_full_flow(member_name: str, email: str, num_membre: str, niveau: str, frek_id: str) -> dict:
    """End-to-end: create request, upload PDF, add signer, activate.
    Returns dict with id, status and signature_link.
    """
    parts = member_name.strip().split(" ", 1)
    first_name = parts[0] or "Membre"
    last_name = parts[1] if len(parts) > 1 else "Kiltikonet"

    pdf = generate_charte_pdf(member_name, num_membre, niveau, frek_id)

    due = (datetime.now(timezone.utc) + timedelta(days=30)).strftime("%Y-%m-%d")
    sr = await create_signature_request(
        name=f"Charte d'engagement Kilti Konet — {num_membre}",
        due_date_iso=due,
    )
    sr_id = sr.get("id")
    if not sr_id:
        raise YousignError(500, "Réponse Yousign invalide (id manquant)", sr)

    doc = await upload_document(sr_id, pdf, filename=f"charte_{num_membre}.pdf")
    doc_id = doc.get("id")
    if not doc_id:
        raise YousignError(500, "Document Yousign sans id", doc)

    await add_signer(sr_id, doc_id, first_name, last_name, email)
    activated = await activate_signature_request(sr_id)

    signature_link = ""
    signers = activated.get("signers", [])
    if signers:
        signature_link = signers[0].get("signature_link", "") or ""

    return {
        "signature_request_id": sr_id,
        "document_id": doc_id,
        "status": activated.get("status", "ongoing"),
        "signature_link": signature_link,
        "due_date": due,
    }
