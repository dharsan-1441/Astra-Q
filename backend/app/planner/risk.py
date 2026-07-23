"""
Planner risk engine — calculates migration risk scores, recommends
algorithms (ML-KEM, ML-DSA, Hybrid), rollback steps, and estimates durations.
"""

from typing import Optional
from app.discovery.models import NormalizedAsset
from app.readiness.models import AssetReadinessAssessment


def determine_strategy(asset: NormalizedAsset) -> str:
    """Recommend the optimal cryptographic algorithm deployment strategy."""
    meta = asset.metadata
    asset_type = asset.type.lower()
    notes = str(meta.get("notes") or "").lower()
    hybrid_pref = meta.get("hybrid_support", False) or "hybrid" in notes

    # Encryption / Key Encapsulation (KEM) targets
    if asset_type in ("server", "gateway", "proxy", "vpn", "load_balancer", "database"):
        if hybrid_pref:
            return "Hybrid (ML-KEM-768 + ECDH-P256)"
        return "ML-KEM-768 (Confidentiality)"

    # Signature / Authentication targets
    elif asset_type in ("client", "pki", "hsm") or meta.get("certificate"):
        if hybrid_pref:
            return "Hybrid (ML-DSA-65 + ECDSA-P256)"
        return "ML-DSA-65 (Authentication)"

    # Fallback default
    return "Hybrid (ML-KEM + ML-DSA)"


def determine_rollback_plan(asset: NormalizedAsset) -> str:
    """Produce custom rollback instructions for reversing a failed migration step."""
    asset_type = asset.type.lower()

    if asset_type == "hsm":
        return (
            "Restore previous HSM firmware release. Re-import legacy backup "
            "keys and verify cryptographic partition integrity."
        )
    elif asset_type == "pki":
        return (
            "Deactivate post-quantum CA certificates. Revert certificate signing "
            "authority engine to classical RSA/ECDSA key pairs and re-issue credentials."
        )
    elif asset_type in ("server", "gateway", "proxy", "vpn"):
        return (
            "Revert TLS cipher suite configuration to classical suites (e.g., ECDHE-RSA). "
            "Restore previous classical SSL certificate chain and restart service daemon."
        )
    else:
        return (
            "Revert configuration template to previous state. "
            "Disable post-quantum library imports and restart application runtime."
        )


def determine_duration(asset: NormalizedAsset, has_blockers: bool) -> float:
    """Estimate migration execution duration in hours for the asset."""
    asset_type = asset.type.lower()
    base_hours = 2.0

    if asset_type == "hsm":
        base_hours = 6.0
    elif asset_type == "pki":
        base_hours = 5.0
    elif asset_type == "database":
        base_hours = 4.0
    elif asset_type in ("server", "vpn", "gateway"):
        base_hours = 3.0
    elif asset_type == "client":
        base_hours = 1.0

    # Penalties
    if asset.metadata.get("legacy", False):
        base_hours += 2.0
    if has_blockers:
        base_hours += 1.5

    return round(base_hours, 1)


def calculate_step_risk(
    asset: NormalizedAsset,
    assessment: Optional[AssetReadinessAssessment],
    num_dependents: int,
) -> float:
    """
    Calculate the risk score (0 to 100) of a single migration step.

    Risk weights:
        - Criticality (50%): Critical=4, High=3, Medium=2, Low=1, Unknown=1.
        - Readiness (30%): (100 - readiness score) percentage.
        - Dependents (20%): Number of other systems calling this asset.
    """
    meta = asset.metadata
    crit = str(meta.get("criticality") or "unknown").lower()
    
    crit_weights = {
        "critical": 4.0,
        "high": 3.0,
        "medium": 2.0,
        "low": 1.0,
        "unknown": 1.0,
    }
    crit_weight = crit_weights.get(crit, 1.0)
    
    # 1. Criticality Contribution (Max 50 points)
    crit_score = (crit_weight / 4.0) * 50.0

    # 2. Readiness Contribution (Max 30 points)
    readiness_val = 50.0  # Default to 50% ready if no assessment exists
    if assessment:
        readiness_val = assessment.readiness_score
    readiness_score = ((100.0 - readiness_val) / 100.0) * 30.0

    # 3. Dependency Contribution (Max 20 points)
    dep_score = min(num_dependents * 4.0, 20.0)

    total_risk = crit_score + readiness_score + dep_score
    return round(min(max(total_risk, 0.0), 100.0), 2)
