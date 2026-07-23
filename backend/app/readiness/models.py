"""
Readiness models — Pydantic models for readiness statuses, individual assessments,
enterprise-wide summaries, and the in-memory readiness data store.
"""

from threading import Lock
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.readiness.exceptions import AssetReadinessNotFoundError


class AlgorithmSupportStatus(BaseModel):
    """PQC and classical algorithm compatibility status."""
    ml_kem_support: bool = False
    ml_dsa_support: bool = False
    hybrid_support: bool = False
    classical_algorithms_present: List[str] = Field(default_factory=list)


class TLSStatus(BaseModel):
    """TLS protocol and cipher compatibility status."""
    tls_version: Optional[str] = None
    pqc_cipher_availability: bool = False
    hybrid_cipher_support: bool = False


class CertificateStatus(BaseModel):
    """Certificate parameters and upgrade readiness status."""
    rsa_certificates: bool = False
    ecc_certificates: bool = False
    hybrid_certificates: bool = False
    certificate_upgrade_required: bool = False


class LibraryStatus(BaseModel):
    """Cryptographic library versions and OQS support status."""
    openssl_version: Optional[str] = None
    oqs_provider: bool = False
    legacy_libraries: List[str] = Field(default_factory=list)


class HardwareStatus(BaseModel):
    """Hardware support, HSMs, and firmware compatibility status."""
    hardware_constraints: List[str] = Field(default_factory=list)
    hsm_compatibility: str = "Unknown"  # "Compatible" | "Incompatible" | "Unknown"
    legacy_firmware: bool = False
    cpu_architecture: Optional[str] = None


class SoftwareStatus(BaseModel):
    """Operating system, runtimes, stacks, and dependency compatibility status."""
    operating_system: Optional[str] = None
    runtime: Optional[str] = None
    application_stack: Optional[str] = None
    dependency_compatibility: str = "Compatible"  # "Compatible" | "Upgrade Required" | "Incompatible"


class BenchmarkStatus(BaseModel):
    """Linked Phase 4 benchmark performance status."""
    status: str = "Unavailable"  # "Available" | "Unavailable"
    benchmark_session_id: Optional[str] = None


class AssetReadinessAssessment(BaseModel):
    """Comprehensive readiness assessment report for a single enterprise asset."""
    asset_id: str
    asset_name: str
    asset_type: str
    readiness_score: float  # 0 to 100
    classification: str  # "PQC Ready" | "Hybrid Ready" | "Upgrade Required" | "Legacy Blocker" | "Unsupported"
    algorithm_support: AlgorithmSupportStatus
    tls_status: TLSStatus
    certificate_status: CertificateStatus
    library_status: LibraryStatus
    hardware_status: HardwareStatus
    software_status: SoftwareStatus
    benchmark_status: BenchmarkStatus
    identified_issues: List[str] = Field(default_factory=list)
    recommended_actions: List[str] = Field(default_factory=list)


class ReadinessSummary(BaseModel):
    """Enterprise-wide PQC readiness statistics and summaries."""
    enterprise_readiness_score: float = 0.0
    average_readiness: float = 0.0
    highest_risk_assets: List[Dict[str, Any]] = Field(default_factory=list)
    lowest_readiness_assets: List[Dict[str, Any]] = Field(default_factory=list)
    readiness_distribution: Dict[str, int] = Field(default_factory=dict)
    assets_ready: int = 0
    assets_requiring_hybrid: int = 0
    assets_requiring_upgrade: int = 0
    blocked_assets: int = 0


class ReadinessStore:
    """Thread-safe in-memory store for generated readiness assessments."""

    def __init__(self) -> None:
        self._assessments: Dict[str, AssetReadinessAssessment] = {}
        self._summary: Optional[ReadinessSummary] = None
        self._lock = Lock()

    def set_results(
        self,
        assessments: List[AssetReadinessAssessment],
        summary: ReadinessSummary,
    ) -> None:
        """Atomically set the assessments list and calculated summary."""
        with self._lock:
            self._assessments = {a.asset_id: a for a in assessments}
            self._summary = summary

    def get_all(self) -> List[AssetReadinessAssessment]:
        """Retrieve all current assessments."""
        with self._lock:
            return list(self._assessments.values())

    def get(self, asset_id: str) -> AssetReadinessAssessment:
        """Retrieve a specific asset assessment."""
        with self._lock:
            val = self._assessments.get(asset_id)
        if not val:
            raise AssetReadinessNotFoundError(
                f"Assessment not found for asset ID: {asset_id}"
            )
        return val

    def get_summary(self) -> ReadinessSummary:
        """Retrieve the global enterprise summary."""
        with self._lock:
            if not self._summary:
                return ReadinessSummary()
            return self._summary

    def clear(self) -> None:
        """Clear all stored assessments and summaries."""
        with self._lock:
            self._assessments.clear()
            self._summary = None


# Module-level singleton
_readiness_store = ReadinessStore()


def get_readiness_store() -> ReadinessStore:
    """Return the global ReadinessStore singleton instance."""
    return _readiness_store
