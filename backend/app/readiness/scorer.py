"""
Readiness scoring engine — calculates weighted readiness scores and
determines classification levels based on numeric scores and detected blocker issues.
"""

from typing import Dict, List


from typing import Dict, List, Any


def calculate_overall_score(
    factor_scores: Dict[str, float],
    sub_statuses: Dict[str, Any] = None,
    profile: str = "ML-KEM-768 + ML-DSA Level 3 (Hybrid Level 2)",
    crypto_algorithm: str = ""
) -> float:
    """Calculate the weighted overall PQC readiness score (0-100) adjusted for the active profile."""
    # Make a copy of factor scores
    scores = dict(factor_scores)

    if sub_statuses is not None:
        p = profile.lower()
        asset_algo = crypto_algorithm.upper().strip()

        # 1. Quantum Resistance Level (QRL)
        if "classical only" in p:
            qrl = 0.0
        elif "1024" in p or "level 5" in p or "level 3" in p:
            qrl = 100.0
        elif "768" in p or "level 3" in p or "level 2" in p:
            qrl = 80.0
        else:
            qrl = 60.0

        # 2. Algorithm Strength (AS)
        if "classical only" in p:
            algo_strength = 30.0
        elif "hybrid" in p:
            if "level 3" in p or "level 5" in p:
                algo_strength = 100.0
            elif "level 2" in p or "level 3" in p:
                algo_strength = 90.0
            else:
                algo_strength = 80.0
        else:
            if "1024" in p or "level 5" in p:
                algo_strength = 85.0
            elif "768" in p or "level 3" in p:
                algo_strength = 75.0
            else:
                algo_strength = 65.0

        # 3. Migration Complexity (MC)
        if "classical only" in p:
            complexity_score = 100.0
        elif "hybrid" in p:
            if "level 3" in p:
                complexity_score = 60.0
            elif "level 2" in p:
                complexity_score = 70.0
            else:
                complexity_score = 80.0
        else:
            if "1024" in p or "level 5" in p:
                complexity_score = 70.0
            elif "768" in p or "level 3" in p:
                complexity_score = 80.0
            else:
                complexity_score = 90.0

        # 4. Compatibility Score (CS)
        is_classical = any(x in asset_algo for x in ("RSA", "ECC", "ECDSA", "ECDH", "AES")) or asset_algo in ("", "NONE", "UNKNOWN")
        has_kem = "ML-KEM" in asset_algo or "KYBER" in asset_algo
        has_dsa = "ML-DSA" in asset_algo or "DILITHIUM" in asset_algo

        if "classical only" in p:
            if is_classical:
                compatibility = 100.0
            else:
                compatibility = 20.0
        elif "kem" in p and "dsa" not in p:
            if has_kem:
                if "512" in p and "512" in asset_algo:
                    compatibility = 100.0
                elif "768" in p and "768" in asset_algo:
                    compatibility = 100.0
                elif "1024" in p and "1024" in asset_algo:
                    compatibility = 100.0
                else:
                    compatibility = 60.0
            elif is_classical:
                compatibility = 50.0
            else:
                compatibility = 30.0
            if has_dsa:
                compatibility = max(0.0, compatibility - 30.0)
        elif "dsa" in p and "kem" not in p:
            if has_dsa:
                if "level 1" in p and "44" in asset_algo:
                    compatibility = 100.0
                elif "level 3" in p and "65" in asset_algo:
                    compatibility = 100.0
                elif "level 5" in p and "87" in asset_algo:
                    compatibility = 100.0
                else:
                    compatibility = 60.0
            elif is_classical:
                compatibility = 50.0
            else:
                compatibility = 30.0
            if has_kem:
                compatibility = max(0.0, compatibility - 30.0)
        else:  # Hybrid profiles
            if has_kem and has_dsa:
                if "level 1" in p and "512" in asset_algo and "44" in asset_algo:
                    compatibility = 100.0
                elif "level 2" in p and "768" in asset_algo and "65" in asset_algo:
                    compatibility = 100.0
                elif "level 3" in p and "1024" in asset_algo and "87" in asset_algo:
                    compatibility = 100.0
                else:
                    compatibility = 70.0
            elif has_kem or has_dsa:
                compatibility = 60.0
            elif is_classical:
                compatibility = 40.0
            else:
                compatibility = 20.0

        if "classical only" in p:
            if is_classical:
                algo_score = 100.0
            else:
                algo_score = 30.0
        else:
            algo_score = (
                0.30 * algo_strength +
                0.30 * compatibility +
                0.20 * qrl +
                0.20 * complexity_score
            )
        scores["algorithm"] = round(algo_score, 2)

        if sub_statuses.get("benchmark_status") and sub_statuses["benchmark_status"].status == "Available":
            scores["benchmark"] = 100.0
        else:
            scores["benchmark"] = 30.0

    weights = {
        "algorithm": 0.25,
        "tls": 0.20,
        "certificate": 0.15,
        "library": 0.15,
        "hardware": 0.10,
        "software": 0.10,
        "benchmark": 0.05,
    }

    score = 0.0
    for factor, factor_score in scores.items():
        weight = weights.get(factor, 0.0)
        score += factor_score * weight

    return round(score, 2)


def classify_readiness(score: float, issues: List[str]) -> str:
    """
    Classify an asset into a readiness tier.

    Tiers:
        - PQC Ready (>= 90): Modern setup with PQC/hybrid options, no blockers.
        - Hybrid Ready (70-89): Secure infrastructure capable of hybrid mode.
        - Upgrade Required (40-69): Demands certificate or library updates.
        - Legacy Blocker (10-39): Obsolete OS, CPU, or hardware blocking migration.
        - Unsupported (< 10): Critical information missing or completely incompatible.
    """
    # Check for hard architectural blockers
    has_architectural_blocker = any(
        "legacy hardware" in issue.lower()
        or "legacy firmware" in issue.lower()
        or "obsolete cpu" in issue.lower()
        or "obsolete operating system" in issue.lower()
        for issue in issues
    )

    if has_architectural_blocker:
        # Forces the asset into the Legacy Blocker category even if other factors are scored highly
        return "Legacy Blocker"

    if score >= 90:
        return "PQC Ready"
    elif score >= 70:
        return "Hybrid Ready"
    elif score >= 40:
        return "Upgrade Required"
    elif score >= 10:
        return "Legacy Blocker"
    else:
        return "Unsupported"
