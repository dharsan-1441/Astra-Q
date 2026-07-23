"""
Manual asset registration service.

Handles the creation of normalized assets from manually submitted data
for systems that cannot be auto-discovered (HSM, legacy VPN, embedded devices, etc.).
"""

import logging

from app.discovery.exceptions import InvalidAssetError
from app.discovery.models import (
    DiscoverySource,
    ManualAssetEntry,
    NormalizedAsset,
)

logger = logging.getLogger("pqc_engine.discovery.manual_assets")


class ManualAssetService:
    """Converts manual asset registration entries into normalized assets."""

    VALID_TYPES = {
        "hsm", "vpn", "controller", "embedded", "pki", "server",
        "client", "database", "firewall", "gateway", "proxy",
        "load_balancer", "iot", "mail", "dns", "cache",
        "monitoring", "other",
    }

    def register(self, entry: ManualAssetEntry) -> NormalizedAsset:
        """
        Validate and convert a manual asset entry into a normalized asset.

        Args:
            entry: The manual registration payload.

        Returns:
            A new normalized asset.

        Raises:
            InvalidAssetError: If the entry fails validation.
        """
        self._validate(entry)

        metadata: dict = {
            "vendor": entry.vendor,
            "legacy": entry.legacy,
            "pqc_support": entry.pqc_support,
            "hybrid_support": entry.hybrid_support,
            "criticality": entry.criticality,
            "dependencies": entry.dependencies,
            "notes": entry.notes,
        }

        asset = NormalizedAsset(
            name=entry.name,
            type=entry.type,
            discovery_source=DiscoverySource.MANUAL.value,
            metadata=metadata,
            status="active",
        )

        logger.info(
            "Registered manual asset: %s (type=%s, id=%s)",
            asset.name,
            asset.type,
            asset.id,
        )
        return asset

    def _validate(self, entry: ManualAssetEntry) -> None:
        """Validate manual asset entry fields."""
        if not entry.name or not entry.name.strip():
            raise InvalidAssetError(
                message="Asset name is required",
                details="name field is empty",
            )

        normalized_type = entry.type.lower().strip()
        if normalized_type not in self.VALID_TYPES:
            logger.warning(
                "Non-standard asset type '%s' — accepting as 'other'",
                entry.type,
            )
