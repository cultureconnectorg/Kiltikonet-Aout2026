"""
Observatory adapters — read-only bridges to sources of truth.

Each adapter :
- reads ONE domain from source collections (Smart Engine, workspace, CC2026, legacy)
- exposes a canonical shape with explicit metric_dictionary (source, definition,
  transformation, period, quality, confidence, last_updated, publication_status)
- NEVER writes, NEVER deletes, NEVER modifies collections
- can be consumed indifferently by Observatory AND Smart Engine

Import pattern :
    from services.observatory_adapters import badges_adapter
    snapshot = await badges_adapter.snapshot()
"""
from . import badges as badges_adapter
from . import conversion as conversion_adapter
from . import network as network_adapter
from . import diffusion as diffusion_adapter
from . import live as live_adapter
from . import mgraph as mgraph_adapter
from . import alerts as alerts_adapter

__all__ = [
    "badges_adapter",
    "conversion_adapter",
    "network_adapter",
    "diffusion_adapter",
    "live_adapter",
    "mgraph_adapter",
    "alerts_adapter",
]
