"""
Analytics normalization — Phase 1 of Observatory.

Extract & normalize contextual fields from the raw HTTP request and event payload :
- visitor_id (first-party, anonymous, consent-aware — never derived server-side from a fingerprint)
- session_id (client-provided, respected as-is)
- referrer_host (parsed from referrer URL — strips path/query, keeps host only)
- utm (source/medium/campaign/content/term)
- device (type/os — parsed from User-Agent, minimal)
- geo (country_iso only — coarse, no city/lat/lon)
- consent_level (from the event payload : 'anonymous' | 'full' — client tells us if user accepted cookies)

Design principle : PRIVACY-FIRST.
- No IP stored in cleartext when consent_level == 'anonymous' (only sha256-hashed prefix).
- No device fingerprinting server-side. visitor_id is created by the client in localStorage.
- Country derived from IP is best-effort ; falls back to null.
"""
import hashlib
import re
from typing import Optional
from urllib.parse import urlparse


# ── Very light UA parsing (no external dep) ─────────────────────────
_UA_MOBILE_RX = re.compile(r"(iPhone|iPad|iPod|Android|Mobile)", re.IGNORECASE)
_UA_TABLET_RX = re.compile(r"(iPad|Tablet)", re.IGNORECASE)
_UA_OS_RX = [
    (re.compile(r"iPhone|iPad|iPod", re.IGNORECASE), "iOS"),
    (re.compile(r"Android", re.IGNORECASE), "Android"),
    (re.compile(r"Windows NT", re.IGNORECASE), "Windows"),
    (re.compile(r"Mac OS X", re.IGNORECASE), "macOS"),
    (re.compile(r"Linux", re.IGNORECASE), "Linux"),
]


def parse_device(user_agent: str) -> dict:
    """Return {type: mobile|tablet|desktop, os: name|null} — minimal, no fingerprint."""
    if not user_agent:
        return {"type": "unknown", "os": None}
    if _UA_TABLET_RX.search(user_agent):
        dev_type = "tablet"
    elif _UA_MOBILE_RX.search(user_agent):
        dev_type = "mobile"
    else:
        dev_type = "desktop"
    os_name = None
    for rx, name in _UA_OS_RX:
        if rx.search(user_agent):
            os_name = name
            break
    return {"type": dev_type, "os": os_name}


def parse_referrer(referrer: Optional[str]) -> Optional[str]:
    """Return only the referrer host (no path/query). Skip if same as own host."""
    if not referrer:
        return None
    try:
        parsed = urlparse(referrer)
        host = (parsed.netloc or "").lower().split(":")[0]
        if not host:
            return None
        # Strip our own host
        if host.endswith("kiltikonet.fr") or "emergentagent.com" in host or "emergent.host" in host:
            return "internal"
        return host
    except Exception:
        return None


_UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]


def parse_utm(data: dict) -> Optional[dict]:
    """Extract UTM from event.data.url or event.data.utm nested dict."""
    if not data:
        return None
    # Direct nested
    utm = data.get("utm")
    if isinstance(utm, dict):
        cleaned = {k[4:]: v for k, v in utm.items() if k.startswith("utm_") and v}
        cleaned.update({k: v for k, v in utm.items() if k in ("source", "medium", "campaign", "content", "term") and v})
        return cleaned or None
    # From an URL field
    for url_key in ("url", "href", "current_url"):
        url = data.get(url_key)
        if isinstance(url, str) and "utm_" in url:
            try:
                q = urlparse(url).query
                if not q:
                    continue
                utm = {}
                for pair in q.split("&"):
                    if "=" not in pair:
                        continue
                    k, v = pair.split("=", 1)
                    if k in _UTM_KEYS and v:
                        utm[k[4:]] = v
                if utm:
                    return utm
            except Exception:
                pass
    return None


def hash_ip(ip: Optional[str]) -> Optional[str]:
    """SHA256-prefixed hash of the IP (irréversible)."""
    if not ip or ip in ("unknown", "127.0.0.1", "::1"):
        return None
    return "ip_" + hashlib.sha256(ip.encode("utf-8")).hexdigest()[:16]


def geo_from_ip(ip: Optional[str]) -> dict:
    """
    Best-effort country lookup from IP.
    Free approach : return {} — later a lightweight geoip library or Cloudflare header (CF-IPCountry)
    can populate this without cost. Placeholder for now — never fabricate a value.
    """
    return {}


def normalize_event(
    event_type: str,
    session_id: str,
    user_id: Optional[str],
    timestamp: str,
    data: dict,
    ip: Optional[str],
    user_agent: str,
    referrer_header: Optional[str],
    cf_country_header: Optional[str] = None,
) -> dict:
    """Build a canonical event document ready for insertion into analytics_events."""
    # visitor_id : client-provided, first-party, anonymous — never derived here
    visitor_id = None
    if isinstance(data, dict):
        visitor_id = data.get("visitor_id") or data.get("visitorId")

    # consent_level : client tells us (default 'anonymous' if not provided)
    consent_level = "anonymous"
    if isinstance(data, dict):
        c = data.get("consent") or data.get("consent_level")
        if c in ("anonymous", "full", "essential"):
            consent_level = c

    # Referrer : from Referer header OR from event.data.referrer (client fallback)
    referrer_host = parse_referrer(referrer_header)
    if not referrer_host and isinstance(data, dict):
        referrer_host = parse_referrer(data.get("referrer"))

    # UTM extraction
    utm = parse_utm(data if isinstance(data, dict) else {})

    # Device
    device = parse_device(user_agent or "")

    # Geo (from Cloudflare header if available, else best-effort)
    geo = {}
    if cf_country_header:
        geo = {"country_iso": cf_country_header.upper()[:2]}

    # Store IP only if user gave full consent — otherwise only hash
    ip_hash = hash_ip(ip)
    ip_stored = ip if consent_level == "full" else None

    return {
        "event_type": event_type,
        "session_id": session_id,
        "visitor_id": visitor_id,
        "user_id": user_id,
        "timestamp": timestamp,
        "data": data if isinstance(data, dict) else {"raw": data},
        # Contextual (normalized)
        "referrer_host": referrer_host,
        "utm": utm,
        "device": device,
        "geo": geo,
        # Privacy fields
        "consent_level": consent_level,
        "ip": ip_stored,
        "ip_hash": ip_hash,
        "user_agent": user_agent or None,
    }
