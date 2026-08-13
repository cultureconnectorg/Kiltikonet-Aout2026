"""
P0 Migration — Legacy site_events → analytics_events (canonical)

Objectif :
- Le duplicate handler POST /api/analytics/batch a longtemps écrit dans site_events (schéma allégé).
- On unifie désormais dans analytics_events (schéma riche).
- Cette migration copie chaque site_events doc vers analytics_events avec tag `_source_legacy = "site_events"`
  et `_pre_refonte = True`.
- La collection site_events N'EST PAS SUPPRIMÉE — elle est conservée en archive immuable.
- Le script est IDEMPOTENT : ne recrée pas les docs déjà migrés (via clé `_legacy_id`).

Usage :
    cd /app/backend && python migrate_site_events.py
"""
import asyncio
import os
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

if not MONGO_URL or not DB_NAME:
    raise SystemExit("MONGO_URL / DB_NAME missing in backend/.env")


async def migrate():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    total_source = await db.site_events.count_documents({})
    already_migrated = await db.analytics_events.count_documents({"_source_legacy": "site_events"})

    print(f"Source (site_events) total    : {total_source}")
    print(f"Already migrated (analytics_events._source_legacy=site_events) : {already_migrated}")

    if total_source == 0:
        print("Nothing to migrate.")
        return

    # Get all _id already migrated to avoid duplicates
    migrated_legacy_ids = set()
    async for d in db.analytics_events.find(
        {"_source_legacy": "site_events"}, {"_legacy_id": 1}
    ):
        lid = d.get("_legacy_id")
        if lid:
            migrated_legacy_ids.add(lid)

    print(f"Skipping {len(migrated_legacy_ids)} already-migrated docs")

    now_iso = datetime.now(timezone.utc).isoformat()
    batch = []
    BATCH_SIZE = 500
    inserted = 0

    async for src in db.site_events.find({}):
        legacy_id = str(src.get("_id"))
        if legacy_id in migrated_legacy_ids:
            continue

        # Normalize to rich schema
        doc = {
            "id": str(uuid.uuid4()),
            "event_type": src.get("event") or "unknown",
            "session_id": src.get("session_id") or "",
            "user_id": src.get("user_id"),
            "timestamp": src.get("timestamp") or now_iso,
            "data": {
                **(src.get("data") if isinstance(src.get("data"), dict) else {}),
                "page": src.get("page"),
                "device": src.get("device"),
            },
            "ip": None,  # legacy stored only ip_hash — respect that
            "ip_hash": src.get("ip_hash"),
            "user_agent": None,
            "created_at": now_iso,
            "_source_legacy": "site_events",
            "_legacy_id": legacy_id,
            "_pre_refonte": True,
        }
        batch.append(doc)

        if len(batch) >= BATCH_SIZE:
            await db.analytics_events.insert_many(batch)
            inserted += len(batch)
            print(f"  → inserted {inserted}/{total_source - len(migrated_legacy_ids)}...")
            batch = []

    if batch:
        await db.analytics_events.insert_many(batch)
        inserted += len(batch)

    print(f"\n✅ Migration complete. {inserted} docs migrated.")
    print(f"   site_events    : {await db.site_events.count_documents({})} (unchanged — read-only archive)")
    print(f"   analytics_events (total)  : {await db.analytics_events.count_documents({})}")
    print(f"   analytics_events (legacy) : {await db.analytics_events.count_documents({'_source_legacy':'site_events'})}")
    print(f"   analytics_events (new)    : {await db.analytics_events.count_documents({'_source_legacy':{'$exists':False}})}")


if __name__ == "__main__":
    asyncio.run(migrate())
