"""
OMEGA ROUTER — Routes extraites de server.py + Infrastructure ITER.58
Brain (web-search, chat-enriched, memory), FREK (stats, health, nfc),
Badge lifecycle, Remboursement, Audit Logs, Brain Training Data,
Adhesion, Feed, Plafond 150EUR, RGPD
"""
import os
import uuid
import hashlib
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Request, Depends, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

router = APIRouter(tags=["omega"])

_client = AsyncIOMotorClient(os.environ.get("MONGO_URL", ""))
_db = _client[os.environ.get("DB_NAME", "kiltikonet")]

TAVILY_API_KEY = os.environ.get("TAVILY_API_KEY", "")
JETON_VALEUR = float(os.environ.get("JETON_VALEUR_EURO", "1.50"))
PLAFOND_EUR = 150.0

# Import frek client
from services.frek_client import frek_client as _frek

# Import doctrine permission
from routes.doctrine import require_permission as _require_perm


# ═══════════════════════════════════════════════════════════════
# AUDIT LOGS — Append-only, SHA256 chained
# ═══════════════════════════════════════════════════════════════

VALID_ACTION_TYPES = [
    "FREK_CERTIFY", "FEED_POST", "FEED_ECLAIR", "FEED_COMMENT",
    "BRAIN_QUERY", "WALLET_CREDIT", "WALLET_DEBIT", "TRADE_ORDER",
    "SHOP_PURCHASE", "ADHESION_SUBSCRIBE", "GOUVERNANCE_VOTE",
    "TERMINAL_DEPLOY", "NFC_SCAN", "BADGE_EMIT", "BADGE_SCAN",
    "SETTINGS_UPDATE", "AUTH_LOGIN", "AUTH_LOGOUT",
    "WALLET_TRANSFER", "WALLET_SWAP", "USER_FOLLOW", "USER_UNFOLLOW",
    "BUILDER_SAVE", "BUILDER_PUBLISH", "FREK_WORKSHOP_SUBMIT",
    "ACCREDITATION_PAYMENT", "PAYMENT_FAILED",
]


async def write_audit_log(user_frek_id: str, action_type: str, object_id: str = "",
                          object_type: str = "", metadata: dict = None, session_id: str = ""):
    """Write an immutable audit log entry with SHA256 chain."""
    if action_type not in VALID_ACTION_TYPES:
        logger.warning(f"Invalid audit action_type: {action_type}")
        return

    last_log = await _db.audit_logs.find_one(
        {}, {"_id": 0, "hash": 1}, sort=[("timestamp", -1)]
    )
    previous_hash = last_log["hash"] if last_log and last_log.get("hash") else "GENESIS"

    log_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()
    chain_input = f"{previous_hash}|{log_id}|{user_frek_id}|{action_type}|{timestamp}"
    current_hash = hashlib.sha256(chain_input.encode()).hexdigest()

    doc = {
        "log_id": log_id,
        "user_frek_id": user_frek_id,
        "action_type": action_type,
        "object_id": object_id,
        "object_type": object_type,
        "metadata": metadata or {},
        "timestamp": timestamp,
        "hash": current_hash,
        "session_id": session_id,
    }
    await _db.audit_logs.insert_one(doc)
    return log_id


# ═══════════════════════════════════════════════════════════════
# BRAIN TRAINING DATA — Append-only, cultural_score auto
# ═══════════════════════════════════════════════════════════════

_CULTURAL_KEYWORDS = [
    "martinique", "caraibe", "diaspora", "creole", "frek", "culture",
    "caribeen", "antilles", "guadeloupe", "guyane", "zouk", "bele",
    "madinina", "kilti", "outre-mer", "gwoka", "carnaval", "madras",
]


def compute_cultural_score(langue: str, input_text: str, output_text: str, context_tags: list) -> float:
    score = 0.0
    if langue == "kw":
        score += 0.2
    caribbean_tags = [t for t in context_tags if any(k in t.lower() for k in _CULTURAL_KEYWORDS)]
    if caribbean_tags:
        score += 0.2
    if len(input_text) > 50:
        score += 0.1
    output_lower = output_text.lower()
    if any(k in output_lower for k in _CULTURAL_KEYWORDS):
        score += 0.3
    return min(score, 1.0)


async def write_brain_training(frek_id: str, langue: str, input_text: str,
                                output_text: str, context_tags: list = None, session_id: str = ""):
    """Write brain training data entry."""
    tags = context_tags or []
    cultural_score = compute_cultural_score(langue, input_text, output_text, tags)
    doc = {
        "id": str(uuid.uuid4()),
        "frek_id": frek_id,
        "langue": langue,
        "input": input_text,
        "output": output_text[:2000],
        "context_tags": tags,
        "cultural_score": cultural_score,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "session_id": session_id,
        "eligible_training": cultural_score > 0.6,
        "model_version": "scaffold-claude-sonnet-4",
    }
    await _db.brain_training_data.insert_one(doc)


# ═══════════════════════════════════════════════════════════════
# PLAFOND 150€ — Helper
# ═══════════════════════════════════════════════════════════════

async def check_plafond_150(email: str, jetons_to_add: int) -> dict:
    """Check DSP2 150EUR ceiling. Returns {ok, current_eur, after_eur, kyc_validated}."""
    reg = await _db.registrations.find_one({"email": email}, {"_id": 0, "jetons_solde": 1, "kyc_validated": 1})
    badge = await _db.cc_badges.find_one({"email": email}, {"_id": 0, "jetons_solde": 1})
    current_solde = (reg or {}).get("jetons_solde", 0) or (badge or {}).get("jetons_solde", 0)
    kyc_validated = (reg or {}).get("kyc_validated", False)

    current_eur = current_solde * JETON_VALEUR
    after_eur = (current_solde + jetons_to_add) * JETON_VALEUR

    if not kyc_validated and after_eur > PLAFOND_EUR:
        return {"ok": False, "current_eur": current_eur, "after_eur": after_eur, "kyc_validated": False}
    return {"ok": True, "current_eur": current_eur, "after_eur": after_eur, "kyc_validated": kyc_validated}


# ═══════════════════════════════════════════════════════════════
# SESSION HELPER — Extract email/frek from cookie
# ═══════════════════════════════════════════════════════════════

import jwt as pyjwt

SESSION_SECRET = os.environ.get('SESSION_SECRET', 'fallback-dev-secret')
SESSION_COOKIE_NAME = 'kk_session'


def _get_session(request: Request) -> dict:
    """Extract session from cookie. Returns dict or raises 401."""
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifie")
    try:
        session = pyjwt.decode(token, SESSION_SECRET, algorithms=["HS256"])
    except (pyjwt.ExpiredSignatureError, pyjwt.InvalidTokenError):
        raise HTTPException(status_code=401, detail="Session expiree")
    return session


def _get_session_email(request: Request) -> str:
    session = _get_session(request)
    email = session.get("email", "")
    if not email:
        raise HTTPException(status_code=401, detail="Non authentifie")
    return email.lower()


async def _get_user_frek_id(email: str) -> str:
    """Resolve frek_id from email."""
    reg = await _db.registrations.find_one({"email": email}, {"_id": 0, "frek_id": 1})
    if reg and reg.get("frek_id"):
        return reg["frek_id"]
    badge = await _db.cc_badges.find_one({"email": email}, {"_id": 0, "frek_id": 1})
    return (badge or {}).get("frek_id", "")


# ═══════════════════════════════════════════════════════════════
# BRAIN — WEB SEARCH (extracted from server.py L9660)
# ═══════════════════════════════════════════════════════════════

@router.post("/api/brain/web-search")
async def brain_web_search(request: Request):
    """Search the web for real-time information to enrich CVL BRAIN responses"""
    if not TAVILY_API_KEY:
        return {"results": [], "enriched": False, "reason": "TAVILY_API_KEY not configured"}

    body = await request.json()
    query = body.get("query", "")
    if not query:
        raise HTTPException(status_code=400, detail="query required")

    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=TAVILY_API_KEY)
        response = client.search(
            query=query, search_depth="basic", max_results=5, include_answer=True,
        )
        results = []
        for r in response.get("results", []):
            results.append({
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "content": r.get("content", "")[:300],
            })
        return {"results": results, "answer": response.get("answer", ""), "enriched": True, "query": query}
    except Exception as e:
        return {"results": [], "enriched": False, "reason": str(e)}


# ═══════════════════════════════════════════════════════════════
# BRAIN — CHAT ENRICHED (extracted from server.py L9699)
# + ITER.58: audit_logs, brain_training_data, quota adhesion
# ═══════════════════════════════════════════════════════════════

