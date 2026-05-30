"""
CVL BRAIN Agent Integration Service
Connects CVL BRAIN to the 10 automated agents of kiltikonet.
Stores analyses in MongoDB collection: cvl_brain_analyses
"""
import os
import logging
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from services.cvl_brain import analyse

logger = logging.getLogger(__name__)

_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _client[os.environ.get("DB_NAME", "culture_connect_2026")]

# Collections
ANALYSES_COL = "cvl_brain_analyses"
REPORTS_COL = "cvl_brain_daily_reports"
AGENT_STATUS_COL = "cvl_brain_agent_status"
ALERTS_COL = "cvl_brain_alerts"
AGENT_LOGS_COL = "agent_logs"


async def log_write(agent_id: str, level: str, message: str, detail: str = ""):
    """Persistent log entry — visible via /api/ai-agents/{id}/logs.
    levels: info | success | warning | error
    """
    try:
        await _db[AGENT_LOGS_COL].insert_one({
            "agent_id": agent_id,
            "level": level,
            "message": message,
            "detail": detail,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        logger.warning(f"agent_logs write failed for {agent_id}: {e}")


async def _log_agent_call(agent_id: str, success: bool, detail: str = ""):
    """Track each agent's last CVL BRAIN interaction + persistent log entry."""
    await _db[AGENT_STATUS_COL].update_one(
        {"agent_id": agent_id},
        {"$set": {
            "agent_id": agent_id,
            "last_call": datetime.now(timezone.utc).isoformat(),
            "last_success": success,
            "last_detail": detail,
            "connected": True,
        }, "$inc": {"total_calls": 1}},
        upsert=True,
    )
    # Persistent log (was empty before bug fix)
    await log_write(
        agent_id=agent_id,
        level="success" if success else "error",
        message=detail or ("Call OK" if success else "Call failed"),
    )


async def get_all_agent_statuses() -> list:
    """Get CVL BRAIN connection status for all agents."""
    statuses = await _db[AGENT_STATUS_COL].find({}, {"_id": 0}).to_list(20)
    return statuses


# ─── AGENT 1: Smart Engine CVLN ───────────────────────────────────
async def brain_smart_engine_analyse(flux_data: dict, flux_type: str = "general") -> dict:
    """Called on each new Smart Engine data flux (badge, inscription, NFC, FREK)."""
    try:
        enriched = {**flux_data, "flux_type": flux_type, "source": "smart_engine"}
        result = await analyse(enriched, context="profil")
        # Store in MongoDB
        await _db[ANALYSES_COL].insert_one({
            "agent": "smart-engine-cvln",
            "flux_type": flux_type,
            "input_data": flux_data,
            "result": result,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        await _log_agent_call("smart-engine-cvln", True, f"Flux {flux_type} analysed")
        return result
    except Exception as e:
        logger.error(f"Smart Engine BRAIN error: {e}")
        await _log_agent_call("smart-engine-cvln", False, str(e))
        return {"error": str(e)}


# ─── AGENT 2: Moteur d'Alertes ────────────────────────────────────
async def brain_alert_check(anomaly_data: dict) -> dict:
    """Called when Smart Engine detects an anomaly."""
    try:
        result = await analyse(anomaly_data, context="alerte")
        criticite = result.get("criticite", "LOW")
        doc = {
            "agent": "alert-engine",
            "input_data": anomaly_data,
            "result": result,
            "criticite": criticite,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "acknowledged": False,
        }
        await _db[ALERTS_COL].insert_one(doc)
        if criticite == "CRITICAL":
            logger.critical(f"CVL BRAIN CRITICAL ALERT: {result.get('action_immediate', 'N/A')}")
            await _db.team_notifications.insert_one({
                "type": "cvl_brain_critical",
                "message": f"ALERTE CRITIQUE CVL BRAIN: {result.get('action_immediate', '')}",
                "data": result,
                "read": False,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
        await _log_agent_call("alert-engine", True, f"Criticite: {criticite}")
        return result
    except Exception as e:
        logger.error(f"Alert Engine BRAIN error: {e}")
        await _log_agent_call("alert-engine", False, str(e))
        return {"error": str(e)}


# ─── AGENT 3: Générateur de Badges ────────────────────────────────
async def brain_enrich_badge(badge_data: dict) -> dict:
    """Called on each new badge creation to enrich with FREK-ID and cultural score."""
    try:
        result = await analyse(badge_data, context="profil")
        frek_id = result.get("frek_id", "")
        score = result.get("cultural_impact_score", 0)
        # Update badge in DB with brain enrichment
        if badge_data.get("badge_id"):
            await _db.cc_badges.update_one(
                {"badge_id": badge_data["badge_id"]},
                {"$set": {
                    "cvl_brain_frek_id": frek_id,
                    "cultural_impact_score": score,
                    "cvl_brain_analysed": True,
                    "cvl_brain_result": result,
                    "cvl_brain_date": datetime.now(timezone.utc).isoformat(),
                }}
            )
        await _db[ANALYSES_COL].insert_one({
            "agent": "badge-generator",
            "badge_id": badge_data.get("badge_id"),
            "input_data": badge_data,
            "result": result,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        await _log_agent_call("badge-generator", True, f"Badge enrichi: score={score}")
        return result
    except Exception as e:
        logger.error(f"Badge Generator BRAIN error: {e}")
        await _log_agent_call("badge-generator", False, str(e))
        return {"error": str(e)}


# ─── AGENT 4: Tracker Analytics ───────────────────────────────────
async def brain_daily_report() -> dict:
    """Compile daily analytics and generate a CVL BRAIN report."""
    try:
        # Gather today's stats
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
        today_str = today.isoformat()
        badge_count = await _db.cc_badges.count_documents({})
        analyses_today = await _db[ANALYSES_COL].count_documents({"timestamp": {"$gte": today_str}})
        alerts_today = await _db[ALERTS_COL].count_documents({"timestamp": {"$gte": today_str}})
        daily_data = {
            "date": today_str,
            "total_badges": badge_count,
            "analyses_today": analyses_today,
            "alerts_today": alerts_today,
        }
        result = await analyse(daily_data, context="evenement")
        await _db[REPORTS_COL].insert_one({
            "agent": "analytics-tracker",
            "date": today_str,
            "input_data": daily_data,
            "result": result,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        await _log_agent_call("analytics-tracker", True, f"Rapport genere: {today_str[:10]}")
        return result
    except Exception as e:
        logger.error(f"Analytics Tracker BRAIN error: {e}")
        await _log_agent_call("analytics-tracker", False, str(e))
        return {"error": str(e)}


# ─── AGENT 5: Webhook Stripe ─────────────────────────────────────
async def brain_stripe_payment(payment_data: dict) -> dict:
    """Called on confirmed Jeton CC payment to update recovery level."""
    try:
        result = await analyse(payment_data, context="profil")
        niveau = result.get("niveau_recuperation", 0)
        if payment_data.get("email"):
            await _db.cc_badges.update_many(
                {"email": payment_data["email"]},
                {"$set": {"niveau_recuperation": niveau, "cvl_brain_stripe_date": datetime.now(timezone.utc).isoformat()}}
            )
        await _db[ANALYSES_COL].insert_one({
            "agent": "stripe-webhook",
            "input_data": payment_data,
            "result": result,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        await _log_agent_call("stripe-webhook", True, f"Niveau recuperation: {niveau}")
        return result
    except Exception as e:
        logger.error(f"Stripe Webhook BRAIN error: {e}")
        await _log_agent_call("stripe-webhook", False, str(e))
        return {"error": str(e)}


# ─── AGENT 6: Service Email SES ──────────────────────────────────
async def brain_email_trigger(profile_data: dict, score: int) -> bool:
    """If cultural_impact_score > 70, flag for email notification."""
    if score <= 70:
        return False
    try:
        await _db.email_logs.insert_one({
            "type": "cvl_brain_recommendation",
            "recipient": profile_data.get("email", ""),
            "subject": "Vos recommandations CVL BRAIN",
            "score": score,
            "queued": True,
            "sent": False,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        await _log_agent_call("email-service", True, f"Email queued for score={score}")
        return True
    except Exception as e:
        logger.error(f"Email Service BRAIN error: {e}")
        await _log_agent_call("email-service", False, str(e))
        return False


# ─── AGENT 7: Moteur Social Pro ──────────────────────────────────
async def brain_pro_profile(profile_data: dict) -> dict:
    """Called on new Pro Space registration to enrich profile."""
    try:
        result = await analyse(profile_data, context="profil")
        await _db[ANALYSES_COL].insert_one({
            "agent": "social-feed-engine",
            "input_data": profile_data,
            "result": result,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        await _log_agent_call("social-feed-engine", True, f"Profil Pro enrichi")
        return result
    except Exception as e:
        logger.error(f"Social Pro BRAIN error: {e}")
        await _log_agent_call("social-feed-engine", False, str(e))
        return {"error": str(e)}


# ─── AGENT 10: Processeur Batch ──────────────────────────────────
async def brain_batch_process(limit: int = 50) -> dict:
    """Process all unanalyzed profiles in batch."""
    try:
        unanalyzed = await _db.cc_badges.find(
            {"cvl_brain_analysed": {"$ne": True}},
            {"_id": 0}
        ).limit(limit).to_list(limit)

        processed = 0
        errors = 0
        for badge in unanalyzed:
            try:
                result = await analyse(badge, context="profil")
                frek_id = result.get("frek_id", "")
                score = result.get("cultural_impact_score", 0)
                await _db.cc_badges.update_one(
                    {"badge_id": badge["badge_id"]},
                    {"$set": {
                        "cvl_brain_frek_id": frek_id,
                        "cultural_impact_score": score,
                        "cvl_brain_analysed": True,
                        "cvl_brain_result": result,
                        "cvl_brain_date": datetime.now(timezone.utc).isoformat(),
                    }}
                )
                # Trigger email if score > 70
                await brain_email_trigger(badge, score)
                processed += 1
            except Exception as e:
                errors += 1
                logger.error(f"Batch process error for {badge.get('badge_id')}: {e}")

        summary = {"processed": processed, "errors": errors, "total_unanalyzed": len(unanalyzed)}
        await _log_agent_call("batch-processor", True, f"Batch: {processed}/{len(unanalyzed)}")
        return summary
    except Exception as e:
        logger.error(f"Batch Processor BRAIN error: {e}")
        await _log_agent_call("batch-processor", False, str(e))
        return {"error": str(e)}


# ─── GET STORED ANALYSES ─────────────────────────────────────────
async def get_analyses(agent: str = None, limit: int = 20) -> list:
    """Get stored CVL BRAIN analyses."""
    query = {}
    if agent:
        query["agent"] = agent
    results = await _db[ANALYSES_COL].find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return results


async def get_alerts(limit: int = 20) -> list:
    """Get CVL BRAIN alerts."""
    return await _db[ALERTS_COL].find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)


async def get_profile_analysis(badge_id: str) -> dict:
    """Get CVL BRAIN analysis for a specific badge."""
    badge = await _db.cc_badges.find_one({"badge_id": badge_id}, {"_id": 0})
    if not badge:
        return {"error": "Badge non trouve"}
    return {
        "badge_id": badge_id,
        "nom": f"{badge.get('prenom', '')} {badge.get('nom', '')}",
        "cvl_brain_analysed": badge.get("cvl_brain_analysed", False),
        "cultural_impact_score": badge.get("cultural_impact_score"),
        "cvl_brain_frek_id": badge.get("cvl_brain_frek_id"),
        "cvl_brain_result": badge.get("cvl_brain_result"),
        "cvl_brain_date": badge.get("cvl_brain_date"),
    }
