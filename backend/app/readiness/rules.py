"""
Readiness rules engine — evaluates enterprise assets and dependency graph
relationships to generate factor scores, issues, and recommendations.
"""

from typing import Any, Dict, List, Tuple

from app.discovery.models import NormalizedAsset
from app.readiness.models import (
    AlgorithmSupportStatus,
    BenchmarkStatus,
    CertificateStatus,
    HardwareStatus,
    LibraryStatus,
    SoftwareStatus,
    TLSStatus,
)

# Known obsolete/legacy operating systems
LEGACY_OS_LIST = [
    "windows server 2008",
    "windows server 2012",
    "centos 6",
    "centos 7",
    "ubuntu 14.04",
    "ubuntu 16.04",
    "debian 8",
    "debian 9",
]

# Known obsolete CPU architectures
LEGACY_ARCHS = ["x86", "i386", "i686", "mips", "powerpc", "armv7l"]


def check_benchmark_availability(
    algo: str,
    param: str,
    benchmark_sessions: List[Any],
) -> Tuple[str, str | None]:
    """Link Phase 4 benchmark records if available for this algorithm/parameter set."""
    if not benchmark_sessions:
        return "Unavailable", None

    # Search for an exact match on parameter set first
    for session in benchmark_sessions:
        if session.parameter_set.upper() == param.upper():
            return "Available", session.id

    # Fallback to matching the base algorithm
    for session in benchmark_sessions:
        if session.algorithm.upper() == algo.upper():
            return "Available", session.id

    return "Unavailable", None