@router.post("/api/brain/chat-enriched", dependencies=[Depends(_require_perm("use_terminal_ia"))])
async def brain_chat_enriched(request: Request):
    """CVL BRAIN chat with multi-turn memory, user context, and web enrichment"""
    body = await request.json()
    message = body.get("message", "")
    messages_history = body.get("messages", [])
    use_web = body.get("use_web_search", False)
    user_name = body.get("user_name", "un utilisateur")
    user_context = body.get("user_context", None)
    langue = body.get("langue_preference", "fr")
    frek_id = body.get("frek_id", "")
    brain_session_id = body.get("session_id", "")

    # --- ITER.58: Quota check by adhesion level ---
    email = ""
    try:
        session = _get_session(request)
        email = session.get("email", "")
    except Exception:
        pass

    if email:
        adhesion = await _db.adhesions.find_one({"email": email, "actif": True}, {"_id": 0})
        if adhesion:
            quota = adhesion.get("brain_quota_daily", 10)
            used = adhesion.get("brain_quota_used_today", 0)
            reset_ts = adhesion.get("brain_quota_reset", "")
            # Reset if past midnight UTC
            if reset_ts:
                try:
                    reset_dt = datetime.fromisoformat(reset_ts)
                    if datetime.now(timezone.utc) > reset_dt:
                        await _db.adhesions.update_one(
                            {"email": email, "actif": True},
                            {"$set": {
                                "brain_quota_used_today": 0,
                                "brain_quota_reset": (datetime.now(timezone.utc).replace(
                                    hour=0, minute=0, second=0, microsecond=0
                                ) + timedelta(days=1)).isoformat()
                            }}
                        )
                        used = 0
                except Exception:
                    pass
            if quota != 999999 and used >= quota:
                level = adhesion.get("level", "FREE")
                raise HTTPException(
                    status_code=429,
                    detail=f"Quota journalier atteint ({used}/{quota}). Niveau actuel: {level}. Upgrade ton adhesion pour continuer."
                )

    # Web enrichment
    web_context = ""
    if use_web and TAVILY_API_KEY:
        try:
            from tavily import TavilyClient
            client = TavilyClient(api_key=TAVILY_API_KEY)
            response = client.search(query=message, search_depth="basic", max_results=3, include_answer=True)
            web_results = response.get("results", [])
            if web_results:
                web_context = "\n\n[CONTEXTE WEB RECENT]\n"
                for r in web_results[:3]:
                    web_context += f"- {r.get('title', '')}: {r.get('content', '')[:200]}\n"
                web_context += f"\nReponse synthetisee: {response.get('answer', '')}\n"
        except Exception:
            pass

    # Archive context
    archive_context = ""
    if user_context and user_context.get("email"):
        try:
            archives = await _db.user_archives.find(
                {"email": user_context["email"], "folder": "CVL Brain"},
                {"_id": 0, "name": 1, "content_summary": 1, "type": 1}
            ).to_list(10)
            if archives:
                archive_context = "\n\n[ARCHIVES PERSONNELLES DE L'UTILISATEUR]\n"
                for a in archives:
                    archive_context += f"- {a.get('name', 'Fichier')} ({a.get('type', '')})"
                    if a.get('content_summary'):
                        archive_context += f": {a['content_summary'][:150]}"
                    archive_context += "\n"
        except Exception:
            pass

    from services.cvl_brain_knowledge import build_cvl_brain_prompt
    system_prompt = build_cvl_brain_prompt(user_name, user_context, web_context + archive_context)

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        emergent_key = os.environ.get("EMERGENT_LLM_KEY", "")

        # Build conversation context
        history_context = ""
        if messages_history and len(messages_history) > 1:
            recent = messages_history[-20:-1] if len(messages_history) > 21 else messages_history[:-1]
            history_context = "\n\n[HISTORIQUE DE CONVERSATION]\n"
            for hist_msg in recent:
                role_label = "Utilisateur" if hist_msg.get("role") == "user" else "CVL Brain"
                content = hist_msg.get("content", "")[:500]
                history_context += f"{role_label}: {content}\n"
            history_context += "\n[FIN HISTORIQUE]\n"

        enriched_prompt = system_prompt + history_context

        chat_obj = LlmChat(
            api_key=emergent_key,
            session_id=str(uuid.uuid4()),
            system_message=enriched_prompt,
        )
        chat_obj.with_model("anthropic", "claude-sonnet-4-5-20250929")

        user_msg = UserMessage(text=message)
        response_text = await chat_obj.send_message(user_msg)

        # --- ITER.58: Post-response actions ---
        if email:
            # Increment quota
            await _db.adhesions.update_one(
                {"email": email, "actif": True},
                {"$inc": {"brain_quota_used_today": 1}}
            )

        # Resolve frek_id if not provided
        if not frek_id and email:
            frek_id = await _get_user_frek_id(email)

        # Write brain training data (always, even without frek_id)
        await write_brain_training(
            frek_id=frek_id or email or "anonymous",
            langue=langue,
            input_text=message, output_text=response_text,
            context_tags=[], session_id=brain_session_id,
        )

        # Write audit log (only if frek_id available)
        if frek_id:
            await write_audit_log(
                user_frek_id=frek_id, action_type="BRAIN_QUERY",
                object_id=brain_session_id, object_type="brain_session",
                metadata={"langue": langue, "web_enriched": bool(web_context)},
                session_id=brain_session_id,
            )

        # Cultural score for response
        cs = compute_cultural_score(langue, message, response_text, [])

        return {
            "response": response_text,
            "web_enriched": bool(web_context),
            "langue_detectee": langue,
            "cultural_score": cs,
            "tokens_used": 1,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur CVL BRAIN: {str(e)}")


# ═══════════════════════════════════════════════════════════════
# BRAIN — SSE STREAMING (additif — ne remplace pas chat-enriched)
# Bug fix #3 Laurent.ia : tokens en temps réel pour Terminal IA
# ═══════════════════════════════════════════════════════════════

@router.post("/api/brain/chat-stream", dependencies=[Depends(_require_perm("use_terminal_ia"))])
async def brain_chat_stream(request: Request):
    """SSE streaming version of /api/brain/chat-enriched.
    Same payload, but returns text/event-stream with progressive tokens.
    Client side: use EventSource or fetch + ReadableStream.
    """
    from fastapi.responses import StreamingResponse
    body = await request.json()
    message = body.get("message", "")
    messages_history = body.get("messages", [])
    user_name = body.get("user_name", "un utilisateur")
    user_context = body.get("user_context", None)
    langue = body.get("langue_preference", "fr")
    frek_id = body.get("frek_id", "")
    brain_session_id = body.get("session_id", "")

    # Reuse quota check from chat-enriched (light copy)
    email = ""
    try:
        session = _get_session(request)
        email = session.get("email", "")
    except Exception:
        pass
    if email:
        adhesion = await _db.adhesions.find_one({"email": email, "actif": True}, {"_id": 0})
        if adhesion:
            quota = adhesion.get("brain_quota_daily", 10)
            used = adhesion.get("brain_quota_used_today", 0)
            if quota != 999999 and used >= quota:
                raise HTTPException(429, f"Quota journalier atteint ({used}/{quota})")

    from services.cvl_brain_knowledge import build_cvl_brain_prompt
    system_prompt = build_cvl_brain_prompt(user_name, user_context, "")

    history_context = ""
    if messages_history and len(messages_history) > 1:
        recent = messages_history[-20:-1] if len(messages_history) > 21 else messages_history[:-1]
        history_context = "\n\n[HISTORIQUE DE CONVERSATION]\n"
        for hist_msg in recent:
            role_label = "Utilisateur" if hist_msg.get("role") == "user" else "CVL Brain"
            content = hist_msg.get("content", "")[:500]
            history_context += f"{role_label}: {content}\n"
        history_context += "\n[FIN HISTORIQUE]\n"

    async def event_generator():
        import json as _json
        full_response = []
        try:
            # emergentintegrations doesn't expose streaming yet → fallback to anthropic native
            import anthropic
            api_key = os.environ.get("EMERGENT_LLM_KEY", "")
            client = anthropic.Anthropic(api_key=api_key, base_url="https://integrations.emergentagent.com/llm")
            with client.messages.stream(
                model="claude-sonnet-4-5-20250929",
                max_tokens=2000,
                system=system_prompt + history_context,
                messages=[{"role": "user", "content": message}],
            ) as stream:
                for text in stream.text_stream:
                    full_response.append(text)
                    yield f"data: {_json.dumps({'token': text})}\n\n"
            # Final event
            final_text = "".join(full_response)
            yield f"data: {_json.dumps({'done': True, 'full_response': final_text})}\n\n"

            # Post-response housekeeping (quota + training data)
            if email:
                await _db.adhesions.update_one(
                    {"email": email, "actif": True},
                    {"$inc": {"brain_quota_used_today": 1}},
                )
            resolved_frek = frek_id or (await _get_user_frek_id(email) if email else "")
            await write_brain_training(
                frek_id=resolved_frek or email or "anonymous",
                langue=langue,
                input_text=message, output_text=final_text,
                context_tags=[], session_id=brain_session_id,
            )
        except Exception as e:
            yield f"data: {_json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )



# ═══════════════════════════════════════════════════════════════
# BRAIN — MEMORY (extracted from server.py L9785)
# ═══════════════════════════════════════════════════════════════

@router.post("/api/brain/memory/save")
async def brain_memory_save(request: Request):
    """Save a CVL BRAIN conversation to persistent memory"""
    body = await request.json()
    session_id = body.get("session_id")
    messages = body.get("messages", [])
    title = body.get("title", "")
    tags = body.get("tags", [])
    user_id = body.get("user_id", "")

    if not session_id or not messages:
        raise HTTPException(status_code=400, detail="session_id and messages required")

    if not title:
        user_msgs = [m for m in messages if m.get("role") == "user"]
        title = user_msgs[0]["content"][:80] if user_msgs else "Conversation sans titre"

    doc = {
        "session_id": session_id, "user_id": user_id, "title": title,
        "messages": messages, "tags": tags, "message_count": len(messages),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    existing = await _db.brain_memory.find_one({"session_id": session_id})
    if existing:
        await _db.brain_memory.update_one(
            {"session_id": session_id},
            {"$set": {"messages": messages, "title": title, "tags": tags,
                      "message_count": len(messages),
                      "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        await _db.brain_memory.insert_one(doc)

    return {"success": True, "session_id": session_id}


@router.get("/api/brain/memory/history")
async def brain_memory_history(user_id: str = "", limit: int = 20, skip: int = 0):
    """Get conversation history for a user"""
    query = {}
    if user_id:
        query["user_id"] = user_id

    cursor = _db.brain_memory.find(query, {"_id": 0}).sort("updated_at", -1).skip(skip).limit(limit)
    conversations = []
    async for doc in cursor:
        conversations.append({
            "session_id": doc.get("session_id"),
            "title": doc.get("title"),
            "message_count": doc.get("message_count", 0),
            "tags": doc.get("tags", []),
            "created_at": doc.get("created_at"),
            "updated_at": doc.get("updated_at"),
        })

    total = await _db.brain_memory.count_documents(query)
    return {"conversations": conversations, "total": total}


@router.get("/api/brain/memory/{session_id}")
async def brain_memory_get(session_id: str):
    """Get a specific conversation by session_id"""
    doc = await _db.brain_memory.find_one({"session_id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Conversation non trouvee")
    return doc


@router.delete("/api/brain/memory/{session_id}")
async def brain_memory_delete(session_id: str):
    """Delete a conversation from memory"""
    result = await _db.brain_memory.delete_one({"session_id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conversation non trouvee")
    return {"success": True}


# ═══════════════════════════════════════════════════════════════
# FREK — STATS & HEALTH (extracted from server.py L3852)
# ═══════════════════════════════════════════════════════════════

@router.get("/api/frek/stats")
async def get_frek_cc2026_stats():
    """Get FREK CC2026 stats for dashboard"""
    stats = await _frek.get_cc2026_stats()
    return stats


@router.get("/api/frek/health")
async def check_frek_health():
    """Check FREK API health"""
    is_healthy = await _frek.health()
    return {"healthy": is_healthy, "fallback_mode": os.environ.get("FREK_FALLBACK_MODE", "true")}


# ═══════════════════════════════════════════════════════════════
# NFC TAP (extracted from server.py L8445)
# ═══════════════════════════════════════════════════════════════

class NfcTapRequest(BaseModel):
    nfc_uid: Optional[str] = None
    badge_id: Optional[str] = None
    montant: int
    merchant_id: Optional[str] = None
    zone: str = "ENTREE_GENERALE"


@router.post("/api/frek/nfc/tap")
async def nfc_tap(req: NfcTapRequest):
    """NFC tap payment — find badge by NFC UID or badge_id, debit jetons"""
    badge = None
    if req.nfc_uid:
        badge = await _db.cc_badges.find_one({"nfc_uid": req.nfc_uid}, {"_id": 0})
    elif req.badge_id:
        badge = await _db.cc_badges.find_one({"badge_id": req.badge_id}, {"_id": 0})

    if not badge:
        return {"status": "error", "code": "NOT_FOUND", "message": "Badge NFC non trouve", "color": "red"}

    if not badge.get("nfc_enabled"):
        return {"status": "error", "code": "NFC_DISABLED", "message": "NFC non active sur ce badge", "color": "red"}

    statut = badge.get("statut", "")
    if statut not in ("ACTIVE", "REMIS"):
        return {"status": "error", "code": "INACTIVE", "message": f"Badge non actif ({statut})", "color": "red"}

    badge_id = badge.get("badge_id", "")
    current_solde = badge.get("jetons_solde", 0) or 0

    if req.montant > 0:
        if current_solde < req.montant:
            return {
                "status": "insufficient", "code": "LOW_BALANCE", "color": "orange",
                "message": f"Solde insuffisant ({current_solde}/{req.montant}J)",
                "badge_id": badge_id, "jetons_solde": current_solde,
            }
        new_solde = current_solde - req.montant
        await _db.cc_badges.update_one({"badge_id": badge_id}, {"$set": {"jetons_solde": new_solde}})

        await _db.cc_transactions.insert_one({
            "badge_id": badge_id, "type": "nfc_tap", "jetons": -req.montant,
            "merchant_id": req.merchant_id, "zone": req.zone,
            "previous_solde": current_solde, "new_solde": new_solde,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        frek_id = badge.get("frek_id", "")
        if frek_id:
            asyncio.create_task(_frek.record_stage(frek_id, "METAMORPHOSE"))
            await write_audit_log(frek_id, "NFC_SCAN", badge_id, "badge",
                                  {"montant": req.montant, "zone": req.zone})

        return {
            "status": "success", "code": "OK", "color": "green",
            "message": f"Paiement NFC {req.montant}J OK",
            "badge_id": badge_id,
            "person": {"full_name": f"{badge.get('prenom','')} {badge.get('nom','')}", "type_badge": badge.get("type_badge")},
            "jetons_debited": req.montant, "new_solde": new_solde,
        }

    return {
        "status": "success", "code": "OK", "color": "green",
        "message": "Badge NFC verifie",
        "badge_id": badge_id,
        "person": {"full_name": f"{badge.get('prenom','')} {badge.get('nom','')}", "type_badge": badge.get("type_badge")},
        "jetons_solde": current_solde,
    }


# ═══════════════════════════════════════════════════════════════
# REMBOURSEMENT (extracted from server.py L8514)
# ═══════════════════════════════════════════════════════════════

class RemboursementRequest(BaseModel):
    merchant_id: str
    montant_eur: float
    description: Optional[str] = None


@router.post("/api/jetons/remboursement")
async def jetons_remboursement(req: RemboursementRequest):
    """Admin: enregistrer un remboursement marchand SEPA J+3"""
    jeton_rachat = float(os.environ.get("JETON_RACHAT_EURO", "1.35"))
    jetons_equivalent = round(req.montant_eur / jeton_rachat)

    await _db.cc_remboursements.insert_one({
        "merchant_id": req.merchant_id, "montant_eur": req.montant_eur,
        "jetons_equivalent": jetons_equivalent, "jeton_rachat_eur": jeton_rachat,
        "description": req.description, "statut": "ENREGISTRE",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "status": "success", "merchant_id": req.merchant_id,
        "montant_eur": req.montant_eur, "jetons_equivalent": jetons_equivalent,
        "jeton_rachat_eur": jeton_rachat,
    }


@router.get("/api/jetons/remboursements")
async def list_remboursements():
    """List all merchant refunds"""
    rembs = await _db.cc_remboursements.find({}, {"_id": 0}).sort("timestamp", -1).to_list(200)
    total = sum(r.get("montant_eur", 0) for r in rembs)
    return {"remboursements": rembs, "total_eur": round(total, 2), "count": len(rembs)}


# ═══════════════════════════════════════════════════════════════
# BADGE LIFECYCLE (extracted from server.py L8081)
# ═══════════════════════════════════════════════════════════════

@router.get("/api/badges/lifecycle/{badge_id}")
async def get_badge_lifecycle(badge_id: str):
    """Retourne le cycle de vie complet d'un badge (8 etapes)"""
    badge = await _db.cc_badges.find_one({"badge_id": badge_id}, {"_id": 0})
    if not badge:
        raise HTTPException(status_code=404, detail="Badge non trouve")

    statut = badge.get("statut", "INSCRIT")
    lifecycle = [
        {"step": 1, "name": "Inscription", "done": True, "date": badge.get("date_emission")},
        {"step": 2, "name": "FREK-ID emis", "done": bool(badge.get("frek_id")), "frek_id": badge.get("frek_id")},
        {"step": 3, "name": "Email envoye", "done": True, "note": "Bienvenue + QR dynamique"},
        {"step": 4, "name": "Activation", "done": statut in ("ACTIVE", "REMIS"), "date": badge.get("activated_at")},
        {"step": 5, "name": "Impression", "done": badge.get("imprime", False), "date": badge.get("imprime_at")},
        {"step": 6, "name": "Remise J-0", "done": statut == "REMIS" or badge.get("remis", False), "date": badge.get("remis_at")},
        {"step": 7, "name": "NFC actif", "done": badge.get("nfc_enabled", False) and statut == "REMIS", "nfc_uid": badge.get("nfc_uid")},
        {"step": 8, "name": "FREK Legacy", "done": False, "note": "Post-evenement CVL BRAIN / OAPI"},
    ]

    return {
        "badge_id": badge_id, "statut": statut,
        "type_badge": badge.get("type_badge"), "prenom": badge.get("prenom"), "nom": badge.get("nom"),
        "lifecycle": lifecycle,
        "current_step": next((s["step"] for s in reversed(lifecycle) if s["done"]), 1),
    }


# ═══════════════════════════════════════════════════════════════
# ADHESION — Real implementation (replaces skeleton mocks)
# ═══════════════════════════════════════════════════════════════

ADHESION_LEVELS = {
    "FREE": {"name": "Libre", "prix_mensuel": 0, "brain_quota_daily": 10, "kt_offerts": 0},
    "PRO": {"name": "Pro", "prix_mensuel": 10, "brain_quota_daily": 50, "kt_offerts": 50},
    "PREMIUM": {"name": "Premium", "prix_mensuel": 30, "brain_quota_daily": 999999, "kt_offerts": 200},
    "INSTITUTIONNEL": {"name": "Institutionnel", "prix_mensuel": 150, "brain_quota_daily": 999999, "kt_offerts": 1000},
}


@router.get("/api/adhesion/levels")
async def get_adhesion_levels():
    """Retourne les 4 niveaux avec droits et prix."""
    levels = []
    for key, val in ADHESION_LEVELS.items():
        levels.append({
            "id": key, "name": val["name"], "prix_mensuel": val["prix_mensuel"],
            "brain_quota_daily": val["brain_quota_daily"], "kt_offerts": val["kt_offerts"],
        })
    return {"levels": levels}


@router.get("/api/adhesion/current")
async def get_current_adhesion(request: Request):
    """Retourne l'adhesion actuelle de l'utilisateur."""
    email = _get_session_email(request)
    adhesion = await _db.adhesions.find_one({"email": email, "actif": True}, {"_id": 0})
    if not adhesion:
        return {"adhesion": {"level": "FREE", "prix_mensuel": 0, "brain_quota_daily": 10,
                             "brain_quota_used_today": 0, "actif": True}}
    return {"adhesion": adhesion}


class AdhesionSubscribeRequest(BaseModel):
    level: str


@router.post("/api/adhesion/subscribe")
async def subscribe_adhesion(request: Request, body: AdhesionSubscribeRequest):
    """Souscrire a un niveau d'adhesion.
    - FREE: activation immediate
    - Paid tiers: returns Stripe checkout URL; adhesion activated by webhook on payment
    """
    email = _get_session_email(request)
    level = body.level.upper()
    if level not in ADHESION_LEVELS:
        raise HTTPException(400, f"Niveau invalide. Choix: {list(ADHESION_LEVELS.keys())}")

    config = ADHESION_LEVELS[level]

    # FREE level — activate immediately, no payment
    if config["prix_mensuel"] == 0:
        await _db.adhesions.update_many({"email": email, "actif": True}, {"$set": {"actif": False}})
        now = datetime.now(timezone.utc)
        adhesion_doc = {
            "adhesion_id": str(uuid.uuid4()),
            "email": email, "level": level,
            "prix_mensuel": 0, "brain_quota_daily": config["brain_quota_daily"],
            "brain_quota_used_today": 0,
            "brain_quota_reset": (now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)).isoformat(),
            "date_debut": now.isoformat(), "date_fin": None, "auto_renew": False, "actif": True,
        }
        await _db.adhesions.insert_one(adhesion_doc)
        return {"success": True, "level": level, "kt_offerts": 0, "adhesion_id": adhesion_doc["adhesion_id"]}

    # Paid tier — create Stripe checkout session
    try:
        import os
        from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
        api_key = os.environ.get("STRIPE_API_KEY")
        base_url = str(request.base_url).rstrip("/")
        webhook_url = f"{base_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
        checkout_request = CheckoutSessionRequest(
            amount=float(config["prix_mensuel"]),
            currency="eur",
            success_url=f"{base_url}/pro?adhesion=success&level={level}",
            cancel_url=f"{base_url}/pro?adhesion=cancelled",
            metadata={
                "type": "adhesion",
                "email": email,
                "level": level,
                "kt_offerts": str(config["kt_offerts"]),
                "brain_quota_daily": str(config["brain_quota_daily"]),
            },
        )
        session = await stripe_checkout.create_checkout_session(checkout_request)
        # Store pending adhesion
        await _db.adhesions_pending.insert_one({
            "session_id": session.session_id,
            "email": email, "level": level,
            "amount": config["prix_mensuel"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        return {"success": True, "requires_payment": True, "checkout_url": session.url,
                "session_id": session.session_id, "level": level}
    except Exception as e:
        raise HTTPException(500, f"Stripe checkout creation failed: {str(e)}")


@router.post("/api/adhesion/cancel")
async def cancel_adhesion(request: Request):
    """Annuler l'abonnement — repasse en FREE."""
    email = _get_session_email(request)
    await _db.adhesions.update_many({"email": email, "actif": True}, {"$set": {"actif": False}})
    return {"success": True, "message": "Abonnement annule. Retour au niveau FREE."}


# ═══════════════════════════════════════════════════════════════
# FEED — Posts, Eclair, Commentaires
# ═══════════════════════════════════════════════════════════════


import random as _random

_FEED_IMAGES = [
    "https://images.pexels.com/photos/2531728/pexels-photo-2531728.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/1916818/pexels-photo-1916818.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/2747446/pexels-photo-2747446.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/2263410/pexels-photo-2263410.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/1749822/pexels-photo-1749822.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/1547592/pexels-photo-1547592.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/1598488/pexels-photo-1598488.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/1618005/pexels-photo-1618005.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/1514525/pexels-photo-1514525.jpeg?auto=compress&cs=tinysrgb&w=800",
    "https://images.pexels.com/photos/5752729/pexels-photo-5752729.jpeg?auto=compress&cs=tinysrgb&w=800",
]

_FEED_AVATARS = [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=100",
    "https://images.unsplash.com/photo-1514525253361-bee8718a74a2?auto=format&fit=crop&q=80&w=100",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100",
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100",
]

_FEED_AUTHORS = [
    {"nom": "Ben ARRIS", "avatar": 0, "frek": True},
    {"nom": "Kilti Maker", "avatar": 1, "frek": True},
    {"nom": "Core Engine", "avatar": 2, "frek": False},
    {"nom": "Global Sound", "avatar": 3, "frek": True},
    {"nom": "Malaika", "avatar": 4, "frek": True},
    {"nom": "Djaz Fusion", "avatar": 5, "frek": True},
]

_FEED_CONTENTS = [
    "Synchronizing the alchemy of digital gestures with institutional precision. CC2026 is the proof of concept.",
    "New session studio — Beat Zouk available now in the shop. 3 mois de travail, des nuits en studio, cette emotion pure.",
    "Protocol Omega update successful. Security layers optimized. FREK-ID traçabilite renforcee.",
    "Proposition de collaboration pour Diaspora Rhythms. La culture caribeeenne rayonne au-dela des oceans.",
    "Le gwoka rencontre l'electro — fusion unique nee en Martinique. Ecoutez le premier extrait.",
    "DEBAT : La tokenisation de la culture est-elle une opportunite ou une menace ? Les Jetons CC montrent une voie.",
    "5 conseils pour les createurs culturels : construisez votre communaute AVANT de monetiser.",
    "Retour d'experience : comment nous avons multiplie par 3x l'engagement en 6 mois. La cle ? L'authenticite.",
    "COMMUNIQUE — Le Conseil Regional valide un budget pour le developpement culturel numerique.",
    "Il y a 10 ans, ma grand-mere me racontait des contes creoles au clair de lune. Aujourd'hui, je les digitalise.",
    "INTERVIEW EXCLUSIVE — La culture caribeeenne est la prochaine frontiere de l'innovation.",
    "Fier d'annoncer notre participation a Culture Connect 2026 ! Rendez-vous en Martinique.",
    "De Fort-de-France a Montreal : mon parcours d'artiste caribeen dans le monde.",
    "EXTRAIT SONORE — Preview de mon prochain album. Premieres notes ici. L'album complet arrive pour CC2026.",
    "Nouveau milestone : 2000 createurs ont rejoint notre plateforme ce mois-ci. Annou kontinie !",
    "La diaspora n'est pas un exil. C'est un reseau. Chaque ile est un noeud qui pulse au rythme du ka.",
    "Session live au marche de Fort-de-France — gwoka spontane avec les passants. Magie pure.",
    "Architecture Luciole v2 : quand le code devient art. Chaque pixel est un acte de souverainete.",
    "Ti' Punch & Identite Creole — un voyage gustatif a travers les traditions. Disponible au shop.",
    "DOCUMENTAIRE — Voix de la diaspora. Des histoires qui meritent d'etre racontees.",
]

_FEED_TAGS = [
    ["BRUT", "GHANA"], ["MUSIC", "MARTINIQUE"], ["TECH", "CORE"], ["DIASPORA", "ZOUK"],
    ["ART", "GWOKA"], ["DEBAT", "FINTECH"], ["CONSEIL", "CREATEUR"], ["GROWTH", "CC2026"],
    ["INSTITUTION", "POLITIQUE"], ["PATRIMOINE", "CREOLE"], ["INTERVIEW", "INNOVATION"],
    ["CC2026", "KILTIKONET"], ["ARTISTE", "PARCOURS"], ["ALBUM", "PREVIEW"],
    ["COMMUNAUTE", "MILESTONE"], ["LITTERATURE", "DIASPORA"], ["LIVE", "SESSION"],
    ["CODE", "ART"], ["GASTRONOMIE", "TRADITION"], ["DOCUMENTAIRE", "CULTURE"],
]


async def _seed_feed_posts():
    """Auto-seed feed_posts with curated content."""
    now = datetime.now(timezone.utc)
    posts = []
    for i, content in enumerate(_FEED_CONTENTS):
        author = _FEED_AUTHORS[i % len(_FEED_AUTHORS)]
        post_time = now - timedelta(hours=_random.randint(1, 96), minutes=_random.randint(0, 59))
        posts.append({
            "post_id": str(uuid.uuid4()),
            "frek_id_auteur": f"FREK-{str(uuid.uuid4())[:8]}" if author["frek"] else "",
            "email_auteur": f"{author['nom'].lower().replace(' ', '.')}@kiltikonet.fr",
            "prenom_auteur": author["nom"],
            "photo_auteur": _FEED_AVATARS[author["avatar"]],
            "badge_frek": author["frek"],
            "contenu": content,
            "media_url": _FEED_IMAGES[i % len(_FEED_IMAGES)],
            "media_type": "image",
            "tags": _FEED_TAGS[i % len(_FEED_TAGS)],
            "nb_eclairs": _random.randint(50, 50000),
            "nb_commentaires": _random.randint(5, 1500),
            "eclairs_by": [],
            "commentaires": [],
            "timestamp": post_time.isoformat(),
        })
    await _db.feed_posts.insert_many(posts)
    logger.info(f"Feed seeded with {len(posts)} posts")


@router.get("/api/feed/posts")
async def get_feed_posts(page: int = 1, limit: int = 10):
    """Get feed posts with pagination. Auto-seed if empty."""
    total = await _db.feed_posts.count_documents({})
    if total < 5:
        await _seed_feed_posts()
        total = await _db.feed_posts.count_documents({})
    skip = (page - 1) * limit
    posts = await _db.feed_posts.find({}, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    return {"posts": posts, "total": total, "page": page, "has_more": skip + limit < total}


class FeedPostCreate(BaseModel):
    contenu: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    tags: List[str] = []


@router.post("/api/feed/posts")
async def create_feed_post(request: Request, body: FeedPostCreate):
    """Create a new feed post."""
    email = _get_session_email(request)
    frek_id = await _get_user_frek_id(email)
    reg = await _db.registrations.find_one({"email": email}, {"_id": 0, "full_name": 1, "photo_url": 1, "frek_id": 1})

    post = {
        "post_id": str(uuid.uuid4()),
        "frek_id_auteur": frek_id or "",
        "email_auteur": email,
        "prenom_auteur": (reg or {}).get("full_name", "Anonyme").split(" ")[0],
        "photo_auteur": (reg or {}).get("photo_url", ""),
        "badge_frek": bool(frek_id),
        "contenu": body.contenu,
        "media_url": body.media_url,
        "media_type": body.media_type,
        "tags": body.tags,
        "nb_eclairs": 0,
        "nb_commentaires": 0,
        "eclairs_by": [],
        "commentaires": [],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await _db.feed_posts.insert_one(post)

    if frek_id:
        await write_audit_log(frek_id, "FEED_POST", post["post_id"], "feed_post")

    post.pop("eclairs_by", None)
    return {"success": True, "post": post}


@router.post("/api/feed/posts/{post_id}/eclair")
async def eclair_post(post_id: str, request: Request):
    """Eclair (like premium) — debite 1 KT auteur, credite 1 KT destinataire."""
    email = _get_session_email(request)
    frek_id = await _get_user_frek_id(email)

    post = await _db.feed_posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Post non trouve")

    # Check already eclaired
    if email in (post.get("eclairs_by") or []):
        raise HTTPException(400, "Deja eclaire")

    # Debit 1 KT from eclairer
    reg = await _db.registrations.find_one({"email": email}, {"_id": 0, "jetons_solde": 1})
    solde = (reg or {}).get("jetons_solde", 0)
    if solde < 1:
        raise HTTPException(400, "Solde KT insuffisant pour un eclair")

    await _db.registrations.update_one({"email": email}, {"$inc": {"jetons_solde": -1}})

    # Credit 1 KT to post author
    author_email = post.get("email_auteur", "")
    if author_email and author_email != email:
        await _db.registrations.update_one({"email": author_email}, {"$inc": {"jetons_solde": 1}})

    # Update post
    await _db.feed_posts.update_one(
        {"post_id": post_id},
        {"$inc": {"nb_eclairs": 1}, "$push": {"eclairs_by": email}}
    )

    if frek_id:
        await write_audit_log(frek_id, "FEED_ECLAIR", post_id, "feed_post", {"author": author_email})

    return {"success": True, "nb_eclairs": post.get("nb_eclairs", 0) + 1, "kt_debited": 1}


class CommentCreate(BaseModel):
    contenu: str


@router.post("/api/feed/posts/{post_id}/commentaire")
async def comment_post(post_id: str, request: Request, body: CommentCreate):
    """Add a comment to a post."""
    email = _get_session_email(request)
    frek_id = await _get_user_frek_id(email)
    reg = await _db.registrations.find_one({"email": email}, {"_id": 0, "full_name": 1})

    comment = {
        "comment_id": str(uuid.uuid4())[:12],
        "email": email,
        "prenom": (reg or {}).get("full_name", "Anonyme").split(" ")[0],
        "frek_id": frek_id,
        "contenu": body.contenu,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    await _db.feed_posts.update_one(
        {"post_id": post_id},
        {"$inc": {"nb_commentaires": 1}, "$push": {"commentaires": comment}}
    )

    if frek_id:
        await write_audit_log(frek_id, "FEED_COMMENT", post_id, "feed_post")

    return {"success": True, "comment": comment}


@router.get("/api/feed/posts/{post_id}/commentaires")
async def get_post_comments(post_id: str):
    """Get comments for a post."""
    post = await _db.feed_posts.find_one({"post_id": post_id}, {"_id": 0, "commentaires": 1})
    if not post:
        raise HTTPException(404, "Post non trouve")
    return {"commentaires": post.get("commentaires", [])}


# ═══════════════════════════════════════════════════════════════
# RGPD — DELETE ACCOUNT
# ═══════════════════════════════════════════════════════════════

@router.delete("/api/user/account")
async def delete_user_account(request: Request):
    """RGPD: Anonymise personal data, invalidate sessions."""
    email = _get_session_email(request)
    frek_id = await _get_user_frek_id(email)
    now = datetime.now(timezone.utc).isoformat()

    # Anonymise registrations
    await _db.registrations.update_one(
        {"email": email},
        {"$set": {
            "full_name": "UTILISATEUR_SUPPRIME",
            "email": f"deleted_{uuid.uuid4().hex[:8]}@supprime.local",
            "phone": "", "photo_url": "", "bio": "",
            "supprime": True, "supprime_at": now,
        }}
    )

    # Anonymise badges
    await _db.cc_badges.update_many(
        {"email": email},
        {"$set": {"prenom": "SUPPRIME", "nom": "SUPPRIME", "email": "deleted@supprime.local"}}
    )

    # Mark FREK-ID as deleted (keep in audit_logs)
    if frek_id:
        await _db.frek_ids.update_one(
            {"frek_id": frek_id}, {"$set": {"status": "SUPPRIME", "supprime_at": now}}
        )
        await write_audit_log(frek_id, "AUTH_LOGOUT", "", "account", {"reason": "RGPD_DELETION"})

    # Deactivate adhesion
    await _db.adhesions.update_many({"email": email}, {"$set": {"actif": False}})

    # Delete sessions
    await _db.sessions.delete_many({"email": email})

    # Send deletion confirmation email (Brevo Template 4)
    try:
        from services.brevo_templates import compte_suppression
        subj, html = compte_suppression(email.split("@")[0])
        from server import send_email_async
        await send_email_async(email, subj, html)
    except Exception as mail_err:
        logging.getLogger(__name__).warning(f"Deletion email failed: {mail_err}")

    return {"message": "Compte supprime", "timestamp": now}


# ═══════════════════════════════════════════════════════════════
# USER SETTINGS (real, replaces skeleton mock)
# ═══════════════════════════════════════════════════════════════

@router.get("/api/user/settings")
async def get_user_settings(request: Request):
    """Get user settings from real data."""
    email = _get_session_email(request)
    reg = await _db.registrations.find_one({"email": email}, {"_id": 0})
    if not reg:
        raise HTTPException(404, "Utilisateur non trouve")

    frek_id = reg.get("frek_id", "")
    adhesion = await _db.adhesions.find_one({"email": email, "actif": True}, {"_id": 0})
    settings = await _db.user_settings.find_one({"email": email}, {"_id": 0}) or {}

    return {
        "profile": {
            "full_name": reg.get("full_name", ""),
            "bio": reg.get("bio", ""),
            "photo_url": reg.get("photo_url", "") or reg.get("avatar_url", ""),
            "avatar_url": reg.get("avatar_url", "") or reg.get("photo_url", ""),
            "email": email,
            "frek_id": frek_id,
            "actor_role": reg.get("actor_role", "consumer"),
        },
        "adhesion": {
            "level": (adhesion or {}).get("level", "FREE"),
            "brain_quota_daily": (adhesion or {}).get("brain_quota_daily", 10),
            "brain_quota_used_today": (adhesion or {}).get("brain_quota_used_today", 0),
        },
        "notifications": settings.get("notifications", {
            "email_enabled": True, "push_enabled": False, "in_app_enabled": True,
        }),
        "privacy": settings.get("privacy", {
            "profile_public": True, "frek_id_public": False,
        }),
        "preferences": settings.get("preferences", {
            "language": "fr", "brain_language": "fr", "theme": "sovereign_onyx",
        }),
    }


class SettingsUpdateRequest(BaseModel):
    section: str
    data: dict


@router.put("/api/user/settings")
async def update_user_settings(request: Request, body: SettingsUpdateRequest):
    """Update a section of user settings."""
    email = _get_session_email(request)

    if body.section == "profile":
        allowed = ["full_name", "bio", "photo_url"]
        update = {k: v for k, v in body.data.items() if k in allowed}
        if update:
            await _db.registrations.update_one({"email": email}, {"$set": update})
    else:
        await _db.user_settings.update_one(
            {"email": email},
            {"$set": {body.section: body.data}},
            upsert=True,
        )

    frek_id = await _get_user_frek_id(email)
    if frek_id:
        await write_audit_log(frek_id, "SETTINGS_UPDATE", "", "settings", {"section": body.section})

    return {"success": True, "section": body.section}


@router.post("/api/user/avatar")
async def upload_avatar(request: Request, file: UploadFile = File(...)):
    """Upload avatar — max 5MB, JPG/PNG/WebP only."""
    email = _get_session_email(request)
    frek_id = await _get_user_frek_id(email)

    valid_types = {"image/jpeg", "image/png", "image/webp"}
    if file.content_type not in valid_types:
        raise HTTPException(400, "Format non supporte. Utilisez JPG, PNG ou WebP")

    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "Fichier trop volumineux (max 5 MB)")

    from services.object_storage import put_object, generate_path
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    path = generate_path(frek_id or email, f"avatar.{ext}")
    result = put_object(path, data, file.content_type or "image/jpeg")

    avatar_url = f"/api/files/{result['path']}"

    # Update user record
    await _db.registrations.update_one(
        {"email": email},
        {"$set": {"photo_url": avatar_url, "avatar_url": avatar_url}}
    )

    # Audit log
    await write_audit_log(frek_id or email, "SETTINGS_UPDATE", "", "avatar", {"avatar_url": avatar_url, "size": len(data)})

    return {"avatar_url": avatar_url}


# ═══════════════════════════════════════════════════════════════
# DMs — Messages Prives (polling 5s)
# ═══════════════════════════════════════════════════════════════

@router.get("/api/messages/conversations")
async def get_conversations(request: Request):
    """Liste des conversations de l'utilisateur."""
    email = _get_session_email(request)

    # Get all conversations involving this user
    convs = await _db.dm_conversations.find(
        {"participants": email}, {"_id": 0}
    ).sort("last_message_at", -1).to_list(50)

    # Enrich with last message and unread count
    result = []
    for conv in convs:
        other_email = next((p for p in conv["participants"] if p != email), "")
        other_user = await _db.registrations.find_one(
            {"email": other_email}, {"_id": 0, "full_name": 1, "photo_url": 1, "frek_id": 1}
        ) or {"full_name": other_email, "photo_url": "", "frek_id": ""}

        unread = await _db.dm_messages.count_documents({
            "conversation_id": conv["conversation_id"], "recipient": email, "read": False
        })

        result.append({
            "conversation_id": conv["conversation_id"],
            "other_email": other_email,
            "other_name": other_user.get("full_name", other_email),
            "other_avatar": other_user.get("photo_url", ""),
            "other_frek_id": other_user.get("frek_id", ""),
            "last_message": conv.get("last_message", ""),
            "last_message_at": conv.get("last_message_at", ""),
            "unread": unread,
        })

    return {"conversations": result}


@router.get("/api/messages/{conversation_id}")
async def get_messages(conversation_id: str, request: Request, limit: int = 50):
    """Recupere les messages d'une conversation."""
    email = _get_session_email(request)

    # Verify user belongs to conversation
    conv = await _db.dm_conversations.find_one(
        {"conversation_id": conversation_id, "participants": email}, {"_id": 0}
    )
    if not conv:
        raise HTTPException(403, "Acces refuse a cette conversation")

    msgs = await _db.dm_messages.find(
        {"conversation_id": conversation_id}, {"_id": 0}
    ).sort("timestamp", 1).limit(limit).to_list(limit)

    # Mark as read
    await _db.dm_messages.update_many(
        {"conversation_id": conversation_id, "recipient": email, "read": False},
        {"$set": {"read": True}}
    )

    return {"messages": msgs, "conversation_id": conversation_id}


class SendMessageRequest(BaseModel):
    recipient_email: str
    content: str


@router.post("/api/messages/send")
async def send_message(request: Request, body: SendMessageRequest):
    """Envoyer un message prive."""
    email = _get_session_email(request)
    frek_id = await _get_user_frek_id(email)
    reg = await _db.registrations.find_one({"email": email}, {"_id": 0, "full_name": 1})

    if email == body.recipient_email:
        raise HTTPException(400, "Impossible de s'envoyer un message a soi-meme")

    # Find or create conversation
    participants = sorted([email, body.recipient_email])
    conv = await _db.dm_conversations.find_one(
        {"participants": {"$all": participants}}, {"_id": 0}
    )

    if not conv:
        conv_id = str(uuid.uuid4())
        conv = {
            "conversation_id": conv_id,
            "participants": participants,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_message": body.content[:100],
            "last_message_at": datetime.now(timezone.utc).isoformat(),
        }
        await _db.dm_conversations.insert_one(conv)
    else:
        conv_id = conv["conversation_id"]

    msg = {
        "message_id": str(uuid.uuid4()),
        "conversation_id": conv_id,
        "sender": email,
        "sender_name": (reg or {}).get("full_name", email),
        "recipient": body.recipient_email,
        "content": body.content,
        "read": False,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await _db.dm_messages.insert_one(msg)

    # Update last message
    await _db.dm_conversations.update_one(
        {"conversation_id": conv_id},
        {"$set": {"last_message": body.content[:100], "last_message_at": msg["timestamp"]}}
    )

    if frek_id:
        await write_audit_log(frek_id, "FEED_POST", msg["message_id"], "dm")

    return {"success": True, "message_id": msg["message_id"], "conversation_id": conv_id}


# ═══════════════════════════════════════════════════════════════
# AGENDA CC2026 — 20-23 mai 2026
# ═══════════════════════════════════════════════════════════════

_AGENDA_CC2026 = [
    {
        "jour": "2026-05-20", "label": "Jour 1 — Ouverture", "events": [
            {"heure": "09:00", "titre": "Ouverture Officielle CC2026", "lieu": "TOM — Teyat Otonom Mawon", "artiste": "Comite CC2026", "confirme": True, "type": "ceremonie"},
            {"heure": "10:30", "titre": "Keynote : Souverainete Culturelle Numerique", "lieu": "TOM — Grande Salle", "artiste": "Laurent MUSIC", "confirme": True, "type": "conference"},
            {"heure": "14:00", "titre": "Panel : FREK-ID et Tracabilite des Oeuvres", "lieu": "TOM — Salle Innovation", "artiste": "Panel FREK", "confirme": True, "type": "conference"},
            {"heure": "16:00", "titre": "Ateliers Creoles — Langue & Tech", "lieu": "Espace Workshops", "artiste": "Collectif Madinina", "confirme": True, "type": "atelier"},
            {"heure": "20:00", "titre": "Concert Ouverture — Gwoka Fusion", "lieu": "Scene Principale", "artiste": "Admiral T", "confirme": True, "type": "concert"},
        ]
    },
    {
        "jour": "2026-05-21", "label": "Jour 2 — Innovation", "events": [
            {"heure": "09:30", "titre": "Hackathon Culturel — Kick-off", "lieu": "Hub Tech", "artiste": "Equipes participantes", "confirme": True, "type": "hackathon"},
            {"heure": "11:00", "titre": "Masterclass : Monetisation des Oeuvres", "lieu": "TOM — Salle Innovation", "artiste": "Ben ARRIS", "confirme": True, "type": "masterclass"},
            {"heure": "14:00", "titre": "Demo Day : Startups Culturelles Caribeeennes", "lieu": "TOM — Grande Salle", "artiste": "10 startups selectionnees", "confirme": True, "type": "pitch"},
            {"heure": "17:00", "titre": "Table Ronde : Fintech & Culture", "lieu": "TOM — Salle Innovation", "artiste": "Panel Fintech", "confirme": True, "type": "conference"},
            {"heure": "21:00", "titre": "Concert — Zouk & Kompa Night", "lieu": "Scene Principale", "artiste": "Kassav'", "confirme": True, "type": "concert"},
        ]
    },
    {
        "jour": "2026-05-22", "label": "Jour 3 — Diaspora", "events": [
            {"heure": "09:00", "titre": "Rencontres Diaspora — Networking", "lieu": "Hub Connexions", "artiste": "Communaute", "confirme": True, "type": "networking"},
            {"heure": "11:00", "titre": "Panel : Patrimoine Immateriel UNESCO", "lieu": "TOM — Grande Salle", "artiste": "Experts UNESCO", "confirme": True, "type": "conference"},
            {"heure": "14:00", "titre": "Ateliers Gastronomie Creole", "lieu": "Espace Culinaire", "artiste": "Chef invites", "confirme": True, "type": "atelier"},
            {"heure": "16:00", "titre": "Expo : Art Contemporain Caribeen", "lieu": "Galerie TOM", "artiste": "12 artistes", "confirme": True, "type": "exposition"},
            {"heure": "22:00", "titre": "Concert — Kathy-Liana Bravo", "lieu": "Scene Principale", "artiste": "Kathy-Liana Bravo", "confirme": True, "type": "concert"},
        ]
    },
    {
        "jour": "2026-05-23", "label": "Jour 4 — Legacy", "events": [
            {"heure": "09:00", "titre": "Hackathon Culturel — Presentations Finales", "lieu": "Hub Tech", "artiste": "Equipes finalistes", "confirme": True, "type": "hackathon"},
            {"heure": "11:00", "titre": "Remise des Prix CC2026", "lieu": "TOM — Grande Salle", "artiste": "Jury CC2026", "confirme": True, "type": "ceremonie"},
            {"heure": "14:00", "titre": "Bilan & Perspectives CC2027", "lieu": "TOM — Grande Salle", "artiste": "Comite CC2026", "confirme": True, "type": "conference"},
            {"heure": "16:00", "titre": "Ceremonie de Cloture", "lieu": "TOM — Grande Salle", "artiste": "Tous les participants", "confirme": True, "type": "ceremonie"},
            {"heure": "21:00", "titre": "Grand Concert de Cloture", "lieu": "Scene Principale", "artiste": "Surprise", "confirme": False, "type": "concert"},
        ]
    },
]


@router.get("/api/planning/cc2026")
async def get_cc2026_planning():
    """Agenda complet CC2026 — 4 jours."""
    return {"days": _AGENDA_CC2026, "total_events": sum(len(d["events"]) for d in _AGENDA_CC2026)}


@router.get("/api/planning/cc2026/{jour}")
async def get_cc2026_day(jour: str):
    """Agenda d'un jour specifique."""
    for d in _AGENDA_CC2026:
        if d["jour"] == jour:
            return d
    raise HTTPException(404, "Jour non trouve")


# ═══════════════════════════════════════════════════════════════
# STARTUP — Create indexes
# ═══════════════════════════════════════════════════════════════

async def create_omega_indexes():
    """Create indexes for Omega collections on startup."""
    try:
        await _db.audit_logs.create_index([("user_frek_id", 1), ("timestamp", -1)])
        await _db.audit_logs.create_index([("action_type", 1)])
        await _db.brain_training_data.create_index([("eligible_training", 1), ("timestamp", -1)])
        await _db.brain_training_data.create_index([("frek_id", 1)])
        await _db.adhesions.create_index([("email", 1), ("actif", 1)])
        await _db.feed_posts.create_index([("timestamp", -1)])
        await _db.feed_posts.create_index([("frek_id_auteur", 1)])
        # FREK-ID uniqueness
        try:
            await _db.frek_ids.create_index([("email", 1)], unique=True, sparse=True)
        except Exception:
            pass  # Index may already exist
        logger.info("Omega indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating omega indexes: {e}")


# ═══════════════════════════════════════════════════════════════
# TERMINAL — Deploy, Versioning, Rollback
# ═══════════════════════════════════════════════════════════════

# Dangerous patterns in HTML
_DANGEROUS_PATTERNS = [
    '<script src="http://', 'document.cookie', 'localStorage.getItem',
    'fetch(', 'XMLHttpRequest', 'eval(', 'Function(',
    'window.location', 'top.location',
]


def _scan_html_security(html: str) -> dict:
    """Basic HTML security scan."""
    issues = []
    for pattern in _DANGEROUS_PATTERNS:
        if pattern.lower() in html.lower():
            issues.append(f"Pattern suspect: {pattern}")
    # Allow Tailwind CDN, Chart.js, etc. but flag unknown external scripts
    import re
    external_scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)', html)
    allowed_cdns = ['cdn.tailwindcss.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com',
                    'unpkg.com', 'cdn.alpinejs.dev']
    for src in external_scripts:
        if not any(cdn in src for cdn in allowed_cdns):
            issues.append(f"Script externe non autorise: {src}")
    return {"safe": len(issues) == 0, "issues": issues}


class TerminalDeployRequest(BaseModel):
    slug: str
    html: str
    title: str = ""
    frek_id: str = ""


@router.post("/api/terminal/deploy")
async def terminal_deploy(request: Request, body: TerminalDeployRequest):
    """Deploy an HTML page — versioned, max 10 per slug."""
    email = ""
    try:
        email = _get_session_email(request)
    except Exception:
        pass

    frek_id = body.frek_id or (await _get_user_frek_id(email) if email else "anon")
    frek_short = (frek_id or "anon")[:5]
    full_slug = f"{frek_short}-{body.slug}"

    # Security scan
    scan = _scan_html_security(body.html)
    if not scan["safe"]:
        raise HTTPException(400, f"HTML refuse: {'; '.join(scan['issues'][:3])}")

    deploy_id = str(uuid.uuid4())[:12]
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "deploy_id": deploy_id,
        "frek_id": frek_id,
        "slug": full_slug,
        "title": body.title or body.slug,
        "html": body.html,
        "timestamp": now,
        "version": 1,
    }

    # Count existing versions for this slug
    existing = await _db.terminal_deploys.count_documents({"slug": full_slug, "frek_id": frek_id})
    doc["version"] = existing + 1

    # Max 10 versions per slug — delete oldest if exceeded
    if existing >= 10:
        oldest = await _db.terminal_deploys.find(
            {"slug": full_slug, "frek_id": frek_id}, {"_id": 1}
        ).sort("timestamp", 1).limit(1).to_list(1)
        if oldest:
            await _db.terminal_deploys.delete_one({"_id": oldest[0]["_id"]})

    await _db.terminal_deploys.insert_one(doc)

    if frek_id and frek_id != "anon":
        await write_audit_log(frek_id, "TERMINAL_DEPLOY", deploy_id, "terminal_deploy",
                              {"slug": full_slug, "version": doc["version"]})

    url = f"/pages/{full_slug}"
    return {
        "deploy_id": deploy_id, "slug": full_slug, "url": url,
        "version": doc["version"], "timestamp": now, "title": doc["title"],
    }


@router.get("/api/terminal/deploys")
async def list_terminal_deploys(frek_id: str = ""):
    """List deploys for a user."""
    query = {}
    if frek_id:
        query["frek_id"] = frek_id
    deploys = await _db.terminal_deploys.find(query, {"_id": 0, "html": 0}).sort("timestamp", -1).limit(20).to_list(20)
    return {"deploys": deploys}


@router.post("/api/terminal/rollback/{deploy_id}")
async def terminal_rollback(deploy_id: str):
    """Rollback to a specific deploy version."""
    doc = await _db.terminal_deploys.find_one({"deploy_id": deploy_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Deploy non trouve")
    return {"html": doc.get("html", ""), "slug": doc.get("slug"), "version": doc.get("version")}


# Serve deployed pages
@router.get("/pages/{slug:path}")
async def serve_deployed_page(slug: str):
    """Serve the latest deployed HTML page."""
    from fastapi.responses import HTMLResponse
    doc = await _db.terminal_deploys.find_one(
        {"slug": slug}, {"_id": 0, "html": 1}
    , sort=[("timestamp", -1)])
    if not doc:
        raise HTTPException(404, "Page non trouvee")
    return HTMLResponse(content=doc["html"])


# ═══════════════════════════════════════════════════════════════
# MESSAGES / DMs
# ═══════════════════════════════════════════════════════════════

@router.get("/api/messages/conversations")
async def list_conversations(request: Request):
    """List DM conversations for current user."""
    email = _get_session_email(request)
    convos = await _db.dm_conversations.find(
        {"participants": email}, {"_id": 0}
    ).sort("updated_at", -1).limit(20).to_list(20)
    return {"conversations": convos}


@router.get("/api/messages/conversations/{convo_id}")
async def get_conversation_messages(convo_id: str, limit: int = 20, skip: int = 0):
    """Get messages in a conversation."""
    msgs = await _db.dm_messages.find(
        {"conversation_id": convo_id}, {"_id": 0}
    ).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    msgs.reverse()
    return {"messages": msgs}


class DmSendRequest(BaseModel):
    destinataire_frek_id: str = ""
    destinataire_email: str = ""
    contenu: str


@router.post("/api/messages/send")
async def send_dm(request: Request, body: DmSendRequest):
    """Send a DM."""
    email = _get_session_email(request)
    dest_email = body.destinataire_email
    if not dest_email and body.destinataire_frek_id:
        dest_reg = await _db.registrations.find_one({"frek_id": body.destinataire_frek_id}, {"_id": 0, "email": 1})
        dest_email = (dest_reg or {}).get("email", "")
    if not dest_email:
        raise HTTPException(400, "Destinataire introuvable")

    participants = sorted([email, dest_email])
    convo = await _db.dm_conversations.find_one({"participants": participants}, {"_id": 0})
    if not convo:
        convo_id = str(uuid.uuid4())[:12]
        await _db.dm_conversations.insert_one({
            "conversation_id": convo_id, "participants": participants,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "last_message": body.contenu[:100],
        })
    else:
        convo_id = convo["conversation_id"]

    msg = {
        "message_id": str(uuid.uuid4())[:12],
        "conversation_id": convo_id,
        "sender_email": email,
        "contenu": body.contenu,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "read": False,
    }
    await _db.dm_messages.insert_one(msg)
    await _db.dm_conversations.update_one(
        {"conversation_id": convo_id},
        {"$set": {"last_message": body.contenu[:100], "updated_at": msg["timestamp"]}}
    )

    return {"success": True, "message_id": msg["message_id"], "conversation_id": convo_id}


# ═══════════════════════════════════════════════════════════════
# AGENDA CC2026 — Seed + Read
# ═══════════════════════════════════════════════════════════════

CC2026_AGENDA = [
    {"day": 1, "date": "2026-05-20", "label": "Jour 1 — Ouverture", "slots": [
        {"heure": "18:00", "titre": "Ceremonie d'ouverture", "lieu": "Scene Principale", "artiste": "Kilti Konet", "confirme": True},
        {"heure": "20:00", "titre": "DJ Set Ouverture", "lieu": "Scene Principale", "artiste": "TBA", "confirme": False},
    ]},
    {"day": 2, "date": "2026-05-21", "label": "Jour 2 — Culture", "slots": [
        {"heure": "15:00", "titre": "Ateliers Creoles", "lieu": "Espace Workshops", "artiste": "Collectif Madinina", "confirme": True},
        {"heure": "20:00", "titre": "Concert Zouk", "lieu": "Scene Principale", "artiste": "TBA", "confirme": False},
    ]},
    {"day": 3, "date": "2026-05-22", "label": "Jour 3 — Live", "slots": [
        {"heure": "16:00", "titre": "Labo des Histoires", "lieu": "Scene Secondaire", "artiste": "Kathy-Liana Bravo", "confirme": True},
        {"heure": "22:00", "titre": "Live Set", "lieu": "Scene Principale", "artiste": "Kathy-Liana Bravo", "confirme": True},
    ]},
    {"day": 4, "date": "2026-05-23", "label": "Jour 4 — Cloture", "slots": [
        {"heure": "14:00", "titre": "Remise des prix FREK", "lieu": "Scene Principale", "artiste": "Jury CC2026", "confirme": True},
        {"heure": "21:00", "titre": "Concert Cloture", "lieu": "Scene Principale", "artiste": "TBA", "confirme": False},
    ]},
]


@router.get("/api/planning/cc2026")
async def get_cc2026_agenda():
    """Get CC2026 agenda (4 days)."""
    return {"days": CC2026_AGENDA, "lieu": "La Savane, Fort-de-France", "dates": "20-23 mai 2026"}


# ═══════════════════════════════════════════════════════════════
# GOUVERNANCE — Proposals + Votes
# ═══════════════════════════════════════════════════════════════

@router.get("/api/gouvernance/proposals")
async def list_gouvernance_proposals(request: Request):
    """List active governance proposals."""
    proposals = await _db.gouvernance_proposals.find({}, {"_id": 0}).sort("date_creation", -1).limit(20).to_list(20)
    email = ""
    try:
        email = _get_session_email(request)
    except Exception:
        pass
    for p in proposals:
        p["user_a_vote"] = email in (p.get("voters", []))
    return {"proposals": proposals}


@router.get("/api/gouvernance/seed")
async def seed_gouvernance_proposals():
    """Auto-seed governance proposals if empty."""
    count = await _db.gouvernance_proposals.count_documents({})
    if count > 0:
        return {"message": "Proposals already exist", "count": count}

    proposals = [
        {
            "proposal_id": str(uuid.uuid4()),
            "titre": "Allocation budget 2026 pour le developpement numerique",
            "description": "Proposition d'allouer 30% du budget CC2026 au developpement d'outils numeriques pour les createurs culturels caribeeens.",
            "auteur": "Comite CC2026",
            "categorie": "BUDGET",
            "statut": "ACTIVE",
            "nb_votes_pour": 24,
            "nb_votes_contre": 3,
            "voters": [],
            "date_creation": datetime.now(timezone.utc).isoformat(),
            "date_fin": "2026-05-15T23:59:59Z",
        },
        {
            "proposal_id": str(uuid.uuid4()),
            "titre": "Creation d'un fonds de soutien pour artistes emergents",
            "description": "Mise en place d'un fonds de 50 000EUR pour financer les projets d'artistes emergents via le systeme FREK-ID.",
            "auteur": "Collectif Madinina",
            "categorie": "FONDS",
            "statut": "ACTIVE",
            "nb_votes_pour": 45,
            "nb_votes_contre": 8,
            "voters": [],
            "date_creation": datetime.now(timezone.utc).isoformat(),
            "date_fin": "2026-05-20T23:59:59Z",
        },
        {
            "proposal_id": str(uuid.uuid4()),
            "titre": "Partenariat avec l'UNESCO pour la preservation du patrimoine immateriel",
            "description": "Etablir un accord formel avec l'UNESCO pour integrer les oeuvres certifiees FREK dans le registre du patrimoine immateriel.",
            "auteur": "Panel FREK",
            "categorie": "PARTENARIAT",
            "statut": "ACTIVE",
            "nb_votes_pour": 67,
            "nb_votes_contre": 2,
            "voters": [],
            "date_creation": datetime.now(timezone.utc).isoformat(),
            "date_fin": "2026-06-01T23:59:59Z",
        },
        {
            "proposal_id": str(uuid.uuid4()),
            "titre": "Extension du Jeton CC aux festivals partenaires",
            "description": "Permettre l'utilisation du Jeton CC dans 5 festivals caribeeens partenaires en 2027.",
            "auteur": "FMS Comite",
            "categorie": "FINTECH",
            "statut": "ACTIVE",
            "nb_votes_pour": 33,
            "nb_votes_contre": 12,
            "voters": [],
            "date_creation": datetime.now(timezone.utc).isoformat(),
            "date_fin": "2026-05-25T23:59:59Z",
        },
    ]
    await _db.gouvernance_proposals.insert_many(proposals)
    return {"message": "Proposals seeded", "count": len(proposals)}


class GouvernanceCreateRequest(BaseModel):
    titre: str
    description: str
    categorie: str = "GENERAL"


@router.post("/api/gouvernance/create")
async def create_gouvernance_proposal(request: Request, body: GouvernanceCreateRequest):
    """Creer une nouvelle proposition."""
    email = _get_session_email(request)
    reg = await _db.registrations.find_one({"email": email}, {"_id": 0, "full_name": 1})

    proposal = {
        "proposal_id": str(uuid.uuid4()),
        "titre": body.titre,
        "description": body.description,
        "auteur": (reg or {}).get("full_name", email),
        "auteur_email": email,
        "categorie": body.categorie,
        "statut": "ACTIVE",
        "nb_votes_pour": 0,
        "nb_votes_contre": 0,
        "voters": [],
        "date_creation": datetime.now(timezone.utc).isoformat(),
        "date_fin": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
    }
    await _db.gouvernance_proposals.insert_one(proposal)

    frek_id = await _get_user_frek_id(email)
    if frek_id:
        await write_audit_log(frek_id, "GOUVERNANCE_CREATE", proposal["proposal_id"], "proposal")

    return {"success": True, "proposal_id": proposal["proposal_id"]}


class GouvernanceVoteRequest(BaseModel):
    proposal_id: str
    vote: str  # POUR or CONTRE


@router.post("/api/gouvernance/vote")
async def vote_gouvernance(request: Request, body: GouvernanceVoteRequest):
    """Vote on a governance proposal."""
    email = _get_session_email(request)
    proposal = await _db.gouvernance_proposals.find_one({"proposal_id": body.proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(404, "Proposition non trouvee")
    if email in (proposal.get("voters") or []):
        raise HTTPException(400, "Vous avez deja vote")

    # Vote weight by adhesion level
    adhesion = await _db.adhesions.find_one({"email": email, "actif": True}, {"_id": 0})
    level = (adhesion or {}).get("level", "FREE")
    weights = {"FREE": 1, "PRO": 3, "PREMIUM": 5, "INSTITUTIONNEL": 10}
    weight = weights.get(level, 1)

    field = "nb_votes_pour" if body.vote.upper() == "POUR" else "nb_votes_contre"
    await _db.gouvernance_proposals.update_one(
        {"proposal_id": body.proposal_id},
        {"$inc": {field: weight}, "$push": {"voters": email}}
    )

    frek_id = await _get_user_frek_id(email)
    if frek_id:
        await write_audit_log(frek_id, "GOUVERNANCE_VOTE", body.proposal_id, "proposal",
                              {"vote": body.vote.upper(), "weight": weight, "level": level})

    return {"success": True, "vote": body.vote.upper(), "weight": weight, "level": level}


# ═══════════════════════════════════════════════════════════════
# ACCREDITATION CC2026 — Flux 7 etapes (formulaire → impression)
# ═══════════════════════════════════════════════════════════════

ACCREDITATION_TYPES = {
    "PRO": {"label": "Professionnel", "price": 300, "nfc": False},
    "INSTITUTIONNEL": {"label": "Institutionnel", "price": 500, "nfc": True},
    "ARTISTE": {"label": "Artiste", "price": 0, "nfc": False},
    "VIP": {"label": "VIP", "price": 800, "nfc": True},
    "PRESSE": {"label": "Presse", "price": 0, "nfc": False},
    "VISITEUR": {"label": "Visiteur", "price": 50, "nfc": False},
}


class AccreditationApplyRequest(BaseModel):
    prenom: str
    nom: str
    email: str
    telephone: str = ""
    organisation: str = ""
    type_accreditation: str
    bio: str = ""
    photo_url: str = ""
    jours_selectionnes: list = []


@router.post("/api/accreditation/apply")
async def accreditation_apply(body: AccreditationApplyRequest):
    """Etape 1-2 : Soumission de la demande d'accreditation."""
    if body.type_accreditation not in ACCREDITATION_TYPES:
        raise HTTPException(400, f"Type invalide. Types: {list(ACCREDITATION_TYPES.keys())}")

    existing = await _db.accreditations_cc2026.find_one({"email": body.email}, {"_id": 0})
    if existing:
        raise HTTPException(409, "Demande deja soumise pour cet email")

    acc_type = ACCREDITATION_TYPES[body.type_accreditation]
    acc_id = f"ACC-{str(uuid.uuid4())[:8].upper()}"

    doc = {
        "accreditation_id": acc_id,
        "prenom": body.prenom,
        "nom": body.nom,
        "email": body.email,
        "telephone": body.telephone,
        "organisation": body.organisation,
        "type_accreditation": body.type_accreditation,
        "type_label": acc_type["label"],
        "bio": body.bio,
        "photo_url": body.photo_url,
        "jours_selectionnes": body.jours_selectionnes or ["2026-05-20", "2026-05-21", "2026-05-22", "2026-05-23"],
        "prix": acc_type["price"],
        "nfc_enabled": acc_type["nfc"],
        "statut": "SOUMISE" if acc_type["price"] == 0 else "EN_ATTENTE_PAIEMENT",
        "etape": 3 if acc_type["price"] > 0 else 4,
        "badge_id": None,
        "qr_token": None,
        "frek_id": None,
        "paiement_stripe_id": None,
        "paiement_date": None,
        "validation_admin": None,
        "validation_date": None,
        "badge_genere": False,
        "badge_imprime": False,
        "badge_remis": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.accreditations_cc2026.insert_one(doc)

    return {
        "accreditation_id": acc_id,
        "type": body.type_accreditation,
        "type_label": acc_type["label"],
        "prix": acc_type["price"],
        "statut": doc["statut"],
        "etape": doc["etape"],
        "requires_payment": acc_type["price"] > 0,
    }


@router.get("/api/accreditation/status/{accreditation_id}")
async def accreditation_status(accreditation_id: str):
    """Verifie le statut d'une accreditation."""
    doc = await _db.accreditations_cc2026.find_one({"accreditation_id": accreditation_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Accreditation non trouvee")
    return doc


@router.get("/api/accreditation/my")
async def my_accreditation(request: Request):
    """Recupere l'accreditation de l'utilisateur connecte."""
    email = _get_session_email(request)
    doc = await _db.accreditations_cc2026.find_one({"email": email}, {"_id": 0})
    if not doc:
        return {"exists": False}
    return {**doc, "exists": True}


@router.get("/api/accreditation/types")
async def get_accreditation_types():
    """Liste les types d'accreditation disponibles."""
    return {"types": {k: {**v, "id": k} for k, v in ACCREDITATION_TYPES.items()}}


@router.post("/api/accreditation/pay/{accreditation_id}")
async def accreditation_pay(accreditation_id: str, request: Request):
    """Etape 3 : Creer un checkout Stripe pour le paiement."""
    doc = await _db.accreditations_cc2026.find_one({"accreditation_id": accreditation_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Accreditation non trouvee")
    if doc["prix"] == 0:
        return {"already_free": True}

    import stripe
    stripe.api_key = os.environ.get("STRIPE_API_KEY", "")

    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    origin_url = body.get("origin_url", os.environ.get("FRONTEND_URL", ""))

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "unit_amount": int(doc["prix"] * 100),
                    "product_data": {"name": f"Accreditation CC2026 — {doc['type_label']}"},
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{origin_url}/pro?accreditation=success&id={accreditation_id}",
            cancel_url=f"{origin_url}/pro?accreditation=cancelled",
            metadata={"accreditation_id": accreditation_id, "email": doc["email"]},
        )

        await _db.accreditations_cc2026.update_one(
            {"accreditation_id": accreditation_id},
            {"$set": {"paiement_stripe_id": session.id, "statut": "PAIEMENT_EN_COURS"}}
        )

        return {"checkout_url": session.url, "session_id": session.id}
    except Exception as e:
        logger.error(f"Stripe checkout error for accreditation: {e}")
        raise HTTPException(500, f"Erreur Stripe: {str(e)}")


@router.post("/api/accreditation/confirm-payment/{accreditation_id}")
async def accreditation_confirm_payment(accreditation_id: str):
    """Etape 3b : Confirmer le paiement (appele apres webhook Stripe ou manuellement)."""
    doc = await _db.accreditations_cc2026.find_one({"accreditation_id": accreditation_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Accreditation non trouvee")

    await _db.accreditations_cc2026.update_one(
        {"accreditation_id": accreditation_id},
        {"$set": {
            "statut": "SOUMISE",
            "etape": 4,
            "paiement_date": datetime.now(timezone.utc).isoformat(),
        }}
    )
    return {"success": True, "statut": "SOUMISE", "etape": 4}


@router.get("/api/accreditation/admin/list")
async def admin_list_accreditations(statut: str = None):
    """Admin : lister les accreditations."""
    query = {}
    if statut:
        query["statut"] = statut
    docs = await _db.accreditations_cc2026.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"accreditations": docs, "total": len(docs)}


class AdminValidateRequest(BaseModel):
    accreditation_id: str
    decision: str  # "APPROUVE" ou "REFUSE"
    motif: str = ""


@router.post("/api/accreditation/admin/validate")
async def admin_validate_accreditation(body: AdminValidateRequest, request: Request):
    """Etape 5 : Validation admin — genere le badge si approuve."""
    email = _get_session_email(request)

    doc = await _db.accreditations_cc2026.find_one({"accreditation_id": body.accreditation_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Accreditation non trouvee")

    if body.decision == "APPROUVE":
        import secrets as _sec
        import string as _str
        code5 = "".join(_sec.choice(_str.ascii_uppercase + _str.digits) for _ in range(5))
        type_map = {"PRO": "VIS", "INSTITUTIONNEL": "OFF", "ARTISTE": "ART", "VIP": "VIP", "PRESSE": "PRS", "VISITEUR": "VIS"}
        badge_type = type_map.get(doc["type_accreditation"], "VIS")
        badge_id = f"CC26-{badge_type}-{code5}"
        qr_token = uuid.uuid4().hex

        # Create badge in cc_badges
        await _db.cc_badges.insert_one({
            "badge_id": badge_id,
            "prenom": doc["prenom"],
            "nom": doc["nom"],
            "email": doc["email"],
            "type_badge": badge_type,
            "statut": "ACTIVE",
            "qr_token": qr_token,
            "nfc_enabled": doc.get("nfc_enabled", False),
            "nfc_uid": "",
            "jetons_solde": 0,
            "organisation": doc.get("organisation", ""),
            "date_emission": datetime.now(timezone.utc).isoformat(),
            "imprime": False,
            "remis": False,
            "accreditation_id": body.accreditation_id,
        })

        await _db.accreditations_cc2026.update_one(
            {"accreditation_id": body.accreditation_id},
            {"$set": {
                "statut": "APPROUVEE",
                "etape": 6,
                "badge_id": badge_id,
                "qr_token": qr_token,
                "validation_admin": email,
                "validation_date": datetime.now(timezone.utc).isoformat(),
                "badge_genere": True,
            }}
        )

        frek_id = await _get_user_frek_id(doc["email"])
        if frek_id:
            await write_audit_log(frek_id, "ACCREDITATION_APPROVED", body.accreditation_id, "accreditation")

        # Send badge confirmation email
        try:
            from services.brevo_templates import badge_confirmation
            from server import send_email_async
            subj, html = badge_confirmation(
                prenom=doc["prenom"],
                type_badge=doc.get("type_label", doc["type_accreditation"]),
                frek_id=frek_id or "",
                badge_id=badge_id,
            )
            await send_email_async(doc["email"], subj, html)
        except Exception:
            pass  # Email failure must not block badge generation

        return {"success": True, "decision": "APPROUVE", "badge_id": badge_id, "qr_token": qr_token}
    else:
        await _db.accreditations_cc2026.update_one(
            {"accreditation_id": body.accreditation_id},
            {"$set": {
                "statut": "REFUSEE",
                "etape": 5,
                "validation_admin": email,
                "validation_date": datetime.now(timezone.utc).isoformat(),
                "motif_refus": body.motif,
            }}
        )
        return {"success": True, "decision": "REFUSE", "motif": body.motif}


@router.post("/api/accreditation/admin/mark-printed/{accreditation_id}")
async def mark_badge_printed(accreditation_id: str):
    """Etape 7 : Marquer le badge comme imprime."""
    await _db.accreditations_cc2026.update_one(
        {"accreditation_id": accreditation_id},
        {"$set": {"badge_imprime": True, "etape": 7, "statut": "IMPRIMEE"}}
    )
    return {"success": True, "etape": 7}


# ═══════════════════════════════════════════════════════════════
# ITER.59 — EXPORT CSV TWINA (P0.3)
# ═══════════════════════════════════════════════════════════════

@router.get("/api/admin/badges/export-csv")
async def export_badges_csv(statut: str = None, type_badge: str = None):
    """Export badges CSV UTF-8 BOM pour Twina. Admin uniquement."""
    import csv as _csv
    import io as _io

    query = {}
    if statut:
        query["statut"] = statut
    if type_badge:
        query["type_badge"] = type_badge

    badges = await _db.cc_badges.find(query, {"_id": 0}).sort("date_emission", -1).to_list(5000)

    buf = _io.StringIO()
    buf.write("\ufeff")  # BOM for Excel
    writer = _csv.writer(buf, delimiter=";")
    writer.writerow(["badge_id", "frek_id", "prenom", "nom", "organisation",
                      "type_badge", "statut", "qr_token", "nfc_enabled",
                      "date_emission", "email"])
    for b in badges:
        writer.writerow([
            b.get("badge_id", ""), b.get("frek_id", ""),
            b.get("prenom", ""), b.get("nom", ""),
            b.get("organisation", ""), b.get("type_badge", ""),
            b.get("statut", ""), b.get("qr_token", ""),
            str(b.get("nfc_enabled", False)), b.get("date_emission", ""),
            b.get("email", ""),
        ])

    from fastapi.responses import StreamingResponse as _SR
    return _SR(
        _io.BytesIO(buf.getvalue().encode("utf-8")),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=badges_cc2026_twina.csv"},
    )


# ═══════════════════════════════════════════════════════════════
# ITER.59 — WALLET TRANSFER & SWAP (Boutons #38 #39)
# ═══════════════════════════════════════════════════════════════

class WalletTransferRequest(BaseModel):
    destinataire_frek_id: str
    montant: int
    type_jeton: str = "KT"

@router.post("/api/wallet/transfer")
async def wallet_transfer(request: Request, body: WalletTransferRequest):
    """Transfert JCC/KT entre wallets. Debit envoyeur, credit destinataire."""
    email = _get_session_email(request)
    sender_frek_id = await _get_user_frek_id(email)

    if body.montant <= 0:
        raise HTTPException(400, "Montant invalide")

    field = "balance_kt" if body.type_jeton == "KT" else "balance_jcc"

    sender_wallet = await _db.kn_wallets.find_one({"email": email}, {"_id": 0})
    if not sender_wallet or sender_wallet.get(field, 0) < body.montant:
        raise HTTPException(400, f"Solde {body.type_jeton} insuffisant")

    # Find recipient by frek_id
    recipient = await _db.users.find_one({"frek_id": body.destinataire_frek_id}, {"_id": 0, "email": 1})
    if not recipient:
        raise HTTPException(404, "Destinataire introuvable")

    now = datetime.now(timezone.utc).isoformat()

    # Debit sender
    await _db.kn_wallets.update_one(
        {"email": email},
        {"$inc": {field: -body.montant}, "$set": {"updated_at": now}}
    )
    # Credit recipient
    await _db.kn_wallets.update_one(
        {"email": recipient["email"]},
        {"$inc": {field: body.montant}, "$set": {"updated_at": now}},
        upsert=True
    )

    # Log both sides
    tx_id = str(uuid.uuid4())[:8]
    for side, frek, action in [
        ("debit", sender_frek_id, "WALLET_DEBIT"),
        ("credit", body.destinataire_frek_id, "WALLET_CREDIT"),
    ]:
        await write_audit_log(frek, action, tx_id, "wallet", {
            "montant": body.montant, "type_jeton": body.type_jeton,
            "from": sender_frek_id, "to": body.destinataire_frek_id,
        })

    return {"success": True, "tx_id": tx_id, "montant": body.montant, "type": body.type_jeton}


class WalletSwapRequest(BaseModel):
    montant: int
    direction: str = "KT_TO_JCC"  # or "JCC_TO_KT"

@router.post("/api/wallet/swap")
async def wallet_swap(request: Request, body: WalletSwapRequest):
    """Conversion KT <-> JCC. Taux 1:1."""
    email = _get_session_email(request)

    if body.montant <= 0:
        raise HTTPException(400, "Montant invalide")

    if body.direction == "KT_TO_JCC":
        from_field, to_field = "balance_kt", "balance_jcc"
    else:
        from_field, to_field = "balance_jcc", "balance_kt"

    wallet = await _db.kn_wallets.find_one({"email": email}, {"_id": 0})
    if not wallet or wallet.get(from_field, 0) < body.montant:
        raise HTTPException(400, "Solde insuffisant pour le swap")

    now = datetime.now(timezone.utc).isoformat()
    await _db.kn_wallets.update_one(
        {"email": email},
        {"$inc": {from_field: -body.montant, to_field: body.montant}, "$set": {"updated_at": now}}
    )

    frek_id = await _get_user_frek_id(email)
    await write_audit_log(frek_id, "WALLET_SWAP", "", "wallet", {
        "montant": body.montant, "direction": body.direction,
    })

    return {"success": True, "montant": body.montant, "direction": body.direction}


# ═══════════════════════════════════════════════════════════════
# ITER.59 — BUILDER CRUD (Boutons #92-#112)
# ═══════════════════════════════════════════════════════════════

class BuilderProjectCreate(BaseModel):
    titre: str = "Sans titre"
    description: str = ""

class BuilderProjectUpdate(BaseModel):
    titre: str = ""
    description: str = ""
    media_url: str = ""

class BuilderPublishRequest(BaseModel):
    project_id: str
    canal: str = "feed"  # feed | pro | shop

@router.get("/api/builder/projects")
async def list_builder_projects(request: Request):
    """Liste les projets du builder."""
    email = _get_session_email(request)
    projects = await _db.builder_projects.find({"email": email}, {"_id": 0}).sort("updated_at", -1).to_list(50)
    return {"projects": projects}

@router.post("/api/builder/projects")
async def create_builder_project(request: Request, body: BuilderProjectCreate):
    """Creer un nouveau projet builder."""
    email = _get_session_email(request)
    frek_id = await _get_user_frek_id(email)
    project_id = f"PRJ-{str(uuid.uuid4())[:8].upper()}"
    now = datetime.now(timezone.utc).isoformat()

    doc = {
        "project_id": project_id,
        "email": email,
        "frek_id": frek_id,
        "titre": body.titre,
        "description": body.description,
        "media_url": "",
        "status": "draft",
        "canal": None,
        "published": False,
        "frek_certified": False,
        "created_at": now,
        "updated_at": now,
    }
    await _db.builder_projects.insert_one(doc)
    await write_audit_log(frek_id, "BUILDER_SAVE", project_id, "builder")

    return {k: v for k, v in doc.items() if k != "_id"}

@router.put("/api/builder/projects/{project_id}")
async def update_builder_project(project_id: str, request: Request, body: BuilderProjectUpdate):
    """Sauvegarder un projet builder."""
    email = _get_session_email(request)
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if body.titre:
        update["titre"] = body.titre
    if body.description:
        update["description"] = body.description
    if body.media_url:
        update["media_url"] = body.media_url

    result = await _db.builder_projects.update_one(
        {"project_id": project_id, "email": email},
        {"$set": update}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Projet introuvable")
    return {"success": True, "project_id": project_id}

@router.post("/api/builder/publish")
async def publish_builder_project(request: Request, body: BuilderPublishRequest):
    """Publier un projet sur un canal (feed, pro, shop)."""
    email = _get_session_email(request)
    frek_id = await _get_user_frek_id(email)

    project = await _db.builder_projects.find_one(
        {"project_id": body.project_id, "email": email}, {"_id": 0}
    )
    if not project:
        raise HTTPException(404, "Projet introuvable")

    now = datetime.now(timezone.utc).isoformat()
    await _db.builder_projects.update_one(
        {"project_id": body.project_id},
        {"$set": {"published": True, "canal": body.canal, "published_at": now, "updated_at": now}}
    )

    # If canal == feed, create a real post in pro_posts (the active feed)
    if body.canal in ("feed", "shop"):
        reg = await _db.registrations.find_one({"email": email}, {"_id": 0, "id": 1, "full_name": 1, "profile_type": 1, "image": 1, "frek_id": 1})
        # Fallback: if no registration found, use session/email info
        author_name = email.split("@")[0]
        author_id = ""
        author_title = "Membre"
        author_image = ""
        author_frek = frek_id or ""
        if reg:
            author_name = reg.get("full_name", author_name)
            author_id = reg.get("id", "")
            author_title = reg.get("profile_type", "Membre")
            author_image = reg.get("image", "")
            author_frek = reg.get("frek_id", frek_id or "")

        post = {
            "id": f"post_{str(uuid.uuid4())[:12]}",
            "author_id": author_id,
            "author_frek_id": author_frek,
            "author_name": author_name,
            "author_title": author_title,
            "author_image": author_image,
            "content": (project.get("titre") or "") + ("\n\n" + project["description"] if project.get("description") else ""),
            "thumbnail_url": project.get("media_url", ""),
            "post_type": "creation",
            "dimension": "Arts Visuels & Sceniques",
            "likes": [],
            "likes_count": 0,
            "eclairs": [],
            "eclairs_count": 0,
            "comments": [],
            "comments_count": 0,
            "shares_count": 0,
            "views_count": 0,
            "is_ghost": False,
            "is_reel": False,
            "builder_project_id": body.project_id,
            "canal": body.canal,
            "created_at": now,
            "updated_at": now,
        }
        await _db.pro_posts.insert_one(post)

    await write_audit_log(frek_id, "BUILDER_PUBLISH", body.project_id, "builder", {"canal": body.canal})
    return {"success": True, "canal": body.canal, "project_id": body.project_id}

@router.get("/api/builder/analytics")
async def builder_analytics(request: Request):
    """Stats du builder basees sur audit_logs."""
    email = _get_session_email(request)
    frek_id = await _get_user_frek_id(email)

    projects = await _db.builder_projects.count_documents({"email": email})
    published = await _db.builder_projects.count_documents({"email": email, "published": True})
    posts = await _db.feed_posts.count_documents({"auteur_frek_id": frek_id})

    # Count eclairs received
    pipeline = [
        {"$match": {"auteur_frek_id": frek_id}},
        {"$group": {"_id": None, "total_eclairs": {"$sum": "$eclairs"}}},
    ]
    eclair_result = await _db.feed_posts.aggregate(pipeline).to_list(1)
    total_eclairs = eclair_result[0]["total_eclairs"] if eclair_result else 0

    return {
        "projects": projects,
        "published": published,
        "posts": posts,
        "eclairs_recus": total_eclairs,
    }


# ═══════════════════════════════════════════════════════════════
# ITER.59 — FREK WORKSHOP SUBMIT (Bouton #107)
# ═══════════════════════════════════════════════════════════════

class FrekCertifyRequest(BaseModel):
    project_id: str

@router.post("/api/frek/certify")
async def frek_certify_project(request: Request, body: FrekCertifyRequest):
    """Soumettre un projet au Workshop FREK pour certification Genesis."""
    email = _get_session_email(request)
    frek_id = await _get_user_frek_id(email)

    project = await _db.builder_projects.find_one(
        {"project_id": body.project_id, "email": email}, {"_id": 0}
    )
    if not project:
        raise HTTPException(404, "Projet introuvable")

    now = datetime.now(timezone.utc).isoformat()
    cert_id = f"FREK-{str(uuid.uuid4())[:8].upper()}"

    await _db.frek_certifications.insert_one({
        "cert_id": cert_id,
        "project_id": body.project_id,
        "frek_id": frek_id,
        "email": email,
        "titre": project.get("titre", ""),
        "status": "GENESIS",
        "submitted_at": now,
    })

    await _db.builder_projects.update_one(
        {"project_id": body.project_id},
        {"$set": {"frek_certified": True, "frek_cert_id": cert_id, "updated_at": now}}
    )

    await write_audit_log(frek_id, "FREK_WORKSHOP_SUBMIT", cert_id, "frek", {"project_id": body.project_id})
    return {"success": True, "cert_id": cert_id, "status": "GENESIS"}


# ═══════════════════════════════════════════════════════════════
# ITER.59 — USER FOLLOW (Bouton #142)
# ═══════════════════════════════════════════════════════════════

class FollowRequest(BaseModel):
    target_frek_id: str

@router.post("/api/user/follow")
async def toggle_follow(request: Request, body: FollowRequest):
    """Toggle follow/unfollow un utilisateur."""
    email = _get_session_email(request)
    frek_id = await _get_user_frek_id(email)

    if frek_id == body.target_frek_id:
        raise HTTPException(400, "Cannot follow yourself")

    existing = await _db.user_follows.find_one(
        {"follower": frek_id, "following": body.target_frek_id}
    )

    if existing:
        await _db.user_follows.delete_one({"follower": frek_id, "following": body.target_frek_id})
        action = "USER_UNFOLLOW"
        following = False
    else:
        await _db.user_follows.insert_one({
            "follower": frek_id,
            "following": body.target_frek_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        action = "USER_FOLLOW"
        following = True

    await write_audit_log(frek_id, action, body.target_frek_id, "social")
    return {"success": True, "following": following}

@router.get("/api/user/following")
async def get_following(request: Request):
    """Liste des frek_id suivis."""
    email = _get_session_email(request)
    frek_id = await _get_user_frek_id(email)
    docs = await _db.user_follows.find({"follower": frek_id}, {"_id": 0, "following": 1}).to_list(500)
    return {"following": [d["following"] for d in docs]}


# ═══════════════════════════════════════════════════════════════
# ITER.59 — BRAIN SESSIONS (Boutons #13 #14)
# ═══════════════════════════════════════════════════════════════

@router.get("/api/brain/sessions")
async def list_brain_sessions(request: Request):
    """Liste les sessions Brain de l'utilisateur."""
    email = _get_session_email(request)
    sessions = await _db.brain_sessions.find(
        {"email": email}, {"_id": 0}
    ).sort("updated_at", -1).to_list(50)
    return {"sessions": sessions}

@router.get("/api/brain/activity")
async def brain_recent_activity(request: Request):
    """Activite recente du Brain (dernieres requetes)."""
    email = _get_session_email(request)
    frek_id = await _get_user_frek_id(email)
    logs = await _db.audit_logs.find(
        {"user_frek_id": frek_id, "action_type": "BRAIN_QUERY"},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(10)
    return {"activity": logs}


# ═══════════════════════════════════════════════════════════════
# ITER.59 — FREKVIEW / CULTURAL IMPACT SCORE
# ═══════════════════════════════════════════════════════════════

@router.get("/api/frek/profile/{frek_id}")
async def get_frek_profile(frek_id: str):
    """Profil FREK avec Cultural Impact Score."""
    user = await _db.users.find_one({"frek_id": frek_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "Utilisateur introuvable")

    # Compute score
    eclairs_pipeline = [
        {"$match": {"auteur_frek_id": frek_id}},
        {"$group": {"_id": None, "total": {"$sum": "$eclairs"}}},
    ]
    eclair_res = await _db.feed_posts.aggregate(eclairs_pipeline).to_list(1)
    eclairs = eclair_res[0]["total"] if eclair_res else 0

    posts = await _db.feed_posts.count_documents({"auteur_frek_id": frek_id})
    certifications = await _db.frek_certifications.count_documents({"frek_id": frek_id})

    # Days since creation
    created = user.get("created_at", "")
    days = 0
    if created:
        try:
            dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            days = (datetime.now(timezone.utc) - dt).days
        except Exception:
            days = 0

    score = (eclairs * 2) + (posts * 5) + (certifications * 20) + int(days * 0.1)

    if score >= 600:
        niveau = "PILIER"
    elif score >= 300:
        niveau = "INFLUENT"
    elif score >= 100:
        niveau = "ACTIF"
    else:
        niveau = "EMERGENT"

    # Badge CC2026 linked
    badge = await _db.cc_badges.find_one({"email": user.get("email", "")}, {"_id": 0})

    return {
        "frek_id": frek_id,
        "display_name": user.get("full_name", ""),
        "email": user.get("email", ""),
        "score": score,
        "niveau": niveau,
        "eclairs_recus": eclairs,
        "posts": posts,
        "certifications": certifications,
        "jours_actifs": days,
        "badge_cc2026": badge.get("badge_id") if badge else None,
        "created_at": created,
    }


# ═══════════════════════════════════════════════════════════════
# ITER.59 — TRADE PEER-TO-PEER
# ═══════════════════════════════════════════════════════════════

class TradeOfferRequest(BaseModel):
    type_jeton: str = "KT"
    montant: int
    prix_unitaire_jcc: float = 1.0
    description: str = ""

@router.post("/api/trade/offer")
async def create_trade_offer(request: Request, body: TradeOfferRequest):
    """Creer une offre de trade P2P."""
    email = _get_session_email(request)
    frek_id = await _get_user_frek_id(email)

    if body.montant <= 0:
        raise HTTPException(400, "Montant invalide")

    wallet = await _db.kn_wallets.find_one({"email": email}, {"_id": 0})
    field = "balance_kt" if body.type_jeton == "KT" else "balance_jcc"
    if not wallet or wallet.get(field, 0) < body.montant:
        raise HTTPException(400, "Solde insuffisant")

    offer_id = f"TRD-{str(uuid.uuid4())[:8].upper()}"
    now = datetime.now(timezone.utc).isoformat()

    # Lock funds
    await _db.kn_wallets.update_one({"email": email}, {"$inc": {field: -body.montant}})

    doc = {
        "offer_id": offer_id,
        "seller_frek_id": frek_id,
        "seller_email": email,
        "type_jeton": body.type_jeton,
        "montant": body.montant,
        "prix_unitaire_jcc": body.prix_unitaire_jcc,
        "description": body.description,
        "status": "open",
        "created_at": now,
    }
    await _db.trade_offers.insert_one(doc)
    await write_audit_log(frek_id, "TRADE_ORDER", offer_id, "trade", {"action": "create"})

    return {k: v for k, v in doc.items() if k != "_id"}

@router.get("/api/trade/offers")
async def list_trade_offers():
    """Liste les offres de trade ouvertes."""
    offers = await _db.trade_offers.find({"status": "open"}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"offers": offers}

@router.post("/api/trade/accept/{offer_id}")
async def accept_trade(offer_id: str, request: Request):
    """Accepter une offre de trade. Debit acheteur JCC, credit vendeur JCC, transfert jetons."""
    email = _get_session_email(request)
    frek_id = await _get_user_frek_id(email)

    offer = await _db.trade_offers.find_one({"offer_id": offer_id, "status": "open"}, {"_id": 0})
    if not offer:
        raise HTTPException(404, "Offre introuvable ou deja acceptee")

    if offer["seller_email"] == email:
        raise HTTPException(400, "Impossible d'accepter sa propre offre")

    total_jcc = int(offer["montant"] * offer["prix_unitaire_jcc"])
    buyer_wallet = await _db.kn_wallets.find_one({"email": email}, {"_id": 0})
    if not buyer_wallet or buyer_wallet.get("balance_jcc", 0) < total_jcc:
        raise HTTPException(400, f"Solde JCC insuffisant ({total_jcc} requis)")

    now = datetime.now(timezone.utc).isoformat()

    # Debit buyer JCC
    await _db.kn_wallets.update_one({"email": email}, {"$inc": {"balance_jcc": -total_jcc}})
    # Credit seller JCC
    await _db.kn_wallets.update_one(
        {"email": offer["seller_email"]},
        {"$inc": {"balance_jcc": total_jcc}},
        upsert=True
    )
    # Credit buyer with traded tokens
    field = "balance_kt" if offer["type_jeton"] == "KT" else "balance_jcc"
    await _db.kn_wallets.update_one(
        {"email": email},
        {"$inc": {field: offer["montant"]}},
        upsert=True
    )

    # Mark offer as completed
    await _db.trade_offers.update_one(
        {"offer_id": offer_id},
        {"$set": {"status": "completed", "buyer_frek_id": frek_id, "completed_at": now}}
    )

    await write_audit_log(frek_id, "TRADE_ORDER", offer_id, "trade", {"action": "accept"})
    return {"success": True, "offer_id": offer_id, "total_jcc": total_jcc}


# ═══════════════════════════════════════════════════════════════
# ITER.60 — OBJECT STORAGE UPLOADS (#20 Paperclip, #98 Builder)
# ═══════════════════════════════════════════════════════════════

@router.post("/api/brain/upload")
async def brain_upload(request: Request, file: UploadFile = File(...)):
    """Upload fichier pour BrainChat — retourne URL publique."""
    email = _get_session_email(request)
    frek_id = await _get_user_frek_id(email)

    from services.object_storage import validate_upload, put_object, generate_path, get_object

    data = await file.read()
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin"
    valid, err = validate_upload(file.content_type or "", ext, len(data))
    if not valid:
        raise HTTPException(400, err)

    path = generate_path(frek_id, file.filename)
    result = put_object(path, data, file.content_type or "application/octet-stream")

    doc = {
        "file_id": str(uuid.uuid4())[:8],
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result.get("size", len(data)),
        "uploader_email": email,
        "uploader_frek_id": frek_id,
        "context": "brain",
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.uploaded_files.insert_one(doc)
    await write_audit_log(frek_id, "BRAIN_UPLOAD", doc["file_id"], "brain", {"filename": file.filename, "size": len(data)})

    return {
        "url": f"/api/files/{result['path']}",
        "type": file.content_type,
        "nom": file.filename,
        "file_id": doc["file_id"],
        "size": len(data),
    }


@router.post("/api/builder/upload")
async def builder_upload(request: Request, file: UploadFile = File(...)):
    """Upload média pour BuilderView — retourne URL publique + preview."""
    email = _get_session_email(request)
    frek_id = await _get_user_frek_id(email)

    from services.object_storage import validate_upload, put_object, generate_path

    data = await file.read()
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin"
    valid, err = validate_upload(file.content_type or "", ext, len(data))
    if not valid:
        raise HTTPException(400, err)

    path = generate_path(frek_id, file.filename)
    result = put_object(path, data, file.content_type or "application/octet-stream")

    doc = {
        "file_id": str(uuid.uuid4())[:8],
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result.get("size", len(data)),
        "uploader_email": email,
        "uploader_frek_id": frek_id,
        "context": "builder",
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.uploaded_files.insert_one(doc)
    await write_audit_log(frek_id, "BUILDER_UPLOAD", doc["file_id"], "builder", {"filename": file.filename, "size": len(data)})

    return {
        "url": f"/api/files/{result['path']}",
        "type": file.content_type,
        "nom": file.filename,
        "file_id": doc["file_id"],
        "size": len(data),
    }


@router.get("/api/files/{path:path}")
async def serve_file(path: str):
    """Serve un fichier depuis Object Storage."""
    record = await _db.uploaded_files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(404, "Fichier introuvable")

    from services.object_storage import get_object
    data, ct = get_object(path)
    return Response(content=data, media_type=record.get("content_type", ct))


# ═══════════════════════════════════════════════════════════════
# ITER.60 — BRAIN SESSION MESSAGES (#13 Historique)
# ═══════════════════════════════════════════════════════════════

@router.get("/api/brain/sessions/{session_id}/messages")
async def get_brain_session_messages(session_id: str, request: Request):
    """Charger les messages d'une session Brain passée."""
    email = _get_session_email(request)

    session = await _db.brain_sessions.find_one(
        {"session_id": session_id, "email": email}, {"_id": 0}
    )
    if not session:
        raise HTTPException(404, "Session introuvable")

    messages = session.get("messages", [])
    return {"session_id": session_id, "messages": messages, "title": session.get("title", "")}

