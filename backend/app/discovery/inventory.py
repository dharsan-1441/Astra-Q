"""
Normalized inventory manager.

Provides a unified in-memory store for all discovered assets regardless
of discovery source. Supports CRUD operations and summary statistics.
"""

import logging
from threading import Lock

from app.discovery.exceptions import AssetNotFoundError, DuplicateAssetError
from app.discovery.models import NormalizedAsset

logger = logging.getLogger("pqc_engine.discovery.inventory")


class InventoryManager:
    """
    Thread-safe in-memory inventory of normalized enterprise assets.

    All discovery sources (YAML import, TLS scan, manual registration)
    converge into this single store.
    """

    _SERVER_TYPES = {
        "server", "gateway", "proxy", "load_balancer",
        "database", "dns", "mail", "cache", "monitoring",
    }
    _CLIENT_TYPES = {"client"}

    def __init__(self) -> None:
        self._assets: dict[str, NormalizedAsset] = {}
        self._lock = Lock()

    def add(self, asset: NormalizedAsset) -> NormalizedAsset:
        """Add an asset to the inventory. Returns the stored asset."""
        with self._lock:
            if asset.id in self._assets:
                raise DuplicateAssetError(
                    message=f"Asset already exists: {asset.id}",
                    details=asset.name,
                )
            self._assets[asset.id] = asset
            logger.debug("Added asset %s (%s)", asset.id, asset.name)
            return asset

    def add_many(self, assets: list[NormalizedAsset]) -> list[NormalizedAsset]:
        """Add multiple assets atomically. Returns the stored assets."""
        with self._lock:
            for asset in assets:
                self._assets[asset.id] = asset
            logger.info("Added %d assets to inventory", len(assets))
            return assets

    def get(self, asset_id: str) -> NormalizedAsset:
        """Retrieve a single asset by ID."""
        with self._lock:
            asset = self._assets.get(asset_id)
        if asset is None:
            raise AssetNotFoundError(
                message=f"Asset not found: {asset_id}",
                details=asset_id,
            )
        return asset

    def get_all(self) -> list[NormalizedAsset]:
        """Retrieve all assets in the inventory."""
        with self._lock:
            return list(self._assets.values())

    def delete(self, asset_id: str) -> None:
        """Remove an asset from the inventory."""
        with self._lock:
            if asset_id not in self._assets:
                raise AssetNotFoundError(
                    message=f"Asset not found: {asset_id}",
                    details=asset_id,
                )
            del self._assets[asset_id]
            logger.info("Deleted asset %s", asset_id)

    def clear(self) -> None:
        """Remove all assets from the inventory."""
        with self._lock:
            count = len(self._assets)
            self._assets.clear()
            logger.info("Cleared %d assets from inventory", count)

    def count(self) -> int:
        """Return the number of assets in the inventory."""
        with self._lock:
            return len(self._assets)

    def summary(self) -> dict:
        """
        Compute summary statistics for the current inventory.

        Returns a dictionary with counts by category.
        """
        with self._lock:
            all_assets = list(self._assets.values())

        total = len(all_assets)
        servers = sum(1 for a in all_assets if a.type in self._SERVER_TYPES)
        clients = sum(1 for a in all_assets if a.type in self._CLIENT_TYPES)
        legacy = sum(1 for a in all_assets if a.metadata.get("legacy", False))
        unknown = sum(1 for a in all_assets if a.readiness == "unknown")

        by_source: dict[str, int] = {}
        by_type: dict[str, int] = {}
        by_criticality: dict[str, int] = {}

        for asset in all_assets:
            by_source[asset.discovery_source] = by_source.get(asset.discovery_source, 0) + 1
            by_type[asset.type] = by_type.get(asset.type, 0) + 1
            crit = asset.metadata.get("criticality", "unknown")
            by_criticality[crit] = by_criticality.get(crit, 0) + 1

        criticality_list = [
            {"level": "Critical", "count": by_criticality.get("critical", 0)},
            {"level": "High", "count": by_criticality.get("high", 0)},
            {"level": "Medium", "count": by_criticality.get("medium", 0)},
            {"level": "Low", "count": by_criticality.get("low", 0)},
        ]

        return {
            "total": total,
            "servers": servers,
            "clients": clients,
            "legacy": legacy,
            "unknown": unknown,
            "by_source": by_source,
            "by_type": by_type,
            "by_criticality": by_criticality,
            "criticality": criticality_list,
        }


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

_inventory = InventoryManager()


def get_inventory() -> InventoryManager:
    """Return the application-wide inventory singleton."""
    return _inventory
