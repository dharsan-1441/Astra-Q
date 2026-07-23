"""
Discovery module — enterprise cryptographic asset discovery engine.

Provides three discovery modes:
    1. YAML Import — parse enterprise configuration files
    2. TLS Scan — inspect live TLS endpoints
    3. Manual Registration — register assets that cannot be auto-discovered

All sources converge into a single normalized inventory.
"""

from app.discovery.inventory import get_inventory
from app.discovery.manual_assets import ManualAssetService
from app.discovery.parser import YAMLParser
from app.discovery.tls_scanner import TLSScanner

__all__ = [
    "YAMLParser",
    "TLSScanner",
    "ManualAssetService",
    "get_inventory",
]
