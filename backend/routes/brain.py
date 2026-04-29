from fastapi import APIRouter, HTTPException, Request, Depends
from services.cvl_brain import analyse
from services.cvl_brain_agents import (
    brain_smart_engine_analyse, brain_alert_check, brain_enrich_badge,
    brain_daily_report, brain_stripe_payment, brain_pro_profile,
    brain_batch_process, get_all_agent_statuses, get_analyses,
    get_alerts, get_profile_analysis,
)
from routes.doctrine import require_permission
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/brain", tags=["CVL BRAIN"])


# ─── Direct CVL BRAIN endpoints ──────────────────────────────────

@router.post("/analyse")
async def analyse_profil(data: dict):
    try:
        return await analyse(data, context="profil")
    except Exception as e:
        logger.error(f"CVL BRAIN analyse error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/entreprise")
async def analyse_entreprise(data: dict):
    try:
        return await analyse(data, context="entreprise")
    except Exception as e:
        logger.error(f"CVL BRAIN entreprise error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/evenement")
async def analyse_evenement(data: dict):
    try:
        return await analyse(data, context="evenement")
    except Exception as e:
        logger.error(f"CVL BRAIN evenement error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerte")
async def alerte_operationnelle(data: dict):
    try:
        return await analyse(data, context="alerte")
    except Exception as e:
        logger.error(f"CVL BRAIN alerte error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Agent Integration endpoints ─────────────────────────────────

@router.get("/agent-status")
async def agent_brain_status():
    """Get CVL BRAIN connection status for all 10 agents."""
    statuses = await get_all_agent_statuses()
    return {"statuses": statuses, "brain_active": True}


@router.post("/smart-engine-flux")
async def smart_engine_flux(data: dict):
    """Trigger Smart Engine analysis through CVL BRAIN."""
    flux_type = data.pop("flux_type", "general")
    return await brain_smart_engine_analyse(data, flux_type)


@router.post("/alert-check")
async def alert_check(data: dict):
    """Trigger alert analysis through CVL BRAIN."""
    return await brain_alert_check(data)


@router.post("/enrich-badge")
async def enrich_badge(data: dict):
    """Enrich a badge with CVL BRAIN analysis."""
    return await brain_enrich_badge(data)


@router.post("/daily-report")
async def daily_report():
    """Generate daily CVL BRAIN analytics report."""
    return await brain_daily_report()


@router.post("/stripe-payment")
async def stripe_payment(data: dict):
    """Process Stripe payment through CVL BRAIN."""
    return await brain_stripe_payment(data)


@router.post("/pro-profile")
async def pro_profile(data: dict):
    """Enrich Pro Space profile through CVL BRAIN."""
    return await brain_pro_profile(data)


@router.post("/batch-process")
async def batch_process(limit: int = 10):
    """Process unanalyzed profiles in batch through CVL BRAIN."""
    return await brain_batch_process(limit)


@router.get("/analyses")
async def list_analyses(agent: str = None, limit: int = 20):
    """Get stored CVL BRAIN analyses."""
    results = await get_analyses(agent, limit)
    return {"analyses": results, "count": len(results)}


@router.get("/alerts")
async def list_alerts(limit: int = 20):
    """Get CVL BRAIN alerts."""
    alerts = await get_alerts(limit)
    return {"alerts": alerts, "count": len(alerts)}


@router.get("/profile/{badge_id}")
async def profile_analysis(badge_id: str):
    """Get CVL BRAIN analysis for a specific badge."""
    return await get_profile_analysis(badge_id)



# ─── Simple chat endpoint (used by Terminal) ───────────────
@router.post("/chat", dependencies=[Depends(require_permission("use_terminal_ia"))])
async def brain_chat(data: dict):
    """Simple CVL BRAIN chat endpoint for the Terminal."""
    import os
    message = data.get("message", "")
    session_id = data.get("session_id", "")
    if not message:
        return {"reply": "Pose-moi une question !"}
    try:
        from services.cvl_brain_knowledge import build_cvl_brain_prompt
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import uuid
        emergent_key = os.environ.get("EMERGENT_LLM_KEY", "")
        system_prompt = build_cvl_brain_prompt("Terminal User")
        chat_obj = LlmChat(
            api_key=emergent_key,
            session_id=session_id or str(uuid.uuid4()),
            system_message=system_prompt,
        )
        chat_obj.with_model("anthropic", "claude-sonnet-4-5-20250929")
        user_msg = UserMessage(text=message)
        response = await chat_obj.send_message(user_msg)
        return {"reply": response}
    except Exception as e:
        logger.error(f"Brain chat error: {e}")
        return {"reply": f"Erreur: {str(e)}"}
