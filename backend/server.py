from fastapi import FastAPI, APIRouter, File, UploadFile, Form, HTTPException, Query, Request, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse, Response, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
from pathlib import Path
from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import io
import csv
import asyncio
import cloudinary
import cloudinary.uploader
import resend
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
import qrcode
from reportlab.lib.pagesizes import A6
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
import requests
import jwt as pyjwt
import re as _re
import pymongo.errors as _pymongo_errors

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Environment mode
ENVIRONMENT = os.environ.get('ENVIRONMENT', 'development')
IS_PRODUCTION = ENVIRONMENT == 'production'

# ---------------------------------------------------------------------------
# Validation des variables d'environnement critiques au démarrage
# ---------------------------------------------------------------------------
_REQUIRED_ENV_VARS = ["MONGO_URL", "DB_NAME", "SESSION_SECRET"]
_PLACEHOLDER_MARKERS = ("<", ">", "your-", "fallback-")

def _validate_env() -> None:
    """Vérifie que les variables critiques sont définies et ne sont pas des placeholders."""
    missing = []
    placeholders = []
    for var in _REQUIRED_ENV_VARS:
        val = os.environ.get(var, "")
        if not val:
            missing.append(var)
        elif any(m in val for m in _PLACEHOLDER_MARKERS):
            placeholders.append(var)
    if missing:
        raise RuntimeError(
            f"Variables d'environnement manquantes : {missing}. "
            "Copiez backend/.env.example en backend/.env et renseignez les vraies valeurs."
        )
    if IS_PRODUCTION and placeholders:
        raise RuntimeError(
            f"Variables d'environnement non configurées (valeurs placeholder détectées) : {placeholders}. "
            "Remplacez les placeholders par les vraies valeurs avant de lancer en production."
        )
    if not IS_PRODUCTION and placeholders:
        logging.warning(
            "Variables d'environnement avec valeurs placeholder : %s — "
            "certaines fonctionnalités seront inopérantes.",
            placeholders,
        )

_validate_env()

# Session / Cookie auth
SESSION_SECRET = os.environ.get('SESSION_SECRET', '')
if not SESSION_SECRET or 'fallback' in SESSION_SECRET or 'your-' in SESSION_SECRET:
    if IS_PRODUCTION:
        raise RuntimeError(
            "SESSION_SECRET doit être défini avec une valeur forte en production. "
            "Générez-en une avec : openssl rand -hex 64"
        )
    # Dev uniquement : fallback prévisible mais avec avertissement
    SESSION_SECRET = 'fallback-dev-secret-DO-NOT-USE-IN-PRODUCTION'
    logging.warning("SESSION_SECRET non configuré — utilisation du fallback de développement UNIQUEMENT.")
SESSION_COOKIE_NAME = 'kk_session'
SESSION_MAX_AGE = 30 * 24 * 3600  # 30 days — persistent sessions


def create_session_token(payload: dict) -> str:
    """Sign a session payload into a JWT token."""
    data = {
        **payload,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(seconds=SESSION_MAX_AGE),
    }
    return pyjwt.encode(data, SESSION_SECRET, algorithm="HS256")


def decode_session_token(token: str) -> dict | None:
    """Decode and verify a session JWT. Returns None on failure."""
    try:
        return pyjwt.decode(token, SESSION_SECRET, algorithms=["HS256"])
    except (pyjwt.ExpiredSignatureError, pyjwt.InvalidTokenError):
        return None


def set_session_cookie(response, payload: dict):
    """Attach an httpOnly session cookie to a response."""
    token = create_session_token(payload)
    # secure=True uniquement en production (HTTPS) — en dev HTTP, False pour éviter les cookies rejetés
    _cookie_secure = IS_PRODUCTION
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=_cookie_secure,
        samesite="strict",
        max_age=SESSION_MAX_AGE,
        path="/",
    )
    return response


def clear_session_cookie(response):
    """Remove the session cookie."""
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return response

def get_session_from_cookie(request) -> dict | None:
    """Extract and decode session from request cookie."""
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        return None
    return decode_session_token(token)


# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Cloudinary configuration
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True
)

# Resend configuration
resend.api_key = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")

# Stripe configuration
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY")
STRIPE_PUBLIC_KEY = os.environ.get("STRIPE_PUBLIC_KEY")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET")
BASE_URL = os.environ.get("BASE_URL", "https://kiltikonet.fr")

# Validation Stripe au démarrage — avertit tôt plutôt qu'à l'achat
def _validate_stripe_config() -> None:
    _stripe_placeholders = ("<", ">", "your-", "sk_test_REPLACE", "pk_test_REPLACE")
    missing = []
    bad = []
    for name, val in [("STRIPE_API_KEY", STRIPE_API_KEY), ("STRIPE_PUBLIC_KEY", STRIPE_PUBLIC_KEY), ("STRIPE_WEBHOOK_SECRET", STRIPE_WEBHOOK_SECRET)]:
        if not val:
            missing.append(name)
        elif any(m in val for m in _stripe_placeholders):
            bad.append(name)
    if missing:
        logging.warning("Stripe non configuré — variables manquantes: %s. Les achats JCC seront inopérants.", missing)
    elif bad:
        logging.warning("Stripe — valeurs placeholder détectées: %s. Les achats JCC seront inopérants.", bad)
    elif IS_PRODUCTION and not STRIPE_API_KEY.startswith("sk_live_"):
        logging.warning("ATTENTION : STRIPE_API_KEY ne semble pas être une clé live (doit commencer par 'sk_live_'). Vérifiez la configuration en production.")

_validate_stripe_config()

# Create the main app
app = FastAPI()

# CORS middleware — explicit origins required for httpOnly cookies
_cors_raw = os.environ.get('CORS_ORIGINS', '')
_cors_origins = [o.strip().strip('"') for o in _cors_raw.split(',') if o.strip()]

if not _cors_origins:
    if IS_PRODUCTION:
        raise RuntimeError(
            "CORS_ORIGINS environment variable is required in production. "
            "Set it to a comma-separated list of allowed origins, e.g.: "
            "https://kiltikonet.fr,https://www.kiltikonet.fr"
        )
    # En développement, autoriser localhost par défaut avec un avertissement
    _cors_origins = ["http://localhost:3000", "http://localhost:3001"]
    logging.warning(
        "CORS_ORIGINS non défini — origines de développement autorisées par défaut: %s",
        _cors_origins,
    )

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Create a v1 router for new API endpoints
api_v1_router = APIRouter(prefix="/api/v1")


# ── Global Rate Limiter (production) ──
_rate_limit_store: Dict[str, list] = {}
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 500     # requests per window per IP (production-grade)

# ── Aggressive rate limiter for sensitive endpoints (admin login, auth) ──
_auth_rate_limit_store: Dict[str, list] = {}
AUTH_RATE_LIMIT_WINDOW = 900  # 15 minutes
AUTH_RATE_LIMIT_MAX = 5       # 5 attempts per 15 min per IP


def _get_client_ip(request: Request) -> str:
    """Extract real client IP behind Cloudflare / proxy."""
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# Endpoints qui déclenchent le rate limiter agressif
_SENSITIVE_ENDPOINTS = (
    "/api/workspace/login",
    "/api/admin/verify",
    "/api/admin/login",
    "/api/auth/login",
    "/api/auth/register",
    "/api/pro/verify-code",
)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Basic IP-based rate limiting — only for non-API routes to prevent abuse.
    Combined with aggressive rate limiter on sensitive auth endpoints.
    """
    path = request.url.path

    # ─── Aggressive rate limiter on sensitive endpoints (always on, even preview) ───
    if any(path.startswith(ep) for ep in _SENSITIVE_ENDPOINTS) and request.method == "POST":
        client_ip = _get_client_ip(request)
        now = datetime.now(timezone.utc).timestamp()
        window_start = now - AUTH_RATE_LIMIT_WINDOW
        hits = _auth_rate_limit_store.get(client_ip, [])
        hits = [t for t in hits if t > window_start]
        if len(hits) >= AUTH_RATE_LIMIT_MAX:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Trop de tentatives. Réessayez dans 15 minutes.",
                    "retry_after_seconds": AUTH_RATE_LIMIT_WINDOW,
                },
                headers={"Retry-After": str(AUTH_RATE_LIMIT_WINDOW)},
            )
        hits.append(now)
        _auth_rate_limit_store[client_ip] = hits

    # ─── Standard global rate limiter (production only, non-API) ───
    if IS_PRODUCTION:
        # All API routes are excluded — rate limit only applies to static/unknown routes
        if not path.startswith("/api/"):
            client_ip = _get_client_ip(request)
            now = datetime.now(timezone.utc).timestamp()

            window_start = now - RATE_LIMIT_WINDOW
            hits = _rate_limit_store.get(client_ip, [])
            hits = [t for t in hits if t > window_start]

            if len(hits) >= RATE_LIMIT_MAX:
                return JSONResponse(status_code=429, content={"detail": "Trop de requêtes. Réessayez dans quelques secondes."})

            hits.append(now)
            _rate_limit_store[client_ip] = hits

    return await call_next(request)


# ── Auth middleware: populate request.state.session from cookie ──
@app.middleware("http")
async def session_cookie_middleware(request: Request, call_next):
    token = request.cookies.get(SESSION_COOKIE_NAME)
    request.state.session = decode_session_token(token) if token else None
    response = await call_next(request)
    return response



# ── Health check endpoint (for deployment/monitoring) ──
@app.get("/api/health")
async def health_check():
    """Production health check — verifies DB connectivity."""
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"), serverSelectionTimeoutMS=3000)
        await client.server_info()
        return {"status": "ok", "db": "connected", "version": "1.0.0"}
    except Exception:
        return JSONResponse(status_code=503, content={"status": "error", "db": "disconnected"})


# ── Session endpoints ──
@app.get("/api/auth/me")
async def auth_me(request: Request):
    """Return the current user from the httpOnly cookie. No localStorage needed."""
    session = getattr(request.state, 'session', None)
    if not session:
        return JSONResponse(status_code=401, content={"authenticated": False})
    return {"authenticated": True, "session": session}


@app.post("/api/auth/logout")
async def auth_logout():
    """Clear the session cookie."""
    response = JSONResponse(content={"success": True})
    clear_session_cookie(response)
    return response


# ── Admin / Workspace guard helpers ──
ADMIN_ROLES = {"admin", "founder"}
WORKSPACE_ROLES = {"admin", "founder", "design", "event", "press", "business", "finance", "captions", "analyst", "partnerships"}

def require_admin(request: Request):
    """Raise 403 if the caller is not admin or founder."""
    session = getattr(request.state, "session", None)
    if not session or session.get("role") not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return session

def require_workspace(request: Request):
    """Raise 403 if the caller has no workspace role."""
    session = getattr(request.state, "session", None)
    if not session or session.get("role") not in WORKSPACE_ROLES:
        raise HTTPException(status_code=403, detail="Accès réservé aux membres de l'équipe")
    return session


# ================== BIDIRECTIONAL REALTIME SYNC (WebSocket + SSE) ==================
from fastapi import WebSocket, WebSocketDisconnect
from typing import Set
import uuid as uuid_lib

# Connection managers
class ConnectionManager:
    """Manages WebSocket connections for bidirectional real-time sync"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}  # client_id -> websocket
        self.subscriptions: Dict[str, Set[str]] = {}  # channel -> set of client_ids
        self.client_metadata: Dict[str, dict] = {}  # client_id -> metadata (user info, page, etc.)
    
    async def connect(self, websocket: WebSocket, client_id: str = None):
        await websocket.accept()
        if not client_id:
            client_id = str(uuid_lib.uuid4())[:8]
        self.active_connections[client_id] = websocket
        self.client_metadata[client_id] = {
            "connected_at": datetime.now(timezone.utc).isoformat(),
            "subscriptions": []
        }
        logger.info(f"🔗 WebSocket connected: {client_id} (Total: {len(self.active_connections)})")
        return client_id
    
    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.client_metadata:
            del self.client_metadata[client_id]
        # Remove from all subscriptions
        for channel in self.subscriptions.values():
            channel.discard(client_id)
        logger.info(f"🔌 WebSocket disconnected: {client_id} (Remaining: {len(self.active_connections)})")
    
    def subscribe(self, client_id: str, channel: str):
        """Subscribe client to a channel (e.g., 'cms', 'globe', 'registrations')"""
        if channel not in self.subscriptions:
            self.subscriptions[channel] = set()
        self.subscriptions[channel].add(client_id)
        if client_id in self.client_metadata:
            if "subscriptions" not in self.client_metadata[client_id]:
                self.client_metadata[client_id]["subscriptions"] = []
            self.client_metadata[client_id]["subscriptions"].append(channel)
    
    def unsubscribe(self, client_id: str, channel: str):
        if channel in self.subscriptions:
            self.subscriptions[channel].discard(client_id)
    
    async def broadcast_to_channel(self, channel: str, message: dict, exclude_client: str = None):
        """Broadcast message to all clients subscribed to a channel"""
        if channel not in self.subscriptions:
            return
        
        dead_clients = []
        for client_id in self.subscriptions[channel]:
            if client_id == exclude_client:
                continue
            if client_id in self.active_connections:
                try:
                    await self.active_connections[client_id].send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to {client_id}: {e}")
                    dead_clients.append(client_id)
        
        # Clean up dead connections
        for client_id in dead_clients:
            self.disconnect(client_id)
    
    async def broadcast_to_all(self, message: dict, exclude_client: str = None):
        """Broadcast message to all connected clients"""
        dead_clients = []
        for client_id, websocket in self.active_connections.items():
            if client_id == exclude_client:
                continue
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error sending to {client_id}: {e}")
                dead_clients.append(client_id)
        
        for client_id in dead_clients:
            self.disconnect(client_id)
        
        logger.info(f"📡 Broadcast to {len(self.active_connections) - (1 if exclude_client else 0)} clients")
    
    async def send_to_client(self, client_id: str, message: dict):
        """Send message to a specific client"""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending to {client_id}: {e}")
                self.disconnect(client_id)
    
    def get_status(self):
        return {
            "total_connections": len(self.active_connections),
            "channels": {ch: len(clients) for ch, clients in self.subscriptions.items()},
            "clients": list(self.active_connections.keys())
        }

# Global connection manager
ws_manager = ConnectionManager()

# Keep SSE for backward compatibility
sse_connections: List[asyncio.Queue] = []

class RealtimeEvent(BaseModel):
    event_type: str
    data: dict = {}
    timestamp: str = ""
    source_client: str = ""  # Added to track origin

async def broadcast_event(event_type: str, data: dict = None, source_client: str = "", channels: List[str] = None):
    """Broadcast an event to all connected clients (WebSocket + SSE)"""
    if data is None:
        data = {}
    event = RealtimeEvent(
        event_type=event_type,
        data=data,
        timestamp=datetime.now(timezone.utc).isoformat(),
        source_client=source_client
    )
    event_dict = event.model_dump()
    
    # Broadcast via WebSocket
    if channels:
        for channel in channels:
            await ws_manager.broadcast_to_channel(channel, event_dict, exclude_client=source_client)
    else:
        await ws_manager.broadcast_to_all(event_dict, exclude_client=source_client)
    
    # Also broadcast via SSE for backward compatibility
    dead_connections = []
    for queue in sse_connections:
        try:
            await queue.put(event_dict)
        except Exception:
            dead_connections.append(queue)
    for dead in dead_connections:
        if dead in sse_connections:
            sse_connections.remove(dead)
    
    logger.info(f"📡 Broadcast event: {event_type} | WS: {len(ws_manager.active_connections)} | SSE: {len(sse_connections)}")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ================== PRICING CONFIGURATION ==================
ACCREDITATION_TIERS = {
    "emerging": {"name": "Émergent", "price": 50.00, "currency": "eur"},
    "professional": {"name": "Professionnel", "price": 150.00, "currency": "eur"},
    "institutional": {"name": "Institutionnel", "price": 300.00, "currency": "eur"}
}

PARTNERSHIP_TIERS = {
    "bronze": {"name": "Partenaire Bronze", "price": 2500.00, "currency": "eur", "vip_count": 2},
    "silver": {"name": "Partenaire Silver", "price": 5000.00, "currency": "eur", "vip_count": 5},
    "gold": {"name": "Partenaire Gold", "price": 10000.00, "currency": "eur", "vip_count": 10}
}

# Billets entrée — culture Connect 2026 (20-23 Mai, Fort-de-France)
TICKET_TIERS = {
    "general": {"name": "Billet Général",  "price": 45.00,  "currency": "eur",
                "access": "Entrée générale 4 jours — concerts, marchés, ateliers ouverts"},
    "vip":     {"name": "Billet VIP",       "price": 150.00, "currency": "eur",
                "access": "Accès VIP 4 jours — Lounge, conférences, backstage, networking"},
}

# ================== EMAIL TEMPLATES ==================
def get_confirmation_email(name: str, tier: str, email: str) -> str:
    tier_data = ACCREDITATION_TIERS.get(tier, ACCREDITATION_TIERS["professional"])
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Georgia, serif; margin: 0; padding: 0; background-color: #F4F1EA; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #FFFFFF; }}
            .header {{ padding: 30px; text-align: center; border-bottom: 3px solid #A65D47; }}
            .content {{ padding: 40px 30px; color: #1A1A1A; line-height: 1.7; }}
            .badge {{ display: inline-block; background: #A65D47; color: #FFFFFF; padding: 8px 16px; font-size: 14px; }}
            .footer {{ padding: 20px 30px; background: #F4F1EA; text-align: center; font-size: 12px; color: #8A8578; }}
            h1 {{ color: #1A1A1A; font-size: 24px; margin: 0 0 20px 0; }}
            .highlight {{ color: #A65D47; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 10px 0 0 0; color: #1A1A1A; font-size: 18px;">Culture Connect 2026</h2>
            </div>
            <div class="content">
                <h1>Paiement confirmé — Demande d'accréditation reçue</h1>
                <p>Bonjour <span class="highlight">{name}</span>,</p>
                <p>Nous avons bien reçu votre paiement et votre demande d'accréditation pour <strong>Culture Connect 2026</strong>.</p>
                <p>
                    <strong>Formule choisie :</strong><br>
                    <span class="badge">{tier_data['name']} — {int(tier_data['price'])}€</span>
                </p>
                <p>Notre équipe examine votre dossier et vous répondra sous <strong>72 heures</strong>.</p>
                <p>En attendant, n'hésitez pas à nous contacter pour toute question.</p>
                <p style="margin-top: 30px;">À très bientôt,<br><strong>L'équipe Culture Connect</strong></p>
            </div>
            <div class="footer">
                <p>Culture Connect 2026 · Fort-de-France, Martinique · 20-23 Mai 2026</p>
                <p>contact@kiltikonet.fr</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_approval_email(name: str, tier: str, registration_id: str) -> str:
    tier_data = ACCREDITATION_TIERS.get(tier, ACCREDITATION_TIERS["professional"])
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Georgia, serif; margin: 0; padding: 0; background-color: #F4F1EA; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #FFFFFF; }}
            .header {{ padding: 30px; text-align: center; border-bottom: 3px solid #4A5D4E; }}
            .content {{ padding: 40px 30px; color: #1A1A1A; line-height: 1.7; }}
            .success-badge {{ display: inline-block; background: #4A5D4E; color: #FFFFFF; padding: 12px 24px; font-size: 16px; margin: 20px 0; }}
            .info-box {{ background: #F4F1EA; padding: 20px; margin: 20px 0; border-left: 4px solid #A65D47; }}
            .footer {{ padding: 20px 30px; background: #F4F1EA; text-align: center; font-size: 12px; color: #8A8578; }}
            h1 {{ color: #1A1A1A; font-size: 24px; margin: 0 0 20px 0; }}
            .highlight {{ color: #A65D47; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 10px 0 0 0; color: #1A1A1A; font-size: 18px;">Culture Connect 2026</h2>
            </div>
            <div class="content">
                <h1>Accréditation confirmée ✓</h1>
                <p>Bonjour <span class="highlight">{name}</span>,</p>
                <p>Excellente nouvelle ! Votre demande d'accréditation a été <strong>approuvée</strong>.</p>
                <div style="text-align: center;">
                    <span class="success-badge">✓ ACCRÉDITÉ · {tier_data['name']}</span>
                </div>
                <div class="info-box">
                    <strong>Informations pratiques :</strong><br><br>
                    📅 <strong>Dates :</strong> 20-23 Mai 2026<br>
                    📍 <strong>Lieu :</strong> Fort-de-France, Martinique<br>
                    🎯 <strong>Marché Culturel :</strong> Vendredi 22 Mai — La Savane<br><br>
                    Présentez-vous avec cette confirmation et une pièce d'identité pour retirer votre badge.
                </div>
                <p>Nous avons hâte de vous accueillir !</p>
                <p style="margin-top: 30px;">Cordialement,<br><strong>L'équipe Culture Connect</strong></p>
            </div>
            <div class="footer">
                <p>Culture Connect 2026 · Fort-de-France, Martinique · 20-23 Mai 2026</p>
                <p>contact@kiltikonet.fr</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_rejection_email(name: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Georgia, serif; margin: 0; padding: 0; background-color: #F4F1EA; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #FFFFFF; }}
            .header {{ padding: 30px; text-align: center; border-bottom: 3px solid #A65D47; }}
            .content {{ padding: 40px 30px; color: #1A1A1A; line-height: 1.7; }}
            .footer {{ padding: 20px 30px; background: #F4F1EA; text-align: center; font-size: 12px; color: #8A8578; }}
            h1 {{ color: #1A1A1A; font-size: 24px; margin: 0 0 20px 0; }}
            .contact-box {{ background: #F4F1EA; padding: 20px; margin: 20px 0; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 10px 0 0 0; color: #1A1A1A; font-size: 18px;">Culture Connect 2026</h2>
            </div>
            <div class="content">
                <h1>Suite à votre demande</h1>
                <p>Bonjour {name},</p>
                <p>Nous vous remercions pour l'intérêt que vous portez à <strong>Culture Connect 2026</strong>.</p>
                <p>Après examen attentif de votre dossier, nous avons le regret de vous informer que nous ne sommes pas en mesure de donner une suite favorable à votre demande d'accréditation pour cette édition.</p>
                <p>Cette décision ne remet pas en cause la qualité de votre profil. Le nombre de places étant limité, nous avons dû faire des choix difficiles.</p>
                <div class="contact-box">
                    <p style="margin: 0;"><strong>Des questions ?</strong></p>
                    <p style="margin: 10px 0 0 0;">N'hésitez pas à nous écrire à <a href="mailto:contact@kiltikonet.fr" style="color: #A65D47;">contact@kiltikonet.fr</a></p>
                </div>
                <p>Nous vous souhaitons une excellente continuation dans vos projets.</p>
                <p style="margin-top: 30px;">Bien cordialement,<br><strong>L'équipe Culture Connect</strong></p>
            </div>
            <div class="footer">
                <p>Culture Connect 2026 · Fort-de-France, Martinique · 20-23 Mai 2026</p>
            </div>
        </div>
    </body>
    </html>
    """

def get_partner_welcome_email(company_name: str, tier: str, contact_name: str) -> str:
    tier_data = PARTNERSHIP_TIERS.get(tier, PARTNERSHIP_TIERS["bronze"])
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Georgia, serif; margin: 0; padding: 0; background-color: #F4F1EA; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #FFFFFF; }}
            .header {{ padding: 30px; text-align: center; border-bottom: 3px solid #4A5D4E; }}
            .content {{ padding: 40px 30px; color: #1A1A1A; line-height: 1.7; }}
            .partner-badge {{ display: inline-block; background: #4A5D4E; color: #FFFFFF; padding: 12px 24px; font-size: 16px; margin: 20px 0; }}
            .benefits-box {{ background: #F4F1EA; padding: 20px; margin: 20px 0; border-left: 4px solid #4A5D4E; }}
            .footer {{ padding: 20px 30px; background: #F4F1EA; text-align: center; font-size: 12px; color: #8A8578; }}
            h1 {{ color: #1A1A1A; font-size: 24px; margin: 0 0 20px 0; }}
            .highlight {{ color: #4A5D4E; font-weight: bold; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 10px 0 0 0; color: #1A1A1A; font-size: 18px;">Culture Connect 2026</h2>
            </div>
            <div class="content">
                <h1>Bienvenue parmi nos partenaires !</h1>
                <p>Bonjour <span class="highlight">{contact_name}</span>,</p>
                <p>Nous sommes ravis d'accueillir <strong>{company_name}</strong> parmi les partenaires officiels de <strong>Culture Connect 2026</strong>.</p>
                <div style="text-align: center;">
                    <span class="partner-badge">✓ {tier_data['name'].upper()}</span>
                </div>
                <div class="benefits-box">
                    <strong>Vos avantages :</strong><br><br>
                    ✓ Logo affiché sur notre site officiel<br>
                    ✓ {tier_data['vip_count']} accréditations VIP offertes<br>
                    ✓ Visibilité sur tous nos supports de communication<br>
                    ✓ Accès à l'espace partenaires privilégié<br><br>
                    <strong>Événement :</strong> 20-23 Mai 2026 · Fort-de-France, Martinique
                </div>
                <p>Notre équipe vous contactera très prochainement pour finaliser les détails de votre partenariat.</p>
                <p style="margin-top: 30px;">Merci pour votre confiance,<br><strong>L'équipe Culture Connect</strong></p>
            </div>
            <div class="footer">
                <p>Culture Connect 2026 · Fort-de-France, Martinique · 20-23 Mai 2026</p>
                <p>contact@kiltikonet.fr</p>
            </div>
        </div>
    </body>
    </html>
    """

async def send_email_async(to_email: str, subject: str, html_content: str):
    """Send email via Brevo HTTP API"""
    try:
        import httpx
        brevo_key = os.environ.get("BREVO_SMTP_KEY", "")
        sender_email = os.environ.get("SENDER_EMAIL", "noreply@kiltikonet.fr")
        sender_name = "Kiltikonet"

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={"api-key": brevo_key, "content-type": "application/json", "accept": "application/json"},
                json={
                    "sender": {"name": sender_name, "email": sender_email},
                    "to": [{"email": to_email}],
                    "subject": subject,
                    "htmlContent": html_content,
                }
            )
            if resp.status_code in (200, 201):
                msg_id = resp.json().get("messageId", "")
                logger.info(f"Email sent via Brevo to {to_email} (msgId={msg_id})")
                await db.email_logs.insert_one({
                    "to": to_email, "subject": subject, "provider": "brevo",
                    "status": "sent", "message_id": msg_id,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
                return {"id": msg_id}
            else:
                err = resp.text[:200]
                logger.error(f"Brevo API failed for {to_email}: {resp.status_code} {err}")
                await db.email_logs.insert_one({
                    "to": to_email, "subject": subject, "provider": "brevo",
                    "status": "failed", "error": err,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
                return None
    except Exception as e:
        logger.error(f"Brevo API error for {to_email}: {e}")
        await db.email_logs.insert_one({
            "to": to_email, "subject": subject, "provider": "brevo",
            "status": "failed", "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        return None

async def _send_brevo_transactional(to_email: str, subject: str, text_content: str):
    """Alias for simple text-based transactional email via Brevo"""
    html = f"<div style='font-family:sans-serif;color:#e0e0e0;background:#0a0a0b;padding:32px;border-radius:12px;'><pre style='white-space:pre-wrap;color:#e0e0e0;'>{text_content}</pre><hr style='border-color:#f2ca50;'/><p style='color:#888;font-size:12px;'>kiltikonet.fr — CC2026</p></div>"
    return await send_email_async(to_email, subject, html)

async def send_email_with_attachment(to_email: str, subject: str, html_content: str, pdf_content: bytes, filename: str):
    """Send email with PDF attachment via Brevo HTTP API"""
    try:
        import httpx
        import base64
        brevo_key = os.environ.get("BREVO_SMTP_KEY", "")
        sender_email = os.environ.get("SENDER_EMAIL", "noreply@kiltikonet.fr")

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={"api-key": brevo_key, "content-type": "application/json", "accept": "application/json"},
                json={
                    "sender": {"name": "Kiltikonet", "email": sender_email},
                    "to": [{"email": to_email}],
                    "subject": subject,
                    "htmlContent": html_content,
                    "attachment": [{"content": base64.b64encode(pdf_content).decode(), "name": filename}],
                }
            )
            if resp.status_code in (200, 201):
                logger.info(f"Email with attachment sent via Brevo to {to_email}")
                return {"id": resp.json().get("messageId", "")}
            else:
                logger.error(f"Brevo attachment email failed: {resp.status_code} {resp.text[:200]}")
                return None
    except Exception as e:
        logger.error(f"Failed to send email with attachment to {to_email}: {e}")
        return None

async def notify_partner_of_approval(partner_id: str, registration: dict):
    """Notify partner when their sponsored participant is approved"""
    try:
        partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
        if not partner or not partner.get("contact_email"):
            return
        
        participant_name = registration.get("full_name", "Un participant")
        org_name = registration.get("organization_name", "")
        partner_name = partner.get("company_name", "Partenaire")
        contact_name = partner.get("contact_name", "")
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Georgia, serif; margin: 0; padding: 0; background-color: #F4F1EA; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #FFFFFF; }}
                .header {{ padding: 30px; text-align: center; border-bottom: 3px solid #4A5D4E; }}
                .content {{ padding: 40px 30px; color: #1A1A1A; line-height: 1.7; }}
                .highlight-box {{ background: #4A5D4E; color: #FFFFFF; padding: 20px; margin: 20px 0; text-align: center; }}
                .footer {{ padding: 20px 30px; background: #F4F1EA; text-align: center; font-size: 12px; color: #8A8578; }}
                h1 {{ color: #1A1A1A; font-size: 24px; margin: 0 0 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin: 10px 0 0 0; color: #1A1A1A; font-size: 18px;">Culture Connect 2026</h2>
                </div>
                <div class="content">
                    <h1>Bonne nouvelle pour {partner_name} !</h1>
                    <p>Bonjour {contact_name},</p>
                    <p>Nous avons le plaisir de vous informer qu'un participant que vous parrainez vient d'être accrédité pour <strong>Culture Connect 2026</strong>.</p>
                    <div class="highlight-box">
                        <p style="margin: 0; font-size: 18px;"><strong>{participant_name}</strong></p>
                        <p style="margin: 5px 0 0 0; opacity: 0.9;">{org_name}</p>
                        <p style="margin: 15px 0 0 0; font-size: 14px;">✓ ACCRÉDITATION VALIDÉE</p>
                    </div>
                    <p>Ce participant pourra désormais accéder à l'ensemble des activités de l'événement.</p>
                    <p style="margin-top: 30px;">Cordialement,<br><strong>L'équipe Culture Connect</strong></p>
                </div>
                <div class="footer">
                    <p>Culture Connect 2026 · Fort-de-France, Martinique · 20-23 Mai 2026</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        await send_email_async(
            partner.get("contact_email"),
            f"✓ Accréditation validée : {participant_name} — Culture Connect 2026",
            html
        )
        logger.info(f"Partner notification sent to {partner.get('contact_email')} for {participant_name}")
    except Exception as e:
        logger.error(f"Failed to notify partner {partner_id}: {str(e)}")

def get_badge_email_html(participant_name: str, tier: str, registration_id: str) -> str:
    """Email template for badge delivery"""
    tier_names = {"emerging": "Émergent", "professional": "Professionnel", "institutional": "Institutionnel"}
    tier_name = tier_names.get(tier, "Professionnel")
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Georgia, serif; margin: 0; padding: 0; background-color: #F4F1EA; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #FFFFFF; }}
            .header {{ padding: 30px; text-align: center; border-bottom: 3px solid #A65D47; }}
            .content {{ padding: 40px 30px; color: #1A1A1A; line-height: 1.7; }}
            .badge-box {{ background: #A65D47; color: #FFFFFF; padding: 25px; margin: 20px 0; text-align: center; }}
            .info-box {{ background: #F4F1EA; padding: 20px; margin: 20px 0; border-left: 4px solid #4A5D4E; }}
            .footer {{ padding: 20px 30px; background: #F4F1EA; text-align: center; font-size: 12px; color: #8A8578; }}
            h1 {{ color: #1A1A1A; font-size: 24px; margin: 0 0 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 10px 0 0 0; color: #1A1A1A; font-size: 18px;">Culture Connect 2026</h2>
            </div>
            <div class="content">
                <h1>Votre badge est prêt !</h1>
                <p>Bonjour <strong>{participant_name}</strong>,</p>
                <p>Votre badge officiel pour <strong>Culture Connect 2026</strong> est joint à ce message en pièce attachée (PDF).</p>
                <div class="badge-box">
                    <p style="margin: 0; font-size: 14px; opacity: 0.9;">VOTRE STATUT</p>
                    <p style="margin: 10px 0 0 0; font-size: 22px; font-weight: bold;">{tier_name.upper()}</p>
                </div>
                <div class="info-box">
                    <strong>Instructions :</strong><br><br>
                    ✓ Imprimez votre badge au format A6 (10.5 x 14.8 cm)<br>
                    ✓ Présentez-le à l'entrée de l'événement<br>
                    ✓ Le QR code permet de valider votre accréditation<br><br>
                    <strong>Événement :</strong> 20-23 Mai 2026 · Fort-de-France, Martinique
                </div>
                <p>À très bientôt !</p>
                <p style="margin-top: 30px;"><strong>L'équipe Culture Connect</strong></p>
            </div>
            <div class="footer">
                <p>Culture Connect 2026 · Fort-de-France, Martinique · 20-23 Mai 2026</p>
                <p>contact@kiltikonet.fr</p>
            </div>
        </div>
    </body>
    </html>
    """

async def upload_to_cloudinary(file: UploadFile, folder: str = "culture-connect/logos") -> Optional[str]:
    """Upload file to Cloudinary and return the secure URL"""
    try:
        content = await file.read()
        result = await asyncio.to_thread(
            cloudinary.uploader.upload,
            content,
            folder=folder,
            resource_type="image"
        )
        logger.info(f"Uploaded to Cloudinary: {result.get('secure_url')}")
        return result.get("secure_url")
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {str(e)}")
        return None

# ================== MODELS ==================
class RegistrationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str
    full_name: str
    organization_name: Optional[str] = ""
    country: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    profile_type: Optional[str] = "other"
    stand_request: Optional[bool] = False
    stand_category: Optional[str] = None
    bio: Optional[str] = ""
    logo_url: Optional[str] = None
    language_preference: Optional[str] = "fr"
    how_heard: Optional[str] = ""
    status: Optional[str] = "pending"
    show_in_catalog: Optional[bool] = False
    created_at: Optional[str] = ""
    tier: Optional[str] = None
    expertise_tags: Optional[List[str]] = None  # NEW: Expertise tags

class RegistrationListResponse(BaseModel):
    registrations: List[RegistrationResponse]
    total: int
    counts: dict

class AdminVerify(BaseModel):
    password: str

# ================== WORKSPACE SYSTEM ==================
# Workspace passwords and roles configuration
WORKSPACE_CREDENTIALS = {
    "CC2026admin": {"role": "admin", "name": "Admin", "redirect": "/admin"},
    "LC2026": {"role": "founder", "name": "Laurent Coeurvolan", "redirect": "/workspace/laurent"},
    "Twina2026": {"role": "design", "name": "Twina", "redirect": "/workspace/twina"},
    "Gwen2026": {"role": "event", "name": "Gwen", "redirect": "/workspace/gwen"},
    "Kaige2026": {"role": "press", "name": "Kaige-Jean", "redirect": "/workspace/kaige"},
    "Alirio2026": {"role": "business", "name": "Alirio", "redirect": "/workspace/alirio"},
    "Wudy2026": {"role": "finance", "name": "Wudy", "redirect": "/workspace/wudy"},
    "Fabrice2026": {"role": "captions", "name": "Fabrice", "redirect": "/workspace/fabrice"},
    "DataCC2026": {"role": "analyst", "name": "Data Analyst", "redirect": "/workspace/analyst"},
    "Coleen2026": {"role": "partnerships", "name": "Coleen", "redirect": "/workspace/coleen"}
}

class WorkspaceLoginRequest(BaseModel):
    password: str

class WorkspaceLog(BaseModel):
    user: str
    role: str
    action: str
    details: Optional[str] = None
    timestamp: Optional[str] = None

class WorkspaceLogoutRequest(BaseModel):
    user: str
    role: str

class StatusUpdate(BaseModel):
    status: str

class CatalogUpdate(BaseModel):
    show_in_catalog: bool

class ManualRegistration(BaseModel):
    full_name: str
    organization_name: str
    country: str
    email: str
    phone: str
    profile_type: str
    tier: str = "professional"
    status: str = "approved"
    show_in_catalog: bool = True
    bio: str = ""
    stand_request: bool = False
    stand_category: Optional[str] = None
    expertise_tags: Optional[List[str]] = None  # NEW: Support expertise tags

class CheckoutRequest(BaseModel):
    type: str  # "accreditation", "partnership", or "ticket"
    tier: str  # tier key within the chosen type
    origin_url: str
    # For accreditation
    full_name: Optional[str] = None
    organization_name: Optional[str] = None
    country: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    profile_type: Optional[str] = None
    stand_request: Optional[bool] = False
    stand_category: Optional[str] = None
    bio: Optional[str] = ""
    language_preference: Optional[str] = "fr"
    how_heard: Optional[str] = None
    # Additional fields for complete data capture
    profile_image_url: Optional[str] = None  # Cloudinary URL uploaded before checkout
    siret_number: Optional[str] = None
    website_url: Optional[str] = None
    expertise_tags: Optional[str] = None  # NEW: Comma-separated expertise tags
    show_in_catalog: Optional[bool] = False  # NEW: Catalogue pro visibility
    # For partnership
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    # For ticket purchase (vitrine)
    buyer_name: Optional[str] = None
    buyer_email: Optional[str] = None
    # hCaptcha
    captcha_token: Optional[str] = None

class PartnerResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    company_name: str
    contact_name: str
    contact_email: str
    contact_phone: str
    tier: str
    website: Optional[str] = None
    logo_url: Optional[str] = None
    vip_accreditations: List[str] = []
    created_at: str

# ================== CMS MODELS ==================

class CMSMediaItem(BaseModel):
    """Media item for CMS"""
    id: Optional[str] = None
    tenant_id: str = "culture-connect-2026"
    category: str  # hero, logo, venue, gallery
    title: str
    image_url: Optional[str] = None
    description: Optional[str] = None
    order: int = 0
    published: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class CMSExhibitorPhoto(BaseModel):
    """Photo for Smart Engine profile or participant"""
    profile_id: str
    profile_type: str  # smart_engine or participant
    photo_url: Optional[str] = None
    tenant_id: str = "culture-connect-2026"

class CMSSpeaker(BaseModel):
    """Speaker/Intervenant for CMS"""
    id: Optional[str] = None
    tenant_id: str = "culture-connect-2026"
    name: str
    role: str
    photo_url: Optional[str] = None
    bio: Optional[str] = None
    order: int = 0
    published: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class CMSPartnerBanner(BaseModel):
    """Partner banner/logo for CMS"""
    id: Optional[str] = None
    tenant_id: str = "culture-connect-2026"
    name: str
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    order: int = 0
    published: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class CMSTheme(BaseModel):
    """Theme configuration"""
    tenant_id: str = "culture-connect-2026"
    primary_color: str = "#A65D47"
    secondary_color: str = "#C8922A"
    accent_color: str = "#4A5D4E"
    background_color: str = "#1A1A1A"
    text_color: str = "#F4F1EA"
    font_family: str = "Inter"
    hero_image_url: Optional[str] = None
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None

class CMSContent(BaseModel):
    """Editorial content for pages"""
    id: Optional[str] = None
    tenant_id: str = "culture-connect-2026"
    page: str  # home, program, about
    section: str  # title, subtitle, intro, key_figures, etc.
    content: dict  # JSON content
    updated_at: Optional[str] = None

class CMSPage(BaseModel):
    """Custom dynamic page"""
    id: Optional[str] = None
    tenant_id: str = "culture-connect-2026"
    title: str
    slug: str
    content: str  # HTML/rich text
    meta_description: Optional[str] = None
    published: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class AnnualIntention(BaseModel):
    """Annual intention for intro sequence"""
    id: Optional[str] = None
    tenant_id: str = "culture-connect-2026"
    annee: str = "2026"
    mot_annee: str = "NOU."
    mot_annee_note: Optional[str] = "2026 — Nous. La reconnexion."
    image_annee_url: Optional[str] = None
    phrase_ligne_1: str = "Pendant des siècles on nous a séparés."
    phrase_ligne_2: str = "Le 22 Mai 2026 — nous nous retrouvons."
    mot_cle_phrase_2: str = "nous"
    couleur_annee: str = "#A65D47"
    son_tambour_url: Optional[str] = None
    sons_identites: Optional[dict] = None  # {artist: url, label: url, ...}
    territoire_messages: Optional[dict] = None  # {Martinique: "Ou ka vini.", ...}
    active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class MapTerritory(BaseModel):
    """Territory point for diaspora map"""
    id: str
    name: str
    lat: float
    lon: float
    color: str = "#A65D47"
    size: str = "medium"  # primary, large, medium, small
    label: str = ""
    isCenter: bool = False
    opacity: float = 1.0
    active: bool = True

class MapConfig(BaseModel):
    """Map configuration"""
    tenant_id: str = "culture-connect-2026"
    territories: list[dict] = []
    counter_text: str = "territoires connectés"
    animations_enabled: bool = True
    lines_enabled: bool = True

class SectionBackground(BaseModel):
    """Background configuration for a section"""
    section_id: str
    background_type: str = "color"  # color, image, gradient
    color: Optional[str] = None
    image_url: Optional[str] = None
    gradient_start: Optional[str] = None
    gradient_end: Optional[str] = None
    gradient_direction: str = "to-b"
    overlay_opacity: int = 0
    active: bool = True

class SiteConfig(BaseModel):
    """Global site configuration"""
    tenant_id: str = "culture-connect-2026"
    animations_enabled: bool = True
    countdown_enabled: bool = True
    particles_enabled: bool = True
    map_lines_enabled: bool = True
    section_backgrounds: list[dict] = []

# ================== STRIPE ROUTES ==================
@api_router.post("/create-checkout-session")
async def create_checkout_session(request: Request, checkout_data: CheckoutRequest):
    """Create a Stripe checkout session for accreditation or partnership"""
    
    # hCaptcha verification — non-blocking for payment flows (Stripe handles fraud)
    if checkout_data.captcha_token:
        try:
            from services.hcaptcha import verify_hcaptcha
            client_ip = request.client.host if request.client else "unknown"
            captcha_result = await verify_hcaptcha(checkout_data.captcha_token, client_ip)
            if not captcha_result["success"]:
                logger.warning(f"hCaptcha verification failed for checkout (non-blocking): {captcha_result['error']}")
        except Exception as e:
            logger.warning(f"hCaptcha error during checkout (non-blocking): {e}")
    
    # Use origin_url from frontend for redirects (supports preview/production/custom domains)
    origin_url = checkout_data.origin_url.rstrip('/') if checkout_data.origin_url else BASE_URL
    
    if checkout_data.type == "accreditation":
        if checkout_data.tier not in ACCREDITATION_TIERS:
            raise HTTPException(status_code=400, detail="Invalid accreditation tier")
        tier_data = ACCREDITATION_TIERS[checkout_data.tier]
        success_url = f"{origin_url}/confirmation?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin_url}/tarifs"
        
    elif checkout_data.type == "partnership":
        if checkout_data.tier not in PARTNERSHIP_TIERS:
            raise HTTPException(status_code=400, detail="Invalid partnership tier")
        tier_data = PARTNERSHIP_TIERS[checkout_data.tier]
        success_url = f"{origin_url}/partenaire/confirmation?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin_url}/partenaires"

    elif checkout_data.type == "ticket":
        if checkout_data.tier not in TICKET_TIERS:
            raise HTTPException(status_code=400, detail=f"Billet invalide. Choix: {list(TICKET_TIERS.keys())}")
        tier_data = TICKET_TIERS[checkout_data.tier]
        success_url = f"{origin_url}/tarifs?ticket=success&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin_url}/tarifs"

    else:
        raise HTTPException(status_code=400, detail="Invalid checkout type")
    
    # Initialize Stripe
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    # Prepare metadata
    metadata = {
        "type": checkout_data.type,
        "tier": checkout_data.tier,
    }
    
    if checkout_data.type == "accreditation":
        metadata.update({
            "full_name": checkout_data.full_name or "",
            "organization_name": checkout_data.organization_name or "",
            "country": checkout_data.country or "",
            "email": checkout_data.email or "",
            "phone": checkout_data.phone or "",
            "profile_type": checkout_data.profile_type or "",
            "stand_request": str(checkout_data.stand_request),
            "stand_category": checkout_data.stand_category or "",
            "bio": (checkout_data.bio or "")[:500],
            "language_preference": checkout_data.language_preference or "fr",
            "how_heard": checkout_data.how_heard or "",
            "profile_image_url": checkout_data.profile_image_url or "",
            "siret_number": checkout_data.siret_number or "",
            "website_url": checkout_data.website_url or "",
            "expertise_tags": checkout_data.expertise_tags or "",
            "show_in_catalog": str(checkout_data.show_in_catalog or False)
        })
    elif checkout_data.type == "ticket":
        metadata.update({
            "buyer_name": checkout_data.buyer_name or "",
            "buyer_email": checkout_data.buyer_email or "",
            "ticket_access": tier_data.get("access", ""),
        })
    else:
        metadata.update({
            "company_name": checkout_data.company_name or "",
            "contact_name": checkout_data.contact_name or "",
            "contact_email": checkout_data.contact_email or "",
            "contact_phone": checkout_data.contact_phone or "",
            "website": checkout_data.website or "",
            "logo_url": checkout_data.logo_url or ""
        })
    
    # Create checkout session
    checkout_request = CheckoutSessionRequest(
        amount=tier_data["price"],
        currency=tier_data["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata
    )
    
    try:
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record
        transaction = {
            "id": str(uuid.uuid4()),
            "session_id": session.session_id,
            "type": checkout_data.type,
            "tier": checkout_data.tier,
            "amount": tier_data["price"],
            "currency": tier_data["currency"],
            "payment_status": "pending",
            "metadata": metadata,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(transaction)
        
        return {
            "url": session.url,
            "session_id": session.session_id
        }
    except Exception as e:
        logger.error(f"Stripe checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Payment error: {str(e)}")

@api_router.get("/checkout/status/{session_id}")
async def get_checkout_status(request: Request, session_id: str):
    """Get the status of a checkout session"""
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction in database
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": status.payment_status,
                "status": status.status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # If payment is successful, create the registration/partner record
        if status.payment_status == "paid":
            transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            if transaction and not transaction.get("processed"):
                await process_successful_payment(transaction, status.metadata)
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency,
            "metadata": status.metadata
        }
    except Exception as e:
        logger.error(f"Error getting checkout status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events with signature verification"""
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    # Verify signature is present
    if not signature:
        logger.error("Webhook received without Stripe-Signature header")
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")
    
    # Verify webhook secret is configured
    if not STRIPE_WEBHOOK_SECRET:
        logger.error("STRIPE_WEBHOOK_SECRET not configured")
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    # Initialize Stripe checkout with webhook secret for signature verification
    stripe_checkout = StripeCheckout(
        api_key=STRIPE_API_KEY, 
        webhook_url=webhook_url,
        webhook_secret=STRIPE_WEBHOOK_SECRET
    )
    
    try:
        # handle_webhook will verify signature using webhook_secret
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        logger.info(f"Webhook event received: {webhook_response.event_type}")
        
        if webhook_response.event_type == "checkout.session.completed":
            session_id = webhook_response.session_id
            metadata = webhook_response.metadata
            
            # Update transaction
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": webhook_response.payment_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Process the payment
            transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            if transaction and not transaction.get("processed"):
                await process_successful_payment(transaction, metadata)
                logger.info(f"Successfully processed payment for session {session_id}")
                # Notification push admin — paiement recu
                payment_type = metadata.get("type", "unknown")
                notif = {
                    "category": "payment",
                    "title": "Paiement Stripe recu",
                    "message": f"{metadata.get('full_name') or metadata.get('company_name', 'N/A')} — {payment_type} ({metadata.get('tier', '')})",
                    "session_id": session_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                await db.admin_notifications.insert_one({**notif})
                await broadcast_event("admin_notification", notif, channels=["admin_notifications"])

            # --- OMEGA ACCREDITATION FLOW (from omega.py accreditation_pay) ---
            elif metadata.get("accreditation_id"):
                acc_id = metadata["accreditation_id"]
                acc_doc = await db.accreditations_cc2026.find_one({"accreditation_id": acc_id}, {"_id": 0})
                if acc_doc and acc_doc.get("statut") == "PAIEMENT_EN_COURS":
                    await db.accreditations_cc2026.update_one(
                        {"accreditation_id": acc_id},
                        {"$set": {
                            "statut": "SOUMISE",
                            "etape": 4,
                            "paiement_date": datetime.now(timezone.utc).isoformat(),
                            "paiement_stripe_id": session_id,
                        }}
                    )
                    logger.info(f"Omega accreditation payment confirmed: {acc_id}")

                    # Mirror to Baserow
                    try:
                        from services.baserow_service import mirror_badge
                        await mirror_badge({
                            "prenom": acc_doc.get("prenom", ""),
                            "nom": acc_doc.get("nom", ""),
                            "badge_id": acc_id,
                            "type_badge": acc_doc.get("type_accreditation", ""),
                            "statut": "SOUMISE",
                            "email": acc_doc.get("email", ""),
                            "organisation": acc_doc.get("organisation", ""),
                        })
                    except Exception as br_err:
                        logger.error(f"Baserow mirror on accreditation webhook: {br_err}")

                    # Send Brevo badge_confirmation template
                    try:
                        from services.brevo_templates import badge_confirmation
                        subj, html = badge_confirmation(
                            acc_doc.get("prenom", ""),
                            acc_doc.get("type_label", acc_doc.get("type_accreditation", "")),
                            acc_doc.get("frek_id", ""),
                            acc_id,
                        )
                        await send_email_async(acc_doc.get("email", ""), subj, html)
                    except Exception as mail_err:
                        logger.error(f"Brevo email on accreditation webhook: {mail_err}")

                    notif = {
                        "category": "payment",
                        "title": "Paiement accreditation CC2026",
                        "message": f"{acc_doc.get('prenom', '')} {acc_doc.get('nom', '')} — {acc_doc.get('type_label', '')}",
                        "session_id": session_id,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                    await db.admin_notifications.insert_one({**notif})

            # --- JCC WALLET PACK (from omega.py shop checkout) ---
            elif metadata.get("pack_id"):
                pack_id = metadata["pack_id"]
                buyer_email = metadata.get("email", "")
                jetons = int(metadata.get("jetons", "0"))
                if buyer_email and jetons > 0:
                    await db.kn_wallets.update_one(
                        {"email": buyer_email},
                        {"$inc": {"balance_jcc": jetons}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
                        upsert=True
                    )
                    logger.info(f"Wallet credited: {buyer_email} +{jetons} JCC (pack {pack_id})")

                    # Send Brevo jeton_achat_confirmation template
                    try:
                        wallet = await db.kn_wallets.find_one({"email": buyer_email}, {"_id": 0})
                        solde = wallet.get("balance_jcc", jetons) if wallet else jetons
                        user = await db.registrations.find_one({"email": buyer_email}, {"_id": 0, "prenom": 1, "full_name": 1})
                        prenom = user.get("prenom", buyer_email.split("@")[0]) if user else buyer_email.split("@")[0]
                        from services.brevo_templates import jeton_achat_confirmation
                        subj, html = jeton_achat_confirmation(prenom, jetons, solde)
                        await send_email_async(buyer_email, subj, html)
                    except Exception as mail_err:
                        logger.warning(f"Jeton email failed: {mail_err}")

        elif webhook_response.event_type == "payment_intent.payment_failed":
            logger.warning(f"Payment failed: session={webhook_response.session_id}")
            await db.audit_logs.insert_one({
                "action_type": "PAYMENT_FAILED",
                "session_id": webhook_response.session_id or "",
                "metadata": webhook_response.metadata or {},
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

        return {"status": "success", "event": webhook_response.event_type}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        # Return 400 for signature verification failures
        if "signature" in str(e).lower():
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
        return {"status": "error", "message": str(e)}

async def process_successful_payment(transaction: dict, metadata: dict):
    """Process a successful payment - create registration or partner"""
    session_id = transaction.get("session_id")
    payment_type = metadata.get("type") or transaction.get("type")
    tier = metadata.get("tier") or transaction.get("tier")
    
    # Mark as processed to prevent duplicate processing
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"processed": True}}
    )
    
    if payment_type == "accreditation":
        # Create registration
        registration_id = str(uuid.uuid4())
        registration = {
            "id": registration_id,
            "full_name": metadata.get("full_name", ""),
            "organization_name": metadata.get("organization_name", ""),
            "country": metadata.get("country", ""),
            "email": metadata.get("email", ""),
            "phone": metadata.get("phone", ""),
            "profile_type": metadata.get("profile_type", ""),
            "stand_request": metadata.get("stand_request", "false").lower() == "true",
            "stand_category": metadata.get("stand_category") or None,
            "bio": metadata.get("bio", ""),
            # Use profile_image_url from Cloudinary (uploaded before checkout)
            "logo_url": metadata.get("profile_image_url") or None,
            "language_preference": metadata.get("language_preference", "fr"),
            "how_heard": metadata.get("how_heard", ""),
            # Additional fields
            "siret_number": metadata.get("siret_number") or None,
            "website_url": metadata.get("website_url") or None,
            # Expertise tags stored as array
            "expertise_tags": [t.strip() for t in (metadata.get("expertise_tags") or "").split(",") if t.strip()],
            "tier": tier,
            "status": "pending",
            "show_in_catalog": metadata.get("show_in_catalog", "false").lower() == "true",
            "payment_session_id": session_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.registrations.insert_one(registration)
        
        # Send confirmation email
        email = metadata.get("email")
        if email:
            asyncio.create_task(send_email_async(
                email,
                "Votre demande d'accréditation Culture Connect 2026 a été reçue",
                get_confirmation_email(metadata.get("full_name", ""), tier, email)
            ))
        
        logger.info(f"Created registration {registration_id} from payment {session_id}")
        
    elif payment_type == "partnership":
        # Create partner
        partner_id = str(uuid.uuid4())
        tier_data = PARTNERSHIP_TIERS.get(tier, PARTNERSHIP_TIERS["bronze"])
        
        partner = {
            "id": partner_id,
            "company_name": metadata.get("company_name", ""),
            "contact_name": metadata.get("contact_name", ""),
            "contact_email": metadata.get("contact_email", ""),
            "contact_phone": metadata.get("contact_phone", ""),
            "tier": tier,
            "website": metadata.get("website") or None,
            "logo_url": metadata.get("logo_url") or None,
            "vip_accreditations": [],
            "payment_session_id": session_id,
            "show_on_landing": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.partners.insert_one(partner)
        
        # Create VIP accreditations for the partner
        vip_ids = []
        for i in range(tier_data["vip_count"]):
            vip_id = str(uuid.uuid4())
            vip_registration = {
                "id": vip_id,
                "full_name": f"VIP {i+1} - {metadata.get('company_name', '')}",
                "organization_name": metadata.get("company_name", ""),
                "country": "",
                "email": metadata.get("contact_email", ""),
                "phone": "",
                "profile_type": "institution",
                "stand_request": False,
                "stand_category": None,
                "bio": f"Accréditation VIP offerte - {tier_data['name']}",
                "logo_url": None,
                "language_preference": "fr",
                "how_heard": "partner_benefit",
                "tier": "institutional",
                "status": "approved",
                "show_in_catalog": False,
                "partner_id": partner_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.registrations.insert_one(vip_registration)
            vip_ids.append(vip_id)
        
        # Update partner with VIP IDs
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": {"vip_accreditations": vip_ids}}
        )
        
        # Send welcome email
        email = metadata.get("contact_email")
        if email:
            asyncio.create_task(send_email_async(
                email,
                "Bienvenue parmi nos partenaires — Culture Connect 2026",
                get_partner_welcome_email(
                    metadata.get("company_name", ""),
                    tier,
                    metadata.get("contact_name", "")
                )
            ))
        
        logger.info(f"Created partner {partner_id} with {len(vip_ids)} VIP accreditations from payment {session_id}")

    elif payment_type == "adhesion":
        # Activate adhesion after successful payment
        email = metadata.get("email", "")
        level = metadata.get("level", "FREE")
        kt_offerts = int(metadata.get("kt_offerts", 0))
        brain_quota = int(metadata.get("brain_quota_daily", 10))
        if email and level:
            now_iso = datetime.now(timezone.utc)
            await db.adhesions.update_many({"email": email, "actif": True}, {"$set": {"actif": False}})
            adhesion_doc = {
                "adhesion_id": str(uuid.uuid4()),
                "email": email, "level": level,
                "prix_mensuel": float(metadata.get("prix_mensuel", 0)),
                "brain_quota_daily": brain_quota,
                "brain_quota_used_today": 0,
                "brain_quota_reset": (now_iso.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)).isoformat(),
                "date_debut": now_iso.isoformat(), "date_fin": None, "auto_renew": True, "actif": True,
                "stripe_session_id": session_id,
            }
            await db.adhesions.insert_one(adhesion_doc)
            # Credit welcome JCC
            if kt_offerts > 0:
                await db.registrations.update_one({"email": email}, {"$inc": {"jetons_solde": kt_offerts}})
            # Mark pending record as processed
            await db.adhesions_pending.update_one(
                {"session_id": session_id}, {"$set": {"processed": True}}
            )
            logger.info(f"Adhesion {level} activated for {email} via Stripe session {session_id}")

    elif payment_type == "ticket":
        buyer_name = metadata.get("buyer_name", "")
        buyer_email = metadata.get("buyer_email", "")
        tier = metadata.get("tier", "general")
        tier_data = TICKET_TIERS.get(tier, TICKET_TIERS["general"])
        if buyer_email:
            ticket_id = f"TK26-{tier.upper()[:3]}-{str(uuid.uuid4())[:8].upper()}"
            await db.tickets.insert_one({
                "ticket_id": ticket_id,
                "buyer_name": buyer_name,
                "buyer_email": buyer_email,
                "tier": tier,
                "tier_name": tier_data["name"],
                "access": tier_data["access"],
                "amount_eur": tier_data["price"],
                "stripe_session_id": session_id,
                "status": "confirmed",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            from services import ses_service as _ses
            asyncio.create_task(_ses.send_ticket_confirmation(
                to_email=buyer_email,
                name=buyer_name,
                ticket_id=ticket_id,
                tier_name=tier_data["name"],
                access=tier_data["access"],
            ))
            logger.info(f"Ticket {ticket_id} confirmed for {buyer_email}")

@api_router.get("/stripe-public-key")
async def get_stripe_public_key():
    """Return the Stripe public key for frontend"""
    return {"publicKey": STRIPE_PUBLIC_KEY}

@api_router.get("/partners")
async def get_partners():
    """Get all partners for display on landing page"""
    partners = await db.partners.find(
        {"show_on_landing": True},
        {"_id": 0}
    ).to_list(100)
    return {"partners": partners, "total": len(partners)}

# ================== EXISTING ROUTES ==================
@api_router.get("/")
async def root():
    return {"message": "Culture Connect 2026 API"}

@api_router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """Upload image to Cloudinary before Stripe checkout - returns URL to store in metadata"""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Use JPEG, PNG, WebP or GIF")
    
    # Upload to Cloudinary
    image_url = await upload_to_cloudinary(file, "culture-connect/profiles")
    
    if not image_url:
        raise HTTPException(status_code=500, detail="Upload failed")
    
    return {"url": image_url, "success": True}

@api_router.post("/registrations", response_model=RegistrationResponse)
async def create_registration(
    full_name: str = Form(...),
    organization_name: str = Form(...),
    country: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    profile_type: str = Form(...),
    stand_request: bool = Form(...),
    stand_category: Optional[str] = Form(None),
    bio: str = Form(...),
    language_preference: str = Form(...),
    how_heard: str = Form(...),
    tier: str = Form("professional"),
    logo: Optional[UploadFile] = File(None)
):
    registration_id = str(uuid.uuid4())
    logo_url = None
    
    if logo and logo.filename:
        logo_url = await upload_to_cloudinary(logo, f"culture-connect/logos/{registration_id}")
    
    registration = {
        "id": registration_id,
        "full_name": full_name,
        "organization_name": organization_name,
        "country": country,
        "email": email,
        "phone": phone,
        "profile_type": profile_type,
        "stand_request": stand_request,
        "stand_category": stand_category if stand_request else None,
        "bio": bio,
        "logo_url": logo_url,
        "language_preference": language_preference,
        "how_heard": how_heard,
        "tier": tier,
        "status": "pending",
        "show_in_catalog": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.registrations.insert_one(registration)
    
    # 🔄 Broadcast real-time update
    await broadcast_event("registration_created", {"id": registration_id, "name": full_name, "tier": tier})
    # Notification push admin — nouveau badge/inscription
    notif = {
        "category": "badge",
        "title": "Nouvelle inscription",
        "message": f"{full_name} — {tier}",
        "badge_id": registration_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.admin_notifications.insert_one({**notif})
    await broadcast_event("admin_notification", notif, channels=["admin_notifications"])
    
    asyncio.create_task(send_email_async(
        email,
        "Votre demande d'accréditation Culture Connect 2026 a été reçue",
        get_confirmation_email(full_name, tier, email)
    ))
    
    return RegistrationResponse(**registration)

@api_router.get("/registrations", response_model=RegistrationListResponse)
async def get_registrations(
    profile_type: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    stand_request: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    filter_query = {}
    if profile_type:
        filter_query["profile_type"] = profile_type
    if country:
        filter_query["country"] = country
    if stand_request is not None and stand_request != "":
        filter_query["stand_request"] = stand_request.lower() == "true"
    if status:
        filter_query["status"] = status
    
    registrations = await db.registrations.find(filter_query, {"_id": 0}).to_list(1000)
    
    all_registrations = await db.registrations.find({}, {"_id": 0, "profile_type": 1, "status": 1}).to_list(1000)
    counts = {
        "total": len(all_registrations),
        "by_profile": {},
        "by_status": {"pending": 0, "approved": 0, "rejected": 0}
    }
    
    for reg in all_registrations:
        profile = reg.get("profile_type", "other")
        counts["by_profile"][profile] = counts["by_profile"].get(profile, 0) + 1
        status_val = reg.get("status", "pending")
        if status_val in counts["by_status"]:
            counts["by_status"][status_val] += 1
    
    return RegistrationListResponse(
        registrations=registrations,
        total=len(registrations),
        counts=counts
    )

@api_router.patch("/registrations/{registration_id}/status")
async def update_registration_status(registration_id: str, status_update: StatusUpdate):
    if status_update.status not in ["pending", "approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    registration = await db.registrations.find_one({"id": registration_id}, {"_id": 0})
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    previous_status = registration.get("status")
    
    # When approving, automatically add to catalog
    update_data = {"status": status_update.status}
    if status_update.status == "approved":
        update_data["show_in_catalog"] = True
    elif status_update.status == "rejected":
        update_data["show_in_catalog"] = False
    
    await db.registrations.update_one(
        {"id": registration_id},
        {"$set": update_data}
    )
    
    if previous_status != status_update.status:
        email = registration.get("email")
        name = registration.get("full_name")
        tier = registration.get("tier", "professional")
        
        if status_update.status == "approved" and email:
            asyncio.create_task(send_email_async(
                email,
                "Votre accréditation Culture Connect 2026 est confirmée ✓",
                get_approval_email(name, tier, registration_id)
            ))
            
            # NEW: Notify partner if this participant is sponsored
            sponsored_by = registration.get("sponsored_by")
            if sponsored_by:
                asyncio.create_task(notify_partner_of_approval(sponsored_by, registration))
                
        elif status_update.status == "rejected" and email:
            asyncio.create_task(send_email_async(
                email,
                "Suite à votre demande — Culture Connect 2026",
                get_rejection_email(name)
            ))
    
    return {"success": True, "status": status_update.status, "show_in_catalog": update_data.get("show_in_catalog")}

@api_router.patch("/registrations/{registration_id}/catalog")
async def update_catalog_visibility(registration_id: str, catalog_update: CatalogUpdate):
    result = await db.registrations.update_one(
        {"id": registration_id},
        {"$set": {"show_in_catalog": catalog_update.show_in_catalog}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    return {"success": True, "show_in_catalog": catalog_update.show_in_catalog}

@api_router.patch("/registrations/{registration_id}/photo")
async def update_registration_photo(registration_id: str, file: UploadFile = File(...)):
    """Upload or replace a participant photo via Cloudinary."""
    reg = await db.registrations.find_one({"id": registration_id}, {"_id": 0, "id": 1})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    # upload_to_cloudinary returns a string URL, not a dict
    image_url = await upload_to_cloudinary(file, folder="culture_connect/photos")
    if not image_url:
        raise HTTPException(status_code=500, detail="Upload failed")
    
    await db.registrations.update_one(
        {"id": registration_id},
        {"$set": {"logo_url": image_url}}
    )
    return {"success": True, "logo_url": image_url}

@api_router.delete("/registrations/{registration_id}")
async def delete_registration(registration_id: str):
    result = await db.registrations.delete_one({"id": registration_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    return {"success": True, "message": "Registration deleted"}

@api_router.post("/registrations/manual", response_model=RegistrationResponse)
async def create_manual_registration(data: ManualRegistration):
    registration_id = str(uuid.uuid4())
    
    registration = {
        "id": registration_id,
        "full_name": data.full_name,
        "organization_name": data.organization_name,
        "country": data.country,
        "email": data.email,
        "phone": data.phone,
        "profile_type": data.profile_type,
        "stand_request": data.stand_request,
        "stand_category": data.stand_category,
        "bio": data.bio,
        "logo_url": None,
        "language_preference": "fr",
        "how_heard": "admin",
        "tier": data.tier,
        "status": data.status,
        "show_in_catalog": data.show_in_catalog,
        "expertise_tags": data.expertise_tags or [],  # NEW: Include expertise tags
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.registrations.insert_one(registration)
    
    return RegistrationResponse(**registration)

@api_router.get("/catalog")
async def get_catalog_entries():
    """Get only participants that are APPROVED and VISIBLE in catalog"""
    registrations = await db.registrations.find(
        {
            "show_in_catalog": True,
            "status": "approved"
        },
        {
            "_id": 0,
            "email": 0,
            "phone": 0,
            "payment_session_id": 0,
            "siret_number": 0
        }
    ).to_list(1000)
    
    return {"participants": registrations, "total": len(registrations)}

@api_router.get("/registrations/export")
async def export_registrations():
    registrations = await db.registrations.find({}, {"_id": 0}).to_list(1000)
    
    if not registrations:
        registrations = []
    
    output = io.StringIO()
    fieldnames = [
        "id", "full_name", "organization_name", "country", "email", "phone",
        "profile_type", "stand_request", "stand_category", "bio", "logo_url",
        "language_preference", "how_heard", "tier", "status", "created_at"
    ]
    
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
    writer.writeheader()
    for reg in registrations:
        writer.writerow(reg)
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=registrations.csv"}
    )

# ================== BATCH OPERATIONS ==================

class BatchApproveRequest(BaseModel):
    registration_ids: List[str]

class BatchSendBadgesRequest(BaseModel):
    registration_ids: List[str]  # If empty, send to ALL approved

# ================== BATCH JOB PERSISTENCE (MongoDB) ==================

async def create_batch_job(job_id: str, total: int, job_type: str = "send_badges") -> dict:
    """Create a new batch job in MongoDB"""
    job = {
        "id": job_id,
        "type": job_type,
        "total": total,
        "processed": 0,
        "sent": 0,
        "failed": 0,
        "status": "running",
        "results": {"sent": [], "failed": []},
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    await db.batch_jobs.insert_one(job)
    return job

async def update_batch_job_progress(job_id: str, processed: int, sent: int, failed: int, 
                                     sent_result: dict = None, failed_result: dict = None):
    """Update batch job progress in MongoDB"""
    update_data = {
        "processed": processed,
        "sent": sent,
        "failed": failed
    }
    
    push_data = {}
    if sent_result:
        push_data["results.sent"] = sent_result
    if failed_result:
        push_data["results.failed"] = failed_result
    
    update_query = {"$set": update_data}
    if push_data:
        update_query["$push"] = push_data
    
    await db.batch_jobs.update_one({"id": job_id}, update_query)

async def complete_batch_job(job_id: str):
    """Mark batch job as completed"""
    await db.batch_jobs.update_one(
        {"id": job_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )

async def get_batch_job(job_id: str) -> Optional[dict]:
    """Get batch job from MongoDB"""
    return await db.batch_jobs.find_one({"id": job_id}, {"_id": 0})

async def log_email_send(recipient_email: str, recipient_name: str, email_type: str, status: str, participant_id: str = None, error: str = None):
    """Log email send to database for history tracking"""
    log_entry = {
        "id": str(uuid.uuid4()),
        "recipient_email": recipient_email,
        "recipient_name": recipient_name,
        "email_type": email_type,  # "badge", "approval", "rejection", "partner_notification"
        "status": status,  # "sent", "failed"
        "participant_id": participant_id,
        "error": error,
        "sent_at": datetime.now(timezone.utc).isoformat()
    }
    await db.email_logs.insert_one(log_entry)
    return log_entry

@api_router.post("/registrations/batch/approve")
async def batch_approve_registrations(request: BatchApproveRequest):
    """Approve multiple registrations at once (max 50)"""
    if len(request.registration_ids) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 registrations per batch")
    
    if not request.registration_ids:
        raise HTTPException(status_code=400, detail="No registration IDs provided")
    
    results = {"approved": [], "failed": [], "already_approved": []}
    
    for reg_id in request.registration_ids:
        registration = await db.registrations.find_one({"id": reg_id}, {"_id": 0})
        if not registration:
            results["failed"].append({"id": reg_id, "reason": "Not found"})
            continue
        
        if registration.get("status") == "approved":
            results["already_approved"].append(reg_id)
            continue
        
        # Update status
        await db.registrations.update_one(
            {"id": reg_id},
            {"$set": {"status": "approved", "show_in_catalog": True}}
        )
        
        # Send approval email
        email = registration.get("email")
        name = registration.get("full_name")
        tier = registration.get("tier", "professional")
        
        if email:
            asyncio.create_task(send_email_async(
                email,
                "Votre accréditation Culture Connect 2026 est confirmée ✓",
                get_approval_email(name, tier, reg_id)
            ))
        
        # Notify partner if sponsored
        sponsored_by = registration.get("sponsored_by")
        if sponsored_by:
            asyncio.create_task(notify_partner_of_approval(sponsored_by, registration))
        
        results["approved"].append(reg_id)
    
    return {
        "success": True,
        "total_processed": len(request.registration_ids),
        "approved_count": len(results["approved"]),
        "already_approved_count": len(results["already_approved"]),
        "failed_count": len(results["failed"]),
        "details": results
    }

@api_router.post("/registrations/batch/send-badges")
async def batch_send_badges(request: BatchSendBadgesRequest, background_tasks: BackgroundTasks = None):
    """Send badge PDFs by email to selected approved participants (max 50)"""
    
    # Determine which registrations to send badges to
    if request.registration_ids:
        if len(request.registration_ids) > 50:
            raise HTTPException(status_code=400, detail="Maximum 50 badges per batch")
        
        registrations = await db.registrations.find(
            {"id": {"$in": request.registration_ids}, "status": "approved"},
            {"_id": 0}
        ).to_list(50)
    else:
        # Send to ALL approved participants
        registrations = await db.registrations.find(
            {"status": "approved"},
            {"_id": 0}
        ).to_list(1000)
    
    if not registrations:
        return {"success": False, "message": "No approved registrations found", "sent_count": 0, "job_id": None}
    
    # Create batch job in MongoDB for persistence
    job_id = str(uuid.uuid4())
    await create_batch_job(job_id, len(registrations), "send_badges")
    
    # Process badges asynchronously with progress tracking
    async def process_badges():
        processed = 0
        sent = 0
        failed = 0
        
        for reg in registrations:
            email = reg.get("email")
            name = reg.get("full_name", "Participant")
            tier = reg.get("tier", "professional")
            reg_id = reg.get("id")
            
            processed += 1
            
            if not email:
                failed += 1
                await update_batch_job_progress(
                    job_id, processed, sent, failed,
                    failed_result={"id": reg_id, "reason": "No email"}
                )
                await log_email_send(email or "N/A", name, "badge", "failed", reg_id, "No email address")
                continue
            
            try:
                # Generate PDF badge
                pdf_buffer = generate_badge_pdf_buffer(reg)
                
                # Send email with badge attachment
                email_html = get_badge_email_html(name, tier, reg_id)
                filename = f"badge_{name.replace(' ', '_')}_{reg_id[:8]}.pdf"
                
                await send_email_with_attachment(
                    email,
                    f"Votre badge Culture Connect 2026 — {name}",
                    email_html,
                    pdf_buffer,
                    filename
                )
                
                sent += 1
                await update_batch_job_progress(
                    job_id, processed, sent, failed,
                    sent_result={"id": reg_id, "email": email, "name": name}
                )
                await log_email_send(email, name, "badge", "sent", reg_id)
            except Exception as e:
                logger.error(f"Failed to send badge to {email}: {str(e)}")
                failed += 1
                await update_batch_job_progress(
                    job_id, processed, sent, failed,
                    failed_result={"id": reg_id, "reason": str(e)}
                )
                await log_email_send(email, name, "badge", "failed", reg_id, str(e))
        
        # Mark job as completed
        await complete_batch_job(job_id)
    
    # Start async processing
    asyncio.create_task(process_badges())
    
    return {
        "success": True,
        "job_id": job_id,
        "total": len(registrations),
        "message": "Badge sending started"
    }

@api_router.get("/registrations/batch/progress/{job_id}")
async def get_batch_progress(job_id: str):
    """Get progress of a batch job from MongoDB"""
    job = await get_batch_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    progress_percent = (job["processed"] / job["total"] * 100) if job["total"] > 0 else 0
    
    return {
        "job_id": job_id,
        "status": job["status"],
        "total": job["total"],
        "processed": job["processed"],
        "sent": job["sent"],
        "failed": job["failed"],
        "progress_percent": round(progress_percent, 1),
        "started_at": job["started_at"],
        "completed_at": job["completed_at"],
        "results": job["results"] if job["status"] == "completed" else None
    }

@api_router.get("/registrations/batch/history")
async def get_batch_history(limit: int = Query(20, le=100)):
    """Get history of batch jobs"""
    jobs = await db.batch_jobs.find(
        {},
        {"_id": 0}
    ).sort("started_at", -1).to_list(limit)
    
    return {
        "jobs": jobs,
        "total": len(jobs)
    }

# ================== EMAIL LOGS ==================

@api_router.get("/email-logs")
async def get_email_logs(
    email_type: Optional[str] = Query(None, description="Filter by type: badge, approval, rejection, partner_notification"),
    status: Optional[str] = Query(None, description="Filter by status: sent, failed"),
    limit: int = Query(100, le=500)
):
    """Get email send history for admin tracking"""
    filter_query = {}
    
    if email_type:
        filter_query["email_type"] = email_type
    if status:
        filter_query["status"] = status
    
    logs = await db.email_logs.find(
        filter_query,
        {"_id": 0}
    ).sort("sent_at", -1).to_list(limit)
    
    # Get summary stats
    total_sent = await db.email_logs.count_documents({"status": "sent"})
    total_failed = await db.email_logs.count_documents({"status": "failed"})
    badges_sent = await db.email_logs.count_documents({"email_type": "badge", "status": "sent"})
    
    return {
        "logs": logs,
        "total_count": len(logs),
        "summary": {
            "total_sent": total_sent,
            "total_failed": total_failed,
            "badges_sent": badges_sent
        }
    }

@api_router.get("/email-logs/stats")
async def get_email_stats():
    """Get email statistics for dashboard"""
    # Count by type
    pipeline = [
        {"$group": {
            "_id": {"type": "$email_type", "status": "$status"},
            "count": {"$sum": 1}
        }}
    ]
    
    results = await db.email_logs.aggregate(pipeline).to_list(100)
    
    # Format stats
    by_type = {}
    for r in results:
        email_type = r["_id"]["type"]
        status = r["_id"]["status"]
        if email_type not in by_type:
            by_type[email_type] = {"sent": 0, "failed": 0}
        by_type[email_type][status] = r["count"]
    
    # Recent activity (last 7 days)
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_count = await db.email_logs.count_documents({"sent_at": {"$gte": seven_days_ago}})
    
    return {
        "by_type": by_type,
        "recent_7_days": recent_count,
        "total_emails": sum(v["sent"] + v["failed"] for v in by_type.values())
    }

def generate_badge_pdf_buffer(participant: dict) -> bytes:
    """Generate PDF badge and return as bytes buffer"""
    pdf_buffer = io.BytesIO()
    badge_width, badge_height = 105 * mm, 148 * mm  # A6 size
    c = canvas.Canvas(pdf_buffer, pagesize=(badge_width, badge_height))
    
    # Colors
    tier_colors = {
        "emerging": "#4A5D4E",
        "professional": "#A65D47",
        "institutional": "#1A1A1A"
    }
    tier_names = {
        "emerging": "ÉMERGENT",
        "professional": "PROFESSIONNEL",
        "institutional": "INSTITUTIONNEL"
    }
    tier = participant.get("tier", "professional")
    tier_color = HexColor(tier_colors.get(tier, "#A65D47"))
    
    # Background
    c.setFillColor(HexColor("#F4F1EA"))
    c.rect(0, 0, badge_width, badge_height, fill=1, stroke=0)
    
    # Border
    c.setStrokeColor(tier_color)
    c.setLineWidth(3)
    c.rect(3, 3, badge_width - 6, badge_height - 6, fill=0, stroke=1)
    
    # Header
    c.setFillColor(HexColor("#1A1A1A"))
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(badge_width / 2, badge_height - 25, "CULTURE CONNECT 2026")
    
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor("#8A8578"))
    c.drawCentredString(badge_width / 2, badge_height - 38, "Fort-de-France · 20-23 Mai 2026")
    
    # Name and organization
    c.setFillColor(HexColor("#1A1A1A"))
    c.setFont("Helvetica-Bold", 16)
    full_name = participant.get("full_name", "")[:25]
    c.drawCentredString(badge_width / 2, badge_height - 75, full_name)
    
    c.setFont("Helvetica", 10)
    c.setFillColor(HexColor("#8A8578"))
    org_name = participant.get("organization_name", "")[:30]
    c.drawCentredString(badge_width / 2, badge_height - 92, org_name)
    
    # Tier badge
    tier_text = tier_names.get(tier, "PROFESSIONNEL")
    c.setFillColor(tier_color)
    c.rect(badge_width / 2 - 40, badge_height - 118, 80, 18, fill=1, stroke=0)
    c.setFillColor(HexColor("#F4F1EA"))
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(badge_width / 2, badge_height - 113, tier_text)
    
    # QR Code
    profile_url = f"{BASE_URL}/participant/{participant.get('id')}"
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(profile_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format='PNG')
    qr_buffer.seek(0)
    
    from reportlab.lib.utils import ImageReader
    qr_image = ImageReader(qr_buffer)
    qr_size = 35 * mm
    c.drawImage(qr_image, (badge_width - qr_size) / 2, 25, width=qr_size, height=qr_size)
    
    # ID below QR
    c.setFillColor(HexColor("#8A8578"))
    c.setFont("Helvetica", 7)
    c.drawCentredString(badge_width / 2, 18, f"ID: {participant.get('id', '')[:8].upper()}")
    
    c.save()
    pdf_buffer.seek(0)
    return pdf_buffer.getvalue()

@api_router.get("/registrations/export/filtered")
async def export_registrations_filtered(
    profile_type: Optional[str] = Query(None),
    expertise_tags: Optional[str] = Query(None, description="Comma-separated tags"),
    status: Optional[str] = Query(None),
    country: Optional[str] = Query(None)
):
    """
    Export filtered registrations as CSV
    Example: /api/registrations/export/filtered?expertise_tags=labels,marche_culturel&profile_type=label
    """
    filter_query = {}
    
    if profile_type:
        filter_query["profile_type"] = profile_type
    if status:
        filter_query["status"] = status
    if country:
        filter_query["country"] = country
    
    # Filter by expertise tags
    if expertise_tags:
        tags_list = [t.strip() for t in expertise_tags.split(",") if t.strip()]
        if tags_list:
            filter_query["expertise_tags"] = {"$in": tags_list}
    
    registrations = await db.registrations.find(filter_query, {"_id": 0}).to_list(10000)
    
    if not registrations:
        registrations = []
    
    output = io.StringIO()
    fieldnames = [
        "id", "full_name", "organization_name", "country", "email", "phone",
        "profile_type", "expertise_tags", "stand_request", "stand_category", "bio", "logo_url",
        "language_preference", "how_heard", "tier", "status", "siret_number", "website_url", "created_at"
    ]
    
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
    writer.writeheader()
    for reg in registrations:
        # Convert expertise_tags list to string for CSV
        reg_copy = {**reg}
        if isinstance(reg_copy.get("expertise_tags"), list):
            reg_copy["expertise_tags"] = ", ".join(reg_copy["expertise_tags"])
        writer.writerow(reg_copy)
    
    output.seek(0)
    
    # Build filename with filters
    filename_parts = ["registrations"]
    if profile_type:
        filename_parts.append(profile_type)
    if expertise_tags:
        filename_parts.append(expertise_tags.replace(",", "_"))
    filename = f"{'_'.join(filename_parts)}_{datetime.now().strftime('%Y%m%d')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.post("/admin/verify")
async def verify_admin(admin: AdminVerify):
    admin_pwd = os.environ.get("ADMIN_PASSWORD", "CC2026admin")
    if admin.password == admin_pwd:
        response = JSONResponse(content={"success": True})
        set_session_cookie(response, {"role": "admin", "email": "admin@kiltikonet.fr"})
        return response
    raise HTTPException(status_code=401, detail="Invalid password")

# ================== WORKSPACE LOGIN & LOGS ==================

# Rate limiting for login attempts
login_attempts = {}  # IP -> {count, last_attempt, blocked_until}
LOGIN_ATTEMPT_LIMIT = 5
LOGIN_BLOCK_DURATION = 300  # 5 minutes

def check_rate_limit(client_ip: str) -> bool:
    """Check if client is rate limited. Returns True if blocked."""
    now = datetime.now(timezone.utc)
    
    if client_ip in login_attempts:
        attempt_info = login_attempts[client_ip]
        
        # Check if blocked
        if attempt_info.get("blocked_until"):
            if now < attempt_info["blocked_until"]:
                return True
            else:
                # Block expired, reset
                login_attempts[client_ip] = {"count": 0, "last_attempt": now, "blocked_until": None}
                return False
        
        # Reset if last attempt was more than 15 minutes ago
        if (now - attempt_info["last_attempt"]).total_seconds() > 900:
            login_attempts[client_ip] = {"count": 0, "last_attempt": now, "blocked_until": None}
    
    return False

def record_failed_login(client_ip: str):
    """Record a failed login attempt."""
    now = datetime.now(timezone.utc)
    
    if client_ip not in login_attempts:
        login_attempts[client_ip] = {"count": 0, "last_attempt": now, "blocked_until": None}
    
    login_attempts[client_ip]["count"] += 1
    login_attempts[client_ip]["last_attempt"] = now
    
    # Block after 5 failed attempts
    if login_attempts[client_ip]["count"] >= LOGIN_ATTEMPT_LIMIT:
        login_attempts[client_ip]["blocked_until"] = now + timedelta(seconds=LOGIN_BLOCK_DURATION)
        logger.warning(f"🚫 IP {client_ip} blocked for {LOGIN_BLOCK_DURATION}s after {LOGIN_ATTEMPT_LIMIT} failed login attempts")

def clear_failed_login(client_ip: str):
    """Clear failed login attempts after successful login."""
    if client_ip in login_attempts:
        del login_attempts[client_ip]

@api_router.post("/workspace/login")
async def workspace_login(request: WorkspaceLoginRequest, req: Request):
    """
    Workspace login - returns user info and redirect based on password
    Also logs the connection to MongoDB
    """
    client_ip = req.client.host if req.client else "unknown"
    
    # Check rate limiting
    if check_rate_limit(client_ip):
        raise HTTPException(
            status_code=429, 
            detail="Trop de tentatives de connexion. Veuillez réessayer dans 5 minutes."
        )
    
    if request.password not in WORKSPACE_CREDENTIALS:
        record_failed_login(client_ip)
        remaining = LOGIN_ATTEMPT_LIMIT - login_attempts.get(client_ip, {}).get("count", 0)
        if remaining > 0:
            raise HTTPException(status_code=401, detail=f"Mot de passe invalide. {remaining} tentatives restantes.")
        else:
            raise HTTPException(status_code=429, detail="Compte bloqué temporairement. Réessayez dans 5 minutes.")
    
    # Clear failed attempts on successful login
    clear_failed_login(client_ip)
    
    user_info = WORKSPACE_CREDENTIALS[request.password]
    
    # Log the connection
    log_entry = {
        "id": str(uuid.uuid4()),
        "user": user_info["name"],
        "role": user_info["role"],
        "action": "login",
        "details": f"Connexion workspace {user_info['role']}",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "session_start": datetime.now(timezone.utc).isoformat()
    }
    await db.workspace_logs.insert_one(log_entry)
    
    response = JSONResponse(content={
        "success": True,
        "user": user_info["name"],
        "role": user_info["role"],
        "redirect": user_info["redirect"]
    })
    set_session_cookie(response, {
        "role": user_info["role"],
        "name": user_info["name"],
        "redirect": user_info["redirect"]
    })
    return response

@api_router.post("/workspace/log")
async def add_workspace_log(log: WorkspaceLog):
    """Add a workspace activity log entry"""
    log_entry = {
        "id": str(uuid.uuid4()),
        "user": log.user,
        "role": log.role,
        "action": log.action,
        "details": log.details,
        "timestamp": log.timestamp or datetime.now(timezone.utc).isoformat()
    }
    await db.workspace_logs.insert_one(log_entry)
    return {"success": True, "log_id": log_entry["id"]}

@api_router.get("/workspace/logs")
async def get_workspace_logs(request: Request, limit: int = 100, user: Optional[str] = None):
    """Get workspace activity logs (for admin dashboard)"""
    require_workspace(request)
    query = {}
    if user:
        query["user"] = user
    
    logs = await db.workspace_logs.find(
        query,
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return {"logs": logs}

@api_router.get("/workspace/sessions")
async def get_workspace_sessions(request: Request):
    """Get all active/recent sessions grouped by user"""
    require_workspace(request)
    # Get login events from last 30 days
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
    pipeline = [
        {"$match": {"action": "login", "timestamp": {"$gte": thirty_days_ago}}},
        {"$group": {
            "_id": "$user",
            "last_login": {"$max": "$timestamp"},
            "total_logins": {"$sum": 1},
            "role": {"$first": "$role"}
        }},
        {"$sort": {"last_login": -1}}
    ]
    
    sessions = await db.workspace_logs.aggregate(pipeline).to_list(100)
    
    return {"sessions": sessions}

@api_router.post("/workspace/logout")
async def workspace_logout(log: WorkspaceLogoutRequest):
    """Log workspace logout"""
    log_entry = {
        "id": str(uuid.uuid4()),
        "user": log.user,
        "role": log.role,
        "action": "logout",
        "details": "Deconnexion",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.workspace_logs.insert_one(log_entry)
    return {"success": True}

# ================== WORKSPACE PASSWORD MANAGEMENT ==================

class UpdatePasswordRequest(BaseModel):
    workspace_id: str
    new_password: str
    updated_by: str

@api_router.post("/workspace/update-password")
async def update_workspace_password(request: Request, req_body: UpdatePasswordRequest):
    """Update workspace password (founder only)"""
    require_admin(request)
    # Store password update in database
    password_entry = {
        "workspace_id": req_body.workspace_id,
        "password": req_body.new_password,
        "updated_by": req_body.updated_by,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Upsert the password
    await db.workspace_passwords.update_one(
        {"workspace_id": req_body.workspace_id},
        {"$set": password_entry},
        upsert=True
    )
    
    # Log the action
    log_entry = {
        "id": str(uuid.uuid4()),
        "user": req_body.updated_by,
        "role": "founder",
        "action": "password_update",
        "details": f"Mot de passe mis à jour pour {req_body.workspace_id}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.workspace_logs.insert_one(log_entry)
    
    return {"success": True, "message": f"Mot de passe mis à jour pour {req_body.workspace_id}"}

# ================== INTERNAL MESSAGING SYSTEM ==================

class ChatMessage(BaseModel):
    content: str
    channel: Optional[str] = None
    dmTo: Optional[str] = None
    attachments: Optional[List[dict]] = []

class ChatManager:
    """Manages chat WebSocket connections and messaging"""
    
    def __init__(self):
        self.connections: Dict[str, WebSocket] = {}  # userId -> websocket
        self.user_info: Dict[str, dict] = {}  # userId -> {name, role}
        self.typing_status: Dict[str, bool] = {}  # userId -> isTyping
    
    async def connect(self, websocket: WebSocket, user_id: str, user_name: str, role: str):
        await websocket.accept()
        self.connections[user_id] = websocket
        self.user_info[user_id] = {"name": user_name, "role": role}
        await self.broadcast_online_users()
        logger.info(f"💬 Chat connected: {user_name} ({user_id})")
    
    def disconnect(self, user_id: str):
        if user_id in self.connections:
            del self.connections[user_id]
        if user_id in self.user_info:
            del self.user_info[user_id]
        if user_id in self.typing_status:
            del self.typing_status[user_id]
        logger.info(f"💬 Chat disconnected: {user_id}")
    
    async def broadcast_online_users(self):
        online = list(self.connections.keys())
        message = {"type": "online_users", "users": online}
        for ws in self.connections.values():
            try:
                await ws.send_json(message)
            except Exception:
                pass
    
    async def broadcast_to_channel(self, channel: str, message: dict, exclude: str = None):
        for user_id, ws in self.connections.items():
            if user_id == exclude:
                continue
            try:
                await ws.send_json({"type": "message", "message": message})
            except Exception:
                pass
    
    async def send_dm(self, from_id: str, to_id: str, message: dict):
        # Envoyer au destinataire
        if to_id in self.connections:
            try:
                await self.connections[to_id].send_json({"type": "message", "message": message})
            except Exception:
                pass
        # Laurent (founder) voit tous les DMs
        for user_id, info in self.user_info.items():
            if info.get("role") == "founder" and user_id not in [from_id, to_id]:
                if user_id in self.connections:
                    try:
                        await self.connections[user_id].send_json({"type": "message", "message": message})
                    except Exception:
                        pass
    
    async def broadcast_typing(self, user_id: str, user_name: str, is_typing: bool, channel: str = None, dm_to: str = None):
        self.typing_status[user_id] = is_typing
        message = {"type": "typing", "userId": user_id, "userName": user_name, "isTyping": is_typing}
        
        if dm_to:
            # DM typing - envoyer au destinataire uniquement
            if dm_to in self.connections:
                try:
                    await self.connections[dm_to].send_json(message)
                except Exception:
                    pass
        else:
            # Channel typing - broadcast à tous
            for uid, ws in self.connections.items():
                if uid != user_id:
                    try:
                        await ws.send_json(message)
                    except Exception:
                        pass

chat_manager = ChatManager()

@app.websocket("/api/ws/chat")
async def chat_websocket(websocket: WebSocket):
    """WebSocket endpoint for internal messaging"""
    user_id = None
    try:
        await websocket.accept()
        
        # Attendre l'authentification
        auth_data = await asyncio.wait_for(websocket.receive_json(), timeout=30)
        
        if auth_data.get("type") != "auth":
            await websocket.close(code=4001, reason="Auth required")
            return
        
        user_id = auth_data.get("userId", "").lower()
        user_name = auth_data.get("user", "Unknown")
        role = auth_data.get("role", "member")
        
        chat_manager.connections[user_id] = websocket
        chat_manager.user_info[user_id] = {"name": user_name, "role": role}
        await chat_manager.broadcast_online_users()
        
        logger.info(f"💬 Chat authenticated: {user_name} ({user_id})")
        
        # Envoyer l'historique des messages récents
        recent_messages = await db.chat_messages.find().sort("timestamp", -1).limit(50).to_list(50)
        recent_messages.reverse()
        await websocket.send_json({
            "type": "history",
            "messages": [{k: v for k, v in msg.items() if k != "_id"} for msg in recent_messages]
        })
        
        # Boucle de réception des messages
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "message":
                msg = data.get("message", {})
                msg["id"] = str(uuid.uuid4())
                msg["timestamp"] = datetime.now(timezone.utc).isoformat()
                msg["senderId"] = user_id
                msg["sender"] = user_name
                msg["senderRole"] = role
                
                # Sauvegarder en DB
                await db.chat_messages.insert_one(msg)
                
                # Router le message
                if msg.get("dmTo"):
                    await chat_manager.send_dm(user_id, msg["dmTo"], msg)
                    # Aussi envoyer à l'expéditeur pour confirmation
                    await websocket.send_json({"type": "message", "message": msg})
                else:
                    await chat_manager.broadcast_to_channel(msg.get("channel", "general"), msg)
                
                logger.info(f"💬 Message from {user_name}: {msg.get('content', '')[:50]}...")
            
            elif data.get("type") == "typing":
                await chat_manager.broadcast_typing(
                    user_id, 
                    user_name, 
                    data.get("isTyping", False),
                    data.get("channel"),
                    data.get("dmTo")
                )
    
    except WebSocketDisconnect:
        if user_id:
            chat_manager.disconnect(user_id)
            await chat_manager.broadcast_online_users()
    except asyncio.TimeoutError:
        await websocket.close(code=4000, reason="Auth timeout")
    except Exception as e:
        logger.error(f"Chat WebSocket error: {e}")
        if user_id:
            chat_manager.disconnect(user_id)

@api_router.get("/chat/messages/channel/{channel}")
async def get_channel_messages(channel: str, include_all: bool = False, limit: int = 100):
    """Get messages for a channel"""
    query = {"channel": channel}
    if include_all:
        query = {}  # Founder can see all
    
    messages = await db.chat_messages.find(
        query,
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    messages.reverse()
    return {"messages": messages}

@api_router.get("/chat/messages/dm/{user_id}")
async def get_dm_messages(user_id: str, current_user: str = None, limit: int = 100):
    """Get DM messages between current user and specified user"""
    query = {
        "$or": [
            {"senderId": user_id, "dmTo": current_user},
            {"senderId": current_user, "dmTo": user_id}
        ]
    }
    
    messages = await db.chat_messages.find(
        query,
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    messages.reverse()
    return {"messages": messages}

@api_router.post("/chat/messages")
async def save_chat_message(message: ChatMessage, request: Request):
    """Save a chat message (backup for WebSocket)"""
    msg_dict = message.model_dump()
    msg_dict["id"] = str(uuid.uuid4())
    msg_dict["timestamp"] = datetime.now(timezone.utc).isoformat()
    
    await db.chat_messages.insert_one(msg_dict)
    return {"success": True, "id": msg_dict["id"]}

@api_router.post("/chat/upload")
async def upload_chat_attachment(files: List[UploadFile] = File(...)):
    """Upload attachments for chat messages (images and PDFs only)"""
    uploaded_files = []
    
    for file in files:
        # Vérifier le type de fichier
        if not file.content_type:
            continue
        
        allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"]
        if file.content_type not in allowed_types:
            continue
        
        try:
            # Upload vers Cloudinary
            contents = await file.read()
            result = cloudinary.uploader.upload(
                contents,
                folder="cc2026_chat",
                resource_type="auto"
            )
            
            uploaded_files.append({
                "name": file.filename,
                "url": result["secure_url"],
                "type": file.content_type,
                "size": len(contents)
            })
        except Exception as e:
            logger.error(f"Upload error: {e}")
            continue
    
    return {"files": uploaded_files}

@api_router.get("/chat/online")
async def get_online_users():
    """Get list of currently online users in chat"""
    return {
        "online": list(chat_manager.connections.keys()),
        "users": chat_manager.user_info
    }

CC2026_CONTEXT = """
Tu es l'assistant IA de Culture Connect 2026 (CC2026), le premier marche professionnel des industries culturelles afro-descendantes.

INFORMATIONS CLES:
- Date: 22 Mai 2026
- Lieu: La Savane, Fort-de-France, Martinique
- Organisateur: CVLN (Laurent Coeurvolan, Fondateur)
- Site web: kiltikonet.fr

PARTENAIRES OFFICIELS:
- CTM (Collectivite Territoriale de Martinique)
- SACEM
- ISCA
- SKILLFOR

PROGRAMME:
- Conferences et masterclasses
- Marche professionnel
- Concert "Chimin Savann" en soiree
- Networking et B2B

EQUIPE CC2026:
- Laurent Coeurvolan (LC) - Fondateur
- Twina - Design
- Gwen - Evenementiel / Concert
- Kaige-Jean - Attachee de presse
- Alirio - Relations business & Secretariat
- Wudy - Comptabilite
- Fabrice - Captions live

OBJECTIFS:
- Connecter les professionnels des industries culturelles afro-descendantes
- Promouvoir la culture caribbeenne et africaine
- Creer des opportunites economiques et artistiques

Tu dois repondre de maniere professionnelle, concise et utile aux questions d'Alirio concernant le projet CC2026.
"""

class AIAssistantRequest(BaseModel):
    message: str
    user: str
    context: Optional[str] = None

@api_router.post("/ai/assistant")
async def ai_assistant(request: AIAssistantRequest):
    """AI assistant endpoint using Claude for CC2026 project questions"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            return {"response": "Service IA temporairement indisponible. Contactez Laurent."}
        
        # Create chat instance with Claude
        chat = LlmChat(
            api_key=api_key,
            session_id=f"cc2026_assistant_{request.user}",
            system_message=CC2026_CONTEXT
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        
        # Send message
        user_message = UserMessage(text=request.message)
        response = await chat.send_message(user_message)
        
        return {"response": response, "success": True}
        
    except Exception as e:
        print(f"AI Assistant error: {e}")
        return {"response": f"Desole, je n'ai pas pu traiter votre demande. Erreur: {str(e)[:100]}", "success": False}

# ================== NOTIFICATION SYSTEM ==================

class NotificationCreate(BaseModel):
    sender: str
    sender_role: str
    type: str  # artiste_confirmed, expense_added, communique_sent, live_active, partner_added, etc.
    title: str
    message: str
    target: Optional[str] = "laurent"  # Default target is LC
    data: Optional[dict] = None

# Store active SSE connections for real-time notifications
notification_connections: dict = {}

@api_router.post("/notifications/send")
async def send_notification(notification: NotificationCreate):
    """Send a notification to a workspace (default: Laurent)"""
    notif_entry = {
        "id": str(uuid.uuid4()),
        "sender": notification.sender,
        "sender_role": notification.sender_role,
        "type": notification.type,
        "title": notification.title,
        "message": notification.message,
        "target": notification.target,
        "data": notification.data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "read": False
    }
    
    # Save to database
    await db.notifications.insert_one(notif_entry)
    
    # Also log the action
    await db.workspace_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user": notification.sender,
        "role": notification.sender_role,
        "action": notification.type,
        "details": notification.title,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True, "notification_id": notif_entry["id"]}

@api_router.get("/notifications/{target}")
async def get_notifications(target: str, limit: int = 50, unread_only: bool = False):
    """Get notifications for a specific target workspace"""
    query = {"target": target}
    if unread_only:
        query["read"] = False
    
    notifications = await db.notifications.find(
        query,
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    unread_count = await db.notifications.count_documents({"target": target, "read": False})
    
    return {"notifications": notifications, "unread_count": unread_count}

@api_router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark a notification as read"""
    await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"read": True}}
    )
    return {"success": True}

@api_router.patch("/notifications/{target}/read-all")
async def mark_all_notifications_read(target: str):
    """Mark all notifications as read for a target"""
    await db.notifications.update_many(
        {"target": target},
        {"$set": {"read": True}}
    )
    return {"success": True}

# SSE endpoint for real-time notifications
@api_router.get("/notifications/{target}/stream")
async def notification_stream(target: str):
    """SSE stream for real-time notifications"""
    async def event_generator():
        last_check = datetime.now(timezone.utc)
        while True:
            # Check for new notifications every 2 seconds
            await asyncio.sleep(2)
            
            new_notifications = await db.notifications.find({
                "target": target,
                "read": False,
                "timestamp": {"$gt": last_check.isoformat()}
            }, {"_id": 0}).to_list(10)
            
            if new_notifications:
                for notif in new_notifications:
                    yield f"data: {json.dumps(notif)}\n\n"
            
            last_check = datetime.now(timezone.utc)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@api_router.get("/countries")
async def get_countries():
    countries = await db.registrations.distinct("country")
    return {"countries": countries if countries else []}

# ================== PUBLIC PROFILE & BADGE GENERATION ==================

@api_router.get("/participant/{participant_id}")
async def get_public_participant_profile(participant_id: str):
    """
    Public participant profile for QR code validation at event entry
    Returns basic info + status for badge verification
    """
    participant = await db.registrations.find_one(
        {"id": participant_id},
        {"_id": 0, "email": 0, "phone": 0, "payment_session_id": 0, "siret_number": 0}
    )
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    # Build public profile
    return {
        "id": participant.get("id"),
        "full_name": participant.get("full_name"),
        "organization_name": participant.get("organization_name"),
        "profile_type": participant.get("profile_type"),
        "country": participant.get("country"),
        "tier": participant.get("tier"),
        "status": participant.get("status"),
        "is_approved": participant.get("status") == "approved",
        "show_in_catalog": participant.get("show_in_catalog", False),
        "logo_url": participant.get("logo_url"),
        "bio": participant.get("bio"),
        "expertise_tags": participant.get("expertise_tags", []),
        "stand_request": participant.get("stand_request", False),
        "stand_category": participant.get("stand_category"),
        "website_url": participant.get("website_url"),
        "created_at": participant.get("created_at")
    }

@api_router.get("/participant/{participant_id}/badge")
async def generate_badge_pdf(request: Request, participant_id: str):
    """
    Generate PDF badge with QR code for participant
    QR code points to public profile page for validation
    """
    participant = await db.registrations.find_one(
        {"id": participant_id},
        {"_id": 0}
    )
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    if participant.get("status") != "approved":
        raise HTTPException(status_code=403, detail="Badge only available for approved participants")
    
    # Build profile URL for QR code
    frontend_url = os.environ.get("FRONTEND_URL", str(request.base_url).rstrip('/'))
    profile_url = f"{frontend_url}/participant/{participant_id}"
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(profile_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    # Save QR to bytes
    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format='PNG')
    qr_buffer.seek(0)
    
    # Create PDF
    pdf_buffer = io.BytesIO()
    badge_width, badge_height = 105 * mm, 148 * mm  # A6 size
    c = canvas.Canvas(pdf_buffer, pagesize=(badge_width, badge_height))
    
    # Colors
    tier_colors = {
        "emerging": "#4A5D4E",
        "professional": "#A65D47",
        "institutional": "#1A1A1A"
    }
    tier_names = {
        "emerging": "ÉMERGENT",
        "professional": "PROFESSIONNEL",
        "institutional": "INSTITUTIONNEL"
    }
    tier = participant.get("tier", "professional")
    tier_color = HexColor(tier_colors.get(tier, "#A65D47"))
    
    # Background
    c.setFillColor(HexColor("#F4F1EA"))
    c.rect(0, 0, badge_width, badge_height, fill=1, stroke=0)
    
    # Border
    c.setStrokeColor(tier_color)
    c.setLineWidth(3)
    c.rect(3, 3, badge_width - 6, badge_height - 6, fill=0, stroke=1)
    
    # Header
    c.setFillColor(HexColor("#1A1A1A"))
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(badge_width / 2, badge_height - 25, "CULTURE CONNECT 2026")
    
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor("#8A8578"))
    c.drawCentredString(badge_width / 2, badge_height - 38, "Fort-de-France · 20-23 Mai 2026")
    
    # Separator line
    c.setStrokeColor(HexColor("#E5E0D8"))
    c.setLineWidth(0.5)
    c.line(15, badge_height - 48, badge_width - 15, badge_height - 48)
    
    # Name and organization
    c.setFillColor(HexColor("#1A1A1A"))
    c.setFont("Helvetica-Bold", 16)
    
    # Truncate name if too long
    full_name = participant.get("full_name", "")[:25]
    c.drawCentredString(badge_width / 2, badge_height - 75, full_name)
    
    c.setFont("Helvetica", 10)
    c.setFillColor(HexColor("#8A8578"))
    org_name = participant.get("organization_name", "")[:30]
    c.drawCentredString(badge_width / 2, badge_height - 92, org_name)
    
    # Tier badge
    tier_text = tier_names.get(tier, "PROFESSIONNEL")
    c.setFillColor(tier_color)
    c.rect(badge_width / 2 - 40, badge_height - 118, 80, 18, fill=1, stroke=0)
    c.setFillColor(HexColor("#F4F1EA"))
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(badge_width / 2, badge_height - 113, tier_text)
    
    # Profile type
    profile_labels = {
        "artist": "ARTISTE",
        "label": "LABEL",
        "booking_agency": "BOOKING",
        "institution": "INSTITUTION",
        "press": "PRESSE",
        "other": "PROFESSIONNEL"
    }
    c.setFillColor(HexColor("#8A8578"))
    c.setFont("Helvetica", 8)
    profile_label = profile_labels.get(participant.get("profile_type"), "PROFESSIONNEL")
    c.drawCentredString(badge_width / 2, badge_height - 135, profile_label)
    
    # QR Code
    from reportlab.lib.utils import ImageReader
    qr_buffer.seek(0)
    qr_image = ImageReader(qr_buffer)
    qr_size = 35 * mm
    c.drawImage(qr_image, (badge_width - qr_size) / 2, 25, width=qr_size, height=qr_size)
    
    # ID below QR
    c.setFillColor(HexColor("#8A8578"))
    c.setFont("Helvetica", 7)
    c.drawCentredString(badge_width / 2, 18, f"ID: {participant_id[:8].upper()}")
    
    # Stand indicator if applicable
    if participant.get("stand_request"):
        c.setFillColor(HexColor("#4A5D4E"))
        c.setFont("Helvetica-Bold", 7)
        stand_cat = participant.get("stand_category", "Stand")
        c.drawCentredString(badge_width / 2, 8, f"STAND · {stand_cat.upper()}")
    
    c.save()
    pdf_buffer.seek(0)
    
    filename = f"badge_{participant.get('full_name', 'participant').replace(' ', '_')}_{participant_id[:8]}.pdf"
    
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ================== PARTNER MANAGEMENT ==================

class PartnerUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    tier: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    show_on_landing: Optional[bool] = None
    sponsored_registrations: Optional[List[str]] = None

class ManualPartner(BaseModel):
    company_name: str
    contact_name: str
    contact_email: str
    contact_phone: str = ""
    tier: str = "bronze"
    website: Optional[str] = None
    logo_url: Optional[str] = None
    show_on_landing: bool = True

@api_router.get("/partners/admin")
async def get_partners_admin(request: Request):
    """Get all partners with full details for admin"""
    require_admin(request)
    partners = await db.partners.find({}, {"_id": 0}).to_list(100)
    
    # Enrich with sponsored registrations info
    for partner in partners:
        partner_id = partner.get("id")
        # Find registrations sponsored by this partner
        sponsored = await db.registrations.find(
            {"sponsored_by": partner_id},
            {"_id": 0, "id": 1, "full_name": 1, "organization_name": 1, "status": 1}
        ).to_list(50)
        partner["sponsored_registrations"] = sponsored
        partner["sponsored_count"] = len(sponsored)
    
    return {"partners": partners, "total": len(partners)}

@api_router.post("/partners/manual")
async def create_manual_partner(request: Request, data: ManualPartner):
    """Admin manual partner creation (without payment)"""
    require_admin(request)
    partner_id = str(uuid.uuid4())
    
    partner = {
        "id": partner_id,
        "company_name": data.company_name,
        "contact_name": data.contact_name,
        "contact_email": data.contact_email,
        "contact_phone": data.contact_phone,
        "tier": data.tier,
        "website": data.website,
        "logo_url": data.logo_url,
        "vip_accreditations": [],
        "show_on_landing": data.show_on_landing,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "admin_manual"
    }
    
    await db.partners.insert_one(partner)
    
    return {
        "success": True,
        "partner_id": partner_id,
        "message": "Partner created successfully"
    }

@api_router.patch("/partners/{partner_id}")
async def update_partner(partner_id: str, update: PartnerUpdate):
    """Update partner details"""
    partner = await db.partners.find_one({"id": partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    
    if update_data:
        await db.partners.update_one(
            {"id": partner_id},
            {"$set": update_data}
        )
    
    return {"success": True, "updated_fields": list(update_data.keys())}

@api_router.delete("/partners/{partner_id}")
async def delete_partner(partner_id: str):
    """Delete a partner"""
    result = await db.partners.delete_one({"id": partner_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Also unlink any sponsored registrations
    await db.registrations.update_many(
        {"sponsored_by": partner_id},
        {"$unset": {"sponsored_by": ""}}
    )
    
    return {"success": True, "message": "Partner deleted"}

@api_router.post("/partners/{partner_id}/sponsor/{registration_id}")
async def link_sponsor_to_registration(partner_id: str, registration_id: str):
    """Link a partner as sponsor to a registration"""
    # Verify partner exists
    partner = await db.partners.find_one({"id": partner_id})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    # Verify registration exists
    registration = await db.registrations.find_one({"id": registration_id})
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    # Link them
    await db.registrations.update_one(
        {"id": registration_id},
        {"$set": {"sponsored_by": partner_id, "sponsor_name": partner.get("company_name")}}
    )
    
    return {
        "success": True,
        "message": f"Registration linked to partner {partner.get('company_name')}"
    }

@api_router.delete("/partners/{partner_id}/sponsor/{registration_id}")
async def unlink_sponsor_from_registration(partner_id: str, registration_id: str):
    """Unlink a partner from a registration"""
    await db.registrations.update_one(
        {"id": registration_id, "sponsored_by": partner_id},
        {"$unset": {"sponsored_by": "", "sponsor_name": ""}}
    )
    
    return {"success": True, "message": "Sponsor link removed"}


# ================== JETONS (PUBLIC PAGE) ==================

JETONS_PACKS = [
    {"id": "kt-decouverte", "name": "Decouverte", "jetons": 15, "price_eur": 10, "value_eur": 15, "savings_pct": 33, "badge": "Decouverte", "price_per_token": 0.67},
    {"id": "kt-culture",    "name": "Culture",    "jetons": 40, "price_eur": 25, "value_eur": 40, "savings_pct": 38, "badge": "Populaire", "price_per_token": 0.63},
    {"id": "kt-diaspora",   "name": "Diaspora",   "jetons": 85, "price_eur": 50, "value_eur": 85, "savings_pct": 41, "badge": "Meilleur rapport", "price_per_token": 0.59},
    {"id": "kt-vip",        "name": "VIP",        "jetons": 180,"price_eur": 100,"value_eur": 180,"savings_pct": 44, "badge": "Premium", "price_per_token": 0.56},
]

@api_router.get("/jetons/packs")
async def get_jetons_packs():
    return {"packs": JETONS_PACKS}

@api_router.get("/jetons/wallet/{badge_id}")
async def get_jetons_wallet(badge_id: str):
    reg = await db.registrations.find_one(
        {"$or": [{"frek_id": badge_id}, {"id": badge_id}]},
        {"_id": 0, "frek_id": 1, "full_name": 1, "email": 1}
    )
    if not reg:
        raise HTTPException(404, "Badge non trouve")
    wallet = await db.wallets.find_one({"frek_id": reg.get("frek_id", badge_id)}, {"_id": 0})
    return {
        "badge_id": reg.get("frek_id", badge_id),
        "name": reg.get("full_name", ""),
        "balance_jcc": (wallet or {}).get("balance_kt", 0),
        "total_received": (wallet or {}).get("total_earned", 0),
    }

@api_router.post("/jetons/checkout")
async def jetons_checkout(data: dict, request: Request):
    badge_id = data.get("badge_id", "")
    pack_id = data.get("pack", "")
    origin_url = data.get("origin_url", "")
    pack = next((p for p in JETONS_PACKS if p["id"] == pack_id), None)
    if not pack:
        raise HTTPException(400, "Pack non trouve")
    stripe_key = os.environ.get("STRIPE_API_KEY", "")
    if not stripe_key:
        raise HTTPException(500, "Stripe non configure")
    import stripe as _stripe
    _stripe.api_key = stripe_key
    session = _stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "eur",
                "unit_amount": int(pack["price"] * 100),
                "product_data": {"name": f"{pack['name']} — {pack['tokens']} JCC"},
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url=f"{origin_url}/jetons?success=true&pack={pack_id}",
        cancel_url=f"{origin_url}/jetons?canceled=true",
        metadata={"badge_id": badge_id, "pack_id": pack_id, "tokens": str(pack["tokens"])},
    )
    return {"url": session.url}

# ================== API V1 - STATISTICS & INTELLIGENCE ==================

@api_v1_router.get("/stats")
async def get_public_statistics():
    """
    Public Statistics API - Aggregated data for management & BI
    No personal data exposed - only show_in_catalog:true entries for public metrics
    
    Response Structure (for external BI tools like Tableau, PowerBI):
    {
        "generated_at": "ISO timestamp",
        "summary": { total, approved, pending, rejected, in_catalog },
        "by_profile_type": { "artist": count, "label": count, ... },
        "by_country": { "FR": count, "MQ": count, ... },
        "by_tier": { "emerging": count, "professional": count, "institutional": count },
        "conversion_rates": { registration_to_approval, approval_to_catalog },
        "partners": { total, by_tier }
    }
    """
    # Aggregate all registrations
    all_registrations = await db.registrations.find({}, {"_id": 0}).to_list(10000)
    
    # Summary counts
    total = len(all_registrations)
    approved = sum(1 for r in all_registrations if r.get("status") == "approved")
    pending = sum(1 for r in all_registrations if r.get("status") == "pending")
    rejected = sum(1 for r in all_registrations if r.get("status") == "rejected")
    in_catalog = sum(1 for r in all_registrations if r.get("show_in_catalog") and r.get("status") == "approved")
    
    # Distribution by profile_type
    by_profile = {}
    for r in all_registrations:
        profile = r.get("profile_type", "other")
        by_profile[profile] = by_profile.get(profile, 0) + 1
    
    # Distribution by country
    by_country = {}
    for r in all_registrations:
        country = r.get("country", "unknown")
        if country:
            by_country[country] = by_country.get(country, 0) + 1
    
    # Distribution by tier
    by_tier = {"emerging": 0, "professional": 0, "institutional": 0}
    for r in all_registrations:
        tier = r.get("tier", "professional")
        if tier in by_tier:
            by_tier[tier] += 1
    
    # Distribution by expertise tags
    by_expertise = {}
    for r in all_registrations:
        tags = r.get("expertise_tags", [])
        if isinstance(tags, list):
            for tag in tags:
                if tag:
                    by_expertise[tag] = by_expertise.get(tag, 0) + 1
    
    # Sort expertise by count and get top 10
    sorted_expertise = dict(sorted(by_expertise.items(), key=lambda x: x[1], reverse=True)[:10])
    
    # Conversion rates
    registration_to_approval = round((approved / total * 100), 1) if total > 0 else 0
    approval_to_catalog = round((in_catalog / approved * 100), 1) if approved > 0 else 0
    
    # Partners stats
    all_partners = await db.partners.find({}, {"_id": 0}).to_list(100)
    partners_by_tier = {"bronze": 0, "silver": 0, "gold": 0}
    for p in all_partners:
        tier = p.get("tier", "bronze")
        if tier in partners_by_tier:
            partners_by_tier[tier] += 1
    
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_registrations": total,
            "approved": approved,
            "pending": pending,
            "rejected": rejected,
            "visible_in_catalog": in_catalog
        },
        "by_profile_type": by_profile,
        "by_country": by_country,
        "by_tier": by_tier,
        "by_expertise": sorted_expertise,
        "top_5_interests": list(sorted_expertise.keys())[:5],
        "conversion_rates": {
            "registration_to_approval_percent": registration_to_approval,
            "approval_to_catalog_percent": approval_to_catalog
        },
        "partners": {
            "total": len(all_partners),
            "by_tier": partners_by_tier
        },
        "meta": {
            "api_version": "1.0",
            "data_policy": "Aggregated only - no personal data exposed",
            "compatible_with": ["Tableau", "PowerBI", "Google Data Studio", "Custom BI"]
        }
    }

@api_v1_router.get("/stats/territories")
async def get_territory_insights():
    """
    Detailed territorial analysis for geographic business intelligence
    Only includes approved + catalog-visible participants
    """
    catalog_participants = await db.registrations.find(
        {"show_in_catalog": True, "status": "approved"},
        {"_id": 0, "country": 1, "profile_type": 1, "tier": 1, "organization_name": 1}
    ).to_list(10000)
    
    # Build territory matrix
    territories = {}
    for p in catalog_participants:
        country = p.get("country", "unknown")
        if country not in territories:
            territories[country] = {
                "total": 0,
                "by_profile": {},
                "by_tier": {},
                "organizations": []
            }
        territories[country]["total"] += 1
        
        profile = p.get("profile_type", "other")
        territories[country]["by_profile"][profile] = territories[country]["by_profile"].get(profile, 0) + 1
        
        tier = p.get("tier", "professional")
        territories[country]["by_tier"][tier] = territories[country]["by_tier"].get(tier, 0) + 1
        
        # Only add org name (public info for catalog-visible)
        if p.get("organization_name"):
            territories[country]["organizations"].append(p.get("organization_name"))
    
    # Sort by representation
    sorted_territories = dict(sorted(territories.items(), key=lambda x: x[1]["total"], reverse=True))
    
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_territories": len(sorted_territories),
        "territories": sorted_territories,
        "top_5": list(sorted_territories.keys())[:5]
    }

@api_v1_router.get("/stats/advanced")
async def get_advanced_analytics():
    """
    Advanced Analytics for Partner Reports
    Includes trend data, KPIs, and comparative metrics
    """
    all_registrations = await db.registrations.find({}, {"_id": 0}).to_list(10000)
    all_partners = await db.partners.find({}, {"_id": 0}).to_list(100)
    email_logs = await db.email_logs.find({}, {"_id": 0}).to_list(1000)
    
    # Basic counts
    total = len(all_registrations)
    approved = sum(1 for r in all_registrations if r.get("status") == "approved")
    in_catalog = sum(1 for r in all_registrations if r.get("show_in_catalog") and r.get("status") == "approved")
    
    # Registration timeline (by day)
    registration_timeline = {}
    for r in all_registrations:
        created = r.get("created_at", "")[:10]  # Get date part only
        if created:
            registration_timeline[created] = registration_timeline.get(created, 0) + 1
    
    # Sort by date
    registration_timeline = dict(sorted(registration_timeline.items()))
    
    # Profile type distribution with percentages
    profile_distribution = {}
    for r in all_registrations:
        profile = r.get("profile_type", "other")
        profile_distribution[profile] = profile_distribution.get(profile, 0) + 1
    
    profile_with_percent = {
        k: {"count": v, "percent": round(v / total * 100, 1) if total > 0 else 0}
        for k, v in profile_distribution.items()
    }
    
    # Tier distribution with revenue estimates
    tier_revenue = {
        "emerging": {"price": 50, "count": 0, "revenue": 0},
        "professional": {"price": 150, "count": 0, "revenue": 0},
        "institutional": {"price": 300, "count": 0, "revenue": 0}
    }
    for r in all_registrations:
        if r.get("status") == "approved":
            tier = r.get("tier", "professional")
            if tier in tier_revenue:
                tier_revenue[tier]["count"] += 1
                tier_revenue[tier]["revenue"] = tier_revenue[tier]["count"] * tier_revenue[tier]["price"]
    
    total_registration_revenue = sum(t["revenue"] for t in tier_revenue.values())
    
    # Partner revenue estimates
    partner_revenue = {
        "bronze": {"price": 2500, "count": 0, "revenue": 0},
        "silver": {"price": 5000, "count": 0, "revenue": 0},
        "gold": {"price": 10000, "count": 0, "revenue": 0}
    }
    for p in all_partners:
        tier = p.get("tier", "bronze")
        if tier in partner_revenue:
            partner_revenue[tier]["count"] += 1
            partner_revenue[tier]["revenue"] = partner_revenue[tier]["count"] * partner_revenue[tier]["price"]
    
    total_partner_revenue = sum(t["revenue"] for t in partner_revenue.values())
    
    # Expertise/Interest engagement
    expertise_engagement = {}
    for r in all_registrations:
        tags = r.get("expertise_tags", [])
        if isinstance(tags, list):
            for tag in tags:
                if tag:
                    expertise_engagement[tag] = expertise_engagement.get(tag, 0) + 1
    
    # Sort and format
    expertise_sorted = dict(sorted(expertise_engagement.items(), key=lambda x: x[1], reverse=True))
    
    # Marché Culturel specific metrics
    marche_culturel_stats = {
        "stand_requests": sum(1 for r in all_registrations if r.get("stand_request")),
        "approved_stands": sum(1 for r in all_registrations if r.get("stand_request") and r.get("status") == "approved"),
        "stand_categories": {}
    }
    for r in all_registrations:
        if r.get("stand_request"):
            cat = r.get("stand_category", "general")
            marche_culturel_stats["stand_categories"][cat] = marche_culturel_stats["stand_categories"].get(cat, 0) + 1
    
    # Email delivery stats
    email_stats = {
        "total_sent": sum(1 for e in email_logs if e.get("status") == "sent"),
        "total_failed": sum(1 for e in email_logs if e.get("status") == "failed"),
        "badges_sent": sum(1 for e in email_logs if e.get("email_type") == "badge" and e.get("status") == "sent"),
        "delivery_rate": 0
    }
    if email_stats["total_sent"] + email_stats["total_failed"] > 0:
        email_stats["delivery_rate"] = round(
            email_stats["total_sent"] / (email_stats["total_sent"] + email_stats["total_failed"]) * 100, 1
        )
    
    # KPIs for partner report
    kpis = {
        "total_registrations": total,
        "approval_rate": round(approved / total * 100, 1) if total > 0 else 0,
        "catalog_visibility_rate": round(in_catalog / approved * 100, 1) if approved > 0 else 0,
        "total_partners": len(all_partners),
        "total_revenue_estimate": total_registration_revenue + total_partner_revenue,
        "avg_expertise_per_participant": round(
            sum(len(r.get("expertise_tags", [])) for r in all_registrations) / total, 1
        ) if total > 0 else 0,
        "badges_sent": email_stats["badges_sent"],
        "email_delivery_rate": email_stats["delivery_rate"]
    }
    
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "report_title": "Culture Connect 2026 - Rapport de Situation",
        "kpis": kpis,
        "registration_timeline": registration_timeline,
        "profile_distribution": profile_with_percent,
        "tier_analysis": {
            "registrations": tier_revenue,
            "total_registration_revenue": total_registration_revenue
        },
        "partner_analysis": {
            "partners": partner_revenue,
            "total_partner_revenue": total_partner_revenue
        },
        "expertise_engagement": expertise_sorted,
        "top_10_interests": list(expertise_sorted.keys())[:10],
        "marche_culturel": marche_culturel_stats,
        "email_delivery": email_stats,
        "meta": {
            "currency": "EUR",
            "event_date": "2026-05-20",
            "report_type": "advanced_analytics"
        }
    }

@api_v1_router.get("/report/summary")
async def get_partner_report_summary():
    """
    Executive Summary for Partner Meetings
    One-page dashboard data optimized for presentations
    """
    stats = await get_advanced_analytics()
    
    # Extract key highlights
    highlights = []
    
    kpis = stats["kpis"]
    if kpis["total_registrations"] > 0:
        highlights.append(f"{kpis['total_registrations']} inscriptions totales")
    if kpis["approval_rate"] > 80:
        highlights.append(f"Taux d'approbation excellent: {kpis['approval_rate']}%")
    if kpis["badges_sent"] > 0:
        highlights.append(f"{kpis['badges_sent']} badges envoyés")
    if kpis["total_partners"] > 0:
        highlights.append(f"{kpis['total_partners']} partenaire(s) confirmé(s)")
    
    # Top territories
    territories = await get_territory_insights()
    top_territories = territories.get("top_5", [])
    
    # Format for presentation
    return {
        "title": "Culture Connect 2026 - Executive Summary",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "highlights": highlights,
        "key_metrics": {
            "inscriptions": kpis["total_registrations"],
            "approuves": int(kpis["total_registrations"] * kpis["approval_rate"] / 100),
            "partenaires": kpis["total_partners"],
            "revenus_estimes": f"{kpis['total_revenue_estimate']:,}€".replace(",", " ")
        },
        "top_territories": top_territories,
        "top_interests": stats.get("top_10_interests", [])[:5],
        "marche_culturel": {
            "demandes_stand": stats["marche_culturel"]["stand_requests"],
            "stands_approuves": stats["marche_culturel"]["approved_stands"]
        },
        "communication": {
            "badges_envoyes": kpis["badges_sent"],
            "taux_delivrabilite": f"{stats['email_delivery']['delivery_rate']}%"
        }
    }

@api_v1_router.get("/search/match")
async def smart_connect_matching(
    profile_type: Optional[str] = Query(None, description="Filter by profile type"),
    sector: Optional[str] = Query(None, description="Search keyword in bio/organization"),
    country: Optional[str] = Query(None, description="Filter by country"),
    expertise: Optional[str] = Query(None, description="Filter by expertise tags (comma-separated)"),
    limit: int = Query(10, le=50, description="Max results")
):
    """
    Smart Connect API - Find matching profiles based on sector similarity and expertise tags
    SECURITY: Only returns show_in_catalog:true AND status:approved
    
    Use cases:
    - "Find all labels in Martinique"
    - "Find organizations with 'music' in their bio"
    - "Find potential partners by sector"
    - "Find profiles with specific expertise tags"
    """
    # Base filter: only public catalog entries
    filter_query = {"show_in_catalog": True, "status": "approved"}
    
    if profile_type:
        filter_query["profile_type"] = profile_type
    
    if country:
        filter_query["country"] = {"$regex": country, "$options": "i"}
    
    # Filter by expertise tags
    expertise_list = []
    if expertise:
        expertise_list = [e.strip() for e in expertise.split(",") if e.strip()]
        if expertise_list:
            filter_query["expertise_tags"] = {"$in": expertise_list}
    
    # Fetch candidates
    candidates = await db.registrations.find(
        filter_query,
        {"_id": 0, "email": 0, "phone": 0, "payment_session_id": 0}  # Exclude private fields
    ).to_list(1000)
    
    # Apply sector search on bio and organization_name
    if sector:
        sector_lower = sector.lower()
        candidates = [
            c for c in candidates
            if sector_lower in (c.get("bio", "") or "").lower()
            or sector_lower in (c.get("organization_name", "") or "").lower()
        ]
    
    # Score and sort by relevance (with expertise matching bonus)
    def relevance_score(participant):
        score = 0
        if participant.get("logo_url"):
            score += 10  # Has image = more complete profile
        if participant.get("bio") and len(participant.get("bio", "")) > 50:
            score += 5  # Good bio
        if participant.get("website_url"):
            score += 3  # Has website
        
        # Expertise tag matching bonus
        participant_tags = participant.get("expertise_tags", [])
        if expertise_list and participant_tags:
            shared_tags = len(set(participant_tags) & set(expertise_list))
            score += shared_tags * 15  # Significant bonus per shared tag
        
        return score
    
    candidates.sort(key=relevance_score, reverse=True)
    
    # Format response
    results = []
    for c in candidates[:limit]:
        participant_tags = c.get("expertise_tags", [])
        shared_count = len(set(participant_tags) & set(expertise_list)) if expertise_list else 0
        
        results.append({
            "id": c.get("id"),
            "name": c.get("full_name"),
            "organization": c.get("organization_name"),
            "profile_type": c.get("profile_type"),
            "country": c.get("country"),
            "bio": c.get("bio"),
            "tier": c.get("tier"),
            "image_url": c.get("logo_url"),
            "website": c.get("website_url"),
            "has_stand": c.get("stand_request", False),
            "expertise_tags": participant_tags,
            "shared_interests": shared_count
        })
    
    return {
        "query": {
            "profile_type": profile_type,
            "sector": sector,
            "country": country,
            "expertise": expertise_list
        },
        "total_matches": len(results),
        "results": results,
        "suggestions": _generate_sector_suggestions(candidates) if not sector else []
    }

def _generate_sector_suggestions(participants: list) -> list:
    """Generate keyword suggestions based on common terms in bios"""
    word_freq = {}
    stop_words = {"de", "la", "le", "les", "et", "en", "un", "une", "des", "du", "pour", "avec", "the", "and", "for", "with", "a", "an"}
    
    for p in participants:
        bio = (p.get("bio") or "").lower()
        words = bio.split()
        for word in words:
            word = ''.join(c for c in word if c.isalnum())
            if len(word) > 3 and word not in stop_words:
                word_freq[word] = word_freq.get(word, 0) + 1
    
    # Top keywords
    sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
    return [w[0] for w in sorted_words[:8]]

@api_v1_router.get("/search/suggestions")
async def get_partner_suggestions(participant_id: str):
    """
    Get smart partner suggestions for a specific participant
    Based on complementary profile types and shared expertise tags
    """
    # Get the participant
    participant = await db.registrations.find_one(
        {"id": participant_id, "show_in_catalog": True, "status": "approved"},
        {"_id": 0}
    )
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found in catalog")
    
    # Define complementary profiles
    complementary_map = {
        "artist": ["label", "booking_agency", "press", "institution"],
        "label": ["artist", "booking_agency", "press", "distribution"],
        "booking_agency": ["artist", "label", "venue", "institution"],
        "institution": ["artist", "label", "press", "booking_agency"],
        "press": ["artist", "label", "institution"],
        "venue": ["artist", "booking_agency", "label"],
        "distribution": ["label", "artist"],
        "other": ["artist", "label", "institution"]
    }
    
    current_profile = participant.get("profile_type", "other")
    participant_tags = participant.get("expertise_tags", [])
    target_profiles = complementary_map.get(current_profile, ["artist", "label"])
    
    # Find complementary participants
    suggestions = await db.registrations.find(
        {
            "show_in_catalog": True,
            "status": "approved",
            "id": {"$ne": participant_id},
            "profile_type": {"$in": target_profiles}
        },
        {"_id": 0, "email": 0, "phone": 0, "payment_session_id": 0}
    ).to_list(50)
    
    # Score by expertise tag overlap, country proximity and completeness
    def suggestion_score(s):
        score = 0
        
        # Expertise tags matching - highest priority
        s_tags = s.get("expertise_tags", [])
        if participant_tags and s_tags:
            shared_tags = len(set(participant_tags) & set(s_tags))
            score += shared_tags * 20  # Major bonus per shared interest
        
        # Country proximity
        if s.get("country") == participant.get("country"):
            score += 10  # Same country = higher relevance
        
        # Profile completeness
        if s.get("logo_url"):
            score += 5
        if s.get("stand_request"):
            score += 3  # Has stand = visible at event
        
        return score
    
    suggestions.sort(key=suggestion_score, reverse=True)
    
    # Build response with shared interests info
    suggested_connections = []
    for s in suggestions[:10]:
        s_tags = s.get("expertise_tags", [])
        shared_tags = list(set(participant_tags) & set(s_tags)) if participant_tags and s_tags else []
        shared_count = len(shared_tags)
        
        reason = f"Profil complémentaire ({s.get('profile_type')})"
        if shared_count > 0:
            reason = f"Partage {shared_count} intérêt(s) commun(s)"
        
        suggested_connections.append({
            "id": s.get("id"),
            "name": s.get("full_name"),
            "organization": s.get("organization_name"),
            "profile_type": s.get("profile_type"),
            "country": s.get("country"),
            "expertise_tags": s_tags,
            "shared_interests": shared_tags,
            "shared_count": shared_count,
            "reason": reason
        })
    
    return {
        "for_participant": {
            "id": participant_id,
            "name": participant.get("full_name"),
            "profile_type": current_profile,
            "expertise_tags": participant_tags
        },
        "suggested_connections": suggested_connections
    }

# ================== EMERGENT LLM SERVICES ==================
from emergentintegrations.llm.chat import LlmChat, UserMessage, get_integration_proxy_url
import hashlib

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

class EmbeddingRequest(BaseModel):
    text: str

class ChatRequest(BaseModel):
    message: str
    system_prompt: Optional[str] = None
    model: Optional[str] = "claude-4-sonnet-20250514"
    provider: Optional[str] = "anthropic"

def generate_simple_embedding(text: str, dim: int = 1536) -> list:
    """
    Generate a deterministic pseudo-embedding using text hashing.
    This is a fallback when OpenAI API is not available.
    For production, use OPENAI_API_KEY environment variable.
    """
    import math
    # Create a deterministic hash-based embedding
    text_lower = text.lower().strip()
    
    # Generate multiple hash values to fill the embedding
    embedding = []
    for i in range(dim):
        h = hashlib.sha256(f"{text_lower}_{i}".encode()).hexdigest()
        # Convert hex to float between -1 and 1
        val = (int(h[:8], 16) / (16**8)) * 2 - 1
        embedding.append(val)
    
    # Normalize the embedding
    norm = math.sqrt(sum(x*x for x in embedding))
    if norm > 0:
        embedding = [x/norm for x in embedding]
    
    return embedding

@api_v1_router.post("/llm/embedding")
async def generate_embedding_endpoint(request: EmbeddingRequest):
    """Generate embedding using OpenAI via Emergent LLM Key and LiteLLM"""
    try:
        from litellm import embedding
        
        # Use LiteLLM with Emergent key
        response = embedding(
            model="openai/text-embedding-3-small",
            input=[request.text],
            api_key=EMERGENT_LLM_KEY,
            api_base=get_integration_proxy_url()
        )
        
        return {"embedding": response.data[0]["embedding"], "method": "openai-litellm"}
    except Exception as e:
        logger.error(f"Embedding error: {str(e)}")
        # Fallback to hash-based on any error
        embedding_vec = generate_simple_embedding(request.text)
        return {"embedding": embedding_vec, "method": "hash-fallback", "error": str(e)}

@api_v1_router.post("/llm/chat")
async def llm_chat_endpoint(request: ChatRequest):
    """Chat completion using Emergent LLM"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat_obj = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=str(uuid.uuid4()),
            system_message=request.system_prompt or "Tu es un assistant expert en industries culturelles afro-caribéennes.",
        )
        chat_obj.with_model("anthropic", request.model or "claude-sonnet-4-5-20250929")
        user_msg = UserMessage(text=request.message)
        response = await chat_obj.send_message(user_msg)
        return {"response": response}
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

# Include the routers in the main app
app.include_router(api_router)
app.include_router(api_v1_router)

# ================== CC2026 BADGE & JETONS ROUTES ==================
from routes.badges import router as badges_router
from routes.jetons import router as jetons_router
from routes.ses import router as ses_router
from routes.analytics import router as analytics_router
from routes.shared import router as shared_router
from routes.terrain import router as terrain_router
from routes.smart_engine import router as smart_engine_router
from routes.pro_social import router as pro_social_router
from routes.ai_agents import router as ai_agents_router
from routes.brain import router as brain_router
from routes.recommendations import router as reco_router, init_db as reco_init_db
reco_init_db(db)
from routes.candidatures import router as candidatures_router, init_db as candidatures_init_db
candidatures_init_db(db, send_email_async)
from routes.ghost_profiles import router as ghost_router
from routes.ghost_engine import router as growth_engine_router
from routes.fintech import router as fintech_router
from routes.skeleton_omega import router as omega_skeleton_router
from routes.omega import router as omega_router, create_omega_indexes
from routes.cultural_identity import router as cultural_identity_router, feed_router as cultural_feed_router, reactions_router as cultural_reactions_router
from routes.cultural_search import router as cultural_search_router, analytics_router as cultural_analytics_router
from routes.pro_feed import router as pro_feed_router, init_db as pro_feed_init_db
pro_feed_init_db(db)
from routes.wallet import router as wallet_router
from routes.shop_payments import router as shop_payments_router
from routes.site_analytics import router as site_analytics_router
app.include_router(badges_router)
app.include_router(jetons_router)
app.include_router(ses_router)
app.include_router(analytics_router)
app.include_router(shared_router)
app.include_router(terrain_router)
app.include_router(smart_engine_router)
app.include_router(pro_social_router)
app.include_router(ai_agents_router)
app.include_router(brain_router)
app.include_router(reco_router)
app.include_router(candidatures_router)
app.include_router(ghost_router)
app.include_router(growth_engine_router)
app.include_router(fintech_router)
app.include_router(omega_skeleton_router)
app.include_router(omega_router)

# WebAuthn Face ID / Touch ID
from routes.webauthn import router as webauthn_router, init_webauthn
init_webauthn(db)
app.include_router(webauthn_router)

# Push Notifications — Web Push API
from routes.push_notifications import router as push_router, init_push
init_push(db)
app.include_router(push_router)

# Admin CC2026 — Dashboard, Users, Moderation
from routes.admin_cc2026 import router as admin_cc2026_router, init_admin_cc2026
init_admin_cc2026(db)
app.include_router(admin_cc2026_router)

app.include_router(cultural_identity_router)
app.include_router(cultural_feed_router)
app.include_router(cultural_reactions_router)
app.include_router(cultural_search_router)
app.include_router(cultural_analytics_router)
app.include_router(pro_feed_router)
app.include_router(wallet_router)
app.include_router(shop_payments_router)
app.include_router(site_analytics_router)

# FAQ & Support Tickets
from routes.support import router as support_router, seed_default_faq
app.include_router(support_router)

# Gouvernance Kilti Konet
from routes.gouvernance import router as gouvernance_router, create_gouvernance_indexes
from routes.frek_silent import router as frek_silent_router
from routes.laurentia_bridge import router as laurentia_bridge_router
from routes.laurentia_widget import router as laurentia_widget_router
from services.frek_silent_service import create_frek_silent_indexes, frekcore_retry_worker
app.include_router(gouvernance_router)
app.include_router(frek_silent_router)
app.include_router(laurentia_bridge_router)
app.include_router(laurentia_widget_router)

from routes.doctrine import router as doctrine_router, seed_doctrine as _doctrine_seed, backfill_actor_roles as _doctrine_backfill, require_permission as _require_perm
app.include_router(doctrine_router)

# ================== BADGE ACTIVATION (PUBLIC) ==================
from services.frek_client import frek_client as _frek
from services.baserow_service import update_mirror as _br_update_mirror

@app.get("/api/activer-badge/{qr_token}")
async def activer_badge(qr_token: str):
    """Activate badge via QR token scan"""
    badge = await db.cc_badges.find_one({"qr_token": qr_token}, {"_id": 0})
    if not badge:
        raise HTTPException(status_code=404, detail="Badge non trouve ou QR invalide")
    
    statut = badge.get("statut", "")
    badge_id = badge.get("badge_id", "")
    frek_id = badge.get("frek_id", "")
    
    if statut == "ACTIVE":
        return {
            "badge_id": badge_id, 
            "statut": "ACTIVE", 
            "frek_id": frek_id,
            "type_badge": badge.get("type_badge"),
            "prenom": badge.get("prenom"),
            "nom": badge.get("nom"),
            "message": "Badge deja actif"
        }
    if statut == "REVOQUE":
        raise HTTPException(status_code=403, detail="Badge revoque")
    
    # Activate in MongoDB
    await db.cc_badges.update_one({"badge_id": badge_id}, {"$set": {"statut": "ACTIVE"}})
    
    # Activate in FREK
    frek_id = badge.get("frek_id", "")
    frek_result = {}
    if frek_id:
        frek_result = await _frek.activate(frek_id)
    
    # Update Baserow mirror
    baserow_id = badge.get("baserow_row_id")
    if baserow_id:
        badge_copy = {**badge, "statut": "ACTIVE"}
        asyncio.create_task(_br_update_mirror(baserow_id, badge_copy))
    
    return {
        "badge_id": badge_id,
        "statut": "ACTIVE",
        "frek_id": frek_id,
        "frek_status": frek_result.get("status", "n/a"),
        "type_badge": badge.get("type_badge"),
        "prenom": badge.get("prenom"),
        "nom": badge.get("nom"),
        "message": "Badge active avec succes !"
    }

# FREK stats & health — extracted to /routes/omega.py

# ================== CMS ROUTES ==================

DEFAULT_TENANT = "culture-connect-2026"

# --- CMS Media ---
@app.get("/api/cms/media")
async def get_cms_media(category: Optional[str] = None, tenant_id: str = DEFAULT_TENANT):
    """Get all media items, optionally filtered by category"""
    query = {"tenant_id": tenant_id}
    if category:
        query["category"] = category
    
    media = await db.cms_media.find(query, {"_id": 0}).sort("order", 1).to_list(100)
    return {"media": media, "total": len(media)}

@app.post("/api/cms/media", dependencies=[Depends(_require_perm("publish_content"))])
async def create_cms_media(item: CMSMediaItem):
    """Create a new media item"""
    item_dict = item.model_dump()
    item_dict["id"] = str(uuid.uuid4())
    item_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    item_dict["updated_at"] = item_dict["created_at"]
    
    await db.cms_media.insert_one(item_dict)
    return {"success": True, "media": {k: v for k, v in item_dict.items() if k != "_id"}}

@app.put("/api/cms/media/{media_id}", dependencies=[Depends(_require_perm("publish_content"))])
async def update_cms_media(media_id: str, item: CMSMediaItem):
    """Update a media item"""
    item_dict = item.model_dump(exclude_unset=True)
    item_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.cms_media.update_one(
        {"id": media_id, "tenant_id": item.tenant_id},
        {"$set": item_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Media not found")
    
    return {"success": True}

@app.delete("/api/cms/media/{media_id}", dependencies=[Depends(_require_perm("publish_content"))])
async def delete_cms_media(media_id: str, tenant_id: str = DEFAULT_TENANT):
    """Delete a media item"""
    result = await db.cms_media.delete_one({"id": media_id, "tenant_id": tenant_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Media not found")
    
    return {"success": True}

@app.post("/api/cms/media/{media_id}/upload", dependencies=[Depends(_require_perm("publish_content"))])
async def upload_cms_media_image(media_id: str, file: UploadFile = File(...), tenant_id: str = DEFAULT_TENANT):
    """Upload image for a media item"""
    image_url = await upload_to_cloudinary(file, f"culture-connect/cms/{media_id}")
    
    if not image_url:
        raise HTTPException(status_code=500, detail="Failed to upload image")
    
    await db.cms_media.update_one(
        {"id": media_id, "tenant_id": tenant_id},
        {"$set": {"image_url": image_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "image_url": image_url}

@app.post("/api/cms/upload", dependencies=[Depends(_require_perm("publish_content"))])
async def upload_cms_file(file: UploadFile = File(...), type: str = "image"):
    """Generic CMS file upload (images, audio)"""
    # Generate unique folder based on file type
    folder = f"culture-connect/cms/{type}/{uuid.uuid4().hex[:8]}"
    
    if type == "audio":
        # For audio, upload to Cloudinary with resource_type=auto
        import cloudinary.uploader
        file_content = await file.read()
        result = cloudinary.uploader.upload(
            file_content,
            folder=folder,
            resource_type="auto"
        )
        return {"success": True, "url": result.get("secure_url")}
    else:
        # For images, use existing function
        image_url = await upload_to_cloudinary(file, folder)
        if not image_url:
            raise HTTPException(status_code=500, detail="Failed to upload file")
        return {"success": True, "url": image_url}

# --- CMS Exhibitor Photos ---
@app.get("/api/cms/exhibitors")
async def get_cms_exhibitors(tenant_id: str = DEFAULT_TENANT):
    """Get all exhibitor photos"""
    photos = await db.cms_exhibitor_photos.find(
        {"tenant_id": tenant_id}, 
        {"_id": 0}
    ).to_list(200)
    return {"exhibitors": photos, "total": len(photos)}

@app.post("/api/cms/exhibitors/{profile_id}/upload", dependencies=[Depends(_require_perm("publish_content"))])
async def upload_exhibitor_photo(
    profile_id: str, 
    profile_type: str = "smart_engine",
    file: UploadFile = File(...), 
    tenant_id: str = DEFAULT_TENANT
):
    """Upload photo for an exhibitor profile"""
    image_url = await upload_to_cloudinary(file, f"culture-connect/exhibitors/{profile_id}")
    
    if not image_url:
        raise HTTPException(status_code=500, detail="Failed to upload image")
    
    await db.cms_exhibitor_photos.update_one(
        {"profile_id": profile_id, "tenant_id": tenant_id},
        {
            "$set": {
                "profile_id": profile_id,
                "profile_type": profile_type,
                "photo_url": image_url,
                "tenant_id": tenant_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"success": True, "photo_url": image_url}

@app.delete("/api/cms/exhibitors/{profile_id}", dependencies=[Depends(_require_perm("publish_content"))])
async def delete_exhibitor_photo(profile_id: str, tenant_id: str = DEFAULT_TENANT):
    """Delete exhibitor photo"""
    result = await db.cms_exhibitor_photos.delete_one({"profile_id": profile_id, "tenant_id": tenant_id})
    return {"success": True, "deleted": result.deleted_count > 0}

# --- CMS Speakers ---
@app.get("/api/cms/speakers")
async def get_cms_speakers(tenant_id: str = DEFAULT_TENANT):
    """Get all speakers/intervenants"""
    speakers = await db.cms_speakers.find(
        {"tenant_id": tenant_id}, 
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    return {"speakers": speakers, "total": len(speakers)}

@app.post("/api/cms/speakers", dependencies=[Depends(_require_perm("publish_content"))])
async def create_cms_speaker(speaker: CMSSpeaker):
    """Create a new speaker"""
    speaker_dict = speaker.model_dump()
    speaker_dict["id"] = str(uuid.uuid4())
    speaker_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    speaker_dict["updated_at"] = speaker_dict["created_at"]
    
    await db.cms_speakers.insert_one(speaker_dict)
    return {"success": True, "speaker": {k: v for k, v in speaker_dict.items() if k != "_id"}}

@app.put("/api/cms/speakers/{speaker_id}", dependencies=[Depends(_require_perm("publish_content"))])
async def update_cms_speaker(speaker_id: str, speaker: CMSSpeaker):
    """Update a speaker"""
    speaker_dict = speaker.model_dump(exclude_unset=True)
    speaker_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.cms_speakers.update_one(
        {"id": speaker_id, "tenant_id": speaker.tenant_id},
        {"$set": speaker_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Speaker not found")
    
    return {"success": True}

@app.delete("/api/cms/speakers/{speaker_id}", dependencies=[Depends(_require_perm("publish_content"))])
async def delete_cms_speaker(speaker_id: str, tenant_id: str = DEFAULT_TENANT):
    """Delete a speaker"""
    result = await db.cms_speakers.delete_one({"id": speaker_id, "tenant_id": tenant_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Speaker not found")
    
    return {"success": True}

@app.post("/api/cms/speakers/{speaker_id}/upload", dependencies=[Depends(_require_perm("publish_content"))])
async def upload_speaker_photo(speaker_id: str, file: UploadFile = File(...), tenant_id: str = DEFAULT_TENANT):
    """Upload photo for a speaker"""
    image_url = await upload_to_cloudinary(file, f"culture-connect/speakers/{speaker_id}")
    
    if not image_url:
        raise HTTPException(status_code=500, detail="Failed to upload image")
    
    await db.cms_speakers.update_one(
        {"id": speaker_id, "tenant_id": tenant_id},
        {"$set": {"photo_url": image_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "photo_url": image_url}

@app.put("/api/cms/speakers/reorder", dependencies=[Depends(_require_perm("publish_content"))])
async def reorder_speakers(orders: List[dict], tenant_id: str = DEFAULT_TENANT):
    """Reorder speakers via drag & drop"""
    for item in orders:
        await db.cms_speakers.update_one(
            {"id": item["id"], "tenant_id": tenant_id},
            {"$set": {"order": item["order"]}}
        )
    return {"success": True}

# --- CMS Partner Banners ---
@app.get("/api/cms/partners")
async def get_cms_partners(tenant_id: str = DEFAULT_TENANT):
    """Get all partner banners"""
    partners = await db.cms_partner_banners.find(
        {"tenant_id": tenant_id}, 
        {"_id": 0}
    ).sort("order", 1).to_list(100)
    return {"partners": partners, "total": len(partners)}

@app.post("/api/cms/partners", dependencies=[Depends(_require_perm("publish_content"))])
async def create_cms_partner(partner: CMSPartnerBanner):
    """Create a new partner banner"""
    partner_dict = partner.model_dump()
    partner_dict["id"] = str(uuid.uuid4())
    partner_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    partner_dict["updated_at"] = partner_dict["created_at"]
    
    await db.cms_partner_banners.insert_one(partner_dict)
    return {"success": True, "partner": {k: v for k, v in partner_dict.items() if k != "_id"}}

@app.put("/api/cms/partners/{partner_id}", dependencies=[Depends(_require_perm("publish_content"))])
async def update_cms_partner(partner_id: str, partner: CMSPartnerBanner):
    """Update a partner banner"""
    partner_dict = partner.model_dump(exclude_unset=True)
    partner_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.cms_partner_banners.update_one(
        {"id": partner_id, "tenant_id": partner.tenant_id},
        {"$set": partner_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    return {"success": True}

@app.delete("/api/cms/partners/{partner_id}", dependencies=[Depends(_require_perm("publish_content"))])
async def delete_cms_partner(partner_id: str, tenant_id: str = DEFAULT_TENANT):
    """Delete a partner banner"""
    result = await db.cms_partner_banners.delete_one({"id": partner_id, "tenant_id": tenant_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    return {"success": True}

@app.post("/api/cms/partners/{partner_id}/upload", dependencies=[Depends(_require_perm("publish_content"))])
async def upload_partner_logo(partner_id: str, file: UploadFile = File(...), tenant_id: str = DEFAULT_TENANT):
    """Upload logo for a partner"""
    image_url = await upload_to_cloudinary(file, f"culture-connect/partners/{partner_id}")
    
    if not image_url:
        raise HTTPException(status_code=500, detail="Failed to upload image")
    
    await db.cms_partner_banners.update_one(
        {"id": partner_id, "tenant_id": tenant_id},
        {"$set": {"logo_url": image_url, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "logo_url": image_url}

@app.put("/api/cms/partners/reorder", dependencies=[Depends(_require_perm("publish_content"))])
async def reorder_partners(orders: List[dict], tenant_id: str = DEFAULT_TENANT):
    """Reorder partner banners"""
    for item in orders:
        await db.cms_partner_banners.update_one(
            {"id": item["id"], "tenant_id": tenant_id},
            {"$set": {"order": item["order"]}}
        )
    return {"success": True}

# --- CMS Publish/Preview ---
@app.post("/api/cms/publish", dependencies=[Depends(_require_perm("publish_content"))])
async def publish_cms_changes(tenant_id: str = DEFAULT_TENANT):
    """Publish all draft changes"""
    # Mark all items as published
    await db.cms_media.update_many(
        {"tenant_id": tenant_id, "published": False},
        {"$set": {"published": True, "published_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Toutes les modifications ont été publiées"}

# ================== VISUAL EDITOR ENDPOINTS ==================

class VisualEditorChange(BaseModel):
    page: str
    changes: dict

@app.post("/api/cms/visual-editor/save", dependencies=[Depends(_require_perm("publish_content"))])
async def save_visual_editor_changes(data: VisualEditorChange):
    """Save changes made in the visual editor"""
    try:
        # Store changes in visual_editor_changes collection
        change_doc = {
            "page": data.page,
            "changes": data.changes,
            "saved_at": datetime.now(timezone.utc).isoformat(),
            "tenant_id": DEFAULT_TENANT
        }
        
        await db.visual_editor_changes.insert_one(change_doc)
        
        # Broadcast real-time update
        await broadcast_event("visual_editor_updated", {
            "page": data.page,
            "changes_count": len(data.changes)
        })
        
        return {"success": True, "message": "Modifications sauvegardees"}
    except Exception as e:
        logger.error(f"Error saving visual editor changes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cms/visual-editor/changes/{page}")
async def get_visual_editor_changes(page: str):
    """Get saved changes for a specific page"""
    changes = await db.visual_editor_changes.find(
        {"page": page, "tenant_id": DEFAULT_TENANT},
        {"_id": 0}
    ).sort("saved_at", -1).limit(1).to_list(1)
    
    return {"changes": changes[0] if changes else None}

@app.get("/api/cms/visual-editor/proxy")
@app.get("/api/cms/visual-editor/proxy/{full_path:path}")
async def visual_editor_proxy(full_path: str = "", path: str = None, request: Request = None):
    """
    Proxy endpoint for Visual Editor - serves site content from same domain
    to bypass X-Frame-Options / CSP restrictions
    """
    try:
        # Get the frontend URL (port 3000 internally)
        frontend_url = "http://localhost:3000"
        
        # Use full_path if provided (for static assets), otherwise use path query param
        request_path = "/" + full_path if full_path else (path or "/")
        
        # Construct the full URL
        full_url = f"{frontend_url}{request_path}"
        
        # Add visual editor params only for HTML pages (not static assets)
        is_html_request = not any(request_path.endswith(ext) for ext in ['.js', '.css', '.png', '.jpg', '.svg', '.ico', '.json', '.map', '.woff', '.woff2', '.ttf'])
        
        if is_html_request and "?" not in request_path:
            full_url += "?ve=1&skip_intro=1"
        elif is_html_request:
            full_url += "&ve=1&skip_intro=1"
        
        # Fetch the content
        resp = requests.get(full_url, timeout=15)
        
        # Get content type
        content_type = resp.headers.get('content-type', 'text/html')
        
        # Modify HTML to inject editor script and fix asset paths
        if 'text/html' in content_type:
            content = resp.text
            
            # Rewrite asset paths to go through our proxy
            base_proxy_url = "/api/cms/visual-editor/proxy"
            content = content.replace('src="/static/', f'src="{base_proxy_url}/static/')
            content = content.replace('href="/static/', f'href="{base_proxy_url}/static/')
            content = content.replace('src="/', f'src="{base_proxy_url}/')
            content = content.replace('href="/', f'href="{base_proxy_url}/')
            
            # Inject the visual editor initialization script before </body>
            editor_script = """
<script>
// Visual Editor Mode - Enable element selection
(function() {
    // Wait for React to render
    setTimeout(function() {
        document.body.style.cursor = 'crosshair';
        
        // Add click handler for element selection
        document.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const target = e.target;
            
            // Don't select the body or html
            if (target === document.body || target === document.documentElement) return;
            
            // Remove previous selection highlight
            document.querySelectorAll('.ve-selected').forEach(el => {
                el.classList.remove('ve-selected');
                el.style.outline = '';
            });
            
            // Highlight selected element
            target.classList.add('ve-selected');
            target.style.outline = '2px solid #C4714A';
            
            // Generate a unique ID if not present
            if (!target.dataset.veId) {
                target.dataset.veId = 'el-' + Math.random().toString(36).substr(2, 9);
            }
            
            // Send selection to parent
            window.parent.postMessage({
                type: 'element-selected',
                element: {
                    id: target.dataset.veId,
                    tagName: target.tagName,
                    content: target.tagName === 'IMG' ? target.src : target.textContent?.substring(0, 500),
                    styles: {
                        color: getComputedStyle(target).color,
                        backgroundColor: getComputedStyle(target).backgroundColor,
                        fontSize: getComputedStyle(target).fontSize,
                    },
                    href: target.href || null
                }
            }, '*');
        }, true);
        
        // Add visual indicator style
        const style = document.createElement('style');
        style.textContent = '.ve-selected { outline: 2px solid #C4714A !important; }';
        document.head.appendChild(style);
        
        // Notify parent that iframe is ready
        window.parent.postMessage({ type: 'iframe-ready' }, '*');
    }, 2000);
})();
</script>
"""
            content = content.replace('</body>', editor_script + '</body>')
            
            return Response(
                content=content,
                media_type='text/html'
            )
        else:
            # For non-HTML content (CSS, JS, images), proxy as-is
            return Response(
                content=resp.content,
                media_type=content_type
            )
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Visual editor proxy error: {e}")
        raise HTTPException(status_code=502, detail=f"Could not fetch page: {str(e)}")
    except Exception as e:
        logger.error(f"Visual editor proxy unexpected error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cms/preview")
async def get_cms_preview(tenant_id: str = DEFAULT_TENANT):
    """Get preview of all CMS content"""
    media = await db.cms_media.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(100)
    speakers = await db.cms_speakers.find({"tenant_id": tenant_id}, {"_id": 0}).sort("order", 1).to_list(100)
    partners = await db.cms_partner_banners.find({"tenant_id": tenant_id}, {"_id": 0}).sort("order", 1).to_list(100)
    exhibitors = await db.cms_exhibitor_photos.find({"tenant_id": tenant_id}, {"_id": 0}).to_list(200)
    
    return {
        "media": media,
        "speakers": speakers,
        "partners": partners,
        "exhibitors": exhibitors,
        "tenant_id": tenant_id
    }

# ================== CMS THEME (Design Visuel) ==================

@app.get("/api/cms/theme")
async def get_cms_theme(tenant_id: str = DEFAULT_TENANT):
    """Get theme configuration"""
    # Get from tenant_config
    config = await db.tenant_config.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not config:
        # Return defaults
        return {
            "tenant_id": tenant_id,
            "primary_color": "#A65D47",
            "secondary_color": "#C8922A",
            "accent_color": "#4A5D4E",
            "background_color": "#1A1A1A",
            "text_color": "#F4F1EA",
            "font_family": "Inter",
            "hero_image_url": None,
            "hero_title": "Culture Connect 2026",
            "hero_subtitle": "Le premier marché professionnel des industries culturelles afro-caribéennes"
        }
    return config

@app.put("/api/cms/theme", dependencies=[Depends(_require_perm("publish_content"))])
async def update_cms_theme(theme: CMSTheme):
    """Update theme configuration"""
    theme_dict = theme.model_dump()
    theme_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.tenant_config.update_one(
        {"tenant_id": theme.tenant_id},
        {"$set": theme_dict},
        upsert=True
    )
    
    # 🔄 Broadcast real-time update
    await broadcast_event("theme_updated", {"tenant_id": theme.tenant_id})
    
    return {"success": True, "message": "Thème mis à jour"}

@app.post("/api/cms/theme/hero-upload", dependencies=[Depends(_require_perm("publish_content"))])
async def upload_hero_image(file: UploadFile = File(...), tenant_id: str = DEFAULT_TENANT):
    """Upload hero image"""
    image_url = await upload_to_cloudinary(file, f"culture-connect/theme/hero-{tenant_id}")
    
    if not image_url:
        raise HTTPException(status_code=500, detail="Failed to upload image")
    
    await db.tenant_config.update_one(
        {"tenant_id": tenant_id},
        {"$set": {"hero_image_url": image_url, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"success": True, "image_url": image_url}

# ================== CMS CONTENT (Contenu Éditorial) ==================

@app.get("/api/cms/content")
async def get_cms_content(page: Optional[str] = None, tenant_id: str = DEFAULT_TENANT):
    """Get editorial content, optionally filtered by page"""
    query = {"tenant_id": tenant_id}
    if page:
        query["page"] = page
    
    content = await db.cms_content.find(query, {"_id": 0}).to_list(100)
    return {"content": content, "total": len(content)}

@app.get("/api/cms/content/{page}/{section}")
async def get_cms_content_section(page: str, section: str, tenant_id: str = DEFAULT_TENANT):
    """Get specific content section"""
    content = await db.cms_content.find_one(
        {"tenant_id": tenant_id, "page": page, "section": section},
        {"_id": 0}
    )
    return content or {"page": page, "section": section, "content": {}}

@app.put("/api/cms/content/{page}/{section}", dependencies=[Depends(_require_perm("publish_content"))])
async def update_cms_content_section(page: str, section: str, data: dict, tenant_id: str = DEFAULT_TENANT):
    """Update specific content section"""
    content_id = f"{tenant_id}_{page}_{section}"
    
    await db.cms_content.update_one(
        {"tenant_id": tenant_id, "page": page, "section": section},
        {
            "$set": {
                "id": content_id,
                "tenant_id": tenant_id,
                "page": page,
                "section": section,
                "content": data.get("content", {}),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # 🔄 Broadcast real-time update
    await broadcast_event("cms_content_updated", {"page": page, "section": section})
    
    return {"success": True}

@app.post("/api/cms/content/init-defaults", dependencies=[Depends(_require_perm("publish_content"))])
async def init_default_content(tenant_id: str = DEFAULT_TENANT):
    """Initialize default content for all pages"""
    defaults = [
        # Homepage
        {"page": "home", "section": "hero", "content": {
            "title": "Culture Connect 2026",
            "subtitle": "Le premier marché professionnel des industries culturelles afro-caribéennes",
            "cta_text": "Découvrir le programme"
        }},
        {"page": "home", "section": "intro", "content": {
            "title": "Bienvenue à Culture Connect",
            "text": "Du 20 au 23 mai 2026, Fort-de-France accueille le premier marché professionnel dédié aux industries culturelles afro-caribéennes. Un événement unique réunissant labels, artistes, agents, médias et institutions de toute la diaspora."
        }},
        {"page": "home", "section": "key_figures", "content": {
            "figures": [
                {"value": "50+", "label": "Exposants", "description": "Labels, agents, institutions"},
                {"value": "500", "label": "Participants", "description": "Professionnels attendus"},
                {"value": "12", "label": "Territoires", "description": "Caraïbe, Afrique, Europe"},
                {"value": "4", "label": "Jours", "description": "De rencontres B2B"}
            ]
        }},
        # Program - Structure officielle Culture Connect 2026
        {"page": "program", "section": "intro", "content": {
            "title": "Programme Officiel Culture Connect 2026",
            "text": "4 jours de rencontres professionnelles, conférences et showcases au cœur de Fort-de-France, Martinique."
        }},
        {"page": "program", "section": "official_program", "content": {
            "days": [
                {
                    "id": "day1",
                    "date": "2026-05-20",
                    "label": "DAY 1 — Mardi 20 Mai 2026",
                    "site": "Bibliothèque Schoelcher",
                    "is_highlight": False,
                    "highlight_color": None,
                    "slots": [
                        {"time": "09:00", "title": "Accueil & Enregistrement", "description": "Retrait des badges et documentation", "speaker": ""},
                        {"time": "10:00", "title": "Cérémonie d'ouverture", "description": "Discours officiels et présentation du programme", "speaker": "Équipe Culture Connect"},
                        {"time": "14:00", "title": "Table ronde : L'industrie musicale caribéenne en 2026", "description": "État des lieux et perspectives", "speaker": "Panel d'experts"},
                        {"time": "16:30", "title": "Sessions de networking B2B", "description": "Rencontres planifiées entre professionnels", "speaker": ""}
                    ]
                },
                {
                    "id": "day2",
                    "date": "2026-05-21",
                    "label": "DAY 2 — Mercredi 21 Mai 2026",
                    "site": "Bibliothèque Schoelcher + Teyat Otonom Mawon",
                    "is_highlight": False,
                    "highlight_color": None,
                    "slots": [
                        {"time": "09:30", "title": "Workshop : Distribution digitale", "description": "Stratégies de distribution pour artistes caribéens", "speaker": "Experts streaming"},
                        {"time": "11:00", "title": "Masterclass : Production musicale", "description": "Techniques et tendances actuelles", "speaker": ""},
                        {"time": "14:30", "title": "Rencontres B2B", "description": "Sessions de speed-meeting", "speaker": ""},
                        {"time": "20:00", "title": "Showcase Artistes Émergents", "description": "Performances live @ Teyat Otonom Mawon", "speaker": "Artistes sélectionnés"}
                    ]
                },
                {
                    "id": "day3",
                    "date": "2026-05-22",
                    "label": "DAY 3 — Jeudi 22 Mai 2026 (JOURNÉE ABOLITION)",
                    "site": "Teyat Otonom Mawon + La Savane",
                    "is_highlight": True,
                    "highlight_color": "#A65D47",
                    "slots": [
                        {"time": "09:00", "title": "Commémoration de l'Abolition", "description": "Cérémonie officielle et hommage", "speaker": ""},
                        {"time": "11:00", "title": "Conférence : Musiques de la diaspora", "description": "Héritage et créativité contemporaine", "speaker": "Historiens & artistes"},
                        {"time": "15:00", "title": "Marché Culturel @ La Savane", "description": "Stands exposants, démos, rencontres", "speaker": ""},
                        {"time": "19:00", "title": "Concert Abolition", "description": "Grande scène La Savane", "speaker": "Têtes d'affiche"}
                    ]
                },
                {
                    "id": "day4",
                    "date": "2026-05-23",
                    "label": "DAY 4 — Vendredi 23 Mai 2026",
                    "site": "Teyat Otonom Mawon",
                    "is_highlight": False,
                    "highlight_color": None,
                    "slots": [
                        {"time": "09:30", "title": "Bilan & Retours d'expérience", "description": "Ce que nous avons appris", "speaker": "Participants"},
                        {"time": "11:00", "title": "Signature de partenariats", "description": "Officialisation des collaborations", "speaker": ""},
                        {"time": "14:00", "title": "Table ronde de clôture", "description": "Perspectives 2027 et annonces", "speaker": "Organisateurs"},
                        {"time": "17:00", "title": "Cérémonie de clôture", "description": "Remise des prix et remerciements", "speaker": "Équipe Culture Connect"}
                    ]
                }
            ]
        }},
        # About
        {"page": "about", "section": "history", "content": {
            "title": "Notre Histoire",
            "text": "Culture Connect est né de la volonté de créer un espace de rencontre dédié aux professionnels des industries culturelles afro-caribéennes. Initié par Factory Maker Studio, ce projet ambitionne de devenir le rendez-vous incontournable du secteur."
        }},
        {"page": "about", "section": "mission", "content": {
            "title": "Notre Mission",
            "text": "Faciliter les échanges et collaborations entre les acteurs des industries culturelles de la Caraïbe, de l'Afrique et de la diaspora. Créer des opportunités business concrètes et durables."
        }},
        {"page": "about", "section": "vision", "content": {
            "title": "Notre Vision",
            "text": "Faire de Fort-de-France la capitale des industries culturelles afro-caribéennes. Positionner Culture Connect comme la référence mondiale du secteur d'ici 2030."
        }}
    ]
    
    for item in defaults:
        existing = await db.cms_content.find_one({
            "tenant_id": tenant_id, 
            "page": item["page"], 
            "section": item["section"]
        })
        if not existing:
            item["tenant_id"] = tenant_id
            item["id"] = f"{tenant_id}_{item['page']}_{item['section']}"
            item["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.cms_content.insert_one(item)
    
    return {"success": True, "message": "Contenu par défaut initialisé"}

# ================== CMS PAGES (Pages Dynamiques) ==================

@app.get("/api/cms/pages")
async def get_cms_pages(tenant_id: str = DEFAULT_TENANT):
    """Get all custom pages"""
    pages = await db.cms_pages.find({"tenant_id": tenant_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"pages": pages, "total": len(pages)}

@app.get("/api/cms/pages/{page_id}")
async def get_cms_page(page_id: str, tenant_id: str = DEFAULT_TENANT):
    """Get a specific page by ID"""
    page = await db.cms_pages.find_one({"id": page_id, "tenant_id": tenant_id}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page

@app.get("/api/cms/pages/slug/{slug}")
async def get_cms_page_by_slug(slug: str, tenant_id: str = DEFAULT_TENANT):
    """Get a page by slug (for public rendering)"""
    page = await db.cms_pages.find_one(
        {"slug": slug, "tenant_id": tenant_id, "published": True}, 
        {"_id": 0}
    )
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page

@app.post("/api/cms/pages", dependencies=[Depends(_require_perm("publish_content"))])
async def create_cms_page(page: CMSPage):
    """Create a new custom page"""
    # Validate slug
    slug = page.slug.lower().strip().replace(" ", "-")
    slug = ''.join(c for c in slug if c.isalnum() or c == '-')
    
    # Check if slug exists
    existing = await db.cms_pages.find_one({"slug": slug, "tenant_id": page.tenant_id})
    if existing:
        raise HTTPException(status_code=400, detail="Ce slug existe déjà")
    
    page_dict = page.model_dump()
    page_dict["id"] = str(uuid.uuid4())
    page_dict["slug"] = slug
    page_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    page_dict["updated_at"] = page_dict["created_at"]
    
    await db.cms_pages.insert_one(page_dict)
    return {"success": True, "page": {k: v for k, v in page_dict.items() if k != "_id"}}

@app.put("/api/cms/pages/{page_id}", dependencies=[Depends(_require_perm("publish_content"))])
async def update_cms_page(page_id: str, page: CMSPage):
    """Update a custom page"""
    # Validate slug
    slug = page.slug.lower().strip().replace(" ", "-")
    slug = ''.join(c for c in slug if c.isalnum() or c == '-')
    
    # Check if slug exists for another page
    existing = await db.cms_pages.find_one({
        "slug": slug, 
        "tenant_id": page.tenant_id,
        "id": {"$ne": page_id}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Ce slug existe déjà")
    
    page_dict = page.model_dump(exclude_unset=True)
    page_dict["slug"] = slug
    page_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.cms_pages.update_one(
        {"id": page_id, "tenant_id": page.tenant_id},
        {"$set": page_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Page not found")
    
    return {"success": True}

@app.delete("/api/cms/pages/{page_id}", dependencies=[Depends(_require_perm("publish_content"))])
async def delete_cms_page(page_id: str, tenant_id: str = DEFAULT_TENANT):
    """Delete a custom page"""
    result = await db.cms_pages.delete_one({"id": page_id, "tenant_id": tenant_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Page not found")
    
    return {"success": True}

# ================== PUBLIC CMS ENDPOINTS ==================

@app.get("/api/public/theme")
async def get_public_theme(tenant_id: str = DEFAULT_TENANT):
    """Get theme for public site (no auth required)"""
    config = await db.tenant_config.find_one({"tenant_id": tenant_id}, {"_id": 0})
    if not config:
        return {
            "primary_color": "#A65D47",
            "secondary_color": "#C8922A",
            "accent_color": "#4A5D4E",
            "background_color": "#1A1A1A",
            "text_color": "#F4F1EA",
            "font_family": "Inter",
            "hero_image_url": None,
            "hero_title": "Culture Connect 2026",
            "hero_subtitle": "Le premier marché professionnel des industries culturelles afro-caribéennes"
        }
    return config

@app.get("/api/public/content/{page}")
async def get_public_content(page: str, tenant_id: str = DEFAULT_TENANT):
    """Get content for a specific page (no auth required)"""
    content = await db.cms_content.find(
        {"tenant_id": tenant_id, "page": page}, 
        {"_id": 0}
    ).to_list(50)
    
    # Convert to dict by section
    result = {}
    for item in content:
        result[item["section"]] = item.get("content", {})
    
    # Sanitize: replace legacy venue name
    import re
    result_str = str(result)
    if 'Atrium' in result_str or 'atrium' in result_str:
        import json
        result_json = json.dumps(result, default=str)
        result_json = re.sub(r'Tropiques?\s*Atrium', 'Teyat Otonom Mawon (TOM)', result_json, flags=re.IGNORECASE)
        result_json = result_json.replace('Atrium', 'TOM').replace('atrium', 'TOM')
        result = json.loads(result_json)
    
    return result

@app.get("/api/public/page/{slug}")
async def get_public_page(slug: str, tenant_id: str = DEFAULT_TENANT):
    """Get a custom page by slug (no auth required)"""

@app.post("/api/cms/cleanup-atrium", dependencies=[Depends(_require_perm("publish_content"))])
async def cleanup_atrium_references(tenant_id: str = DEFAULT_TENANT):
    """One-time cleanup: replace all Atrium references in CMS content"""
    import re
    import json as json_mod
    updated = 0
    async for doc in db.cms_content.find({"tenant_id": tenant_id}):
        doc_str = json_mod.dumps(doc.get("content", {}), default=str)
        if 'Atrium' in doc_str or 'atrium' in doc_str:
            new_str = re.sub(r'Tropiques?\s*Atrium', 'Teyat Otonom Mawon (TOM)', doc_str, flags=re.IGNORECASE)
            new_str = new_str.replace('Atrium', 'TOM').replace('atrium', 'TOM')
            new_content = json_mod.loads(new_str)
            await db.cms_content.update_one({"_id": doc["_id"]}, {"$set": {"content": new_content}})
            updated += 1
    # Also clean tenant_config
    async for doc in db.tenant_config.find({}):
        doc_str = json_mod.dumps(doc, default=str)
        if 'Atrium' in doc_str or 'atrium' in doc_str:
            doc.pop("_id")
            new_str = re.sub(r'Tropiques?\s*Atrium', 'Teyat Otonom Mawon (TOM)', json_mod.dumps(doc, default=str), flags=re.IGNORECASE)
            new_str = new_str.replace('Atrium', 'TOM').replace('atrium', 'TOM')
            updated += 1
    return {"success": True, "updated_documents": updated}


# ================== MAP TERRITORIES API ==================
DEFAULT_MAP_TERRITORIES = [
    {"id": "martinique", "name": "Fort-de-France", "lat": 14.6, "lon": -61.0, "color": "#A65D47", "size": "primary", "label": "Martinique", "isCenter": True, "active": True},
    {"id": "paris", "name": "Paris", "lat": 48.8, "lon": 2.3, "color": "#C8922A", "size": "large", "label": "Paris — Diaspora", "active": True},
    {"id": "colombia", "name": "Bogotá", "lat": 4.7, "lon": -74.0, "color": "#C8922A", "size": "medium", "label": "Colombie", "active": True},
    {"id": "haiti", "name": "Port-au-Prince", "lat": 18.9, "lon": -72.3, "color": "#A65D47", "size": "medium", "label": "Haïti", "opacity": 0.8, "active": True},
    {"id": "senegal", "name": "Dakar", "lat": 14.7, "lon": -17.4, "color": "#C8922A", "size": "medium", "label": "Sénégal", "active": True},
    {"id": "nigeria", "name": "Lagos", "lat": 6.5, "lon": 3.4, "color": "#C8922A", "size": "small", "label": "Nigeria", "active": True},
    {"id": "guadeloupe", "name": "Guadeloupe", "lat": 16.2, "lon": -61.5, "color": "#A65D47", "size": "medium", "label": "Guadeloupe", "active": True},
    {"id": "london", "name": "Londres", "lat": 51.5, "lon": -0.1, "color": "#FFFFFF", "size": "small", "label": "UK", "active": True},
    {"id": "newyork", "name": "New York", "lat": 40.7, "lon": -74.0, "color": "#FFFFFF", "size": "small", "label": "USA", "active": True},
    {"id": "brazil", "name": "Brasília", "lat": -15.7, "lon": -47.9, "color": "#C8922A", "size": "small", "label": "Brésil", "active": True},
]

@app.get("/api/cms/map-territories")
async def get_map_territories(tenant_id: str = DEFAULT_TENANT):
    """Get map territories configuration"""
    config = await db.map_config.find_one({"tenant_id": tenant_id}, {"_id": 0})
    
    if not config or not config.get("territories"):
        return {
            "territories": DEFAULT_MAP_TERRITORIES,
            "counter_text": "territoires connectés",
            "animations_enabled": True,
            "lines_enabled": True
        }
    
    return config

@app.post("/api/cms/map-territories", dependencies=[Depends(_require_perm("publish_content"))])
async def save_map_territories(config: MapConfig):
    """Save map territories configuration"""
    config_dict = config.model_dump()
    config_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.map_config.update_one(
        {"tenant_id": config.tenant_id},
        {"$set": config_dict},
        upsert=True
    )
    
    # 🔄 Broadcast real-time update
    await broadcast_event("territories_updated", {"count": len(config.territories)})
    
    return {"success": True, "message": "Configuration de la carte sauvegardée"}

@app.post("/api/cms/map-territories/add", dependencies=[Depends(_require_perm("publish_content"))])
async def add_map_territory(territory: MapTerritory, tenant_id: str = DEFAULT_TENANT):
    """Add a new territory to the map"""
    config = await db.map_config.find_one({"tenant_id": tenant_id})
    
    if not config:
        config = {
            "tenant_id": tenant_id,
            "territories": DEFAULT_MAP_TERRITORIES.copy(),
            "counter_text": "territoires connectés",
            "animations_enabled": True,
            "lines_enabled": True
        }
    
    territories = config.get("territories", [])
    territories.append(territory.model_dump())
    
    await db.map_config.update_one(
        {"tenant_id": tenant_id},
        {"$set": {"territories": territories, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    # 🔄 Broadcast real-time update
    await broadcast_event("territories_updated", {"action": "added", "territory": territory.name})
    
    return {"success": True, "message": "Territoire ajouté"}

@app.delete("/api/cms/map-territories/{territory_id}", dependencies=[Depends(_require_perm("publish_content"))])
async def delete_map_territory(territory_id: str, tenant_id: str = DEFAULT_TENANT):
    """Delete a territory from the map"""
    config = await db.map_config.find_one({"tenant_id": tenant_id})
    
    if config and config.get("territories"):
        territories = [t for t in config["territories"] if t.get("id") != territory_id]
        await db.map_config.update_one(
            {"tenant_id": tenant_id},
            {"$set": {"territories": territories, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"success": True, "message": "Territoire supprimé"}

# ================== SECTION BACKGROUNDS API ==================
DEFAULT_SECTION_BACKGROUNDS = [
    {"section_id": "hero", "background_type": "color", "color": "#F4F1EA", "overlay_opacity": 0, "active": True},
    {"section_id": "vision", "background_type": "color", "color": "#F4F1EA", "overlay_opacity": 0, "active": True},
    {"section_id": "diaspora", "background_type": "color", "color": "#1A1A1A", "overlay_opacity": 0, "active": True},
    {"section_id": "programme", "background_type": "color", "color": "#F5F3EE", "overlay_opacity": 0, "active": True},
    {"section_id": "partenaires", "background_type": "color", "color": "#F4F1EA", "overlay_opacity": 0, "active": True},
    {"section_id": "cta", "background_type": "color", "color": "#1A1A1A", "overlay_opacity": 0, "active": True},
]

@app.get("/api/cms/site-config")
async def get_site_config(tenant_id: str = DEFAULT_TENANT):
    """Get global site configuration"""
    config = await db.site_config.find_one({"tenant_id": tenant_id}, {"_id": 0})
    
    if not config:
        return {
            "tenant_id": tenant_id,
            "animations_enabled": True,
            "countdown_enabled": True,
            "particles_enabled": True,
            "map_lines_enabled": True,
            "section_backgrounds": DEFAULT_SECTION_BACKGROUNDS
        }
    
    return config

@app.post("/api/cms/site-config", dependencies=[Depends(_require_perm("publish_content"))])
async def save_site_config(config: SiteConfig):
    """Save global site configuration"""
    config_dict = config.model_dump()
    config_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.site_config.update_one(
        {"tenant_id": config.tenant_id},
        {"$set": config_dict},
        upsert=True
    )
    
    return {"success": True, "message": "Configuration du site sauvegardée"}

@app.post("/api/cms/section-background", dependencies=[Depends(_require_perm("publish_content"))])
async def save_section_background(background: SectionBackground, tenant_id: str = DEFAULT_TENANT):
    """Save or update a section background"""
    config = await db.site_config.find_one({"tenant_id": tenant_id})
    
    if not config:
        config = {
            "tenant_id": tenant_id,
            "animations_enabled": True,
            "countdown_enabled": True,
            "particles_enabled": True,
            "map_lines_enabled": True,
            "section_backgrounds": DEFAULT_SECTION_BACKGROUNDS.copy()
        }
    
    backgrounds = config.get("section_backgrounds", [])
    
    # Update or add
    updated = False
    for i, bg in enumerate(backgrounds):
        if bg.get("section_id") == background.section_id:
            backgrounds[i] = background.model_dump()
            updated = True
            break
    
    if not updated:
        backgrounds.append(background.model_dump())
    
    await db.site_config.update_one(
        {"tenant_id": tenant_id},
        {"$set": {"section_backgrounds": backgrounds, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"success": True, "message": "Fond de section sauvegardé"}

# ================== ANNUAL INTENTION API ==================
DEFAULT_TERRITORY_MESSAGES = {
    "Martinique": "Ou ka vini.",
    "MQ": "Ou ka vini.",
    "Guadeloupe": "An nou.",
    "GP": "An nou.",
    "Haiti": "Nou la.",
    "HT": "Nou la.",
    "Colombia": "Aquí estamos.",
    "CO": "Aquí estamos.",
    "Senegal": "Dëkk bi.",
    "SN": "Dëkk bi.",
    "France": "La diaspora rentre.",
    "FR": "La diaspora rentre.",
}

@app.get("/api/annual-intention")
async def get_annual_intention(tenant_id: str = DEFAULT_TENANT):
    """Get the active annual intention for intro sequence"""
    intention = await db.annual_intention.find_one(
        {"tenant_id": tenant_id, "active": True},
        {"_id": 0}
    )
    
    if not intention:
        # Return default intention
        return {
            "tenant_id": tenant_id,
            "annee": "2026",
            "mot_annee": "NOU.",
            "mot_annee_note": "2026 — Nous. La reconnexion.",
            "image_annee_url": None,
            "phrase_ligne_1": "Pendant des siècles on nous a séparés.",
            "phrase_ligne_2": "Le 22 Mai 2026 — nous nous retrouvons.",
            "mot_cle_phrase_2": "nous",
            "couleur_annee": "#A65D47",
            "son_tambour_url": None,
            "sons_identites": None,
            "territoire_messages": DEFAULT_TERRITORY_MESSAGES,
            "active": True
        }
    
    # Add default territory messages if not set
    if not intention.get("territoire_messages"):
        intention["territoire_messages"] = DEFAULT_TERRITORY_MESSAGES
    
    return intention

@app.post("/api/annual-intention")
async def save_annual_intention(intention: AnnualIntention):
    """Save or update the annual intention"""
    intention_dict = intention.model_dump()
    intention_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Deactivate other intentions for this tenant
    await db.annual_intention.update_many(
        {"tenant_id": intention.tenant_id},
        {"$set": {"active": False}}
    )
    
    # Upsert the new intention
    existing = await db.annual_intention.find_one({
        "tenant_id": intention.tenant_id,
        "annee": intention.annee
    })
    
    if existing:
        await db.annual_intention.update_one(
            {"tenant_id": intention.tenant_id, "annee": intention.annee},
            {"$set": {**intention_dict, "active": True}}
        )
    else:
        intention_dict["id"] = str(uuid.uuid4())
        intention_dict["created_at"] = datetime.now(timezone.utc).isoformat()
        intention_dict["active"] = True
        await db.annual_intention.insert_one(intention_dict)
    
    # 🔄 Broadcast real-time update
    await broadcast_event("intention_updated", {"annee": intention.annee, "mot": intention.mot_annee})
    
    return {"success": True, "message": "Intention de l'année sauvegardée"}

@app.get("/api/annual-intention/all")
async def get_all_intentions(tenant_id: str = DEFAULT_TENANT):
    """Get all annual intentions for CMS management"""
    intentions = await db.annual_intention.find(
        {"tenant_id": tenant_id},
        {"_id": 0}
    ).sort("annee", -1).to_list(100)
    
    return {"intentions": intentions}

# ================== SMART ENGINE PROXY ==================
import httpx

SMART_ENGINE_URL = "http://localhost:8002"

@app.api_route("/api/v1/smart-recommendations/{path:path}", methods=["GET", "POST", "DELETE", "PUT", "PATCH"])
async def smart_engine_proxy(request: Request, path: str):
    """Proxy requests to KiltiKonet Smart Engine service"""
    async with httpx.AsyncClient(timeout=60.0) as client_http:
        url = f"{SMART_ENGINE_URL}/api/v1/smart-recommendations/{path}"
        
        # Forward the request
        try:
            if request.method == "GET":
                response = await client_http.get(url, params=dict(request.query_params))
            elif request.method == "POST":
                body = await request.body()
                response = await client_http.post(
                    url, 
                    content=body,
                    headers={"Content-Type": request.headers.get("Content-Type", "application/json")}
                )
            elif request.method == "DELETE":
                response = await client_http.delete(url)
            else:
                body = await request.body()
                response = await client_http.request(
                    request.method,
                    url,
                    content=body,
                    headers={"Content-Type": request.headers.get("Content-Type", "application/json")}
                )
            
            # Return the response
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.headers.get("content-type")
            )
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Smart Engine service unavailable")
        except Exception as e:
            logger.error(f"Smart Engine proxy error: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal proxy error")

# Intelligence API Proxy
@app.api_route("/api/v1/intelligence/{path:path}", methods=["GET", "POST"])
async def intelligence_proxy(request: Request, path: str):
    """Proxy requests to KiltiKonet Smart Engine Intelligence API"""
    async with httpx.AsyncClient(timeout=60.0) as client_http:
        url = f"{SMART_ENGINE_URL}/api/v1/intelligence/{path}"
        
        try:
            if request.method == "GET":
                response = await client_http.get(url, params=dict(request.query_params))
            else:
                body = await request.body()
                response = await client_http.post(
                    url, 
                    content=body,
                    headers={"Content-Type": request.headers.get("Content-Type", "application/json")}
                )
            
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.headers.get("content-type")
            )
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Smart Engine service unavailable")
        except Exception as e:
            logger.error(f"Intelligence proxy error: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal proxy error")

# Verify API Proxy (Public endpoint)
@app.get("/api/v1/verify/{attestation_id}")
async def verify_proxy(attestation_id: str):
    """Proxy requests to KiltiKonet Smart Engine Verification API"""
    async with httpx.AsyncClient(timeout=30.0) as client_http:
        url = f"{SMART_ENGINE_URL}/api/v1/verify/{attestation_id}"
        
        try:
            response = await client_http.get(url)
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.headers.get("content-type")
            )
        except httpx.ConnectError:
            raise HTTPException(status_code=503, detail="Smart Engine service unavailable")
        except Exception as e:
            logger.error(f"Verify proxy error: {str(e)}")
            raise HTTPException(status_code=500, detail="Internal proxy error")


# ================== SECURITY HEADERS MIDDLEWARE ==================
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses for browser trust and SEO"""
    
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        
        # Check if this is for visual editor proxy - allow iframe embedding
        is_visual_editor_request = request.url.path.startswith("/api/cms/visual-editor/proxy")
        
        # Security Headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Allow iframe embedding for visual editor proxy, restrict for others
        if is_visual_editor_request:
            # Remove X-Frame-Options to allow embedding
            if "X-Frame-Options" in response.headers:
                del response.headers["X-Frame-Options"]
        else:
            response.headers["X-Frame-Options"] = "SAMEORIGIN"
        
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # Cross-Origin-Resource-Policy (empêche l'inclusion de ressources par d'autres origines)
        # Utilise same-site pour autoriser sous-domaines *.kiltikonet.fr
        if "Cross-Origin-Resource-Policy" not in response.headers:
            response.headers["Cross-Origin-Resource-Policy"] = "same-site"
        
        # Hide server info
        if "server" in response.headers:
            del response.headers["server"]
        if "x-powered-by" in response.headers:
            del response.headers["x-powered-by"]
        
        # Content Security Policy (optimized for all integrations)
        if is_visual_editor_request:
            # Skip CSP for visual editor proxy content to allow embedding
            pass
        else:
            csp = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://assets.emergent.sh https://cdn.tailwindcss.com https://us.i.posthog.com https://*.posthog.com https://js.stripe.com; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com data:; "
                "img-src 'self' data: blob: https: http:; "
                "connect-src 'self' https: wss: https://api.openai.com https://api.anthropic.com https://api.stripe.com https://api.cloudinary.com; "
                "frame-src 'self' https://js.stripe.com https://hooks.stripe.com; "
                "frame-ancestors 'self'; "
                "base-uri 'self'; "
                "form-action 'self' https://checkout.stripe.com;"
            )
            response.headers["Content-Security-Policy"] = csp
        
        # HSTS with extended max-age (2 years)
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        
        return response

app.add_middleware(SecurityHeadersMiddleware)

# ================== DATABASE INDEXES ==================

@app.on_event("startup")
async def create_indexes():
    """Create MongoDB indexes for performance optimization"""
    import time as time_mod
    app._start_time = time_mod.time()
    try:
        # Registrations collection indexes
        await db.registrations.create_index("status")
        await db.registrations.create_index("show_in_catalog")
        await db.registrations.create_index([("status", 1), ("show_in_catalog", 1)])
        await db.registrations.create_index("profile_type")
        await db.registrations.create_index("country")
        await db.registrations.create_index("tier")
        await db.registrations.create_index("email", unique=False)
        await db.registrations.create_index("frek_id", unique=True, sparse=True)
        await db.registrations.create_index("expertise_tags")
        
        # Partners collection indexes
        await db.partners.create_index("tier")
        await db.partners.create_index("show_on_landing")
        
        # Batch jobs collection indexes
        await db.batch_jobs.create_index("status")
        await db.batch_jobs.create_index("started_at")
        
        # Email logs collection indexes
        await db.email_logs.create_index("email_type")
        await db.email_logs.create_index("status")
        await db.email_logs.create_index("sent_at")
        await db.email_logs.create_index("participant_id")
        
        # Payment transactions collection indexes
        await db.payment_transactions.create_index("session_id", unique=True)
        await db.payment_transactions.create_index("payment_status")
        
        # Magic links & invitations indexes
        await db.magic_links.create_index("token", unique=True)
        await db.magic_links.create_index("email")
        await db.magic_links.create_index("expires_at")
        await db.invitations.create_index("token", unique=True, sparse=True)
        await db.invitations.create_index("email")
        
        logger.info("MongoDB indexes created successfully")

        # Omega indexes (audit_logs, brain_training, adhesions, feed, frek_id unique)
        await create_omega_indexes()

        # Production-grade indexes for scale (100k+ users)
        try:
            # Analytics — high-volume, needs compound indexes
            await db.analytics_events.create_index("session_id")
            await db.analytics_events.create_index("type")
            await db.analytics_events.create_index("timestamp")
            await db.analytics_events.create_index([("type", 1), ("timestamp", -1)])
            await db.analytics_events.create_index([("session_id", 1), ("type", 1)])
            # Site events
            await db.site_events.create_index("event_type")
            await db.site_events.create_index("timestamp")
            await db.site_events.create_index([("event_type", 1), ("timestamp", -1)])
            # Support tickets
            await db.support_tickets.create_index("status")
            await db.support_tickets.create_index("email")
            await db.support_tickets.create_index([("status", 1), ("created_at", -1)])
            # FAQ
            await db.faqs.create_index([("published", 1), ("order", 1)])
            await db.faqs.create_index("category")
            # Pro posts — compound for feed performance
            await db.pro_posts.create_index([("is_ghost", 1), ("is_reel", 1), ("created_at", -1)])
            await db.pro_posts.create_index([("is_reel", 1), ("created_at", -1)])
            await db.pro_posts.create_index("builder_project_id")
            await db.pro_posts.create_index([("location_lat", 1), ("location_lng", 1)])
            # Messages
            await db.pro_messages.create_index([("conversation_id", 1), ("created_at", -1)])
            await db.pro_messages.create_index("sender_id")
            # Wallets
            await db.kn_wallets.create_index("owner_email", unique=True, sparse=True)
            await db.kn_wallets.create_index("frek_id", sparse=True)
            # Builder projects
            await db.builder_projects.create_index([("author_email", 1), ("updated_at", -1)])
            await db.builder_projects.create_index("project_id", unique=True)
            # Checkout sessions
            await db.kn_checkout_sessions.create_index("session_id", unique=True, sparse=True)
            await db.kn_checkout_sessions.create_index("email")
            # Pro access logs — TTL index for auto-cleanup (90 days)
            await db.pro_access_logs.create_index("timestamp", expireAfterSeconds=7776000)
            # Workspace logs — TTL (30 days)
            await db.workspace_logs.create_index("timestamp", expireAfterSeconds=2592000)
            logger.info("Production indexes created successfully")
        except Exception as idx_err:
            logger.warning(f"Some production indexes already exist: {idx_err}")

        # Doctrine layer — seed permissions + backfill actor_roles
        await _doctrine_seed()
        backfilled = await _doctrine_backfill()
        if backfilled:
            logger.info("Doctrine backfill: %d users assigned actor_role", backfilled)

        # Object Storage initialization
        try:
            from services.object_storage import init_storage
            init_storage()
        except Exception as storage_err:
            logger.warning(f"Object Storage init deferred: {storage_err}")

        # Seed default FAQ
        try:
            await seed_default_faq()
        except Exception as faq_err:
            logger.warning(f"FAQ seed deferred: {faq_err}")

        # Gouvernance indexes
        try:
            await create_gouvernance_indexes()
            logger.info("Gouvernance indexes created")
        except Exception as gov_err:
            logger.warning(f"Gouvernance indexes deferred: {gov_err}")

        # FREK silent implantation — indexes + retry worker
        try:
            await create_frek_silent_indexes()
            logger.info("FREK silent indexes created")
        except Exception as fs_err:
            logger.warning(f"FREK silent indexes deferred: {fs_err}")

        try:
            asyncio.create_task(frekcore_retry_worker())
            logger.info("FrekCore retry worker scheduled")
        except Exception as worker_err:
            logger.warning(f"FrekCore retry worker not started: {worker_err}")

    except Exception as e:
        logger.error(f"⚠️ Error creating indexes: {str(e)}")

@app.on_event("shutdown")
async def shutdown_db_client():
    # Clean up SSE connections
    for queue in sse_connections:
        await queue.put(None)
    sse_connections.clear()
    client.close()

# ================== REAL-TIME SYNC ENDPOINT (SSE) ==================

@app.get("/api/realtime/events")
async def realtime_events(request: Request):
    """
    Server-Sent Events endpoint for real-time synchronization.
    Clients connect here to receive live updates when data changes.
    """
    async def event_generator():
        queue = asyncio.Queue()
        sse_connections.append(queue)
        logger.info(f"🔗 New SSE connection. Total: {len(sse_connections)}")
        
        try:
            # Send initial connection confirmation
            yield f"data: {json.dumps({'event_type': 'connected', 'timestamp': datetime.now(timezone.utc).isoformat()})}\n\n"
            
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                
                try:
                    # Wait for event with timeout (keepalive)
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    if event is None:
                        break
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    # Send keepalive ping
                    yield f"data: {json.dumps({'event_type': 'ping', 'timestamp': datetime.now(timezone.utc).isoformat()})}\n\n"
        finally:
            if queue in sse_connections:
                sse_connections.remove(queue)
            logger.info(f"🔌 SSE connection closed. Remaining: {len(sse_connections)}")
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.get("/api/realtime/status")
async def realtime_status():
    """Get the status of real-time connections (WebSocket + SSE)"""
    return {
        "websocket": ws_manager.get_status(),
        "sse_connections": len(sse_connections),
        "total_connections": len(ws_manager.active_connections) + len(sse_connections),
        "status": "active",
        "mode": "bidirectional"
    }


# ================== ADMIN NOTIFICATIONS ENDPOINTS ==================

@app.get("/api/admin/notifications")
async def get_admin_notifications(request: Request, limit: int = 50, unread_only: bool = False):
    """Get admin notification history"""
    require_admin(request)
    query = {"read": False} if unread_only else {}
    notifs = await db.admin_notifications.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    unread_count = await db.admin_notifications.count_documents({"read": {"$ne": True}})
    return {"notifications": notifs, "unread_count": unread_count}

@app.post("/api/admin/notifications/read-all")
async def mark_all_admin_notifications_read(request: Request):
    """Mark all notifications as read"""
    require_admin(request)
    result = await db.admin_notifications.update_many({}, {"$set": {"read": True}})
    return {"marked": result.modified_count}

@app.post("/api/admin/notifications/test")
async def send_test_notification(request: Request):
    """Send a test notification for debugging"""
    require_admin(request)
    if IS_PRODUCTION:
        raise HTTPException(status_code=403, detail="Route désactivée en production")
    notif = {
        "category": "system",
        "title": "Notification test",
        "message": "Test du systeme de notifications push en temps reel",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "read": False,
    }
    await db.admin_notifications.insert_one({**notif})
    await broadcast_event("admin_notification", notif, channels=["admin_notifications"])
    return {"status": "sent", "notification": notif}


# ================== BIDIRECTIONAL WEBSOCKET ENDPOINT ==================

@app.websocket("/api/ws/sync")
async def websocket_sync(websocket: WebSocket):
    """
    Bidirectional WebSocket endpoint for real-time synchronization.
    
    Supported message types from client:
    - subscribe: {"action": "subscribe", "channels": ["cms", "globe", "registrations"]}
    - unsubscribe: {"action": "unsubscribe", "channels": ["cms"]}
    - update: {"action": "update", "type": "territories", "data": {...}}
    - ping: {"action": "ping"}
    
    Server broadcasts:
    - Event notifications to all subscribed clients
    - Confirmation of actions
    """
    client_id = await ws_manager.connect(websocket)
    
    try:
        # Send welcome message with client ID
        await websocket.send_json({
            "event_type": "connected",
            "client_id": client_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": "Bidirectional sync active"
        })
        
        # Auto-subscribe to all channels
        for channel in ["cms", "globe", "registrations", "theme", "intention", "admin_notifications"]:
            ws_manager.subscribe(client_id, channel)
        
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            action = data.get("action", "")
            
            if action == "ping":
                await websocket.send_json({
                    "event_type": "pong",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
            
            elif action == "subscribe":
                channels = data.get("channels", [])
                for channel in channels:
                    ws_manager.subscribe(client_id, channel)
                await websocket.send_json({
                    "event_type": "subscribed",
                    "channels": channels,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
            
            elif action == "unsubscribe":
                channels = data.get("channels", [])
                for channel in channels:
                    ws_manager.unsubscribe(client_id, channel)
                await websocket.send_json({
                    "event_type": "unsubscribed",
                    "channels": channels
                })
            
            elif action == "update":
                # Client is sending an update - broadcast to others
                update_type = data.get("type", "")
                update_data = data.get("data", {})
                
                # Broadcast the update to all other clients
                await broadcast_event(
                    event_type=f"{update_type}_updated",
                    data=update_data,
                    source_client=client_id,
                    channels=[update_type] if update_type else None
                )
                
                # Confirm to sender
                await websocket.send_json({
                    "event_type": "update_confirmed",
                    "type": update_type,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
            
            elif action == "request_sync":
                # Client requests full sync state
                sync_type = data.get("type", "all")
                await websocket.send_json({
                    "event_type": "sync_state",
                    "type": sync_type,
                    "connections": ws_manager.get_status(),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })
    
    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {e}")
        ws_manager.disconnect(client_id)

@app.post("/api/realtime/broadcast")
async def manual_broadcast(event_type: str = Form(...), data: str = Form("{}")):
    """Manual broadcast endpoint for testing or external triggers"""
    try:
        parsed_data = json.loads(data)
    except (json.JSONDecodeError, TypeError):
        parsed_data = {"raw": data}
    
    await broadcast_event(event_type, parsed_data)
    return {"success": True, "event_type": event_type, "recipients": len(ws_manager.active_connections) + len(sse_connections)}

# ================== SMART ENGINE INDEXATION ==================

@app.post("/api/smart-engine/index-contacts")
async def index_contacts_to_smart_engine(request: Request):
    """
    Index all 44 contacts from registrations to Smart Engine profiles.
    This creates searchable vector embeddings for AI-powered recommendations.
    """
    require_admin(request)
    try:
        # Get all registrations
        registrations = await db.registrations.find({}, {"_id": 0}).to_list(500)
        
        indexed = 0
        for reg in registrations:
            # Create smart profile from registration
            profile = {
                "id": reg.get("id"),
                "tenant_id": "culture-connect-2026",
                "name": reg.get("full_name", ""),
                "organization": reg.get("organization_name", ""),
                "profile_type": reg.get("profile_type", "institution"),
                "country": reg.get("country", ""),
                "bio": reg.get("bio", ""),
                "tier": reg.get("tier", "professional"),
                "expertise_tags": reg.get("expertise_tags", []),
                "status": reg.get("status", "pending"),
                "indexed_at": datetime.now(timezone.utc).isoformat(),
                # Placeholder for future vector embedding
                "embedding_status": "pending"
            }
            
            # Upsert to smart_profiles collection
            await db.smart_profiles.update_one(
                {"id": reg.get("id")},
                {"$set": profile},
                upsert=True
            )
            indexed += 1
        
        # Create index for fast search
        await db.smart_profiles.create_index("profile_type")
        await db.smart_profiles.create_index("country")
        await db.smart_profiles.create_index("tier")
        await db.smart_profiles.create_index([("name", "text"), ("bio", "text"), ("organization", "text")])
        
        return {
            "success": True,
            "indexed_count": indexed,
            "message": f"Successfully indexed {indexed} contacts to Smart Engine"
        }
    except Exception as e:
        logger.error(f"Smart Engine indexation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/smart-engine/profiles")
async def get_smart_engine_profiles(
    request: Request,
    profile_type: Optional[str] = None,
    country: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50
):
    """Get indexed Smart Engine profiles with optional filters"""
    require_workspace(request)
    try:
        query = {}
        if profile_type:
            query["profile_type"] = profile_type
        if country:
            query["country"] = country
        if search:
            query["$text"] = {"$search": search}
        
        profiles = await db.smart_profiles.find(query, {"_id": 0}).limit(limit).to_list(limit)
        
        return {
            "profiles": profiles,
            "total": len(profiles),
            "filters": {"profile_type": profile_type, "country": country, "search": search}
        }
    except Exception as e:
        logger.error(f"Error fetching smart profiles: {str(e)}")
        return {"profiles": [], "total": 0, "error": str(e)}

@app.delete("/api/smart-engine/purge")
async def purge_smart_engine(request: Request):
    """Purge all mock data from Smart Engine (admin only)"""
    require_admin(request)
    try:
        result = await db.smart_profiles.delete_many({})
        return {
            "success": True,
            "deleted_count": result.deleted_count,
            "message": "Smart Engine profiles purged"
        }
    except Exception as e:
        logger.error(f"Purge error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))



# ================== DYNAMIC SITEMAP & SEO ==================

@app.get("/sitemap.xml")
async def dynamic_sitemap():
    """Generate dynamic sitemap including all catalog participants"""
    from datetime import datetime
    
    base_url = "https://kiltikonet.fr"
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Static pages
    static_pages = [
        {"loc": "/", "priority": "1.0", "changefreq": "weekly"},
        {"loc": "/inscription", "priority": "0.9", "changefreq": "weekly"},
        {"loc": "/catalogue", "priority": "0.8", "changefreq": "daily"},
        {"loc": "/partenaires", "priority": "0.7", "changefreq": "monthly"},
        {"loc": "/programme", "priority": "0.8", "changefreq": "monthly"},
        {"loc": "/tarifs", "priority": "0.7", "changefreq": "monthly"},
        {"loc": "/legal/mentions-legales.html", "priority": "0.3", "changefreq": "yearly"},
        {"loc": "/legal/politique-confidentialite.html", "priority": "0.3", "changefreq": "yearly"},
        {"loc": "/legal/cgu.html", "priority": "0.3", "changefreq": "yearly"},
        {"loc": "/legal/cookies.html", "priority": "0.3", "changefreq": "yearly"},
    ]
    
    # Get catalog participants for dynamic URLs — WITHOUT exposing UUIDs
    # (Point audit sécurité: retirer /participant/{uuid} du sitemap public)
    participants = await db.registrations.find(
        {"show_in_catalog": True, "status": "approved", "public_slug": {"$exists": True, "$ne": ""}},
        {"_id": 0, "public_slug": 1}
    ).to_list(500)

    # Build XML
    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

    # Add static pages
    for page in static_pages:
        xml_content += f'''    <url>
        <loc>{base_url}{page["loc"]}</loc>
        <lastmod>{today}</lastmod>
        <changefreq>{page["changefreq"]}</changefreq>
        <priority>{page["priority"]}</priority>
    </url>\n'''

    # Only add participants with a public slug (opt-in). NEVER expose UUIDs in sitemap.
    for participant in participants:
        slug = participant.get("public_slug", "").strip()
        if not slug:
            continue
        xml_content += f'''    <url>
        <loc>{base_url}/catalogue/{slug}</loc>
        <lastmod>{today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
    </url>\n'''
    
    xml_content += '</urlset>'
    
    return Response(content=xml_content, media_type="application/xml")

# ================== SECTION 2: ARCHITECTURE ROUTES & SYNCHRONISATION ==================
# 4 sources d'entrée: achat billet, inscription site, admin manuel, scan QR
# Synchronisation Baserow ↔ MongoDB ↔ Catalogue public

BASEROW_TOKEN = os.environ.get("BASEROW_TOKEN", "")
BASEROW_TABLE_ID = os.environ.get("BASEROW_TABLE_ID", "865847")
BASEROW_API_URL = "https://api.baserow.io/api"

# Badge types that appear in public catalog
PUBLIC_CATALOG_BADGE_TYPES = ["Artiste", "Exposant", "Institutionnel", "Professionnel", "Staff Artiste"]
# Badge types that are private (not shown in catalog)
PRIVATE_BADGE_TYPES = ["VIP", "Presse", "Benevole", "Public", "Participant", "Visiteur", "Staff", "Regie technique"]

async def sync_to_baserow(participant_data: dict) -> Optional[int]:
    """Sync a participant to Baserow table 865847"""
    try:
        baserow_data = {
            "Prenom": participant_data.get("full_name", "").split(" ")[0] if participant_data.get("full_name") else "",
            "Nom": " ".join(participant_data.get("full_name", "").split(" ")[1:]) if participant_data.get("full_name") else "",
            "Organisation": participant_data.get("organization_name", ""),
            "Email": participant_data.get("email", ""),
            "Telephone": participant_data.get("phone", ""),
            "Type de badge": participant_data.get("badge_type", "Participant"),
            "Territoire d'origine": participant_data.get("country", "Martinique"),
            "Secteur d'activite": participant_data.get("sector", "Autre"),
            "Statut presence": "Absent",
            "kiltikonet inscrit": "Oui" if participant_data.get("kiltikonet_inscrit") else "Non",
            "Consentement RGPD": "Oui",
            "MongoDB_ID": participant_data.get("id", "")
        }
        
        async with asyncio.timeout(10):
            response = await asyncio.to_thread(
                requests.post,
                f"{BASEROW_API_URL}/database/rows/table/{BASEROW_TABLE_ID}/?user_field_names=true",
                headers={"Authorization": f"Token {BASEROW_TOKEN}", "Content-Type": "application/json"},
                json=baserow_data
            )
        
        if response.status_code in [200, 201]:
            result = response.json()
            logger.info(f"✅ Synced to Baserow: {participant_data.get('full_name')} -> Row {result.get('id')}")
            return result.get("id")
        else:
            logger.error(f"❌ Baserow sync failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        logger.error(f"❌ Baserow sync error: {str(e)}")
        return None

async def update_baserow_presence(baserow_id: int, status: str = "Present") -> bool:
    """Update presence status in Baserow"""
    try:
        heure = datetime.now(timezone.utc).strftime("%H:%M")
        data = {
            "Statut presence": status,
            "Heure d'arrivee": heure if status == "Present" else ""
        }
        
        async with asyncio.timeout(10):
            response = await asyncio.to_thread(
                requests.patch,
                f"{BASEROW_API_URL}/database/rows/table/{BASEROW_TABLE_ID}/{baserow_id}/?user_field_names=true",
                headers={"Authorization": f"Token {BASEROW_TOKEN}", "Content-Type": "application/json"},
                json=data
            )
        
        if response.status_code == 200:
            logger.info(f"✅ Baserow presence updated: Row {baserow_id} -> {status}")
            return True
        else:
            logger.error(f"❌ Baserow presence update failed: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Baserow presence error: {str(e)}")
        return False

# ─────────────────────────────────────────────
# ROUTE 1: POST /api/tickets/purchase - Achat billet public
# ─────────────────────────────────────────────
class TicketPurchaseRequest(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = ""
    ticket_type: str = "standard"  # standard, vip, early_bird
    quantity: int = 1
    origin_url: str

@app.post("/api/tickets/purchase")
async def purchase_ticket(request: Request, data: TicketPurchaseRequest):
    """
    Route 1: Achat billet public
    - Crée entrée dans MongoDB tickets
    - Crée entrée dans Baserow avec type PARTICIPANT
    - Envoie email de confirmation avec QR code
    """
    ticket_id = str(uuid.uuid4())
    
    # Create ticket in MongoDB
    ticket = {
        "id": ticket_id,
        "full_name": data.full_name,
        "email": data.email,
        "phone": data.phone,
        "ticket_type": data.ticket_type,
        "quantity": data.quantity,
        "status": "pending",
        "badge_type": "Participant",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tickets.insert_one(ticket)
    
    # Sync to Baserow
    baserow_id = await sync_to_baserow({
        "id": ticket_id,
        "full_name": data.full_name,
        "email": data.email,
        "phone": data.phone,
        "badge_type": "Participant",
        "country": "Martinique",
        "kiltikonet_inscrit": False
    })
    
    if baserow_id:
        await db.tickets.update_one({"id": ticket_id}, {"$set": {"baserow_id": baserow_id}})
    
    # Create Stripe checkout for ticket
    origin_url = data.origin_url.rstrip('/') if data.origin_url else BASE_URL
    ticket_prices = {"standard": 25.00, "vip": 75.00, "early_bird": 15.00}
    price = ticket_prices.get(data.ticket_type, 25.00) * data.quantity
    
    try:
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        
        checkout_request = CheckoutSessionRequest(
            amount=price,
            currency="eur",
            success_url=f"{origin_url}/ticket/confirmation?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{origin_url}/tickets",
            metadata={
                "type": "ticket",
                "ticket_id": ticket_id,
                "full_name": data.full_name,
                "email": data.email,
                "ticket_type": data.ticket_type,
                "quantity": str(data.quantity)
            }
        )
        
        session = await stripe_checkout.create_checkout_session(checkout_request)
        
        await db.tickets.update_one(
            {"id": ticket_id},
            {"$set": {"stripe_session_id": session.session_id}}
        )
        
        logger.info(f"🎫 Ticket purchase initiated: {data.full_name} - {data.ticket_type}")
        return {"url": session.url, "session_id": session.session_id, "ticket_id": ticket_id}
        
    except Exception as e:
        logger.error(f"Ticket checkout error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Payment error: {str(e)}")

# ─────────────────────────────────────────────
# ROUTE 2: POST /api/register - Inscription kiltikonet.fr
# ─────────────────────────────────────────────
class SiteRegistrationRequest(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = ""
    organization_name: Optional[str] = ""
    profile_type: str = "other"  # artist, label, booking_agency, institution, press, other
    country: str = "Martinique"
    bio: Optional[str] = ""
    is_professional: bool = False
    cc2026_interest: bool = False  # Si True, ajoute à Baserow

# ================== CONTACT FORM (with hCaptcha) ==================
class ContactFormRequest(BaseModel):
    name: str
    email: str
    message: str
    captcha_token: Optional[str] = None

@app.post("/api/contact")
async def submit_contact_form(data: ContactFormRequest, request: Request):
    """Public contact form submission with hCaptcha protection"""
    if data.captcha_token:
        from services.hcaptcha import verify_hcaptcha
        client_ip = request.client.host if request.client else "unknown"
        captcha_result = await verify_hcaptcha(data.captcha_token, client_ip)
        if not captcha_result["success"]:
            raise HTTPException(status_code=403, detail=captcha_result["error"])

    contact = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "email": data.email,
        "message": data.message,
        "status": "new",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.contact_messages.insert_one(contact)
    del contact["_id"]
    return {"success": True, "message": "Message recu"}

@app.post("/api/register")
async def register_on_site(data: SiteRegistrationRequest):
    """
    Route 2: Inscription sur kiltikonet.fr
    - Crée utilisateur dans MongoDB users
    - Si cc2026_interest=True, crée aussi dans Baserow
    - Badge type: PUBLIC si non-pro, PRO selon profile_type si pro
    """
    user_id = str(uuid.uuid4())
    
    # Determine badge type based on profile
    if data.is_professional:
        badge_type_map = {
            "artist": "Artiste",
            "label": "Professionnel",
            "booking_agency": "Professionnel",
            "institution": "Institutionnel",
            "press": "Presse",
            "other": "Professionnel"
        }
        badge_type = badge_type_map.get(data.profile_type, "Professionnel")
    else:
        badge_type = "Public"
    
    # Create user in MongoDB
    from routes.doctrine import resolve_actor_role as _resolve_actor
    user = {
        "id": user_id,
        "full_name": data.full_name,
        "email": data.email,
        "phone": data.phone,
        "organization_name": data.organization_name,
        "profile_type": data.profile_type,
        "actor_role": _resolve_actor(data.profile_type),
        "country": data.country,
        "bio": data.bio,
        "is_professional": data.is_professional,
        "badge_type": badge_type,
        "cc2026_interest": data.cc2026_interest,
        "kiltikonet_inscrit": True,
        # Show in catalog only if professional type
        "show_in_catalog": data.is_professional and badge_type in PUBLIC_CATALOG_BADGE_TYPES,
        "status": "approved" if not data.is_professional else "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    # If interested in CC2026, sync to Baserow
    baserow_id = None
    if data.cc2026_interest:
        baserow_id = await sync_to_baserow({
            "id": user_id,
            "full_name": data.full_name,
            "email": data.email,
            "phone": data.phone,
            "organization_name": data.organization_name,
            "badge_type": badge_type,
            "country": data.country,
            "sector": data.profile_type,
            "kiltikonet_inscrit": True
        })
        
        if baserow_id:
            await db.users.update_one({"id": user_id}, {"$set": {"baserow_id": baserow_id}})
    
    # Broadcast registration event
    await broadcast_event("user_registered", {
        "id": user_id,
        "name": data.full_name,
        "badge_type": badge_type,
        "cc2026": data.cc2026_interest
    })
    
    logger.info(f"📝 Site registration: {data.full_name} - Badge: {badge_type} - CC2026: {data.cc2026_interest}")
    
    return {
        "success": True,
        "user_id": user_id,
        "badge_type": badge_type,
        "show_in_catalog": user["show_in_catalog"],
        "baserow_synced": baserow_id is not None
    }

# ─────────────────────────────────────────────
# ROUTE 3: POST /api/admin/accreditation - Admin ajoute manuellement
# ─────────────────────────────────────────────
class AdminAccreditationRequest(BaseModel):
    prenom: str
    nom: str
    organisation: Optional[str] = ""
    email: Optional[str] = ""
    telephone: Optional[str] = ""
    badge_type: str = "Artiste"
    territoire: str = "Martinique"
    secteur: str = "Autre"
    zones_acces: Optional[str] = ""

@app.post("/api/admin/accreditation")
async def admin_add_accreditation(request: Request, data: AdminAccreditationRequest):
    """
    Route 3: Admin ajoute participant manuellement
    - Crée UNIQUEMENT dans Baserow (pas dans MongoDB)
    - Génère l'ID Baserow directement
    """
    require_admin(request)
    try:
        baserow_data = {
            "Prenom": data.prenom,
            "Nom": data.nom,
            "Organisation": data.organisation,
            "Email": data.email,
            "Telephone": data.telephone,
            "Type de badge": data.badge_type,
            "Territoire d'origine": data.territoire,
            "Secteur d'activite": data.secteur,
            "Zones acces": data.zones_acces,
            "Statut presence": "Absent",
            "kiltikonet inscrit": "Non",
            "Consentement RGPD": "Oui"
        }
        
        response = requests.post(
            f"{BASEROW_API_URL}/database/rows/table/{BASEROW_TABLE_ID}/?user_field_names=true",
            headers={"Authorization": f"Token {BASEROW_TOKEN}", "Content-Type": "application/json"},
            json=baserow_data,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            result = response.json()
            logger.info(f"✅ Admin accreditation added: {data.prenom} {data.nom} -> Baserow Row {result.get('id')}")
            
            # Broadcast event
            await broadcast_event("accreditation_added", {
                "baserow_id": result.get("id"),
                "name": f"{data.prenom} {data.nom}",
                "badge_type": data.badge_type
            })
            
            return {
                "success": True,
                "baserow_id": result.get("id"),
                "name": f"{data.prenom} {data.nom}",
                "badge_type": data.badge_type
            }
        else:
            logger.error(f"❌ Baserow add failed: {response.status_code} - {response.text}")
            raise HTTPException(status_code=500, detail=f"Baserow error: {response.text}")
            
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Baserow timeout")
    except Exception as e:
        logger.error(f"Admin accreditation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────
# ROUTE 4: GET/PATCH /api/badge/:id - Scan QR validation présence
# ─────────────────────────────────────────────
@app.get("/api/badge/{badge_id}")
async def get_badge_info(badge_id: str):
    """
    Route 4a: GET badge info for QR scan
    - Cherche d'abord dans Baserow par ID
    - Puis dans MongoDB si pas trouvé
    """
    # Try Baserow first
    try:
        response = requests.get(
            f"{BASEROW_API_URL}/database/rows/table/{BASEROW_TABLE_ID}/{badge_id}/?user_field_names=true",
            headers={"Authorization": f"Token {BASEROW_TOKEN}"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # Extract value from Single Select fields
            def get_val(field):
                if isinstance(field, dict) and "value" in field:
                    return field["value"]
                return field or ""
            
            return {
                "source": "baserow",
                "id": badge_id,
                "prenom": data.get("Prenom", ""),
                "nom": data.get("Nom", ""),
                "full_name": f"{data.get('Prenom', '')} {data.get('Nom', '')}".strip(),
                "organisation": data.get("Organisation", ""),
                "badge_type": get_val(data.get("Type de badge")),
                "territoire": get_val(data.get("Territoire d'origine")),
                "statut_presence": get_val(data.get("Statut presence")),
                "heure_arrivee": data.get("Heure d'arrivee", ""),
                "is_present": get_val(data.get("Statut presence")) == "Present"
            }
    except Exception as e:
        logger.warning(f"Baserow lookup failed for {badge_id}: {str(e)}")
    
    # Fallback to MongoDB
    participant = await db.registrations.find_one({"id": badge_id}, {"_id": 0})
    if participant:
        return {
            "source": "mongodb",
            "id": badge_id,
            "full_name": participant.get("full_name", ""),
            "organisation": participant.get("organization_name", ""),
            "badge_type": participant.get("tier", "professional"),
            "statut_presence": "Present" if participant.get("checked_in") else "Absent",
            "is_present": participant.get("checked_in", False),
            "status": participant.get("status")
        }
    
    raise HTTPException(status_code=404, detail="Badge not found")

@app.patch("/api/badge/{badge_id}/validate")
async def validate_badge_presence(badge_id: str):
    """
    Route 4b: PATCH to validate presence (scan QR at event)
    - Met à jour Statut presence = Present dans Baserow
    - Met à jour Heure d'arrivée
    - Retourne en < 3s
    """
    heure = datetime.now(timezone.utc).strftime("%H:%M")
    
    # Try Baserow first
    try:
        response = requests.patch(
            f"{BASEROW_API_URL}/database/rows/table/{BASEROW_TABLE_ID}/{badge_id}/?user_field_names=true",
            headers={"Authorization": f"Token {BASEROW_TOKEN}", "Content-Type": "application/json"},
            json={
                "Statut presence": "Present",
                "Heure d'arrivee": heure
            },
            timeout=3  # Must complete in < 3s per spec
        )
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"✅ Badge validated: {badge_id} at {heure}")
            
            # Broadcast presence update
            await broadcast_event("presence_validated", {
                "badge_id": badge_id,
                "heure": heure,
                "name": f"{data.get('Prenom', '')} {data.get('Nom', '')}".strip()
            })
            
            return {
                "success": True,
                "badge_id": badge_id,
                "status": "Present",
                "heure_arrivee": heure,
                "message": f"Présence validée à {heure}"
            }
    except requests.exceptions.Timeout:
        logger.warning(f"Baserow timeout for badge {badge_id}, trying MongoDB fallback")
    except Exception as e:
        logger.warning(f"Baserow error for badge {badge_id}: {str(e)}")
    
    # Fallback: try MongoDB
    result = await db.registrations.update_one(
        {"id": badge_id},
        {"$set": {"checked_in": True, "checked_in_at": heure}}
    )
    
    if result.modified_count > 0:
        return {
            "success": True,
            "badge_id": badge_id,
            "status": "Present",
            "heure_arrivee": heure,
            "source": "mongodb"
        }
    
    raise HTTPException(status_code=404, detail="Badge not found")

# ─────────────────────────────────────────────
# Catalogue public synchronisé
# ─────────────────────────────────────────────
@app.get("/api/catalog/sync")
async def get_synced_catalog():
    """
    Catalogue public synchronisé - RÈGLES D'AFFICHAGE:
    - ARTISTE → fiche complète
    - EXPOSANT → fiche exposant
    - INSTITUTIONNEL → fiche partenaire
    - VIP, PRESSE, BÉNÉVOLE → NON affiché
    - PUBLIC, PARTICIPANT, VISITEUR → NON affiché
    """
    # Get from MongoDB users (kiltikonet inscrit + approved + show_in_catalog)
    mongo_participants = await db.users.find(
        {
            "kiltikonet_inscrit": True,
            "show_in_catalog": True,
            "badge_type": {"$in": PUBLIC_CATALOG_BADGE_TYPES}
        },
        {"_id": 0, "email": 0, "phone": 0}
    ).to_list(500)
    
    # Also get from registrations (MongoDB legacy)
    legacy_participants = await db.registrations.find(
        {
            "show_in_catalog": True,
            "status": "approved"
        },
        {"_id": 0, "email": 0, "phone": 0, "payment_session_id": 0}
    ).to_list(500)
    
    # Merge and dedupe by email/name
    all_participants = []
    seen = set()
    
    for p in mongo_participants + legacy_participants:
        key = p.get("full_name", "") + p.get("organization_name", "")
        if key and key not in seen:
            seen.add(key)
            all_participants.append({
                "id": p.get("id"),
                "full_name": p.get("full_name"),
                "organization_name": p.get("organization_name"),
                "profile_type": p.get("profile_type"),
                "badge_type": p.get("badge_type", p.get("tier")),
                "country": p.get("country"),
                "bio": p.get("bio"),
                "logo_url": p.get("logo_url"),
                "expertise_tags": p.get("expertise_tags", []),
                "website_url": p.get("website_url")
            })
    
    return {
        "participants": all_participants,
        "total": len(all_participants),
        "visible_types": PUBLIC_CATALOG_BADGE_TYPES
    }

# ─────────────────────────────────────────────
# SECTION 4.1: CONTACTS ALIRIO
# ─────────────────────────────────────────────
class ContactAlirio(BaseModel):
    prenom: str
    nom: str
    email: Optional[str] = ""
    tel: Optional[str] = ""
    organisation: Optional[str] = ""
    type: str = "Personnel"  # Partenaire | Presse | Institutionnel | Personnel
    statut: str = "Contact"  # Contact | Partenaire | En négociation
    niveau_partenariat: Optional[str] = None  # Bronze | Silver | Or
    notes: Optional[str] = ""

@app.post("/api/contacts/alirio")
async def create_alirio_contact(contact: ContactAlirio):
    """Create a contact in Alirio's personal directory"""
    contact_data = {
        "id": str(uuid.uuid4()),
        "owner": "alirio",
        **contact.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.contacts_alirio.insert_one(contact_data)
    logger.info(f"📇 Alirio contact created: {contact.prenom} {contact.nom}")
    
    return {"success": True, "contact_id": contact_data["id"]}

@app.get("/api/contacts/alirio")
async def get_alirio_contacts():
    """Get all Alirio's contacts - visible by Alirio and Laurent"""
    contacts = await db.contacts_alirio.find(
        {"owner": "alirio"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    return {"contacts": contacts, "total": len(contacts)}

@app.patch("/api/contacts/alirio/{contact_id}/promote")
async def promote_contact_to_partner(contact_id: str, level: str = "Bronze"):
    """Promote a contact to partner status"""
    result = await db.contacts_alirio.update_one(
        {"id": contact_id},
        {"$set": {"statut": "Partenaire", "niveau_partenariat": level}}
    )
    
    if result.modified_count > 0:
        logger.info(f"📇 Contact promoted to partner: {contact_id} -> {level}")
        # Notify Laurent
        await broadcast_event("partner_promoted", {
            "contact_id": contact_id,
            "level": level,
            "from": "Alirio"
        })
        return {"success": True}
    
    raise HTTPException(status_code=404, detail="Contact not found")

# ═══════════════════════════════════════════════════════════════
# DASHBOARD COLLABORATIF CC2026 / CHIMIN SAVANN
# ═══════════════════════════════════════════════════════════════

# Workspace to pole mapping
WORKSPACE_POLES = {
    'CC2026admin': ['fondateur', 'financement', 'juridique', 'gwen', 'fabrice', 'comm', 'business', 'admin', 'digital'],
    'Gwen2026': ['gwen'],
    'Fabrice2026': ['fabrice'],
    'Kaige2026': ['digital'],
    'Alirio2026': ['digital'],
    'Wudy2026': ['comm']
}

class TaskToggleRequest(BaseModel):
    workspace_id: str
    done: bool

@app.get("/api/cc2026/tasks/status")
async def get_all_task_status():
    """Get all task statuses for CC2026 dashboard"""
    statuses = await db.cc2026_tasks_status.find({}, {"_id": 0}).to_list(1000)
    return {"statuses": statuses}

@app.get("/api/cc2026/tasks/status/{workspace_id}")
async def get_workspace_task_status(workspace_id: str):
    """Get task statuses for a specific workspace"""
    statuses = await db.cc2026_tasks_status.find(
        {"workspace_id": workspace_id},
        {"_id": 0}
    ).to_list(500)
    return {"statuses": statuses}

@app.post("/api/cc2026/tasks/{task_id}/toggle")
async def toggle_task_status(task_id: str, request: TaskToggleRequest):
    """Toggle a task's done status - with workspace permission check"""
    workspace_id = request.workspace_id
    
    # Check if workspace has permission for this task's pole
    # (Frontend should enforce this too, but we double-check)
    allowed_poles = WORKSPACE_POLES.get(workspace_id, [])
    
    # Extract pole from task_id (e.g., s1-g1 -> gwen, s1-f1 -> fondateur)
    pole_prefix_map = {
        'f': 'fondateur', 'fi': 'financement', 'ju': 'juridique',
        'g': 'gwen', 'fa': 'fabrice', 'co': 'comm',
        'bu': 'business', 'ad': 'admin', 'di': 'digital'
    }
    
    # Parse task_id to get pole
    task_pole = None
    parts = task_id.split('-')
    if len(parts) >= 2:
        prefix = ''.join([c for c in parts[1] if c.isalpha()])
        task_pole = pole_prefix_map.get(prefix)
    
    # Admin can toggle everything
    is_admin = workspace_id == 'CC2026admin'
    
    if not is_admin and task_pole and task_pole not in allowed_poles:
        raise HTTPException(status_code=403, detail="Vous n'avez pas la permission de modifier cette tâche")
    
    # Update or create status
    await db.cc2026_tasks_status.update_one(
        {"task_id": task_id},
        {
            "$set": {
                "task_id": task_id,
                "workspace_id": workspace_id,
                "done": request.done,
                "done_at": datetime.now(timezone.utc).isoformat() if request.done else None
            }
        },
        upsert=True
    )
    
    # Broadcast to other workspaces for real-time sync
    await broadcast_event("task_toggled", {
        "task_id": task_id,
        "done": request.done,
        "workspace_id": workspace_id
    })
    
    logger.info(f"📋 CC2026 Task toggled: {task_id} -> {'done' if request.done else 'undone'} by {workspace_id}")
    
    return {"success": True, "task_id": task_id, "done": request.done}

@app.get("/robots.txt")
async def robots_txt():
    """Serve robots.txt"""
    content = """# Culture Connect 2026 - Robots.txt
User-agent: *
Allow: /

Crawl-delay: 1
Sitemap: https://kiltikonet.fr/sitemap.xml

# Protected areas
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /static/

# Allow important public content
Allow: /catalogue
Allow: /inscription
Allow: /partenaires
Allow: /programme
"""
    return Response(content=content, media_type="text/plain")



# ================== ESPACE PRO CC2026 - LinkedIn Culturel ==================

import string
import secrets

# ─── FREK-ID Generator — Collision-proof, High Entropy ───
FREK_ALPHABET = string.ascii_uppercase + string.digits  # 36 chars → 36^8 = 2.8 trillion combos

async def generate_unique_frek_id() -> str:
    """Generate a cryptographically unique FREK-ID with DB collision check."""
    for _ in range(20):
        seg1 = ''.join(secrets.choice(FREK_ALPHABET) for _ in range(4))
        seg2 = ''.join(secrets.choice(FREK_ALPHABET) for _ in range(4))
        frek_id = f"FREK-{seg1}-{seg2}"
        existing = await db.registrations.find_one({"frek_id": frek_id}, {"_id": 0, "frek_id": 1})
        if not existing:
            return frek_id
    raise HTTPException(status_code=500, detail="FREK-ID generation failed after 20 attempts")

# ─── OTP Generator ──────────────────────────────────────
def generate_access_code():
    return ''.join(secrets.choice(string.digits) for _ in range(6))

# ─── Disposable Email Blocklist ──────────────────────────
DISPOSABLE_DOMAINS = {
    "tempmail.com", "temp-mail.org", "guerrillamail.com", "guerrillamail.de",
    "throwaway.email", "mailinator.com", "yopmail.com", "yopmail.fr",
    "trashmail.com", "trashmail.net", "sharklasers.com", "guerrillamailblock.com",
    "grr.la", "dispostable.com", "maildrop.cc", "10minutemail.com",
    "getairmail.com", "mailnesia.com", "tempail.com", "tempr.email",
    "discard.email", "discardmail.com", "fakeinbox.com", "mailcatch.com",
    "trash-mail.com", "binkmail.com", "bobmail.info", "chammy.info",
    "spamgourmet.com", "mytemp.email", "mohmal.com", "emailondeck.com",
    "33mail.com", "getnada.com", "burnermail.io", "inboxbear.com",
    "jetable.org", "nada.email", "crazymailing.com", "harakirimail.com",
    "mailscrap.com", "tmail.ws", "tmpmail.net", "tmpmail.org",
}

def is_disposable_email(email: str) -> bool:
    domain = email.split("@")[-1].lower()
    if domain in DISPOSABLE_DOMAINS:
        return True
    parts = domain.split(".")
    if len(parts) >= 2:
        base = ".".join(parts[-2:])
        if base in DISPOSABLE_DOMAINS:
            return True
    return False

# ─── Rate Limiting — In-memory with IP tracking ─────────
_rate_limit_store = {}  # ip -> [timestamps]
_otp_cooldown_store = {}  # email -> last_sent_timestamp
# OTP verify brute-force protection: email -> {fails: int, blocked_until: float}
_otp_verify_fails: Dict[str, dict] = {}

RATE_LIMIT_MAX = 5        # max requests per window
RATE_LIMIT_WINDOW = 3600  # 1 hour in seconds
OTP_COOLDOWN_SECONDS = 60 # 60s between OTP sends for same email
OTP_MAX_FAILS = 5         # max failed attempts before block
OTP_BLOCK_SECONDS = 300   # 5 minutes block after too many fails

def _check_rate_limit(ip: str) -> bool:
    """Returns True if rate limited (should block)."""
    now = datetime.now(timezone.utc).timestamp()
    if ip not in _rate_limit_store:
        _rate_limit_store[ip] = []
    _rate_limit_store[ip] = [t for t in _rate_limit_store[ip] if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_limit_store[ip]) >= RATE_LIMIT_MAX:
        return True
    _rate_limit_store[ip].append(now)
    return False

def _check_otp_brute_force(key: str) -> bool:
    """Returns True if the key (email or frek_id) is blocked due to too many failed OTP attempts."""
    now = datetime.now(timezone.utc).timestamp()
    entry = _otp_verify_fails.get(key)
    if entry and entry.get("blocked_until", 0) > now:
        return True
    return False

def _record_otp_fail(key: str) -> None:
    """Record a failed OTP attempt. Blocks the key after OTP_MAX_FAILS failures."""
    now = datetime.now(timezone.utc).timestamp()
    entry = _otp_verify_fails.get(key, {"fails": 0, "blocked_until": 0})
    entry["fails"] = entry.get("fails", 0) + 1
    if entry["fails"] >= OTP_MAX_FAILS:
        entry["blocked_until"] = now + OTP_BLOCK_SECONDS
    _otp_verify_fails[key] = entry

def _reset_otp_fails(key: str) -> None:
    """Clear failed OTP attempts on successful verification."""
    _otp_verify_fails.pop(key, None)

def _check_otp_cooldown(email: str) -> int:
    """Returns seconds remaining in cooldown, or 0 if clear."""
    now = datetime.now(timezone.utc).timestamp()
    last_sent = _otp_cooldown_store.get(email, 0)
    remaining = int(OTP_COOLDOWN_SECONDS - (now - last_sent))
    return max(0, remaining)

# Store temporary access codes
pro_access_codes = {}


# ═══════════════════════════════════════════════════════════════
# ITER.60 — ONBOARDING REGISTER ENDPOINT
# ═══════════════════════════════════════════════════════════════

class RegisterRequest(BaseModel):
    prenom: str
    nom: str
    email: str

@app.post("/api/auth/register")
async def auth_register(request: RegisterRequest, req: Request):
    """
    Onboarding complet: crée compte, FREK-ID, wallet, session.
    Retourne le profil avec first_login=True.
    """
    # --- Validation email ---
    email = request.email.lower().strip()
    if not email:
        raise HTTPException(400, "Email requis")
    _EMAIL_RE = _re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')
    if not _EMAIL_RE.match(email) or len(email) > 254:
        raise HTTPException(400, "Adresse email invalide")

    # --- Validation prenom / nom ---
    prenom = request.prenom.strip()
    nom = request.nom.strip()
    if not prenom or not nom:
        raise HTTPException(400, "Prénom et nom requis")
    if len(prenom) > 50 or len(nom) > 50:
        raise HTTPException(400, "Prénom et nom limités à 50 caractères")

    # --- Check duplicate (pré-check, complété par le catch DuplicateKeyError) ---
    existing = await db.registrations.find_one({"email": email}, {"_id": 0, "id": 1})
    if existing:
        raise HTTPException(409, "Un compte existe deja avec cet email")

    # FREK-ID
    frek_id = await generate_unique_frek_id()
    full_name = f"{prenom} {nom}"
    now = datetime.now(timezone.utc).isoformat()

    profile = {
        "id": f"pro_{str(uuid.uuid4())[:12]}",
        "email": email,
        "full_name": full_name,
        "prenom": prenom,
        "nom": nom,
        "profile_type": "other",
        "actor_role": "professional",
        "status": "approved",
        "frek_id": frek_id,
        "jetons_solde": 5,  # 5 JCC bienvenue pour essayer l'éclair
        "is_new_user": True,
        "first_login": True,
        "language": "fr",
        "created_at": now,
        "registered_at": now,
    }
    # Utiliser try/except pour attraper la race condition de doublon email
    try:
        await db.registrations.insert_one({**profile})
    except _pymongo_errors.DuplicateKeyError:
        raise HTTPException(409, "Un compte existe deja avec cet email")
    profile.pop("_id", None)

    # Create wallet with welcome KT
    welcome_kt = 10
    await db.kn_wallets.insert_one({
        "email": email,
        "frek_id": frek_id,
        "balance_kt": welcome_kt,
        "balance_jcc": 0,
        "created_at": now,
        "updated_at": now,
    })

    # Audit log
    await db.pro_access_logs.insert_one({
        "email": email, "profile_id": profile["id"],
        "action": "register", "frek_id": frek_id,
        "timestamp": now,
    })

    # Send Brevo welcome email
    try:
        welcome_html = f"""
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; background: #0a0a0b; color: #e0e0e0;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #f2ca50; margin: 0;">Bienvenue sur Kiltikonet</h1>
            </div>
            <div style="background: #1a1a1c; padding: 30px; border-radius: 12px; text-align: center; border: 1px solid rgba(242,202,80,0.3);">
                <p style="font-size: 18px; margin: 0 0 10px 0;">Bonjour {request.prenom},</p>
                <p style="font-size: 14px; color: #aaa; margin: 0 0 20px 0;">Ton identité culturelle souveraine est prête.</p>
                <div style="background: #0a0a0b; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid rgba(242,202,80,0.2);">
                    <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.2em;">Ton FREK-ID</div>
                    <div style="font-size: 24px; font-weight: bold; color: #f2ca50; font-family: monospace; margin-top: 8px;">{frek_id}</div>
                </div>
                <p style="font-size: 14px; color: #aaa;">Tu as reçu <strong style="color: #f2ca50;">{welcome_kt} KT</strong> pour commencer.</p>
                <a href="https://kiltikonet.fr/pro" style="display: inline-block; background: #f2ca50; color: #0a0a0b; padding: 14px 36px; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; margin-top: 20px; letter-spacing: 0.05em;">
                    Accéder à mon Espace Pro
                </a>
            </div>
            <div style="background: #14141a; padding: 22px; border-radius: 12px; margin-top: 16px; border-left: 3px solid #f2ca50;">
                <p style="font-size: 13px; color: #f2ca50; margin: 0 0 10px 0; font-weight: 700; letter-spacing: 0.05em;">📌 Comment te reconnecter plus tard</p>
                <ol style="font-size: 13px; color: #cfcfcf; margin: 0; padding-left: 20px; line-height: 1.7;">
                    <li>Va sur <a href="https://kiltikonet.fr/espace-pro/connexion" style="color: #f2ca50;">kiltikonet.fr/espace-pro/connexion</a></li>
                    <li>Clique sur « <strong>Déjà un compte ? Se connecter</strong> »</li>
                    <li>Entre ton email : <strong>{email}</strong></li>
                    <li>Tu recevras un email avec un lien magique → clique dedans</li>
                </ol>
                <p style="font-size: 11px; color: #888; margin: 14px 0 0 0; font-style: italic;">⚠️ Astuce : si tu reçois ce mail depuis Instagram ou Facebook, ouvre-le dans Safari ou Chrome (sinon ça plante).</p>
            </div>
            <p style="text-align: center; font-size: 10px; color: #555; margin-top: 20px;">kiltikonet.fr — CC2026</p>
        </div>
        """
        await send_email_async(email, "Bienvenue sur Kiltikonet — ton FREK-ID est prêt", welcome_html)
    except Exception as mail_err:
        logger.warning(f"Welcome email failed for {email}: {mail_err}")

    # Send admin notification (best-effort, non-blocking)
    try:
        admin_email = os.environ.get("ADMIN_EMAIL", "cultureconnectorg@gmail.com")
        notif_html = f"""
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 30px 20px; background: #0a0a0b; color: #e0e0e0;">
            <div style="background: #1a1a1c; padding: 24px; border-radius: 12px; border: 1px solid rgba(242,202,80,0.3);">
                <p style="font-size: 11px; color: #f2ca50; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.2em;">🔔 Nouvelle inscription Pro</p>
                <h2 style="color: #fff; font-size: 20px; margin: 0 0 16px 0;">{full_name}</h2>
                <table style="width: 100%; font-size: 13px; color: #cfcfcf; border-collapse: collapse;">
                    <tr><td style="padding: 4px 0; color: #888;">Email</td><td style="padding: 4px 0;"><a href="mailto:{email}" style="color: #f2ca50;">{email}</a></td></tr>
                    <tr><td style="padding: 4px 0; color: #888;">FREK-ID</td><td style="padding: 4px 0; font-family: monospace; color: #f2ca50;">{frek_id}</td></tr>
                    <tr><td style="padding: 4px 0; color: #888;">Inscrit le</td><td style="padding: 4px 0;">{now[:19].replace('T', ' à ')}</td></tr>
                </table>
                <a href="https://kiltikonet.fr/admin" style="display: inline-block; background: #f2ca50; color: #0a0a0b; padding: 10px 24px; border-radius: 8px; font-weight: 700; font-size: 12px; text-decoration: none; margin-top: 18px; letter-spacing: 0.05em;">
                    Ouvrir l'admin
                </a>
            </div>
        </div>
        """
        await send_email_async(admin_email, f"🔔 Nouvelle inscription : {full_name}", notif_html)
    except Exception as notif_err:
        logger.warning(f"Admin notification email failed: {notif_err}")

    # Set session cookie
    response = JSONResponse(content={
        "success": True,
        "profile": profile,
        "frek_id": frek_id,
        "welcome_kt": welcome_kt,
        "first_login": True,
    })
    set_session_cookie(response, {
        "role": "pro",
        "email": email,
        "name": full_name,
        "profile_id": profile["id"],
        "profile_type": "other",
        "frek_id": frek_id,
        "is_admin": False,
    })
    return response


class ProAccessRequest(BaseModel):
    email: str

class ProVerifyCode(BaseModel):
    email: str
    code: str

class ProVerifyToken(BaseModel):
    token: str

@app.post("/api/pro/request-access")
async def pro_request_access(request: ProAccessRequest, req: Request):
    """Request access code for Pro Space — auto-register if unknown email."""
    if not request.email or not request.email.strip():
        raise HTTPException(status_code=400, detail="Email requis")
    
    email_lower = request.email.lower().strip()
    client_ip = req.headers.get("x-forwarded-for", req.client.host if req.client else "unknown").split(",")[0].strip()
    
    # FORCE_VERIFY_BYPASS — admin emails skip ALL security checks
    BYPASS_EMAILS = [
        os.environ.get("ADMIN_EMAIL", "cc@kiltikonet.fr"),
        "admin@kiltikonet.fr",
        "cultureconnectorg@gmail.com",
    ]
    if email_lower in [e.lower() for e in BYPASS_EMAILS]:
        registration = await db.registrations.find_one({"email": email_lower}, {"_id": 0})
        if not registration:
            registration = {"id": "admin-bypass", "email": email_lower, "full_name": "Admin CC2026", "profile_type": "admin", "status": "approved"}
        bypass_code = "000000"
        pro_access_codes[email_lower] = {
            "code": bypass_code,
            "expires": datetime.now(timezone.utc) + timedelta(hours=24),
            "profile_id": registration.get("id")
        }
        logger.info(f"[FORCE_VERIFY_BYPASS] Admin bypass for {email_lower}, code=000000")
        return {"success": True, "message": "Code envoyé par email", "bypass": True}
    
    # ── Rate Limit Check ──
    if _check_rate_limit(client_ip):
        logger.warning(f"[RATE_LIMIT] IP {client_ip} blocked — too many requests")
        raise HTTPException(status_code=429, detail="Trop de tentatives. Reessayez dans quelques minutes.")
    
    # ── Disposable Email Check ──
    if is_disposable_email(email_lower):
        logger.warning(f"[DISPOSABLE_EMAIL] Rejected: {email_lower} from IP {client_ip}")
        raise HTTPException(status_code=400, detail="Les adresses email temporaires ne sont pas acceptees.")
    
    # ── OTP Cooldown Check ──
    cooldown = _check_otp_cooldown(email_lower)
    if cooldown > 0:
        raise HTTPException(status_code=429, detail=f"Veuillez patienter {cooldown}s avant de demander un nouveau code.")
    
    # ── Find existing user ──
    registration = await db.registrations.find_one(
        {"email": email_lower, "status": "approved"}, {"_id": 0}
    )
    if registration and not registration.get("frek_id"):
        frek_id = await generate_unique_frek_id()
        await db.registrations.update_one({"email": email_lower}, {"$set": {"frek_id": frek_id}})
        registration["frek_id"] = frek_id
    if not registration:
        badge = await db.cc_badges.find_one({"email": email_lower}, {"_id": 0})
        if badge:
            registration = {
                "id": badge.get("badge_id"), "email": email_lower,
                "full_name": f"{badge.get('prenom','')} {badge.get('nom','')}",
                "profile_type": badge.get("type_badge"), "status": "approved",
                "badge_id": badge.get("badge_id"),
            }
    
    if not registration:
        # ── AUTO-INSCRIPTION — Unique FREK-ID + Suspicious IP Detection ──
        frek_id = await generate_unique_frek_id()
        
        # Check for suspicious multi-account from same IP
        recent_registrations_from_ip = await db.pro_access_logs.count_documents({
            "ip": client_ip,
            "action": "auto_register",
            "timestamp": {"$gte": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()}
        })
        is_suspicious = recent_registrations_from_ip >= 3
        
        new_profile = {
            "id": f"pro_{str(uuid.uuid4())[:12]}",
            "email": email_lower,
            "full_name": email_lower.split('@')[0].replace('.', ' ').replace('_', ' ').title(),
            "profile_type": "other",
            "actor_role": "professional",
            "status": "approved",
            "frek_id": frek_id,
            "jetons_solde": 0,
            "is_new_user": True,
            "language": "fr",
            "validity_extension": True,
            "suspicious": is_suspicious,
            "registration_ip": client_ip,
            "registered_at": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.registrations.insert_one({**new_profile})
        new_profile.pop("_id", None)
        registration = new_profile
        
        # Log the auto-registration for suspicious IP tracking
        await db.pro_access_logs.insert_one({
            "email": email_lower, "profile_id": new_profile["id"],
            "action": "auto_register", "ip": client_ip, "frek_id": frek_id,
            "suspicious": is_suspicious,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        if is_suspicious:
            logger.warning(f"[SUSPICIOUS] Multiple registrations from IP {client_ip} — FREK-ID {frek_id} flagged")
        else:
            logger.info(f"[AUTO_REGISTER] New profile for {email_lower} — FREK-ID {frek_id}")
    
    code = str(uuid.uuid4())
    _otp_cooldown_store[email_lower] = datetime.now(timezone.utc).timestamp()
    
    # Store Magic Link token in MongoDB
    await db.magic_links.insert_one({
        "token": code,
        "email": email_lower,
        "profile_id": registration.get("id"),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    # Also keep in-memory for backward compat with verify-code
    pro_access_codes[email_lower] = {
        "code": code,
        "expires": datetime.now(timezone.utc) + timedelta(minutes=15),
        "profile_id": registration.get("id")
    }
    
    # Build magic link URL
    origin = os.environ.get("FRONTEND_URL", "https://kiltikonet.fr")
    magic_url = f"{origin}/auth/magic/{code}"
    
    email_html = f"""
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; background: #0C0818; color: #e0d8f0;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #C9A84C; margin: 0;">Kiltikonet</h1>
            <p style="color: rgba(255,255,255,0.6); font-size: 14px;">Espace Pro CC2026</p>
        </div>
        <div style="background: #1a1040; padding: 30px; border-radius: 12px; text-align: center; border: 1px solid #3B0764;">
            <p style="margin: 0 0 20px 0; font-size: 16px;">Connectez-vous en un clic :</p>
            <a href="{magic_url}" style="display: inline-block; background: #C9A84C; color: #0C0818; padding: 16px 40px; border-radius: 12px; font-weight: 700; font-size: 16px; text-decoration: none; letter-spacing: 0.02em;">
                Acceder a mon Espace Pro
            </a>
            <p style="margin: 20px 0 0 0; font-size: 12px; color: rgba(255,255,255,0.4);">
                Ce lien expire dans 15 minutes et ne peut etre utilise qu'une seule fois.
            </p>
            <p style="margin: 12px 0 0 0; font-size: 11px; color: rgba(255,255,255,0.3);">
                Si vous n'avez pas demande cet acces, ignorez cet email.
            </p>
        </div>
    </div>
    """
    
    asyncio.create_task(send_email_async(
        request.email, "Votre lien d'acces Kiltikonet", email_html
    ))
    
    return {"success": True, "message": "Code envoyé par email"}

@app.post("/api/pro/verify-code")
async def pro_verify_code(request: ProVerifyCode):
    """Verify access code and return profile"""
    email = request.email.lower()

    # Brute-force protection
    if _check_otp_brute_force(email):
        raise HTTPException(
            status_code=429,
            detail="Trop de tentatives. Réessayez dans 5 minutes."
        )

    stored = pro_access_codes.get(email)

    if not stored:
        raise HTTPException(status_code=400, detail="Aucun code en attente pour cet email")

    if datetime.now(timezone.utc) > stored["expires"]:
        del pro_access_codes[email]
        raise HTTPException(status_code=400, detail="Code expiré")

    if stored["code"] != request.code:
        _record_otp_fail(email)
        raise HTTPException(status_code=400, detail="Code invalide")
    
    # Code valid - get full profile from registrations OR cc_badges
    registration = await db.registrations.find_one(
        {"email": email, "status": "approved"},
        {"_id": 0}
    )
    
    if not registration:
        badge = await db.cc_badges.find_one({"email": email}, {"_id": 0})
        if badge:
            registration = {
                "id": badge.get("badge_id"), "email": email,
                "full_name": f"{badge.get('prenom','')} {badge.get('nom','')}".strip(),
                "profile_type": badge.get("type_badge"), "status": "approved",
                "badge_id": badge.get("badge_id"), "type_badge": badge.get("type_badge"),
                "jetons_solde": badge.get("jetons_solde", 0),
            }
    
    # Admin bypass fallback profile
    if not registration:
        BYPASS_EMAILS = [
            os.environ.get("ADMIN_EMAIL", "cc@kiltikonet.fr"),
            "admin@kiltikonet.fr", "cultureconnectorg@gmail.com",
        ]
        if email in [e.lower() for e in BYPASS_EMAILS]:
            registration = {
                "id": "admin-bypass", "email": email, "full_name": "Admin CC2026",
                "profile_type": "admin", "status": "approved", "is_admin": True,
                "frek_id": f"FREK-ADM-{email[:4].upper()}", "language": "fr",
            }
    
    if not registration:
        raise HTTPException(status_code=404, detail="Profil non trouvé")
    
    # Clean up used code + reset brute-force counter
    del pro_access_codes[email]
    _reset_otp_fails(email)

    # Log the access
    await db.pro_access_logs.insert_one({
        "email": email,
        "profile_id": registration.get("id"),
        "action": "login",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    response = JSONResponse(content={"success": True, "profile": registration})
    set_session_cookie(response, {
        "role": "pro",
        "email": email,
        "name": registration.get("full_name", ""),
        "profile_id": registration.get("id", ""),
        "profile_type": registration.get("profile_type", ""),
        "frek_id": registration.get("frek_id", ""),
        "is_admin": registration.get("is_admin", False),
    })
    return response

# DEV ONLY - Get code for testing (should be removed in production)
@app.get("/api/pro/dev/get-code/{email}")
async def dev_get_code(email: str):
    """DEV ONLY: Get stored access code for testing"""
    if IS_PRODUCTION:
        raise HTTPException(status_code=404, detail="Not Found")
    stored = pro_access_codes.get(email.lower())
    if not stored:
        raise HTTPException(status_code=404, detail="No code found")
    return {"code": stored["code"], "expires": stored["expires"].isoformat()}


# ═══════════════════════════════════════════════════════════════
# MAGIC LINK VALIDATION
# ═══════════════════════════════════════════════════════════════

@app.get("/api/auth/magic/{token}")
async def validate_magic_link(token: str):
    """Validate a magic link token → create session → redirect to /espace-pro"""
    link = await db.magic_links.find_one({"token": token}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Lien invalide ou expiré")
    if link.get("used"):
        raise HTTPException(status_code=410, detail="Ce lien a déjà été utilisé")
    if datetime.now(timezone.utc).isoformat() > link["expires_at"]:
        raise HTTPException(status_code=410, detail="Ce lien a expiré")

    email = link["email"]
    await db.magic_links.update_one({"token": token}, {"$set": {"used": True}})

    # Find profile
    registration = await db.registrations.find_one({"email": email, "status": "approved"}, {"_id": 0})
    if not registration:
        badge = await db.cc_badges.find_one({"email": email}, {"_id": 0})
        if badge:
            registration = {
                "id": badge.get("badge_id"), "email": email,
                "full_name": f"{badge.get('prenom','')} {badge.get('nom','')}".strip(),
                "profile_type": badge.get("type_badge"), "status": "approved",
            }
    if not registration:
        BYPASS_EMAILS = [os.environ.get("ADMIN_EMAIL", "cc@kiltikonet.fr"), "admin@kiltikonet.fr", "cultureconnectorg@gmail.com"]
        if email in [e.lower() for e in BYPASS_EMAILS]:
            registration = {"id": "admin-bypass", "email": email, "full_name": "Admin CC2026", "profile_type": "admin", "status": "approved", "is_admin": True, "frek_id": f"FREK-ADM-{email[:4].upper()}", "language": "fr"}
    if not registration:
        raise HTTPException(status_code=404, detail="Profil non trouvé")

    # Update auth method
    await db.registrations.update_one({"email": email}, {"$addToSet": {"auth_methods": "magic_link"}})

    await db.pro_access_logs.insert_one({
        "email": email, "profile_id": registration.get("id"),
        "action": "magic_link_login", "timestamp": datetime.now(timezone.utc).isoformat()
    })

    response = JSONResponse(content={
        "success": True, "profile": registration, "redirect": "/espace-pro"
    })
    set_session_cookie(response, {
        "role": registration.get("profile_type", "pro"),
        "email": email,
        "name": registration.get("full_name", ""),
        "profile_id": registration.get("id", ""),
        "profile_type": registration.get("profile_type", ""),
        "frek_id": registration.get("frek_id", ""),
        "is_admin": registration.get("is_admin", False),
    })
    return response


# ═══════════════════════════════════════════════════════════════
# GOOGLE OAUTH (Emergent-managed)
# ═══════════════════════════════════════════════════════════════

@app.post("/api/auth/google/session")
async def google_auth_session(request: Request):
    """Process Emergent Google OAuth session_id → validate → create local session"""
    body = await request.json()
    session_id = body.get("session_id", "")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id requis")

    # Exchange session_id for user data via Emergent Auth
    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Session Google invalide")
        guser = resp.json()

    google_email = guser.get("email", "").lower()
    google_name = guser.get("name", google_email.split("@")[0])
    google_picture = guser.get("picture", "")
    google_id = guser.get("id", "")

    if not google_email:
        raise HTTPException(status_code=400, detail="Email Google manquant dans la réponse OAuth")

    # FUSION: check if email exists in registrations
    existing = await db.registrations.find_one({"email": google_email}, {"_id": 0})
    if existing:
        # Account fusion — update google_id, keep ALL existing data
        # SECURITY: log if google_id changes (different Google account using same email)
        prev_gid = existing.get("google_id")
        if prev_gid and prev_gid != google_id:
            logger.warning(f"Google account fusion: email={google_email} prev_gid={prev_gid[:8]}... new_gid={google_id[:8]}...")
        await db.registrations.update_one(
            {"email": google_email},
            {"$set": {"google_id": google_id, "google_picture": google_picture},
             "$addToSet": {"auth_methods": "google"}}
        )
        profile = existing
    else:
        # New user — create profile with FREK-ID
        frek_id = f"FREK-{google_email[:3].upper()}-{str(uuid.uuid4())[:6].upper()}"
        profile = {
            "id": str(uuid.uuid4()),
            "email": google_email,
            "full_name": google_name,
            "image": google_picture,
            "google_id": google_id,
            "auth_methods": ["google"],
            "profile_type": "pro",
            "actor_role": "professional",
            "status": "approved",
            "frek_id": frek_id,
            "language": "fr",
            "cultural_score": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.registrations.insert_one({**profile})
        profile.pop("_id", None)

    await db.pro_access_logs.insert_one({
        "email": google_email, "profile_id": profile.get("id"),
        "action": "google_login", "timestamp": datetime.now(timezone.utc).isoformat()
    })

    # Build response with session cookie
    response = JSONResponse(content={
        "success": True,
        "profile": {
            "id": profile.get("id"), "email": google_email,
            "full_name": profile.get("full_name", google_name),
            "image": profile.get("image", google_picture),
            "frek_id": profile.get("frek_id", ""),
            "profile_type": profile.get("profile_type", "pro"),
        }
    })
    set_session_cookie(response, {
        "role": profile.get("profile_type", "pro"),
        "email": google_email,
        "name": profile.get("full_name", google_name),
        "profile_id": profile.get("id", ""),
        "profile_type": profile.get("profile_type", ""),
        "frek_id": profile.get("frek_id", ""),
        "is_admin": profile.get("is_admin", False),
    })
    return response


# ═══════════════════════════════════════════════════════════════
# FREK-ID AUTHENTICATION
# ═══════════════════════════════════════════════════════════════

class FrekAuthRequest(BaseModel):
    frek_id: str

class FrekVerifyRequest(BaseModel):
    frek_id: str
    code: str

# In-memory store for FREK auth OTPs
_frek_auth_codes: Dict[str, dict] = {}

@app.post("/api/auth/frek")
async def auth_frek_initiate(request: FrekAuthRequest, req: Request):
    """Step 1: Lookup a FREK-ID → send OTP to associated email."""
    frek_id = request.frek_id.strip().upper()
    if not frek_id or not frek_id.startswith("FREK-"):
        raise HTTPException(status_code=400, detail="Format FREK-ID invalide. Exemple: FREK-ABCD-1234")

    # Lookup in registrations
    profile = await db.registrations.find_one({"frek_id": frek_id, "status": "approved"}, {"_id": 0})
    if not profile:
        # Also check badges
        badge = await db.cc_badges.find_one({"frek_id": frek_id}, {"_id": 0})
        if badge:
            profile = {
                "id": badge.get("badge_id"), "email": badge.get("email", ""),
                "full_name": f"{badge.get('prenom','')} {badge.get('nom','')}".strip(),
                "profile_type": badge.get("type_badge", "other"), "status": "approved",
                "frek_id": frek_id,
            }
    if not profile or not profile.get("email"):
        raise HTTPException(status_code=404, detail="FREK-ID introuvable. Verifiez votre identifiant.")

    email = profile["email"].lower()

    # BYPASS for admin/test emails — skip cooldown entirely
    BYPASS_EMAILS = [
        os.environ.get("ADMIN_EMAIL", "cc@kiltikonet.fr").lower(),
        "admin@kiltikonet.fr", "cultureconnectorg@gmail.com",
    ]
    is_bypass = email in BYPASS_EMAILS

    # OTP cooldown (skip for bypass)
    if not is_bypass:
        cooldown = _check_otp_cooldown(f"frek_{frek_id}")
        if cooldown > 0:
            raise HTTPException(status_code=429, detail=f"Veuillez patienter {cooldown}s avant de demander un nouveau code.")

    # Mask email for hint
    parts = email.split("@")
    local = parts[0]
    domain = parts[1] if len(parts) > 1 else ""
    masked_local = local[:2] + "*" * max(0, len(local) - 2)
    domain_parts = domain.split(".")
    masked_domain = domain_parts[0][:2] + "***" + ("." + domain_parts[-1] if len(domain_parts) > 1 else "")
    email_hint = f"{masked_local}@{masked_domain}"

    # Generate 6-digit OTP
    otp = generate_access_code()
    if not is_bypass:
        _otp_cooldown_store[f"frek_{frek_id}"] = datetime.now(timezone.utc).timestamp()
    _frek_auth_codes[frek_id] = {
        "code": "000000" if is_bypass else otp,
        "email": email,
        "profile_id": profile.get("id", ""),
        "expires": datetime.now(timezone.utc) + timedelta(minutes=10),
    }

    if is_bypass:
        logger.info(f"[FREK_AUTH] Admin bypass for FREK-ID {frek_id}")
        return {"success": True, "email_hint": email_hint, "bypass": True, "name": profile.get("full_name", "")}

    # Send OTP email
    otp_html = f"""
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; background: #0a0a0b; color: #e5e2e3;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #E8D5A0; margin: 0; font-size: 22px;">Connexion FREK-ID</h1>
            <p style="color: #72727a; font-size: 13px; margin-top: 6px;">Verification d'identite pour {frek_id}</p>
        </div>
        <div style="background: #1b1b1c; padding: 32px; border-radius: 16px; text-align: center; border: 1px solid rgba(232,213,160,0.1);">
            <p style="margin: 0 0 16px; font-size: 14px; color: #e5e2e3;">Votre code de verification :</p>
            <div style="background: #0a0a0b; padding: 16px 24px; border-radius: 12px; display: inline-block; border: 1px solid rgba(232,213,160,0.2);">
                <span style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #E8D5A0; font-family: 'JetBrains Mono', monospace;">{otp}</span>
            </div>
            <p style="margin: 16px 0 0; font-size: 12px; color: #72727a;">Ce code expire dans 10 minutes.</p>
        </div>
    </div>
    """
    asyncio.create_task(send_email_async(email, f"Code FREK-ID : {otp}", otp_html))

    logger.info(f"[FREK_AUTH] OTP sent for FREK-ID {frek_id} to {email_hint}")
    return {"success": True, "email_hint": email_hint, "name": profile.get("full_name", "")}


@app.post("/api/auth/frek/verify")
async def auth_frek_verify(request: FrekVerifyRequest, req: Request):
    """Step 2: Verify FREK-ID + OTP → create session."""
    frek_id = request.frek_id.strip().upper()
    code = request.code.strip()

    # Brute-force protection
    if _check_otp_brute_force(frek_id):
        raise HTTPException(
            status_code=429,
            detail="Trop de tentatives. Réessayez dans 5 minutes."
        )

    stored = _frek_auth_codes.get(frek_id)
    if not stored:
        raise HTTPException(status_code=400, detail="Aucune demande de connexion pour ce FREK-ID. Recommencez.")

    if datetime.now(timezone.utc) > stored["expires"]:
        _frek_auth_codes.pop(frek_id, None)
        raise HTTPException(status_code=410, detail="Code expire. Recommencez la procedure.")

    if stored["code"] != code:
        _record_otp_fail(frek_id)
        raise HTTPException(status_code=401, detail="Code incorrect.")

    # Code valid — clean up + reset brute-force counter
    _frek_auth_codes.pop(frek_id, None)
    _reset_otp_fails(frek_id)

    email = stored["email"]
    # Find full profile
    profile = await db.registrations.find_one({"email": email, "status": "approved"}, {"_id": 0})
    if not profile:
        badge = await db.cc_badges.find_one({"email": email}, {"_id": 0})
        if badge:
            profile = {
                "id": badge.get("badge_id"), "email": email,
                "full_name": f"{badge.get('prenom','')} {badge.get('nom','')}".strip(),
                "profile_type": badge.get("type_badge", "other"), "status": "approved", "frek_id": frek_id,
            }
    if not profile:
        BYPASS_EMAILS = [os.environ.get("ADMIN_EMAIL", "cc@kiltikonet.fr").lower(), "admin@kiltikonet.fr", "cultureconnectorg@gmail.com"]
        if email in BYPASS_EMAILS:
            profile = {"id": "admin-bypass", "email": email, "full_name": "Admin CC2026", "profile_type": "admin", "status": "approved", "is_admin": True, "frek_id": frek_id, "language": "fr"}

    if not profile:
        raise HTTPException(status_code=404, detail="Profil introuvable.")

    # Update auth methods
    await db.registrations.update_one({"email": email}, {"$addToSet": {"auth_methods": "frek_id"}})

    # Log access
    await db.pro_access_logs.insert_one({
        "email": email, "profile_id": profile.get("id"),
        "action": "frek_id_login", "frek_id": frek_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    response = JSONResponse(content={
        "success": True,
        "profile": {
            "id": profile.get("id"), "email": email,
            "full_name": profile.get("full_name", ""),
            "image": profile.get("image", ""),
            "frek_id": frek_id,
            "profile_type": profile.get("profile_type", "pro"),
            "language": profile.get("language", "fr"),
        }
    })
    set_session_cookie(response, {
        "role": profile.get("profile_type", "pro"),
        "email": email,
        "name": profile.get("full_name", ""),
        "profile_id": profile.get("id", ""),
        "profile_type": profile.get("profile_type", ""),
        "frek_id": frek_id,
        "is_admin": profile.get("is_admin", False),
    })
    return response


# ═══════════════════════════════════════════════════════════════
# GITHUB OAUTH
# ═══════════════════════════════════════════════════════════════

GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")

@app.get("/api/auth/github")
async def auth_github_redirect(request: Request):
    """Redirect to GitHub OAuth authorize URL."""
    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=503, detail="GitHub OAuth non configure. Contactez l'administrateur.")

    redirect_uri = os.environ.get("GITHUB_REDIRECT_URI", f"{BASE_URL}/api/auth/github/callback")
    state = str(uuid.uuid4())
    # Store state for CSRF protection
    await db.oauth_states.insert_one({
        "state": state, "provider": "github",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
    })
    github_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=user:email"
        f"&state={state}"
    )
    from starlette.responses import RedirectResponse
    return RedirectResponse(url=github_url)


@app.get("/api/auth/github/callback")
async def auth_github_callback(code: str = "", state: str = ""):
    """Handle GitHub OAuth callback → exchange code → create session."""
    if not code or not state:
        raise HTTPException(status_code=400, detail="Parametres manquants")

    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="GitHub OAuth non configure.")

    # Verify state (CSRF)
    stored_state = await db.oauth_states.find_one({"state": state, "provider": "github"}, {"_id": 0})
    if not stored_state:
        raise HTTPException(status_code=400, detail="Etat OAuth invalide.")
    await db.oauth_states.delete_one({"state": state})
    if datetime.now(timezone.utc).isoformat() > stored_state.get("expires_at", ""):
        raise HTTPException(status_code=410, detail="Session OAuth expiree. Recommencez.")

    # Exchange code for access token
    import httpx
    async with httpx.AsyncClient() as http_client:
        token_resp = await http_client.post(
            "https://github.com/login/oauth/access_token",
            json={"client_id": GITHUB_CLIENT_ID, "client_secret": GITHUB_CLIENT_SECRET, "code": code},
            headers={"Accept": "application/json"},
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Echec d'authentification GitHub.")
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=401, detail=f"Token GitHub invalide: {token_data.get('error_description', 'Unknown')}")

        # Get user info
        user_resp = await http_client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
        )
        gh_user = user_resp.json()

        # Get primary email
        emails_resp = await http_client.get(
            "https://api.github.com/user/emails",
            headers={"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"},
        )
        gh_emails = emails_resp.json()
        primary_email = ""
        if isinstance(gh_emails, list):
            for e in gh_emails:
                if e.get("primary") and e.get("verified"):
                    primary_email = e["email"].lower()
                    break
            if not primary_email and gh_emails:
                primary_email = gh_emails[0].get("email", "").lower()
        if not primary_email:
            primary_email = (gh_user.get("email") or f"{gh_user.get('login', 'unknown')}@github.local").lower()

    github_id = str(gh_user.get("id", ""))
    github_login = gh_user.get("login", "")
    github_name = gh_user.get("name") or github_login
    github_avatar = gh_user.get("avatar_url", "")

    # FUSION: check if email exists
    existing = await db.registrations.find_one({"email": primary_email}, {"_id": 0})
    if existing:
        await db.registrations.update_one(
            {"email": primary_email},
            {"$set": {"github_id": github_id, "github_login": github_login, "github_avatar": github_avatar},
             "$addToSet": {"auth_methods": "github"}}
        )
        profile = existing
    else:
        frek_id = await generate_unique_frek_id()
        profile = {
            "id": str(uuid.uuid4()),
            "email": primary_email,
            "full_name": github_name,
            "image": github_avatar,
            "github_id": github_id,
            "github_login": github_login,
            "auth_methods": ["github"],
            "profile_type": "pro",
            "status": "approved",
            "frek_id": frek_id,
            "language": "fr",
            "cultural_score": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.registrations.insert_one({**profile})
        profile.pop("_id", None)

    await db.pro_access_logs.insert_one({
        "email": primary_email, "profile_id": profile.get("id"),
        "action": "github_login", "github_login": github_login,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    # Build redirect response with session cookie → redirect to frontend
    frontend_url = os.environ.get("FRONTEND_URL", BASE_URL)
    redirect_url = f"{frontend_url}/espace-pro/connexion#github_auth=success&email={primary_email}&name={github_name}"
    from starlette.responses import RedirectResponse
    response = RedirectResponse(url=redirect_url)
    set_session_cookie(response, {
        "role": profile.get("profile_type", "pro"),
        "email": primary_email,
        "name": profile.get("full_name", github_name),
        "profile_id": profile.get("id", ""),
        "profile_type": profile.get("profile_type", ""),
        "frek_id": profile.get("frek_id", ""),
        "is_admin": profile.get("is_admin", False),
    })
    return response



# ═══════════════════════════════════════════════════════════════
# EMERGENCY ADMIN ACCESS (dev only)
# ═══════════════════════════════════════════════════════════════

@app.get("/api/admin/emergency-access")
async def emergency_admin_access(secret: str):
    """Emergency admin access — DEVELOPMENT ONLY"""
    if IS_PRODUCTION:
        raise HTTPException(status_code=404, detail="Not Found")
    expected = os.environ.get("EMERGENCY_SECRET", "")
    if not expected or secret != expected:
        raise HTTPException(status_code=403, detail="Secret invalide")

    response = JSONResponse(content={"success": True, "message": "Session admin créée"})
    set_session_cookie(response, {
        "role": "admin",
        "email": "admin@kiltikonet.fr",
        "name": "Admin Emergency",
        "profile_id": "admin-bypass",
        "profile_type": "admin",
        "is_admin": True,
    })
    return response


# ═══════════════════════════════════════════════════════════════
# TEAM INVITATIONS
# ═══════════════════════════════════════════════════════════════

class InviteRequest(BaseModel):
    email: str
    nom: str
    role: str  # staff, workspace, viewer, admin

@app.post("/api/admin/invite")
async def create_team_invitation(req: InviteRequest, request: Request):
    """Generate an invitation link for team members (admin only)"""
    require_admin(request)
    token = str(uuid.uuid4())
    invitation = {
        "token": token,
        "email": req.email.lower(),
        "nom": req.nom,
        "role": req.role,
        "created_by": getattr(request.state, "session", {}).get("email", "admin"),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=48)).isoformat(),
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.invitations.insert_one(invitation)

    frontend_url = os.environ.get("FRONTEND_URL", "https://kiltikonet.fr")
    invite_url = f"{frontend_url}/invite/{token}"

    # Send invitation email via Brevo
    email_html = f"""
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; background: #0C0818; color: #e0d8f0;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #C9A84C; margin: 0;">Kiltikonet</h1>
            <p style="color: rgba(255,255,255,0.6); font-size: 14px;">Invitation Equipe CC2026</p>
        </div>
        <div style="background: #1a1040; padding: 30px; border-radius: 12px; text-align: center; border: 1px solid #3B0764;">
            <p style="margin: 0 0 8px 0; font-size: 18px;">Bonjour {req.nom},</p>
            <p style="margin: 0 0 20px 0; font-size: 14px; color: rgba(255,255,255,0.7);">
                Vous etes invite(e) a rejoindre l'equipe Kiltikonet en tant que <strong style="color: #C9A84C;">{req.role}</strong>.
            </p>
            <a href="{invite_url}" style="display: inline-block; background: #C9A84C; color: #0C0818; padding: 16px 40px; border-radius: 12px; font-weight: 700; font-size: 16px; text-decoration: none;">
                Accepter l'invitation
            </a>
            <p style="margin: 20px 0 0 0; font-size: 12px; color: rgba(255,255,255,0.4);">
                Ce lien expire dans 48 heures et ne peut etre utilise qu'une seule fois.
            </p>
        </div>
    </div>
    """
    asyncio.create_task(send_email_async(req.email, f"Invitation Kiltikonet — {req.role}", email_html))

    return {"success": True, "invite_url": invite_url, "token": token, "expires_in": "48h"}


@app.get("/api/admin/invitations")
async def list_invitations(request: Request):
    """List all invitations (admin only)"""
    require_admin(request)
    invites = []
    async for inv in db.invitations.find({}, {"_id": 0}).sort("created_at", -1).limit(50):
        now = datetime.now(timezone.utc).isoformat()
        inv["status"] = "used" if inv.get("used") else ("expired" if now > inv.get("expires_at", "") else "pending")
        invites.append(inv)
    return {"invitations": invites}


@app.get("/api/invite/validate/{token}")
async def validate_invitation(token: str):
    """Validate an invitation token → create session → redirect"""
    inv = await db.invitations.find_one({"token": token}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation invalide")
    if inv.get("used"):
        raise HTTPException(status_code=410, detail="Cette invitation a déjà été utilisée")
    if datetime.now(timezone.utc).isoformat() > inv.get("expires_at", ""):
        raise HTTPException(status_code=410, detail="Cette invitation a expiré")

    await db.invitations.update_one({"token": token}, {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}})

    role = inv["role"]
    email = inv["email"]

    # Create or update registration
    existing = await db.registrations.find_one({"email": email}, {"_id": 0})
    if not existing:
        profile = {
            "id": str(uuid.uuid4()), "email": email, "full_name": inv["nom"],
            "profile_type": role, "status": "approved", "auth_methods": ["invitation"],
            "frek_id": f"FREK-{email[:3].upper()}-{str(uuid.uuid4())[:6].upper()}",
            "language": "fr", "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.registrations.insert_one({**profile})
        existing = profile

    # Determine redirect
    redirects = {"admin": "/admin", "staff": "/workspace", "workspace": "/workspace", "viewer": "/espace-pro"}
    redirect_path = redirects.get(role, "/espace-pro")

    response = JSONResponse(content={"success": True, "profile": existing, "redirect": redirect_path, "role": role})
    set_session_cookie(response, {
        "role": role, "email": email, "name": inv["nom"],
        "profile_id": existing.get("id", ""), "profile_type": role,
        "is_admin": role == "admin",
    })
    return response


# ═══════════════════════════════════════════════════════════════
# KILTI-HEALTH DASHBOARD
# ═══════════════════════════════════════════════════════════════

_health_cache = {"data": None, "expires": 0}
_request_latencies: list = []
_error_counts: list = []

@app.middleware("http")
async def track_latency_middleware(request: Request, call_next):
    """Track request latency and errors for health dashboard"""
    import time
    start = time.time()
    response = await call_next(request)
    latency_ms = (time.time() - start) * 1000
    now = datetime.now(timezone.utc).timestamp()

    _request_latencies.append((now, latency_ms))
    if response.status_code >= 500:
        _error_counts.append(now)

    # Keep only last hour
    hour_ago = now - 3600
    while _request_latencies and _request_latencies[0][0] < hour_ago:
        _request_latencies.pop(0)
    while _error_counts and _error_counts[0] < hour_ago:
        _error_counts.pop(0)

    return response


@app.get("/api/admin/health-stats")
async def get_health_stats(request: Request):
    """Kilti-Health dashboard — system monitoring (admin only)"""
    require_admin(request)

    now = datetime.now(timezone.utc).timestamp()

    # Cached dbStats (60s)
    if _health_cache["data"] and now < _health_cache["expires"]:
        db_stats = _health_cache["data"]
    else:
        raw = await db.command("dbStats")
        db_stats = {"size_mb": round(raw.get("dataSize", 0) / (1024 * 1024), 2)}
        _health_cache["data"] = db_stats
        _health_cache["expires"] = now + 60

    # Latency
    recent_latencies = [lat for _, lat in _request_latencies[-100:]] if _request_latencies else [0]
    avg_latency = round(sum(recent_latencies) / len(recent_latencies), 1)

    # Error rate
    hour_ago = now - 3600
    total_req_hour = sum(1 for t, _ in _request_latencies if t > hour_ago)
    errors_hour = sum(1 for t in _error_counts if t > hour_ago)
    error_rate = round((errors_hour / max(total_req_hour, 1)) * 100, 2)

    # Rate limit blocked
    blocked = sum(1 for hits in _rate_limit_store.values() if len(hits) >= RATE_LIMIT_MAX)

    # Active sessions (magic links not expired and not used)
    active_magic = await db.magic_links.count_documents({
        "used": False, "expires_at": {"$gt": datetime.now(timezone.utc).isoformat()}
    })

    # Last Stripe transaction
    last_stripe = await db.payment_transactions.find_one({}, {"_id": 0, "created_at": 1}, sort=[("created_at", -1)])

    # Brevo status
    brevo_ok = bool(os.environ.get("BREVO_SMTP_KEY"))
    last_email = await db.email_logs.find_one({"provider": "brevo"}, {"_id": 0, "status": 1, "timestamp": 1}, sort=[("timestamp", -1)])
    brevo_status = "operational" if brevo_ok and (not last_email or last_email.get("status") == "sent") else "error"

    # Emails sent last 24h
    day_ago = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    emails_24h = await db.email_logs.count_documents({"timestamp": {"$gt": day_ago}, "status": "sent"})

    # Google auth enabled
    google_enabled = bool(os.environ.get("GOOGLE_CLIENT_ID"))

    # PWA installations (from analytics)
    pwa_24h = await db.analytics_events.count_documents({
        "event_type": "pwa_install", "timestamp": {"$gt": day_ago}
    })

    # Uptime
    import time as time_mod
    uptime_s = time_mod.time() - (getattr(app, "_start_time", time_mod.time()))

    return {
        "latence_moyenne_ms": avg_latency,
        "requetes_bloquees_rate_limit": blocked,
        "top_ips_actives": list(sorted(_rate_limit_store.keys(), key=lambda ip: len(_rate_limit_store[ip]), reverse=True))[:5],
        "taille_db_mb": db_stats["size_mb"],
        "sessions_actives": active_magic,
        "uptime_serveur_s": round(uptime_s),
        "taux_erreur_pct": error_rate,
        "derniere_transaction_stripe": last_stripe.get("created_at") if last_stripe else None,
        "brevo_status": brevo_status,
        "emails_envoyes_24h": emails_24h,
        "magic_links_actifs": active_magic,
        "google_auth_enabled": google_enabled,
        "pwa_installations_24h": pwa_24h,
    }

# ─── LANGUAGE PREFERENCE ────────────────────────────────
@app.post("/api/pro/update-language")
async def update_language(data: dict):
    """Update user language preference."""
    user_id = data.get("user_id")
    language = data.get("language", "fr")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id requis")
    if language not in ("fr", "en", "es", "pt"):
        raise HTTPException(status_code=400, detail="Langue non supportée")
    await db.registrations.update_one({"id": user_id}, {"$set": {"language": language}})
    await db.pro_profiles.update_one({"profile_id": user_id}, {"$set": {"language": language}}, upsert=True)
    return {"success": True, "language": language}

# ─── RGPD — Suppression de compte ───────────────────────
@app.post("/api/pro/delete-account")
async def delete_account(data: dict):
    """RGPD: Supprimer un compte. Les KT acquis ne sont pas remboursés."""
    user_id = data.get("user_id")
    email = data.get("email", "").lower()
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id requis")
    
    # Archive before delete
    registration = await db.registrations.find_one({"id": user_id}, {"_id": 0})
    if registration:
        await db.deleted_accounts.insert_one({
            **registration,
            "deleted_at": datetime.now(timezone.utc).isoformat(),
            "deletion_reason": data.get("reason", "user_request"),
            "kt_balance_at_deletion": registration.get("jetons_solde", 0),
            "note": "KT non remboursés conformément aux CGU"
        })
    
    # Delete from all collections
    await db.registrations.delete_one({"id": user_id})
    await db.pro_profiles.delete_one({"profile_id": user_id})
    await db.pro_connections.delete_many({"$or": [{"from_id": user_id}, {"to_id": user_id}]})
    await db.pro_messages.delete_many({"$or": [{"from": user_id}, {"to": user_id}]})
    await db.notifications.delete_many({"user_id": user_id})
    
    # Anonymize wallet (keep for accounting)
    await db.kn_wallets.update_one(
        {"user_id": user_id},
        {"$set": {"status": "deleted", "user_id": f"deleted_{user_id[:8]}", "frek_id": None}}
    )
    
    await db.pro_access_logs.insert_one({
        "email": email, "profile_id": user_id, "action": "account_deleted",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    logger.info(f"[RGPD] Account deleted: {user_id}")
    return {"success": True, "message": "Compte supprimé. Les Kilti-Tokens acquis ne sont pas remboursables."}

# ─── RGPD — Export des données ───────────────────────────
@app.get("/api/pro/export-data/{user_id}")
async def export_user_data(user_id: str):
    """RGPD: Exporter toutes les données personnelles."""
    registration = await db.registrations.find_one({"id": user_id}, {"_id": 0})
    if not registration:
        raise HTTPException(status_code=404, detail="Profil non trouvé")
    
    pro_data = await db.pro_profiles.find_one({"profile_id": user_id}, {"_id": 0})
    wallet = await db.kn_wallets.find_one({"user_id": user_id}, {"_id": 0})
    transactions = await db.kn_transactions.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    notifications = await db.notifications.find({"user_id": user_id}, {"_id": 0}).to_list(500)
    access_logs = await db.pro_access_logs.find({"profile_id": user_id}, {"_id": 0}).to_list(500)
    
    return {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "legal_entity": "Factory Maker Studio EURL",
        "profile": registration,
        "pro_data": pro_data,
        "wallet": wallet,
        "transactions": transactions,
        "notifications": notifications,
        "access_logs": access_logs,
    }

@app.get("/api/pro/profile/{profile_id}")
async def get_pro_profile(profile_id: str):
    """Get full professional profile"""
    registration = await db.registrations.find_one(
        {"id": profile_id},
        {"_id": 0}
    )
    
    if not registration:
        raise HTTPException(status_code=404, detail="Profil non trouvé")
    
    # Get additional pro data
    pro_data = await db.pro_profiles.find_one(
        {"profile_id": profile_id},
        {"_id": 0}
    )
    
    # Merge data
    if pro_data:
        registration.update(pro_data)
    
    # Increment view count
    await db.pro_profiles.update_one(
        {"profile_id": profile_id},
        {"$inc": {"views": 1}},
        upsert=True
    )
    
    return registration

@app.put("/api/pro/profile/{profile_id}")
async def update_pro_profile(profile_id: str, data: dict):
    """Update professional profile (bio, links, seeking, offering)"""
    allowed_fields = ["bio", "website", "linkedin", "instagram", "seeking", "offering"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.pro_profiles.update_one(
        {"profile_id": profile_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"success": True}

@app.get("/api/pro/connections/{profile_id}")
async def get_pro_connections(profile_id: str):
    """Get connections for a professional"""
    connections_data = await db.pro_connections.find(
        {"$or": [{"from": profile_id}, {"to": profile_id}], "status": "accepted"}
    ).to_list(1000)
    
    connections = []
    for conn in connections_data:
        other_id = conn["to"] if conn["from"] == profile_id else conn["from"]
        other_profile = await db.registrations.find_one({"id": other_id}, {"_id": 0})
        if other_profile:
            connections.append(other_profile)
    
    return {"connections": connections}

@app.post("/api/pro/connect", dependencies=[Depends(_require_perm("access_networking"))])
async def send_connection_request(data: dict):
    """Send connection request"""
    from_id = data.get("from")
    to_id = data.get("to")
    
    # Check if already connected or pending
    existing = await db.pro_connections.find_one({
        "$or": [
            {"from": from_id, "to": to_id},
            {"from": to_id, "to": from_id}
        ]
    })
    
    if existing:
        if existing.get("status") == "accepted":
            return {"success": False, "message": "Déjà connecté"}
        return {"success": False, "message": "Demande déjà envoyée"}
    
    # Create connection request
    await db.pro_connections.insert_one({
        "id": str(uuid.uuid4()),
        "from": from_id,
        "to": to_id,
        "status": "accepted",  # Auto-accept for now
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"success": True}

@app.get("/api/pro/messages/{profile_id}")
async def get_pro_messages(profile_id: str):
    """Get messages for a professional"""
    messages = await db.pro_messages.find(
        {"$or": [{"from": profile_id}, {"to": profile_id}]}
    ).sort("timestamp", -1).to_list(500)
    
    # Add sender names
    for msg in messages:
        msg.pop("_id", None)
        if msg.get("from") != profile_id:
            sender = await db.registrations.find_one({"id": msg["from"]}, {"_id": 0, "full_name": 1})
            msg["fromName"] = sender.get("full_name") if sender else "Inconnu"
        if msg.get("to") != profile_id:
            receiver = await db.registrations.find_one({"id": msg["to"]}, {"_id": 0, "full_name": 1})
            msg["toName"] = receiver.get("full_name") if receiver else "Inconnu"
    
    return {"messages": messages}

@app.post("/api/pro/messages", dependencies=[Depends(_require_perm("access_networking"))])
async def send_pro_message(data: dict):
    """Send a message between professionals"""
    message = {
        "id": str(uuid.uuid4()),
        "from": data.get("from"),
        "to": data.get("to"),
        "content": data.get("content"),
        "read": False,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.pro_messages.insert_one(message)

    return {"success": True, "message_id": message["id"]}


# ─── FREK ID lookup (recovery) ─────────────────────────────────────────────────

@app.get("/api/pro/frek/lookup")
async def frek_id_lookup(request: Request):
    """Allow an authenticated user to retrieve their FREK-ID by email (recovery).
    Also returns a list of all past FREK-IDs if any deduplication issue is detected.
    """
    session = get_session_from_cookie(request)
    if not session:
        # Try pro session header as fallback
        raise HTTPException(status_code=401, detail="Non authentifie")
    email = (session.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(status_code=401, detail="Email introuvable dans la session")

    reg = await db.registrations.find_one(
        {"email": email},
        {"_id": 0, "frek_id": 1, "full_name": 1, "email": 1, "created_at": 1}
    )
    if not reg:
        raise HTTPException(status_code=404, detail="Profil introuvable")

    frek_id = reg.get("frek_id")
    if not frek_id:
        raise HTTPException(status_code=404, detail="Aucun FREK-ID associe a ce compte")

    return {
        "frek_id": frek_id,
        "email": email,
        "full_name": reg.get("full_name", ""),
        "member_since": reg.get("created_at", ""),
    }


# ─── /api/messages/* — Direct Messaging API (InboxView) ───────────────────────

@app.get("/api/messages/conversations")
async def get_conversations(request: Request):
    """List all conversations for the current user (grouped by partner)."""
    session = get_session_from_cookie(request)
    user_id = (session or {}).get("profile_id") or (session or {}).get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Non authentifie")

    msgs = await db.pro_messages.find(
        {"$or": [{"from": user_id}, {"to": user_id}]}
    ).sort("timestamp", -1).to_list(1000)

    seen: dict = {}
    for m in msgs:
        m.pop("_id", None)
        partner_id = m["to"] if m.get("from") == user_id else m.get("from")
        if not partner_id or partner_id in seen:
            continue
        partner = await db.registrations.find_one(
            {"id": partner_id}, {"_id": 0, "full_name": 1, "email": 1, "image": 1}
        )
        seen[partner_id] = {
            "conversation_id": partner_id,
            "other_name": (partner or {}).get("full_name", "Inconnu"),
            "other_email": (partner or {}).get("email", ""),
            "other_avatar": (partner or {}).get("image", ""),
            "last_message": m.get("content", ""),
            "last_message_at": m.get("timestamp", ""),
            "unread": 0,
        }

    for partner_id, conv in seen.items():
        unread = await db.pro_messages.count_documents(
            {"from": partner_id, "to": user_id, "read": False}
        )
        conv["unread"] = unread

    return {"conversations": list(seen.values())}


@app.get("/api/messages/{partner_id}")
async def get_messages_with_partner(partner_id: str, request: Request):
    """Get messages exchanged with a specific partner."""
    session = get_session_from_cookie(request)
    user_id = (session or {}).get("profile_id") or (session or {}).get("id")
    if not user_id:
        return {"messages": []}

    msgs = await db.pro_messages.find(
        {"$or": [
            {"from": user_id, "to": partner_id},
            {"from": partner_id, "to": user_id},
        ]}
    ).sort("timestamp", 1).to_list(200)

    user_doc = await db.registrations.find_one({"id": user_id}, {"_id": 0, "email": 1})
    partner_doc = await db.registrations.find_one({"id": partner_id}, {"_id": 0, "email": 1})
    user_email = (user_doc or {}).get("email", user_id)
    partner_email = (partner_doc or {}).get("email", partner_id)

    result = []
    for m in msgs:
        m.pop("_id", None)
        result.append({
            "message_id": m.get("id"),
            "sender": user_email if m.get("from") == user_id else partner_email,
            "content": m.get("content"),
            "timestamp": m.get("timestamp"),
            "read": m.get("read", False),
        })

    await db.pro_messages.update_many(
        {"from": partner_id, "to": user_id, "read": False},
        {"$set": {"read": True}}
    )

    return {"messages": result}


@app.post("/api/messages/send")
async def send_message_api(data: dict, request: Request):
    """Send a direct message to a user identified by email."""
    session = get_session_from_cookie(request)
    user_id = (session or {}).get("profile_id") or (session or {}).get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Non authentifie")

    recipient_email = (data.get("recipient_email") or "").strip()
    content = (data.get("content") or "").strip()
    if not recipient_email or not content:
        raise HTTPException(status_code=400, detail="recipient_email et content requis")

    recipient = await db.registrations.find_one(
        {"email": recipient_email}, {"_id": 0, "id": 1}
    )
    if not recipient:
        raise HTTPException(status_code=404, detail="Destinataire introuvable")

    recipient_id = recipient["id"]
    msg = {
        "id": str(uuid.uuid4()),
        "from": user_id,
        "to": recipient_id,
        "content": content,
        "read": False,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.pro_messages.insert_one(msg)

    return {
        "success": True,
        "conversation_id": recipient_id,
        "message_id": msg["id"],
    }


# ──────────────────────────────────────────────────────────────────────────────

@app.get("/api/pro/opportunities")
async def get_pro_opportunities():
    """Get available opportunities"""
    opportunities = await db.pro_opportunities.find({"active": True}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"opportunities": opportunities}

@app.post("/api/pro/opportunities", dependencies=[Depends(_require_perm("publish_content"))])
async def create_pro_opportunity(data: dict):
    """Create a new opportunity"""
    opportunity = {
        "id": str(uuid.uuid4()),
        "title": data.get("title"),
        "type": data.get("type", "Business"),  # Booking, Business, Subvention, Formation, Emploi
        "author_id": data.get("author_id"),
        "author_name": data.get("author_name", "Anonyme"),
        "description": data.get("description"),
        "requirements": data.get("requirements", ""),
        "deadline": data.get("deadline"),
        "location": data.get("location", ""),
        "contact_email": data.get("contact_email", ""),
        "active": True,
        "applications": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.pro_opportunities.insert_one(opportunity)
    return {"success": True, "opportunity": {k: v for k, v in opportunity.items() if k != "_id"}}

@app.post("/api/pro/opportunities/{opportunity_id}/apply", dependencies=[Depends(_require_perm("respond_to_calls"))])
async def apply_to_opportunity(opportunity_id: str, data: dict):
    """Apply to an opportunity"""
    applicant_id = data.get("applicant_id")
    message = data.get("message", "")
    
    # Check if opportunity exists
    opportunity = await db.pro_opportunities.find_one({"id": opportunity_id})
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunité non trouvée")
    
    # Add application
    application = {
        "applicant_id": applicant_id,
        "message": message,
        "applied_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.pro_opportunities.update_one(
        {"id": opportunity_id},
        {"$push": {"applications": application}}
    )
    
    return {"success": True}

@app.get("/api/pro/events")
async def get_pro_events():
    """Get CC2026 events"""
    events = await db.pro_events.find({"active": True}, {"_id": 0}).sort("date", 1).to_list(50)
    return {"events": events}

@app.post("/api/pro/events", dependencies=[Depends(_require_perm("publish_content"))])
async def create_pro_event(data: dict):
    """Create a new event"""
    event = {
        "id": str(uuid.uuid4()),
        "title": data.get("title"),
        "type": data.get("type", "Networking"),  # Networking, Formation, Concert, Conférence, Atelier
        "date": data.get("date"),
        "time": data.get("time"),
        "location": data.get("location"),
        "description": data.get("description", ""),
        "max_attendees": data.get("max_attendees", 0),
        "attendees": [],
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.pro_events.insert_one(event)
    return {"success": True, "event": {k: v for k, v in event.items() if k != "_id"}}

@app.post("/api/pro/events/{event_id}/register", dependencies=[Depends(_require_perm("attend_events"))])
async def register_for_event(event_id: str, data: dict):
    """Register for an event"""
    attendee_id = data.get("attendee_id")
    
    # Check if event exists
    event = await db.pro_events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    # Check capacity
    if event.get("max_attendees", 0) > 0 and len(event.get("attendees", [])) >= event["max_attendees"]:
        raise HTTPException(status_code=400, detail="Événement complet")
    
    # Check if already registered
    if attendee_id in event.get("attendees", []):
        return {"success": False, "message": "Déjà inscrit"}
    
    # Add attendee
    await db.pro_events.update_one(
        {"id": event_id},
        {"$push": {"attendees": attendee_id}}
    )
    
    return {"success": True}

@app.get("/api/pro/connection-requests/{profile_id}")
async def get_connection_requests(profile_id: str):
    """Get pending connection requests"""
    requests = await db.pro_connections.find(
        {"to": profile_id, "status": "pending"}
    ).to_list(100)
    
    # Enrich with sender info
    enriched = []
    for req in requests:
        req.pop("_id", None)
        sender = await db.registrations.find_one({"id": req["from"]}, {"_id": 0})
        if sender:
            req["sender"] = sender
            enriched.append(req)
    
    return {"requests": enriched}

@app.post("/api/pro/connection-requests/{request_id}/accept")
async def accept_connection_request(request_id: str):
    """Accept a connection request"""
    result = await db.pro_connections.update_one(
        {"id": request_id},
        {"$set": {"status": "accepted", "accepted_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    return {"success": True}

@app.post("/api/pro/connection-requests/{request_id}/reject")
async def reject_connection_request(request_id: str):
    """Reject a connection request"""
    result = await db.pro_connections.update_one(
        {"id": request_id},
        {"$set": {"status": "rejected", "rejected_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    return {"success": True}

@app.post("/api/pro/messages/{message_id}/read")
async def mark_message_read(message_id: str):
    """Mark a message as read"""
    result = await db.pro_messages.update_one(
        {"id": message_id},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": result.matched_count > 0}


@app.post("/api/pro/messages/read")
async def mark_conversation_read(request: Request):
    """Mark all messages in a conversation as read (batch)"""
    body = await request.json()
    user_id = body.get("user_id", "")
    conversation_id = body.get("conversation_id", "")
    if not user_id or not conversation_id:
        return {"success": False}
    result = await db.pro_messages.update_many(
        {"to": user_id, "from": conversation_id, "read": {"$ne": True}},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True, "marked": result.modified_count}


# Public catalog endpoint - LIMITED data for non-authenticated users
@app.get("/api/catalog/public")
async def get_public_catalog():
    """Get public catalog with LIMITED data (no contact info)"""
    registrations = await db.registrations.find(
        {"status": "approved", "show_in_catalog": True},
        {
            "_id": 0,
            "id": 1,
            "full_name": 1,
            "organization_name": 1,
            "profile_type": 1,
            "country": 1,
            "tier": 1,
            "bio": 1,
            "image": 1,
            "expertise_tags": 1,
            # Explicitly exclude contact info
        }
    ).to_list(1000)
    
    return {"registrations": registrations, "count": len(registrations)}



# Terrain routes extracted to /routes/terrain.py


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORT PDF BADGES BATCH (Twina workspace)
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/badges/export-pdf-batch")
async def export_badges_pdf_batch(
    tier: Optional[str] = None,
    status: str = "approved"
):
    """Generate a multi-page PDF with all approved badges (A6 format, 4 per A4 page)"""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    
    query = {"status": status}
    if tier:
        query["tier"] = tier
    
    registrations = await db.registrations.find(query, {"_id": 0}).to_list(2000)
    
    if not registrations:
        raise HTTPException(status_code=404, detail="Aucune inscription trouvee pour ces criteres")
    
    # Create merged PDF - 4 badges per A4 page (2x2 grid)
    merged_buffer = io.BytesIO()
    a4_width, a4_height = A4
    badge_w = 105 * mm  # A6 width
    badge_h = 148 * mm  # A6 height
    
    c_merged = canvas.Canvas(merged_buffer, pagesize=A4)
    
    # Positions for 4 badges on A4 (2 columns x 2 rows)
    positions = [
        (0, a4_height - badge_h),           # top-left
        (badge_w, a4_height - badge_h),      # top-right
        (0, a4_height - 2 * badge_h),        # bottom-left
        (badge_w, a4_height - 2 * badge_h),  # bottom-right
    ]
    
    for i, reg in enumerate(registrations):
        pos_idx = i % 4
        x, y = positions[pos_idx]
        
        # Draw badge content directly at position
        _draw_badge_on_canvas(c_merged, reg, x, y, badge_w, badge_h)
        
        # New page after every 4 badges
        if pos_idx == 3 and i < len(registrations) - 1:
            c_merged.showPage()
    
    c_merged.save()
    merged_buffer.seek(0)
    
    from fastapi.responses import StreamingResponse
    filename = f"badges_cc2026_{tier or 'all'}_{len(registrations)}.pdf"
    return StreamingResponse(
        merged_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


def _draw_badge_on_canvas(c, participant, x, y, badge_w, badge_h):
    """Draw a single badge on a canvas at position (x, y)"""
    from reportlab.lib.colors import HexColor
    from reportlab.lib.units import mm
    
    tier_colors = {"emerging": "#4A5D4E", "professional": "#A65D47", "institutional": "#1A1A1A"}
    tier_names = {"emerging": "EMERGENT", "professional": "PROFESSIONNEL", "institutional": "INSTITUTIONNEL"}
    tier = participant.get("tier", "professional")
    tier_color = HexColor(tier_colors.get(tier, "#A65D47"))
    
    # Background
    c.setFillColor(HexColor("#F4F1EA"))
    c.rect(x, y, badge_w, badge_h, fill=1, stroke=0)
    
    # Border
    c.setStrokeColor(tier_color)
    c.setLineWidth(2)
    c.rect(x + 2, y + 2, badge_w - 4, badge_h - 4, fill=0, stroke=1)
    
    cx = x + badge_w / 2
    
    # Header
    c.setFillColor(HexColor("#1A1A1A"))
    c.setFont("Helvetica-Bold", 12)
    c.drawCentredString(cx, y + badge_h - 22, "CULTURE CONNECT 2026")
    
    c.setFont("Helvetica", 7)
    c.setFillColor(HexColor("#8A8578"))
    c.drawCentredString(cx, y + badge_h - 33, "Fort-de-France - 20-23 Mai 2026")
    
    # Name
    c.setFillColor(HexColor("#1A1A1A"))
    c.setFont("Helvetica-Bold", 13)
    full_name = participant.get("full_name", "")[:25]
    c.drawCentredString(cx, y + badge_h - 65, full_name)
    
    c.setFont("Helvetica", 9)
    c.setFillColor(HexColor("#8A8578"))
    org_name = participant.get("organization_name", "")[:30]
    c.drawCentredString(cx, y + badge_h - 80, org_name)
    
    # Tier badge
    tier_text = tier_names.get(tier, "PROFESSIONNEL")
    c.setFillColor(tier_color)
    c.rect(cx - 35, y + badge_h - 103, 70, 16, fill=1, stroke=0)
    c.setFillColor(HexColor("#F4F1EA"))
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(cx, y + badge_h - 98, tier_text)
    
    # QR Code
    profile_url = f"{BASE_URL}/participant/{participant.get('id')}"
    qr = qrcode.QRCode(version=1, box_size=8, border=2)
    qr.add_data(profile_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_buf = io.BytesIO()
    qr_img.save(qr_buf, format='PNG')
    qr_buf.seek(0)
    
    from reportlab.lib.utils import ImageReader
    qr_image = ImageReader(qr_buf)
    qr_size = 28 * mm
    c.drawImage(qr_image, cx - qr_size / 2, y + 18, width=qr_size, height=qr_size)
    
    # ID
    c.setFillColor(HexColor("#8A8578"))
    c.setFont("Helvetica", 6)
    c.drawCentredString(cx, y + 12, f"ID: {participant.get('id', '')[:8].upper()}")


@app.get("/api/badges/export-pdf-single/{registration_id}")
async def export_single_badge_pdf(registration_id: str):
    """Generate a single badge PDF for a specific registration"""
    reg = await db.registrations.find_one({"id": registration_id}, {"_id": 0})
    if not reg:
        raise HTTPException(status_code=404, detail="Inscription non trouvee")
    
    pdf_bytes = generate_badge_pdf_buffer(reg)
    
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=badge_{registration_id[:8]}.pdf"}
    )


@app.get("/api/badges/export-stats")
async def get_badge_export_stats():
    """Get stats for badge export (how many per tier, approved, etc.)"""
    pipeline = [
        {"$match": {"status": "approved"}},
        {"$group": {"_id": "$tier", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    stats = await db.registrations.aggregate(pipeline).to_list(10)
    total = sum(s["count"] for s in stats)
    return {
        "total_approved": total,
        "by_tier": {s["_id"]: s["count"] for s in stats if s["_id"]},
        "ready_for_print": total
    }


# ═══════════════════════════════════════════════════════════════════════════════
# INVITATION PDF EXPORT — Template PINT personnalisé
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/invitations/export-single/{badge_id}")
async def export_single_invitation(badge_id: str):
    """Génère une invitation PDF personnalisée pour un badge"""
    from services.pdf_export import generate_invitation_pdf
    from fastapi.responses import StreamingResponse

    badge = await db.cc_badges.find_one({"badge_id": badge_id}, {"_id": 0})
    if not badge:
        # Try from registrations
        badge = await db.registrations.find_one({"id": badge_id}, {"_id": 0})
        if badge:
            badge["type_badge"] = badge.get("tier", "PRO").upper()
            badge["prenom"] = badge.get("full_name", "").split(" ")[0] if badge.get("full_name") else ""
            badge["nom"] = " ".join(badge.get("full_name", "").split(" ")[1:]) if badge.get("full_name") else ""

    if not badge:
        raise HTTPException(status_code=404, detail="Badge non trouvé")

    pdf_buffer = generate_invitation_pdf(badge)
    name_slug = f"{badge.get('prenom', '')}-{badge.get('nom', '')}".strip("-").replace(" ", "_")
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invitation_{name_slug}.pdf"}
    )


@app.get("/api/invitations/export-batch")
async def export_batch_invitations(
    type_badge: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 500
):
    """Génère un PDF multi-pages avec toutes les invitations personnalisées"""
    from services.pdf_export import generate_batch_invitations
    from fastapi.responses import StreamingResponse

    query = {}
    if type_badge:
        query["type_badge"] = type_badge.upper()
    if status:
        query["statut"] = status

    badges = await db.cc_badges.find(query, {"_id": 0}).limit(limit).to_list(limit)

    if not badges:
        raise HTTPException(status_code=404, detail="Aucun badge trouvé pour ces critères")

    pdf_buffer = generate_batch_invitations(badges)
    count = len(badges)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invitations_cc2026_{type_badge or 'all'}_{count}.pdf"}
    )


# ═══════════════════════════════════════════════════════════════════════════════
# SCAN DEBIT — Terrain mode jeton debit + zone validation
# ═══════════════════════════════════════════════════════════════════════════════

class ScanDebitRequest(BaseModel):
    badge_id: Optional[str] = None
    qr_token: Optional[str] = None
    zone: str
    montant: int = 0
    agent_id: Optional[str] = None
    merchant_id: Optional[str] = None

@app.post("/api/scan/debit")
async def scan_debit(req: ScanDebitRequest):
    """Unified scan endpoint: zone validation + jeton debit
    - staff_entree: montant=0, validates access only
    - staff_bar/marchands: montant>0, debits jetons
    """
    # Find badge
    badge = None
    if req.badge_id:
        badge = await db.cc_badges.find_one({"badge_id": req.badge_id}, {"_id": 0})
    elif req.qr_token:
        badge = await db.cc_badges.find_one({"qr_token": req.qr_token}, {"_id": 0})
    
    if not badge:
        return {"status": "error", "code": "NOT_FOUND", "message": "Badge non trouvé", "color": "red"}
    
    badge_id = badge.get("badge_id", "")
    badge_type = badge.get("type_badge", "")
    statut = badge.get("statut", "")
    frek_id = badge.get("frek_id", "")
    
    if statut not in ("ACTIVE", "REMIS"):
        return {"status": "error", "code": "INACTIVE", "message": f"Badge non actif ({statut})", "color": "red"}
    
    # Define zone early (fix UnboundLocalError)
    from routes.badges import ZONE_ACCESS, BADGE_TYPES
    zone = req.zone.upper()
    
    # Étape 6 — Remise J-0 : premier scan à ENTREE_GENERALE → statut REMIS
    if zone == "ENTREE_GENERALE" and statut == "ACTIVE" and req.montant == 0:
        await db.cc_badges.update_one({"badge_id": badge_id}, {"$set": {"statut": "REMIS", "remis": True, "remis_at": datetime.now(timezone.utc).isoformat()}})
        # Notification push admin — badge remis
        notif_remis = {
            "category": "badge",
            "title": "Badge remis",
            "message": f"{badge.get('prenom','')} {badge.get('nom','')} — {badge_type} ({badge_id})",
            "badge_id": badge_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await db.admin_notifications.insert_one({**notif_remis})
        await broadcast_event("admin_notification", notif_remis, channels=["admin_notifications"])
        # Update Baserow mirror
        baserow_id = badge.get("baserow_row_id")
        if baserow_id:
            asyncio.create_task(_br_update_mirror(baserow_id, {**badge, "statut": "REMIS"}))
    
    # Zone access check
    if zone in ZONE_ACCESS:
        if badge_type not in ZONE_ACCESS[zone]:
            return {
                "status": "denied", "code": "ZONE_DENIED", "color": "red",
                "message": f"Accès refusé: {badge_type} interdit en zone {zone}",
                "badge_id": badge_id,
                "person": {"full_name": f"{badge.get('prenom','')} {badge.get('nom','')}", "type_badge": badge_type}
            }
    
    # Jeton debit if montant > 0
    jeton_info = {}
    if req.montant > 0:
        current_solde = badge.get("jetons_solde", 0) or 0
        if current_solde < req.montant:
            return {
                "status": "insufficient", "code": "LOW_BALANCE", "color": "orange",
                "message": f"Solde insuffisant ({current_solde}/{req.montant} Jetons)",
                "badge_id": badge_id, "jetons_solde": current_solde,
                "person": {"full_name": f"{badge.get('prenom','')} {badge.get('nom','')}", "type_badge": badge_type}
            }
        new_solde = current_solde - req.montant
        await db.cc_badges.update_one({"badge_id": badge_id}, {"$set": {"jetons_solde": new_solde}})
        
        # Log transaction
        await db.cc_transactions.insert_one({
            "badge_id": badge_id, "type": "depense_terrain", "jetons": -req.montant,
            "zone": zone, "merchant_id": req.merchant_id, "agent_id": req.agent_id,
            "previous_solde": current_solde, "new_solde": new_solde,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        jeton_info = {"jetons_debited": req.montant, "previous_solde": current_solde, "new_solde": new_solde}
        
        # FREK stage METAMORPHOSE
        if frek_id:
            asyncio.create_task(_frek.record_stage(frek_id, "METAMORPHOSE"))
    
    # Log scan
    await db.cc_scans.insert_one({
        "badge_id": badge_id, "zone": zone, "montant": req.montant,
        "agent_id": req.agent_id, "access": True,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    
    # FREK stage EMISSION if SCENE zone
    if zone == "SCENE_PRINCIPALE" and frek_id:
        asyncio.create_task(_frek.record_stage(frek_id, "EMISSION"))
    
    return {
        "status": "success", "code": "OK", "color": "green",
        "message": f"{'Accès validé' if req.montant == 0 else f'Débit {req.montant}J OK'}",
        "badge_id": badge_id,
        "person": {
            "full_name": f"{badge.get('prenom','')} {badge.get('nom','')}",
            "type_badge": badge_type,
            "type_label": BADGE_TYPES.get(badge_type, badge_type),
            "nfc_enabled": badge.get("nfc_enabled", False),
        },
        "zone": zone,
        **jeton_info,
    }



# ═══════════════════════════════════════════════════════════════════════════════
# BADGE LIFECYCLE — 8 étapes du cycle de vie
# ═══════════════════════════════════════════════════════════════════════════════

class BadgePrintBatchRequest(BaseModel):
    badge_ids: Optional[list] = None
    type_badge: Optional[str] = None

@app.post("/api/badges/print-batch")
async def mark_badges_printed(req: BadgePrintBatchRequest):
    """Étape 5 — Impression batch J-15: marquer les badges comme imprimés"""
    query = {}
    if req.badge_ids:
        query["badge_id"] = {"$in": req.badge_ids}
    elif req.type_badge:
        query["type_badge"] = req.type_badge
    else:
        query["statut"] = {"$in": ["INSCRIT", "ACTIVE"]}

    result = await db.cc_badges.update_many(
        query,
        {"$set": {"imprime": True, "imprime_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"status": "success", "marked_printed": result.modified_count}


@app.post("/api/badges/archive-legacy")
async def archive_frek_legacy():
    """Étape 8 — FREK Legacy: archiver les empreintes culturelles post-événement"""
    badges = await db.cc_badges.find({"statut": "REMIS"}, {"_id": 0}).to_list(5000)
    archived = 0
    for badge in badges:
        frek_id = badge.get("frek_id", "")
        if frek_id and not frek_id.startswith("LOCAL-"):
            result = await _frek.record_stage(frek_id, "LEGACY")
            if result.get("status") == "recorded":
                archived += 1
    return {"status": "success", "archived": archived, "total_remis": len(badges)}


# Badge lifecycle — extracted to /routes/omega.py


# ═══════════════════════════════════════════════════════════════════════════════
# DASHBOARD CC2026 LIVE — Refresh every 10s
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/v1/dashboard/cc2026/live")
async def dashboard_cc2026_live():
    """Live stats for CC2026 dashboard — auto-refresh 10s"""
    # Badge stats
    total_badges = await db.cc_badges.count_documents({})
    active_badges = await db.cc_badges.count_documents({"statut": "ACTIVE"})
    inscrit_badges = await db.cc_badges.count_documents({"statut": "INSCRIT"})
    
    # Jetons stats
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$jetons_solde"}}}]
    jeton_agg = await db.cc_badges.aggregate(pipeline).to_list(1)
    total_jetons = jeton_agg[0]["total"] if jeton_agg else 0
    jeton_valeur = float(os.environ.get("JETON_VALEUR_EURO", "1.50"))
    
    # Transaction stats
    total_transactions = await db.cc_transactions.count_documents({})
    
    # Scan stats (today)
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
    scans_today = await db.cc_scans.count_documents({"timestamp": {"$gte": today}})
    
    # FREK stats
    frek_stats = await _frek.get_cc2026_stats()
    frek_total = frek_stats.get("total_frek_ids", total_badges)
    frek_target = 40000
    
    # Type distribution
    type_pipeline = [{"$group": {"_id": "$type_badge", "count": {"$sum": 1}}}]
    type_dist = await db.cc_badges.aggregate(type_pipeline).to_list(20)
    by_type = {d["_id"]: d["count"] for d in type_dist if d["_id"]}
    
    # Recent scans
    recent_scans = await db.cc_scans.find({}, {"_id": 0}).sort("timestamp", -1).limit(5).to_list(5)
    
    return {
        "badges": {
            "total": total_badges, "active": active_badges, "inscrit": inscrit_badges,
            "by_type": by_type,
        },
        "jetons": {
            "total_circulation": total_jetons,
            "valeur_eur": round(total_jetons * jeton_valeur, 2),
            "transactions": total_transactions,
        },
        "scans": {"today": scans_today, "recent": recent_scans},
        "frek": {
            "total_ids": frek_total, "target": frek_target,
            "progress_pct": round(frek_total / frek_target * 100, 2) if frek_target > 0 else 0,
            "available": frek_stats.get("status") != "unavailable",
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN RECONCILE — Sync Baserow ↔ MongoDB
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/admin/reconcile")
async def admin_reconcile(request: Request):
    """Force sync between MongoDB badges and Baserow mirror"""
    require_admin(request)
    from services.baserow_service import mirror_badge
    
    badges = await db.cc_badges.find({}, {"_id": 0}).to_list(1000)
    synced = 0
    errors = 0
    
    for badge in badges:
        try:
            if not badge.get("baserow_row_id"):
                row_id = await mirror_badge(badge)
                if row_id:
                    await db.cc_badges.update_one(
                        {"badge_id": badge["badge_id"]},
                        {"$set": {"baserow_row_id": row_id}}
                    )
                    synced += 1
                else:
                    errors += 1
            else:
                synced += 1
        except Exception as e:
            logger.error(f"Reconcile error for {badge.get('badge_id')}: {e}")
            errors += 1
    
    # Also reconcile FREK queue
    frek_result = await _frek.reconcile()
    
    return {
        "status": "success",
        "badges_synced": synced,
        "badges_errors": errors,
        "total_badges": len(badges),
        "frek_reconciled": frek_result.get("reconciled", 0),
        "frek_remaining": frek_result.get("remaining", 0),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# BATCH EMAILS SES — Campagnes automatisées J-15, J-1, J-0, J+1
# ═══════════════════════════════════════════════════════════════════════════════

class BatchEmailRequest(BaseModel):
    template: str  # rappel_j15, rappel_j1, jour_j, merci_j1
    type_badge_filter: Optional[str] = None
    dry_run: bool = True

@app.post("/api/admin/batch-email")
async def admin_batch_email(request: Request, req: BatchEmailRequest):
    """Send batch emails to all badge holders (or filtered by type)"""
    require_admin(request)
    from services import ses_service
    
    TEMPLATE_MAP = {
        "rappel_j30": ses_service.send_rappel_j30,
        "rappel_j15": ses_service.send_rappel_j15,
        "rappel_j7": ses_service.send_rappel_j7,
        "rappel_j1": ses_service.send_rappel_j1,
        "jour_j": ses_service.send_jour_j,
        "merci_j1": ses_service.send_merci_j1,
    }
    
    if req.template not in TEMPLATE_MAP:
        raise HTTPException(status_code=400, detail=f"Template invalide. Choix: {list(TEMPLATE_MAP.keys())}")
    
    query = {"statut": {"$in": ["INSCRIT", "ACTIVE", "REMIS"]}}
    if req.type_badge_filter:
        query["type_badge"] = req.type_badge_filter
    
    badges = await db.cc_badges.find(query, {"_id": 0}).to_list(5000)
    
    if req.dry_run:
        return {
            "status": "dry_run",
            "template": req.template,
            "recipients_count": len(badges),
            "filter": req.type_badge_filter,
            "sample": [{"email": b.get("email"), "badge_id": b.get("badge_id"), "prenom": b.get("prenom")} for b in badges[:5]],
        }
    
    send_fn = TEMPLATE_MAP[req.template]
    sent = 0
    failed = 0
    
    for badge in badges:
        email = badge.get("email")
        if not email:
            continue
        try:
            result = await send_fn(
                to_email=email,
                prenom=badge.get("prenom", ""),
                badge_id=badge.get("badge_id", ""),
            )
            if result.get("status") == "sent":
                sent += 1
            else:
                failed += 1
        except Exception as e:
            logger.error(f"Batch email error for {email}: {e}")
            failed += 1
    
    return {
        "status": "completed",
        "template": req.template,
        "sent": sent,
        "failed": failed,
        "total": len(badges),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# EMAIL ENDPOINTS — send, campaign, stats, qr-generate, templates
# ═══════════════════════════════════════════════════════════════════════════════

class EmailSendRequest(BaseModel):
    to_email: str
    template: str
    badge_id: Optional[str] = None
    custom_subject: Optional[str] = None
    custom_html: Optional[str] = None

@app.post("/api/email/send")
async def email_send(req: EmailSendRequest):
    """Send individual email using a template or custom HTML"""
    from services import ses_service
    
    if req.custom_html and req.custom_subject:
        result = await ses_service.send_individual(req.to_email, req.custom_subject, req.custom_html)
        return {"status": result.get("status"), "message_id": result.get("message_id")}
    
    if req.template not in ses_service.TEMPLATE_REGISTRY:
        raise HTTPException(status_code=400, detail=f"Template inconnu. Choix: {list(ses_service.TEMPLATE_REGISTRY.keys())}")
    
    badge = None
    if req.badge_id:
        badge = await db.cc_badges.find_one({"badge_id": req.badge_id}, {"_id": 0})
    elif req.to_email:
        badge = await db.cc_badges.find_one({"email": req.to_email}, {"_id": 0})
    
    if not badge:
        raise HTTPException(status_code=404, detail="Badge non trouvé pour cet email/badge_id")
    
    prenom = badge.get("prenom", "")
    badge_id = badge.get("badge_id", "")
    
    tmpl = ses_service.TEMPLATE_REGISTRY[req.template]
    required = tmpl["requires"]
    
    if set(required) <= {"prenom", "badge_id"}:
        result = await tmpl["fn"](to_email=req.to_email, prenom=prenom, badge_id=badge_id)
    elif "frek_id" in required:
        result = await tmpl["fn"](to_email=req.to_email, prenom=prenom, badge_id=badge_id,
                                   frek_id=badge.get("frek_id", ""), qr_token=badge.get("qr_token", ""))
    else:
        result = await tmpl["fn"](to_email=req.to_email, prenom=prenom, badge_id=badge_id)
    
    return {"status": result.get("status"), "template": req.template, "message_id": result.get("message_id")}


class EmailCampaignRequest(BaseModel):
    template: str
    type_badge_filter: Optional[str] = None
    statut_filter: Optional[str] = None
    dry_run: bool = True

@app.post("/api/email/campaign")
async def email_campaign(req: EmailCampaignRequest):
    """Launch segmented email campaign"""
    from services import ses_service
    
    ALL_TEMPLATES = {**ses_service.TEMPLATE_REGISTRY}
    if req.template not in ALL_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"Template: {list(ALL_TEMPLATES.keys())}")
    
    query = {"statut": {"$in": ["INSCRIT", "ACTIVE", "REMIS"]}}
    if req.type_badge_filter:
        query["type_badge"] = req.type_badge_filter
    if req.statut_filter:
        query["statut"] = req.statut_filter
    
    badges = await db.cc_badges.find(query, {"_id": 0}).to_list(5000)
    
    if req.dry_run:
        return {
            "status": "dry_run", "template": req.template,
            "recipients_count": len(badges),
            "filter": {"type_badge": req.type_badge_filter, "statut": req.statut_filter},
            "sample": [{"email": b.get("email"), "badge_id": b.get("badge_id"), "prenom": b.get("prenom")} for b in badges[:5]],
        }
    
    tmpl = ALL_TEMPLATES[req.template]
    sent, failed = 0, 0
    for badge in badges:
        email = badge.get("email")
        if not email:
            continue
        try:
            kwargs = {"to_email": email, "prenom": badge.get("prenom", ""), "badge_id": badge.get("badge_id", "")}
            if "frek_id" in tmpl["requires"]:
                kwargs["frek_id"] = badge.get("frek_id", "")
                kwargs["qr_token"] = badge.get("qr_token", "")
            result = await tmpl["fn"](**kwargs)
            if result.get("status") == "sent":
                sent += 1
            else:
                failed += 1
        except Exception as e:
            logger.error(f"Campaign email error for {email}: {e}")
            failed += 1
    
    await db.cc_email_campaigns.insert_one({
        "template": req.template, "sent": sent, "failed": failed,
        "total": len(badges), "filters": {"type_badge": req.type_badge_filter},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    
    return {"status": "completed", "template": req.template, "sent": sent, "failed": failed, "total": len(badges)}


@app.get("/api/email/stats")
async def email_stats():
    """Get SES sending statistics (deliverability, bounces, etc.)"""
    from services.ses_service import get_ses_send_stats
    ses_stats = get_ses_send_stats()
    
    campaigns = await db.cc_email_campaigns.find({}, {"_id": 0}).sort("timestamp", -1).limit(20).to_list(20)
    
    return {"ses": ses_stats, "campaigns": campaigns}


@app.get("/api/email/templates")
async def email_templates():
    """List all available email templates"""
    from services.ses_service import TEMPLATE_REGISTRY
    templates = []
    for key, val in TEMPLATE_REGISTRY.items():
        templates.append({"id": key, "subject": val["subject"], "requires": val["requires"]})
    return {"templates": templates}


@app.post("/api/email/qr-generate")
async def email_qr_generate(badge_id: str = ""):
    """Generate QR code for a badge and return base64"""
    badge = await db.cc_badges.find_one({"badge_id": badge_id}, {"_id": 0})
    if not badge:
        raise HTTPException(status_code=404, detail="Badge non trouvé")
    
    from services.ses_service import _generate_qr_base64
    qr_token = badge.get("qr_token", "")
    qr_url = f"{os.environ.get('BASE_URL', 'https://kiltikonet.fr')}/activer-badge/{qr_token}"
    qr_b64 = _generate_qr_base64(qr_url)
    
    return {"badge_id": badge_id, "qr_url": qr_url, "qr_base64": qr_b64[:50] + "...", "full_length": len(qr_b64)}


# NFC TAP + Remboursement — extracted to /routes/omega.py


# ═══════════════════════════════════════════════════════════════════════════════
# EXPORT CSV/PDF — Stats, badges, transactions
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/stats/export")
async def stats_export(format: str = "csv"):
    """Export all badge data as CSV for Twina batch print or reporting"""
    import csv as csv_mod
    
    badges = await db.cc_badges.find({}, {"_id": 0}).to_list(5000)
    
    if format == "json":
        return {"badges": badges, "total": len(badges), "exported_at": datetime.now(timezone.utc).isoformat()}
    
    # CSV export
    output = io.StringIO()
    fields = ["badge_id", "frek_id", "prenom", "nom", "email", "type_badge", "statut",
              "nfc_enabled", "nfc_uid", "jetons_solde", "organisation", "date_emission", "imprime", "remis"]
    writer = csv_mod.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for b in badges:
        writer.writerow(b)
    
    csv_content = output.getvalue()
    
    from fastapi.responses import Response
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=cc2026_badges_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"}
    )


@app.get("/api/stats/export/transactions")
async def export_transactions(format: str = "csv"):
    """Export all transactions as CSV"""
    import csv as csv_mod
    
    txs = await db.cc_transactions.find({}, {"_id": 0}).sort("timestamp", -1).to_list(10000)
    
    if format == "json":
        return {"transactions": txs, "total": len(txs)}
    
    output = io.StringIO()
    fields = ["badge_id", "type", "jetons", "zone", "merchant_id", "agent_id",
              "previous_solde", "new_solde", "description", "timestamp"]
    writer = csv_mod.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for tx in txs:
        writer.writerow(tx)
    
    from fastapi.responses import Response
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=cc2026_transactions_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"}
    )


@app.get("/api/stats/export/scans")
async def export_scans():
    """Export all scan logs as CSV"""
    import csv as csv_mod
    
    scans = await db.cc_scans.find({}, {"_id": 0}).sort("timestamp", -1).to_list(10000)
    
    output = io.StringIO()
    fields = ["badge_id", "zone", "montant", "agent_id", "access", "timestamp"]
    writer = csv_mod.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for s in scans:
        writer.writerow(s)
    
    from fastapi.responses import Response
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=cc2026_scans_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"}
    )


@app.get("/api/stats/live")
async def stats_live():
    """Alias for /api/v1/dashboard/cc2026/live — backward compatible"""
    return await dashboard_cc2026_live()


# ═══════════════════════════════════════════════════════════════════════════════
# HEATMAP — Fréquentation par zone
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/stats/heatmap")
async def stats_heatmap():
    """Get scan frequency by zone for heatmap visualization"""
    pipeline = [
        {"$group": {"_id": "$zone", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    zone_data = await db.cc_scans.aggregate(pipeline).to_list(20)
    
    # Also get hourly distribution
    hour_pipeline = [
        {"$addFields": {"hour": {"$substr": ["$timestamp", 11, 2]}}},
        {"$group": {"_id": {"zone": "$zone", "hour": "$hour"}, "count": {"$sum": 1}}},
        {"$sort": {"_id.hour": 1}},
    ]
    hourly = await db.cc_scans.aggregate(hour_pipeline).to_list(200)
    
    zones = {}
    for zd in zone_data:
        z = zd["_id"]
        if z:
            zones[z] = {"total_scans": zd["count"], "hourly": {}}
    
    for h in hourly:
        z = h["_id"].get("zone", "")
        hr = h["_id"].get("hour", "")
        if z in zones:
            zones[z]["hourly"][hr] = h["count"]
    
    max_scans = max((z["total_scans"] for z in zones.values()), default=1)
    for z in zones.values():
        z["heat_level"] = round(z["total_scans"] / max_scans * 100) if max_scans > 0 else 0
    
    return {"zones": zones, "total_scans": sum(z["total_scans"] for z in zones.values())}


class AnalyticsEvent(BaseModel):
    eventType: str
    sessionId: str
    userId: Optional[str] = None
    timestamp: str
    data: dict

class AnalyticsBatch(BaseModel):
    events: List[AnalyticsEvent]

@app.post("/api/analytics/batch")
async def track_analytics_batch(batch: AnalyticsBatch, req: Request):
    """Store batch of analytics events"""
    client_ip = req.headers.get("x-forwarded-for", req.headers.get("x-real-ip", req.client.host if req.client else "unknown"))
    if client_ip and "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()
    user_agent = req.headers.get("user-agent", "")
    
    events_to_insert = []
    notifications_to_create = []
    
    for event in batch.events:
        event_doc = {
            "id": str(uuid.uuid4()),
            "event_type": event.eventType,
            "session_id": event.sessionId,
            "user_id": event.userId,
            "timestamp": event.timestamp,
            "data": event.data,
            "ip": client_ip,
            "user_agent": user_agent,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        events_to_insert.append(event_doc)
        
        # Check for notification-worthy events
        if event.eventType == 'data_modification':
            if event.data.get('operation') == 'create':
                entity = event.data.get('entity')
                if entity == 'registration':
                    notifications_to_create.append({
                        "type": "new_registration",
                        "title": "Nouvelle inscription",
                        "message": "Un nouveau professionnel s'est inscrit",
                        "data": event.data,
                        "priority": "medium"
                    })
                elif entity == 'opportunity':
                    notifications_to_create.append({
                        "type": "new_opportunity",
                        "title": "Nouvelle opportunité",
                        "message": "Une nouvelle opportunité a été publiée",
                        "data": event.data,
                        "priority": "medium"
                    })
        
        # Check for anomalies
        if event.eventType == 'anomaly':
            notifications_to_create.append({
                "type": "anomaly_detected",
                "title": f"Anomalie détectée: {event.data.get('type', 'unknown')}",
                "message": str(event.data.get('details', '')),
                "data": event.data,
                "priority": event.data.get('severity', 'medium')
            })
    
    # Batch insert events
    if events_to_insert:
        await db.analytics_events.insert_many(events_to_insert)
    
    # Create team notifications
    for notif in notifications_to_create:
        await create_team_notification(notif)
    
    return {"success": True, "count": len(events_to_insert)}

async def create_team_notification(notif_data):
    """Create notification for the team"""
    notification = {
        "id": str(uuid.uuid4()),
        "type": notif_data["type"],
        "title": notif_data["title"],
        "message": notif_data["message"],
        "data": notif_data.get("data", {}),
        "priority": notif_data.get("priority", "medium"),
        "read": False,
        "read_by": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.team_notifications.insert_one(notification)
    return notification

@app.get("/api/analytics/dashboard")
async def get_analytics_dashboard(request: Request, days: int = 7):
    """Get analytics dashboard data for admin"""
    require_admin(request)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Aggregate analytics
    pipeline = [
        {"$match": {"created_at": {"$gte": cutoff.isoformat()}}},
        {"$group": {
            "_id": "$event_type",
            "count": {"$sum": 1}
        }}
    ]
    
    event_counts = await db.analytics_events.aggregate(pipeline).to_list(100)
    
    # Page views
    page_views_pipeline = [
        {"$match": {"event_type": "page_view", "created_at": {"$gte": cutoff.isoformat()}}},
        {"$group": {
            "_id": "$data.page",
            "views": {"$sum": 1},
            "unique_sessions": {"$addToSet": "$session_id"}
        }},
        {"$project": {
            "page": "$_id",
            "views": 1,
            "unique_visitors": {"$size": "$unique_sessions"}
        }},
        {"$sort": {"views": -1}},
        {"$limit": 20}
    ]
    
    page_stats = await db.analytics_events.aggregate(page_views_pipeline).to_list(20)
    
    # User activity
    active_users_pipeline = [
        {"$match": {"created_at": {"$gte": cutoff.isoformat()}, "user_id": {"$ne": None}}},
        {"$group": {
            "_id": "$user_id",
            "events": {"$sum": 1},
            "last_activity": {"$max": "$created_at"}
        }},
        {"$sort": {"events": -1}},
        {"$limit": 10}
    ]
    
    active_users = await db.analytics_events.aggregate(active_users_pipeline).to_list(10)
    
    # Intro section tracking
    intro_sections_pipeline = [
        {"$match": {"event_type": "intro_section_click"}},
        {"$group": {
            "_id": "$data.section",
            "clicks": {"$sum": 1}
        }},
        {"$sort": {"clicks": -1}}
    ]
    
    intro_sections = await db.analytics_events.aggregate(intro_sections_pipeline).to_list(20)
    
    # Pro space activity
    pro_activity_pipeline = [
        {"$match": {
            "event_type": {"$in": ["pro_profile_view", "pro_connection", "opportunity_interaction", "event_interaction"]},
            "created_at": {"$gte": cutoff.isoformat()}
        }},
        {"$group": {
            "_id": "$event_type",
            "count": {"$sum": 1}
        }}
    ]
    
    pro_activity = await db.analytics_events.aggregate(pro_activity_pipeline).to_list(10)
    
    return {
        "period_days": days,
        "event_summary": {e["_id"]: e["count"] for e in event_counts},
        "page_stats": page_stats,
        "active_users": active_users,
        "intro_sections": intro_sections,
        "pro_activity": pro_activity,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


@app.get("/api/analytics/site")
async def get_site_analytics(request: Request, days: int = 30):
    """Comprehensive site analytics - traffic, visitors, pages, devices"""
    require_workspace(request)
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)
    cutoff_iso = cutoff.isoformat()
    
    # Total events all time
    total_events_all = await db.analytics_events.count_documents({})
    total_page_views_all = await db.analytics_events.count_documents({"event_type": "page_view"})
    
    # Events in period
    total_events = await db.analytics_events.count_documents({"created_at": {"$gte": cutoff_iso}})
    total_page_views = await db.analytics_events.count_documents({"event_type": "page_view", "created_at": {"$gte": cutoff_iso}})
    
    # Unique sessions in period
    unique_sessions_pipeline = [
        {"$match": {"event_type": "page_view", "created_at": {"$gte": cutoff_iso}}},
        {"$group": {"_id": "$session_id"}},
        {"$count": "total"}
    ]
    unique_result = await db.analytics_events.aggregate(unique_sessions_pipeline).to_list(1)
    unique_visitors = unique_result[0]["total"] if unique_result else 0
    
    # Unique IPs in period
    unique_ips_pipeline = [
        {"$match": {"event_type": "page_view", "created_at": {"$gte": cutoff_iso}, "ip": {"$ne": None}}},
        {"$group": {"_id": "$ip"}},
        {"$count": "total"}
    ]
    ip_result = await db.analytics_events.aggregate(unique_ips_pipeline).to_list(1)
    unique_ips = ip_result[0]["total"] if ip_result else 0
    
    # Daily traffic breakdown
    daily_pipeline = [
        {"$match": {"event_type": "page_view", "created_at": {"$gte": cutoff_iso}}},
        {"$addFields": {"date_str": {"$substr": ["$created_at", 0, 10]}}},
        {"$group": {
            "_id": "$date_str",
            "views": {"$sum": 1},
            "sessions": {"$addToSet": "$session_id"}
        }},
        {"$project": {
            "date": "$_id", "_id": 0,
            "views": 1,
            "visitors": {"$size": "$sessions"}
        }},
        {"$sort": {"date": 1}}
    ]
    daily_stats = await db.analytics_events.aggregate(daily_pipeline).to_list(60)
    
    # Top pages
    pages_pipeline = [
        {"$match": {"event_type": "page_view", "created_at": {"$gte": cutoff_iso}}},
        {"$group": {
            "_id": "$data.page",
            "views": {"$sum": 1},
            "sessions": {"$addToSet": "$session_id"}
        }},
        {"$project": {
            "page": "$_id", "_id": 0,
            "views": 1,
            "visitors": {"$size": "$sessions"}
        }},
        {"$sort": {"views": -1}},
        {"$limit": 15}
    ]
    top_pages = await db.analytics_events.aggregate(pages_pipeline).to_list(15)
    
    # Device breakdown (mobile vs desktop)
    device_pipeline = [
        {"$match": {"event_type": "page_view", "created_at": {"$gte": cutoff_iso}, "data.device.isMobile": {"$exists": True}}},
        {"$group": {
            "_id": "$data.device.isMobile",
            "count": {"$sum": 1}
        }}
    ]
    device_stats = await db.analytics_events.aggregate(device_pipeline).to_list(10)
    mobile = sum(d["count"] for d in device_stats if d["_id"] is True)
    desktop = sum(d["count"] for d in device_stats if d["_id"] is False)
    
    # Referrer sources
    referrer_pipeline = [
        {"$match": {"event_type": "page_view", "created_at": {"$gte": cutoff_iso}, "$and": [{"data.referrer": {"$ne": ""}}, {"data.referrer": {"$ne": None}}]}},
        {"$group": {
            "_id": "$data.referrer",
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    referrers = await db.analytics_events.aggregate(referrer_pipeline).to_list(10)
    
    # Hourly distribution (for current day)
    today_str = now.strftime("%Y-%m-%d")
    hourly_pipeline = [
        {"$match": {"event_type": "page_view", "created_at": {"$gte": today_str}}},
        {"$addFields": {"hour": {"$substr": ["$created_at", 11, 2]}}},
        {"$group": {"_id": "$hour", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    hourly_stats = await db.analytics_events.aggregate(hourly_pipeline).to_list(24)
    
    # Recent activity (last 20 page views)
    recent = await db.analytics_events.find(
        {"event_type": "page_view"},
        {"_id": 0, "data.page": 1, "ip": 1, "created_at": 1, "session_id": 1, "data.device.isMobile": 1}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    # Average pages per session
    avg_pages_pipeline = [
        {"$match": {"event_type": "page_view", "created_at": {"$gte": cutoff_iso}}},
        {"$group": {"_id": "$session_id", "pages": {"$sum": 1}}},
        {"$group": {"_id": None, "avg": {"$avg": "$pages"}}}
    ]
    avg_result = await db.analytics_events.aggregate(avg_pages_pipeline).to_list(1)
    avg_pages = round(avg_result[0]["avg"], 1) if avg_result else 0
    
    return {
        "period_days": days,
        "summary": {
            "total_page_views": total_page_views,
            "total_page_views_all_time": total_page_views_all,
            "unique_visitors": unique_visitors,
            "unique_ips": unique_ips,
            "total_events": total_events,
            "total_events_all_time": total_events_all,
            "avg_pages_per_session": avg_pages,
        },
        "daily": daily_stats,
        "top_pages": top_pages,
        "devices": {"mobile": mobile, "desktop": desktop},
        "referrers": [{"source": r["_id"], "count": r["count"]} for r in referrers],
        "hourly_today": [{"hour": h["_id"], "count": h["count"]} for h in hourly_stats],
        "recent_activity": recent,
        "generated_at": now.isoformat()
    }

@app.get("/api/analytics/behavior/{user_id}")
async def get_user_behavior(request: Request, user_id: str, days: int = 30):
    """Get detailed behavior analysis for a specific user"""
    require_workspace(request)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
    events = await db.analytics_events.find(
        {"user_id": user_id, "created_at": {"$gte": cutoff.isoformat()}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    # Analyze patterns
    event_types = {}
    pages_visited = set()
    total_time = 0
    interactions = []
    
    for event in events:
        event_type = event.get("event_type")
        event_types[event_type] = event_types.get(event_type, 0) + 1
        
        if event_type == "page_view":
            pages_visited.add(event.get("data", {}).get("page"))
        elif event_type == "page_exit":
            total_time += event.get("data", {}).get("timeSpent", 0)
        elif event_type in ["click", "admin_action", "opportunity_interaction"]:
            interactions.append(event)
    
    return {
        "user_id": user_id,
        "period_days": days,
        "total_events": len(events),
        "event_breakdown": event_types,
        "pages_visited": list(pages_visited),
        "total_time_ms": total_time,
        "recent_interactions": interactions[:20],
        "analyzed_at": datetime.now(timezone.utc).isoformat()
    }

# ═══════════════════════════════════════════════════════════════════════════════
# TEAM NOTIFICATIONS - Alertes pour l'équipe
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/team/notifications")
async def get_team_notifications(limit: int = 50, unread_only: bool = False):
    """Get team notifications"""
    query = {"read": False} if unread_only else {}
    
    notifications = await db.team_notifications.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    # Count unread
    unread_count = await db.team_notifications.count_documents({"read": False})
    
    return {
        "notifications": notifications,
        "unread_count": unread_count
    }

@app.post("/api/team/notifications/{notification_id}/read")
async def mark_team_notification_read(notification_id: str, user_id: str = None):
    """Mark notification as read"""
    update = {"read": True}
    if user_id:
        update["$addToSet"] = {"read_by": user_id}
    
    await db.team_notifications.update_one(
        {"id": notification_id},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True}

@app.post("/api/team/notifications/mark-all-read")
async def mark_all_team_notifications_read():
    """Mark all notifications as read"""
    await db.team_notifications.update_many(
        {"read": False},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True}

@app.post("/api/team/notifications/create")
async def create_manual_notification(data: dict):
    """Create a manual team notification"""
    notification = await create_team_notification({
        "type": data.get("type", "manual"),
        "title": data.get("title", "Notification"),
        "message": data.get("message", ""),
        "data": data.get("data", {}),
        "priority": data.get("priority", "medium")
    })
    return {"success": True, "notification_id": notification["id"]}

# ═══════════════════════════════════════════════════════════════════════════════
# SMART RECOMMENDATIONS - Matchmaking & Recommendations
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/pro/recommendations/{profile_id}")
async def get_pro_recommendations(profile_id: str, limit: int = 10):
    """Get personalized recommendations for a pro user based on behavior"""
    
    # Get user's profile
    profile = await db.registrations.find_one({"id": profile_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Get user's interaction history
    interactions = await db.analytics_events.find(
        {"user_id": profile_id, "event_type": {"$in": ["opportunity_interaction", "pro_profile_view", "matching_search"]}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Extract interests from interactions
    viewed_profiles = set()
    opportunity_ids_to_fetch = []
    search_criteria = {}
    
    # First pass: collect data without N+1 queries
    for event in interactions:
        data = event.get("data", {})
        if event["event_type"] == "pro_profile_view":
            viewed_profiles.add(data.get("viewedProfileId"))
        elif event["event_type"] == "opportunity_interaction":
            if data.get("action") == "apply":
                opp_id = data.get("opportunityId")
                if opp_id:
                    opportunity_ids_to_fetch.append(opp_id)
        elif event["event_type"] == "matching_search":
            for k, v in data.get("criteria", {}).items():
                search_criteria[k] = v
    
    # Batch fetch opportunities to avoid N+1
    applied_opportunity_types = set()
    if opportunity_ids_to_fetch:
        opportunities = await db.pro_opportunities.find(
            {"id": {"$in": opportunity_ids_to_fetch}},
            {"_id": 0, "id": 1, "type": 1}
        ).to_list(100)
        for opp in opportunities:
            if opp.get("type"):
                applied_opportunity_types.add(opp.get("type"))
    
    # Build recommendation query
    profile_type = profile.get("profile_type")
    country = profile.get("country")
    expertise = profile.get("expertise_tags", [])
    
    # Find matching profiles (potential connections)
    profile_query = {
        "id": {"$ne": profile_id, "$nin": list(viewed_profiles)},
        "status": "approved",
        "$or": [
            {"country": country},
            {"expertise_tags": {"$in": expertise}},
            {"profile_type": {"$in": get_complementary_types(profile_type)}}
        ]
    }
    
    recommended_profiles = await db.registrations.find(
        profile_query,
        {"_id": 0, "id": 1, "full_name": 1, "organization_name": 1, "profile_type": 1, "country": 1, "expertise_tags": 1}
    ).limit(limit).to_list(limit)
    
    # Find matching opportunities
    opp_query = {"active": True}
    if applied_opportunity_types:
        opp_query["type"] = {"$in": list(applied_opportunity_types)}
    
    recommended_opportunities = await db.pro_opportunities.find(
        opp_query,
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Find relevant events
    recommended_events = await db.pro_events.find(
        {"active": True},
        {"_id": 0}
    ).sort("date", 1).limit(3).to_list(3)
    
    return {
        "profile_id": profile_id,
        "recommended_profiles": recommended_profiles,
        "recommended_opportunities": recommended_opportunities,
        "recommended_events": recommended_events,
        "based_on": {
            "profile_type": profile_type,
            "expertise": expertise,
            "interaction_count": len(interactions)
        }
    }

def get_complementary_types(profile_type):
    """Get complementary profile types for matchmaking"""
    complementary = {
        "artist": ["label", "agent", "media", "institution"],
        "label": ["artist", "media", "agent"],
        "agent": ["artist", "label", "institution"],
        "media": ["artist", "label", "institution"],
        "institution": ["artist", "label", "agent", "media"]
    }
    return complementary.get(profile_type, [])


# ═══════════════════════════════════════════════════════════════════════════════
# SMART ENGINE - Intelligence système & Notifications automatiques
# ═══════════════════════════════════════════════════════════════════════════════

class SmartAlertRule(BaseModel):
    """Smart alert rule for automatic notifications"""
    id: Optional[str] = None
    name: str
    condition_type: str  # traffic_spike, low_engagement, deadline_approaching, anomaly
    threshold: float
    comparison: str  # gt, lt, eq
    notification_target: str = "laurent"
    notification_priority: str = "medium"
    enabled: bool = True
    cooldown_minutes: int = 60  # Minimum time between alerts

class SmartEngineStats(BaseModel):
    """Smart engine statistics response"""
    total_events_24h: int
    active_sessions: int
    alerts_triggered: int
    recommendations_generated: int
    top_actions: list
    anomalies_detected: list

# Default alert rules
DEFAULT_ALERT_RULES = [
    {
        "id": "traffic_spike",
        "name": "Pic de trafic",
        "condition_type": "traffic_spike",
        "threshold": 200,  # 200% of normal
        "comparison": "gt",
        "notification_target": "laurent",
        "notification_priority": "medium",
        "enabled": True,
        "cooldown_minutes": 60
    },
    {
        "id": "low_conversion",
        "name": "Conversion faible",
        "condition_type": "low_conversion",
        "threshold": 10,  # Below 10%
        "comparison": "lt",
        "notification_target": "laurent",
        "notification_priority": "high",
        "enabled": True,
        "cooldown_minutes": 240
    },
    {
        "id": "deadline_24h",
        "name": "Deadline J-1",
        "condition_type": "deadline_approaching",
        "threshold": 24,  # 24 hours before
        "comparison": "lt",
        "notification_target": "all",
        "notification_priority": "high",
        "enabled": True,
        "cooldown_minutes": 1440
    },
    {
        "id": "new_registration_batch",
        "name": "Vague d'inscriptions",
        "condition_type": "registration_batch",
        "threshold": 10,  # 10+ in 1 hour
        "comparison": "gt",
        "notification_target": "laurent",
        "notification_priority": "medium",
        "enabled": True,
        "cooldown_minutes": 120
    },
    {
        "id": "error_spike",
        "name": "Pic d'erreurs",
        "condition_type": "error_spike",
        "threshold": 5,  # 5+ errors in 10 minutes
        "comparison": "gt",
        "notification_target": "laurent",
        "notification_priority": "critical",
        "enabled": True,
        "cooldown_minutes": 30
    }
]

@app.get("/api/smart-engine/stats")
async def get_smart_engine_stats(request: Request):
    """Get Smart Engine statistics and health"""
    require_workspace(request)
    now = datetime.now(timezone.utc)
    yesterday = now - timedelta(days=1)
    last_hour = now - timedelta(hours=1)
    
    # Total events in 24h
    total_events = await db.analytics_events.count_documents({
        "created_at": {"$gte": yesterday.isoformat()}
    })
    
    # Active sessions (events in last hour)
    active_sessions_pipeline = [
        {"$match": {"created_at": {"$gte": last_hour.isoformat()}}},
        {"$group": {"_id": "$session_id"}},
        {"$count": "total"}
    ]
    active_result = await db.analytics_events.aggregate(active_sessions_pipeline).to_list(1)
    active_sessions = active_result[0]["total"] if active_result else 0
    
    # Alerts triggered today
    alerts_today = await db.team_notifications.count_documents({
        "created_at": {"$gte": now.replace(hour=0, minute=0, second=0).isoformat()},
        "type": {"$in": ["anomaly_detected", "traffic_spike", "deadline_alert"]}
    })
    
    # Recommendations generated
    recommendations = await db.analytics_events.count_documents({
        "event_type": "recommendation_served",
        "created_at": {"$gte": yesterday.isoformat()}
    })
    
    # Top actions
    top_actions_pipeline = [
        {"$match": {"created_at": {"$gte": yesterday.isoformat()}}},
        {"$group": {"_id": "$event_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_actions = await db.analytics_events.aggregate(top_actions_pipeline).to_list(10)
    
    # Recent anomalies
    anomalies = await db.analytics_events.find(
        {"event_type": "anomaly", "created_at": {"$gte": yesterday.isoformat()}},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "total_events_24h": total_events,
        "active_sessions": active_sessions,
        "alerts_triggered": alerts_today,
        "recommendations_generated": recommendations,
        "top_actions": [{"type": a["_id"], "count": a["count"]} for a in top_actions],
        "anomalies_detected": anomalies,
        "engine_status": "healthy",
        "last_check": now.isoformat()
    }

@app.get("/api/smart-engine/alerts/rules")
async def get_alert_rules(request: Request):
    """Get all alert rules"""
    require_workspace(request)
    rules = await db.smart_alert_rules.find({}, {"_id": 0}).to_list(100)
    if not rules:
        # Initialize with defaults
        for rule in DEFAULT_ALERT_RULES:
            await db.smart_alert_rules.insert_one(rule)
        return DEFAULT_ALERT_RULES
    return rules

@app.post("/api/smart-engine/alerts/rules")
async def create_alert_rule(request: Request, rule: SmartAlertRule):
    """Create a new alert rule"""
    require_admin(request)
    rule_doc = rule.dict()
    rule_doc["id"] = rule_doc.get("id") or str(uuid.uuid4())
    rule_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.smart_alert_rules.insert_one(rule_doc)
    return {"success": True, "rule": rule_doc}

@app.patch("/api/smart-engine/alerts/rules/{rule_id}")
async def update_alert_rule(request: Request, rule_id: str, enabled: bool = None):
    """Update an alert rule (enable/disable)"""
    require_admin(request)
    update = {}
    if enabled is not None:
        update["enabled"] = enabled
    
    if update:
        await db.smart_alert_rules.update_one(
            {"id": rule_id},
            {"$set": update}
        )
    return {"success": True}

@app.post("/api/smart-engine/check-alerts")
async def check_and_trigger_alerts(request: Request):
    """Check all alert conditions and trigger notifications"""
    require_admin(request)
    now = datetime.now(timezone.utc)
    alerts_triggered = []
    
    rules = await db.smart_alert_rules.find({"enabled": True}, {"_id": 0}).to_list(100)
    
    for rule in rules:
        # Check cooldown
        last_alert = await db.smart_alert_history.find_one(
            {"rule_id": rule["id"]},
            sort=[("triggered_at", -1)]
        )
        
        if last_alert:
            cooldown_end = datetime.fromisoformat(last_alert["triggered_at"]) + timedelta(minutes=rule.get("cooldown_minutes", 60))
            if now < cooldown_end:
                continue
        
        # Check condition
        triggered = False
        details = {}
        
        if rule["condition_type"] == "traffic_spike":
            # Compare last hour to average
            last_hour_count = await db.analytics_events.count_documents({
                "created_at": {"$gte": (now - timedelta(hours=1)).isoformat()}
            })
            avg_count = await db.analytics_events.count_documents({
                "created_at": {"$gte": (now - timedelta(days=7)).isoformat()}
            }) / (7 * 24)  # Average per hour
            
            if avg_count > 0 and (last_hour_count / avg_count * 100) > rule["threshold"]:
                triggered = True
                details = {"current": last_hour_count, "average": round(avg_count, 1), "ratio": round(last_hour_count / avg_count * 100, 1)}
        
        elif rule["condition_type"] == "low_conversion":
            # Check registration to approval ratio
            total_regs = await db.registrations.count_documents({})
            approved = await db.registrations.count_documents({"status": "approved"})
            conversion = (approved / total_regs * 100) if total_regs > 0 else 0
            
            if conversion < rule["threshold"]:
                triggered = True
                details = {"conversion_rate": round(conversion, 1), "total": total_regs, "approved": approved}
        
        elif rule["condition_type"] == "registration_batch":
            # Check registrations in last hour
            recent_regs = await db.registrations.count_documents({
                "created_at": {"$gte": (now - timedelta(hours=1)).isoformat()}
            })
            
            if recent_regs >= rule["threshold"]:
                triggered = True
                details = {"count": recent_regs, "period": "1 hour"}
        
        elif rule["condition_type"] == "error_spike":
            # Check errors in last 10 minutes
            error_count = await db.analytics_events.count_documents({
                "event_type": "error",
                "created_at": {"$gte": (now - timedelta(minutes=10)).isoformat()}
            })
            
            if error_count >= rule["threshold"]:
                triggered = True
                details = {"error_count": error_count, "period": "10 minutes"}
        
        elif rule["condition_type"] == "deadline_approaching":
            # Check tasks with deadlines in threshold hours — simplified for now
            details = {"threshold_hours": rule["threshold"]}
        
        if triggered:
            # Create notification
            notification = {
                "id": str(uuid.uuid4()),
                "type": f"smart_alert_{rule['condition_type']}",
                "title": f"🔔 {rule['name']}",
                "message": format_alert_message(rule["condition_type"], details),
                "data": details,
                "priority": rule["notification_priority"],
                "rule_id": rule["id"],
                "read": False,
                "read_by": [],
                "created_at": now.isoformat()
            }
            
            await db.team_notifications.insert_one(notification)
            
            # Log alert history
            await db.smart_alert_history.insert_one({
                "rule_id": rule["id"],
                "triggered_at": now.isoformat(),
                "details": details
            })
            
            alerts_triggered.append({
                "rule": rule["name"],
                "details": details
            })
    
    return {"alerts_triggered": len(alerts_triggered), "details": alerts_triggered}

def format_alert_message(condition_type, details):
    """Format alert message based on condition type"""
    messages = {
        "traffic_spike": f"Trafic {details.get('ratio', 0)}% au-dessus de la normale ({details.get('current', 0)} événements)",
        "low_conversion": f"Taux de conversion à {details.get('conversion_rate', 0)}% ({details.get('approved', 0)}/{details.get('total', 0)})",
        "registration_batch": f"{details.get('count', 0)} nouvelles inscriptions en {details.get('period', '1h')}",
        "error_spike": f"{details.get('error_count', 0)} erreurs en {details.get('period', '10min')} - Vérifier les logs",
        "deadline_approaching": f"Deadline dans moins de {details.get('threshold_hours', 24)}h"
    }
    return messages.get(condition_type, "Alerte déclenchée")

@app.get("/api/smart-engine/insights")
async def get_smart_insights(request: Request):
    """Get AI-generated insights from analytics data"""
    require_workspace(request)
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    
    # Engagement trends
    daily_events_pipeline = [
        {"$match": {"created_at": {"$gte": week_ago.isoformat()}}},
        {"$addFields": {
            "date": {"$dateToString": {"format": "%Y-%m-%d", "date": {"$dateFromString": {"dateString": "$created_at"}}}}
        }},
        {"$group": {"_id": "$date", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    daily_events = await db.analytics_events.aggregate(daily_events_pipeline).to_list(7)
    
    # User retention
    returning_users_pipeline = [
        {"$match": {"created_at": {"$gte": week_ago.isoformat()}, "user_id": {"$ne": None}}},
        {"$group": {
            "_id": "$user_id",
            "sessions": {"$addToSet": "$session_id"},
            "days": {"$addToSet": {"$dateToString": {"format": "%Y-%m-%d", "date": {"$dateFromString": {"dateString": "$created_at"}}}}}
        }},
        {"$project": {
            "user_id": "$_id",
            "session_count": {"$size": "$sessions"},
            "active_days": {"$size": "$days"}
        }},
        {"$match": {"active_days": {"$gt": 1}}}
    ]
    returning_users = await db.analytics_events.aggregate(returning_users_pipeline).to_list(100)
    
    # Peak hours
    hourly_pipeline = [
        {"$match": {"created_at": {"$gte": week_ago.isoformat()}}},
        {"$addFields": {
            "hour": {"$hour": {"$dateFromString": {"dateString": "$created_at"}}}
        }},
        {"$group": {"_id": "$hour", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    peak_hours = await db.analytics_events.aggregate(hourly_pipeline).to_list(5)
    
    # Pro space funnel
    pro_registrations = await db.registrations.count_documents({})
    pro_approved = await db.registrations.count_documents({"status": "approved"})
    pro_connections = await db.analytics_events.count_documents({
        "event_type": "pro_connection",
        "created_at": {"$gte": week_ago.isoformat()}
    })
    pro_messages = await db.analytics_events.count_documents({
        "event_type": {"$regex": "message"},
        "created_at": {"$gte": week_ago.isoformat()}
    })
    
    # Generate insights
    insights = []
    
    # Trend insight
    if len(daily_events) >= 2:
        recent_avg = sum(d["count"] for d in daily_events[-3:]) / 3 if len(daily_events) >= 3 else daily_events[-1]["count"]
        older_avg = sum(d["count"] for d in daily_events[:3]) / 3 if len(daily_events) >= 3 else daily_events[0]["count"]
        if older_avg > 0:
            trend = ((recent_avg - older_avg) / older_avg) * 100
            if trend > 20:
                insights.append({
                    "type": "positive",
                    "icon": "trending_up",
                    "title": "Engagement en hausse",
                    "message": f"L'activité a augmenté de {abs(trend):.0f}% cette semaine"
                })
            elif trend < -20:
                insights.append({
                    "type": "warning",
                    "icon": "trending_down",
                    "title": "Engagement en baisse",
                    "message": f"L'activité a diminué de {abs(trend):.0f}% cette semaine"
                })
    
    # Retention insight
    retention_rate = (len(returning_users) / pro_approved * 100) if pro_approved > 0 else 0
    if retention_rate > 30:
        insights.append({
            "type": "positive",
            "icon": "users",
            "title": "Bonne rétention",
            "message": f"{retention_rate:.0f}% des utilisateurs reviennent régulièrement"
        })
    elif retention_rate < 10 and pro_approved > 10:
        insights.append({
            "type": "warning",
            "icon": "user_x",
            "title": "Rétention faible",
            "message": "Peu d'utilisateurs reviennent - envisager des emails de relance"
        })
    
    # Peak hours insight
    if peak_hours:
        top_hours = [h["_id"] for h in peak_hours[:2]]
        insights.append({
            "type": "info",
            "icon": "clock",
            "title": "Heures de pointe",
            "message": f"Activité maximale entre {min(top_hours)}h et {max(top_hours)+1}h"
        })
    
    # Conversion insight
    conversion = (pro_approved / pro_registrations * 100) if pro_registrations > 0 else 0
    if conversion < 50 and pro_registrations > 10:
        insights.append({
            "type": "action",
            "icon": "alert",
            "title": "Inscriptions en attente",
            "message": f"{pro_registrations - pro_approved} profils en attente d'approbation"
        })
    
    return {
        "insights": insights,
        "metrics": {
            "daily_trend": daily_events,
            "peak_hours": peak_hours,
            "retention_rate": round(retention_rate, 1),
            "conversion_rate": round(conversion, 1),
            "returning_users": len(returning_users)
        },
        "funnel": {
            "registrations": pro_registrations,
            "approved": pro_approved,
            "connections": pro_connections,
            "messages": pro_messages
        },
        "generated_at": now.isoformat()
    }

# Background task to check alerts periodically (call via cron or scheduler)
@app.post("/api/smart-engine/cron/check")
async def smart_engine_cron_check(request: Request):
    """Cron endpoint to check alerts - call every 15 minutes"""
    require_admin(request)
    result = await check_and_trigger_alerts(request)
    return {"success": True, "result": result}


# ═══════════════════════════════════════════════════════════════════════════════
# DONNÉES PARTAGÉES - Artistes, Prestataires, Tâches, Partenaires
# Synchronisation entre tous les workspaces
# ═══════════════════════════════════════════════════════════════════════════════
# Shared workspace routes extracted to /routes/shared.py
# Terrain/scan routes extracted to /routes/terrain.py
# ═══════════════════════════════════════════════════════════════════════════════


# ═══════════════════════════════════════════════════════════════════════════════
# CVL BRAIN — MODULE 2: WEB SEARCH TEMPS RÉEL (Tavily)
# Enrichit les prompts CVL BRAIN avec des résultats web en temps réel
# ═══════════════════════════════════════════════════════════════════════════════

# Brain web-search, chat-enriched, memory — extracted to /routes/omega.py



# ═══════════════════════════════════════════════════════════════
# ANALYTICS TRACKING
# ═══════════════════════════════════════════════════════════════

@app.post("/api/analytics/track")
async def track_analytics_event(request: Request, data: dict):
    """Track frontend analytics events (PWA install, etc.)."""
    event_type = data.get("event_type", "unknown")
    now = datetime.now(timezone.utc).isoformat()
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")
    await db.analytics_events.insert_one({
        "event_type": event_type,
        "timestamp": now,
        "ip": ip,
        "user_agent": ua,
        "metadata": {k: v for k, v in data.items() if k != "event_type"},
    })
    return {"tracked": True}