def evaluate_asset_rules(
    asset: NormalizedAsset,
    dependencies: List[NormalizedAsset],
    benchmark_sessions: List[Any],
) -> Tuple[Dict[str, float], List[str], List[str], Dict[str, Any]]:
    """
    Evaluate an asset against migration rules to calculate factor scores and recommendations.

    Returns:
        A tuple of (factor_scores, issues, recommendations, sub_statuses).
    """
    meta = asset.metadata
    legacy_asset = meta.get("legacy", False)
    algo_str = str(meta.get("crypto_algorithm") or "").upper().strip()

    # Extract base algorithm category
    base_algo = "UNKNOWN"
    if "ML-KEM" in algo_str or "KYBER" in algo_str:
        base_algo = "ML-KEM"
    elif "ML-DSA" in algo_str or "DILITHIUM" in algo_str:
        base_algo = "ML-DSA"
    elif "RSA" in algo_str:
        base_algo = "RSA"
    elif "ECC" in algo_str or "ECDSA" in algo_str or "ECDH" in algo_str:
        base_algo = "ECC"

    issues: List[str] = []
    recommendations: List[str] = []

    # 1. Algorithm Support (25% weight)
    algo_status = AlgorithmSupportStatus()
    algo_score = 100.0

    if base_algo == "ML-KEM":
        algo_status.ml_kem_support = True
        algo_status.hybrid_support = "HYBRID" in algo_str
    elif base_algo == "ML-DSA":
        algo_status.ml_dsa_support = True
        algo_status.hybrid_support = "HYBRID" in algo_str
    elif base_algo in ("RSA", "ECC"):
        algo_status.classical_algorithms_present = [base_algo]
        # Classical algorithms trigger upgrade recommendation
        algo_score = 50.0
        issues.append(f"Uses classical cryptographic algorithm ({base_algo})")
        if base_algo == "RSA":
            recommendations.append("Upgrade Certificate Chain")
        else:
            recommendations.append("Deploy Hybrid Mode")
    else:
        # Manual assets might have explicit flags
        pqc_manual = meta.get("pqc_support", False)
        hybrid_manual = meta.get("hybrid_support", False)
        if pqc_manual:
            algo_status.ml_kem_support = True
            algo_status.ml_dsa_support = True
            algo_status.hybrid_support = hybrid_manual
        else:
            algo_score = 30.0
            issues.append("Missing PQC algorithm compatibility configuration")
            recommendations.append("Deploy Hybrid Mode")

    if legacy_asset:
        algo_score = min(algo_score, 30.0)

    # Penalize if dependencies are classical-only or blocked
    classical_deps = [d.name for d in dependencies if d.metadata.get("legacy", False)]
    if classical_deps:
        algo_score = max(0.0, algo_score - 15.0)
        issues.append(f"Depends on classical or legacy systems: {', '.join(classical_deps[:2])}")
        recommendations.append("Upgrade TLS Configuration")

    # 2. TLS Compatibility (20% weight)
    tls_status = TLSStatus()
    tls_score = 100.0
    tls_ver = str(meta.get("tls_version") or "").lower().strip()

    if tls_ver:
        tls_status.tls_version = meta.get("tls_version")
        if "1.3" in tls_ver:
            tls_status.pqc_cipher_availability = "MLKEM" in algo_str or "MLDSA" in algo_str
            tls_status.hybrid_cipher_support = "HYBRID" in algo_str or tls_status.pqc_cipher_availability
        elif "1.2" in tls_ver:
            tls_score = 70.0
            issues.append("TLS version 1.2 is restricted to classical suites in default setups")
            recommendations.append("Upgrade TLS Configuration")
        elif any(v in tls_ver for v in ("1.0", "1.1")):
            tls_score = 20.0
            issues.append("Obsolete TLS protocol version (TLS 1.0 or 1.1) in use")
            recommendations.append("Upgrade TLS Configuration")
    else:
        # If not a network asset, do not penalize
        if asset.type not in ("server", "gateway", "proxy", "load_balancer", "vpn"):
            tls_score = 100.0
        else:
            tls_score = 30.0
            issues.append("Missing TLS encryption on network endpoint")
            recommendations.append("Upgrade TLS Configuration")

    # 3. Certificate Readiness (15% weight)
    cert_status = CertificateStatus()
    cert_score = 100.0
    cert_info = meta.get("certificate")

    if cert_info:
        cert_algo = str(cert_info.get("algorithm") or "").upper()
        if "ML-DSA" in cert_algo:
            cert_status.hybrid_certificates = False
        elif "HYBRID" in cert_algo:
            cert_status.hybrid_certificates = True
        elif "ECC" in cert_algo or "ECDSA" in cert_algo:
            cert_status.ecc_certificates = True
            cert_score = 70.0
            issues.append("Uses classical elliptic curve certificate (ECDSA)")
            recommendations.append("Upgrade Certificate Chain")
        elif "RSA" in cert_algo or not cert_algo:
            cert_status.rsa_certificates = True
            cert_status.certificate_upgrade_required = True
            cert_score = 40.0
            issues.append("Uses legacy RSA certificate chain")
            recommendations.append("Upgrade Certificate Chain")
    else:
        if asset.type in ("server", "gateway", "proxy", "vpn"):
            cert_score = 30.0
            issues.append("No SSL/TLS certificate configured on server")
            recommendations.append("Upgrade Certificate Chain")
        else:
            cert_score = 100.0

    # 4. Library Support (15% weight)
    lib_status = LibraryStatus()
    lib_score = 100.0
    openssl_ver = str(meta.get("openssl_version") or "").strip()

    if openssl_ver:
        lib_status.openssl_version = openssl_ver
        if openssl_ver.startswith("3."):
            # Check for OQS Provider (defaulting to enabled if modern YAML suggests it)
            has_oqs = meta.get("oqs_provider", True)
            lib_status.oqs_provider = has_oqs
            if not has_oqs:
                lib_score = 70.0
                issues.append("OQS Provider is disabled in OpenSSL 3.x configuration")
                recommendations.append("Enable OQS Provider")
        elif openssl_ver.startswith("1.1.1"):
            lib_score = 40.0
            issues.append("End-of-life OpenSSL version (1.1.1) in use")
            recommendations.append("Upgrade OpenSSL")
        else:
            lib_score = 10.0
            issues.append(f"Obsolete and vulnerable OpenSSL version ({openssl_ver})")
            recommendations.append("Upgrade OpenSSL")
    else:
        # Default fallback
        if legacy_asset:
            lib_score = 30.0
            issues.append("Legacy software environment detected without modern libraries")
            recommendations.append("Upgrade OpenSSL")
        else:
            # Default to modern OpenSSL 3.x with OQS
            lib_status.openssl_version = "3.0.x (Inferred)"
            lib_status.oqs_provider = True

    # Check for specific legacy libraries in notes/metadata
    notes_str = str(meta.get("notes") or "").lower()
    if "mbedtls" in notes_str or "nss" in notes_str:
        lib_status.legacy_libraries.append("Legacy Crypto Wrapper")
        lib_score = min(lib_score, 40.0)
        issues.append("Uses custom or non-standard legacy cryptographic libraries")

    # 5. Hardware Compatibility (10% weight)
    hw_status = HardwareStatus()
    hw_score = 100.0

    cpu_arch = str(meta.get("cpu_architecture") or "").lower().strip()
    if cpu_arch:
        hw_status.cpu_architecture = meta.get("cpu_architecture")
        if any(arch in cpu_arch for arch in LEGACY_ARCHS):
            hw_score = 30.0
            issues.append(f"Obsolete CPU architecture ({cpu_arch}) lacking AVX2/neon optimizations")
            recommendations.append("Replace Legacy Hardware")

    if asset.type == "hsm":
        if legacy_asset:
            hw_status.hsm_compatibility = "Incompatible"
            hw_score = 20.0
            issues.append("Legacy Hardware Security Module (HSM) lacks PQC support")
            recommendations.append("Replace Legacy Hardware")
        else:
            hw_status.hsm_compatibility = "Compatible"

    if legacy_asset:
        hw_score = min(hw_score, 30.0)
        hw_status.legacy_firmware = True
        issues.append("Legacy firmware configuration active")
        recommendations.append("Upgrade Firmware")

    # 6. Software Compatibility (10% weight)
    sw_status = SoftwareStatus()
    sw_score = 100.0

    os_str = str(meta.get("operating_system") or "").lower().strip()
    if os_str:
        sw_status.operating_system = meta.get("operating_system")
        if any(leg_os in os_str for leg_os in LEGACY_OS_LIST):
            sw_score = 30.0
            sw_status.dependency_compatibility = "Incompatible"
            issues.append(f"Obsolete operating system ({meta.get('operating_system')})")
            recommendations.append("Upgrade TLS Configuration")
        else:
            sw_status.dependency_compatibility = "Compatible"

    # Infer application stack / runtimes
    if "java" in notes_str:
        sw_status.runtime = "Java Runtime Environment"
        sw_status.application_stack = "JVM Application"
    elif "python" in notes_str:
        sw_status.runtime = "Python Engine"
        sw_status.application_stack = "Python Application"

    if legacy_asset:
        sw_score = min(sw_score, 40.0)

    # 7. Benchmark Availability (5% weight)
    bench_status = BenchmarkStatus()
    bench_score = 0.0

    bench_state, session_id = check_benchmark_availability(
        base_algo,
        algo_str,
        benchmark_sessions,
    )
    bench_status.status = bench_state
    bench_status.benchmark_session_id = session_id

    if bench_state == "Available":
        bench_score = 100.0

    # Ensure recommendations has at least "No Action Required" if all is perfect
    if not recommendations:
        recommendations.append("No Action Required")

    # De-duplicate issues and recommendations
    issues = list(dict.fromkeys(issues))
    recommendations = list(dict.fromkeys(recommendations))

    scores = {
        "algorithm": algo_score,
        "tls": tls_score,
        "certificate": cert_score,
        "library": lib_score,
        "hardware": hw_score,
        "software": sw_score,
        "benchmark": bench_score,
    }

    sub_statuses = {
        "algorithm_support": algo_status,
        "tls_status": tls_status,
        "certificate_status": cert_status,
        "library_status": lib_status,
        "hardware_status": hw_status,
        "software_status": sw_status,
        "benchmark_status": bench_status,
    }

    return scores, issues, recommendations, sub_statuses
