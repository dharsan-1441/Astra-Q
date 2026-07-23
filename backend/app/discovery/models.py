"""
Discovery domain models — Pydantic schemas for all discovery sources
and the unified normalized asset representation.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class SystemType(str, Enum):
    SERVER = "server"
    CLIENT = "client"
    DATABASE = "database"
    LOAD_BALANCER = "load_balancer"
    FIREWALL = "firewall"
    VPN = "vpn"
    HSM = "hsm"
    PKI = "pki"
    IOT = "iot"
    EMBEDDED = "embedded"
    GATEWAY = "gateway"
    PROXY = "proxy"
    CONTROLLER = "controller"
    MAIL = "mail"
    DNS = "dns"
    CACHE = "cache"
    MONITORING = "monitoring"
    OTHER = "other"


class Criticality(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    UNKNOWN = "unknown"


class DiscoverySource(str, Enum):
    YAML_IMPORT = "yaml_import"
    TLS_SCAN = "tls_scan"
    MANUAL = "manual"


class AssetStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DECOMMISSIONED = "decommissioned"
    UNKNOWN = "unknown"


class ReadinessLevel(str, Enum):
    READY = "ready"
    PARTIAL = "partial"
    NOT_READY = "not_ready"
    UNKNOWN = "unknown"


# ---------------------------------------------------------------------------
# YAML Import Models
# ---------------------------------------------------------------------------

class CertificateInfo(BaseModel):
    """Certificate metadata within a YAML system entry."""
    issuer: Optional[str] = None
    subject: Optional[str] = None
    expiry: Optional[str] = None
    algorithm: Optional[str] = None
    serial_number: Optional[str] = None


class YAMLSystemEntry(BaseModel):
    """Schema for a single system defined in an enterprise YAML configuration."""
    id: str
    name: str
    type: str
    hostname: Optional[str] = None
    ip: Optional[str] = None
    port: Optional[int] = None
    operating_system: Optional[str] = None
    crypto_algorithm: Optional[str] = None
    tls_version: Optional[str] = None
    certificate: Optional[CertificateInfo] = None
    dependencies: list[str] = Field(default_factory=list)
    criticality: str = Criticality.UNKNOWN.value
    owner: Optional[str] = None
    notes: Optional[str] = None
    legacy: bool = False


class EnterpriseInfo(BaseModel):
    """Enterprise metadata wrapper inside YAML files."""
    name: str
    domain: Optional[str] = None
    environment: Optional[str] = None
    systems: list[YAMLSystemEntry]


class EnterpriseYAMLConfig(BaseModel):
    """Top-level schema for enterprise YAML configuration files."""
    enterprise: EnterpriseInfo


# ---------------------------------------------------------------------------
# TLS Scan Models
# ---------------------------------------------------------------------------

class TLSScanRequest(BaseModel):
    """Request payload for TLS endpoint inspection."""
    hostname: str
    port: int = 443
    timeout: float = 5.0


class TLSDiscoveryResult(BaseModel):
    """Structured result from TLS endpoint inspection."""
    hostname: str
    port: int = 443
    tls_version: Optional[str] = None
    cipher_suite: Optional[str] = None
    certificate_subject: Optional[str] = None
    certificate_issuer: Optional[str] = None
    certificate_expiry: Optional[str] = None
    public_key_algorithm: Optional[str] = None
    public_key_bits: Optional[int] = None
    signature_algorithm: Optional[str] = None
    serial_number: Optional[str] = None
    not_before: Optional[str] = None
    supported_cipher_suites: list[str] = Field(default_factory=list)
    error: Optional[str] = None
    reachable: bool = True
    scan_timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


# ---------------------------------------------------------------------------
# Manual Asset Models
# ---------------------------------------------------------------------------

class ManualAssetEntry(BaseModel):
    """Payload for manually registering an enterprise asset."""
    name: str
    type: str
    vendor: Optional[str] = None
    legacy: bool = False
    pqc_support: bool = False
    hybrid_support: bool = False
    criticality: str = Criticality.UNKNOWN.value
    dependencies: list[str] = Field(default_factory=list)
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Normalized Asset — Unified Representation
# ---------------------------------------------------------------------------

def _generate_asset_id() -> str:
    return f"asset-{uuid.uuid4().hex[:12]}"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class NormalizedAsset(BaseModel):
    """
    Unified asset representation regardless of discovery source.

    Every system discovered through YAML import, TLS scanning,
    or manual registration is stored in this format.
    """
    id: str = Field(default_factory=_generate_asset_id)
    name: str
    type: str
    discovery_source: str
    readiness: str = ReadinessLevel.UNKNOWN.value
    metadata: dict[str, Any] = Field(default_factory=dict)
    discovery_timestamp: str = Field(default_factory=_utc_now_iso)
    status: str = AssetStatus.ACTIVE.value
