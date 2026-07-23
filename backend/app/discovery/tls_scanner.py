"""
TLS endpoint scanner.

Connects to a remote host, inspects the TLS handshake and certificate,
and returns structured discovery results. Handles unreachable hosts gracefully.
"""

import logging
import socket
import ssl
from datetime import datetime, timezone

from app.discovery.models import DiscoverySource, NormalizedAsset, TLSDiscoveryResult

logger = logging.getLogger("pqc_engine.discovery.tls_scanner")


class TLSScanner:
    """Inspects TLS endpoints and extracts cryptographic metadata."""

    def scan(
        self,
        hostname: str,
        port: int = 443,
        timeout: float = 5.0,
    ) -> TLSDiscoveryResult:
        """
        Perform TLS inspection on a remote endpoint.

        Connects to the target, completes a TLS handshake, and extracts
        protocol version, cipher suite, and certificate details.
        Unreachable hosts return a result with ``reachable=False``.

        Args:
            hostname: Target hostname or IP address.
            port: Target port (default 443).
            timeout: Connection timeout in seconds.

        Returns:
            Structured TLS discovery result.
        """
        logger.info("Scanning TLS endpoint: %s:%d", hostname, port)

        result = TLSDiscoveryResult(
            hostname=hostname,
            port=port,
            scan_timestamp=datetime.now(timezone.utc).isoformat(),
        )

        tls_info = self._collect_tls_info(hostname, port, timeout)
        result.tls_version = tls_info.get("tls_version")
        result.cipher_suite = tls_info.get("cipher_suite")
        result.supported_cipher_suites = tls_info.get("supported_cipher_suites", [])

        if tls_info.get("error"):
            result.error = tls_info["error"]
            result.reachable = False
            logger.warning("TLS scan failed for %s:%d — %s", hostname, port, result.error)
            return result

        cert_info = self._collect_cert_info(hostname, port, timeout)
        result.certificate_subject = cert_info.get("subject")
        result.certificate_issuer = cert_info.get("issuer")
        result.certificate_expiry = cert_info.get("expiry")
        result.not_before = cert_info.get("not_before")
        result.public_key_algorithm = cert_info.get("public_key_algorithm")
        result.public_key_bits = cert_info.get("public_key_bits")
        result.signature_algorithm = cert_info.get("signature_algorithm")
        result.serial_number = cert_info.get("serial_number")

        if cert_info.get("error"):
            result.error = cert_info["error"]

        logger.info(
            "TLS scan complete for %s:%d — %s, %s",
            hostname, port, result.tls_version, result.cipher_suite,
        )
        return result

    def scan_to_asset(
        self,
        hostname: str,
        port: int = 443,
        timeout: float = 5.0,
    ) -> tuple[TLSDiscoveryResult, NormalizedAsset]:
        """Scan a TLS endpoint and produce both the raw result and a normalized asset."""
        scan_result = self.scan(hostname, port, timeout)
        asset = NormalizedAsset(
            name=f"{hostname}:{port}",
            type="server",
            discovery_source=DiscoverySource.TLS_SCAN.value,
            metadata=scan_result.model_dump(),
            status="active" if scan_result.reachable else "unknown",
        )
        return scan_result, asset

    def _collect_tls_info(
        self,
        hostname: str,
        port: int,
        timeout: float,
    ) -> dict:
        """Establish a TLS connection and extract protocol/cipher information."""
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE

        try:
            with socket.create_connection((hostname, port), timeout=timeout) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as tls_sock:
                    info: dict = {
                        "tls_version": tls_sock.version(),
                    }
                    cipher = tls_sock.cipher()
                    if cipher:
                        info["cipher_suite"] = cipher[0]

                    shared = tls_sock.shared_ciphers()
                    if shared:
                        info["supported_cipher_suites"] = list({c[0] for c in shared})
                    else:
                        info["supported_cipher_suites"] = []

                    return info

        except (socket.timeout, TimeoutError):
            return {"error": f"Connection timed out after {timeout}s"}
        except ConnectionRefusedError:
            return {"error": "Connection refused"}
        except OSError as exc:
            return {"error": f"Connection failed: {exc}"}

    def _collect_cert_info(
        self,
        hostname: str,
        port: int,
        timeout: float,
    ) -> dict:
        """Retrieve and parse the remote server certificate."""
        info: dict = {}

        verified = self._get_verified_cert(hostname, port, timeout)
        if verified:
            info.update(verified)
            return info

        info["error"] = "Certificate could not be fully verified (self-signed or untrusted CA)"

        try:
            pem = ssl.get_server_certificate((hostname, port), timeout=timeout)
            parsed = self._parse_pem_basic(pem)
            info.update(parsed)
        except Exception as exc:
            info["error"] = f"Certificate retrieval failed: {exc}"

        return info

    def _get_verified_cert(
        self,
        hostname: str,
        port: int,
        timeout: float,
    ) -> dict | None:
        """Attempt a verified TLS connection to extract full certificate details."""
        context = ssl.create_default_context()
        try:
            with socket.create_connection((hostname, port), timeout=timeout) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as tls_sock:
                    cert = tls_sock.getpeercert()
                    if not cert:
                        return None
                    return self._parse_cert_dict(cert)
        except (ssl.SSLCertVerificationError, ssl.SSLError):
            return None
        except Exception:
            return None

    def _parse_cert_dict(self, cert: dict) -> dict:
        """Extract fields from Python's getpeercert() dictionary."""
        info: dict = {}

        subject_parts = []
        for rdn in cert.get("subject", ()):
            for attr_name, attr_value in rdn:
                subject_parts.append(f"{attr_name}={attr_value}")
        info["subject"] = ", ".join(subject_parts) if subject_parts else None

        issuer_parts = []
        for rdn in cert.get("issuer", ()):
            for attr_name, attr_value in rdn:
                issuer_parts.append(f"{attr_name}={attr_value}")
        info["issuer"] = ", ".join(issuer_parts) if issuer_parts else None

        info["expiry"] = cert.get("notAfter")
        info["not_before"] = cert.get("notBefore")
        info["serial_number"] = cert.get("serialNumber")

        return info

    def _parse_pem_basic(self, pem: str) -> dict:
        """Extract basic metadata from a PEM certificate string using ssl DER decoding."""
        info: dict = {}
        try:
            der = ssl.PEM_cert_to_DER_cert(pem)
            info["public_key_algorithm"] = self._detect_key_algo_from_der(der)
        except Exception:
            pass
        return info

    def _detect_key_algo_from_der(self, der_bytes: bytes) -> str | None:
        """Heuristic detection of key algorithm from DER-encoded certificate bytes."""
        RSA_OID = b"\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01"
        EC_OID = b"\x2a\x86\x48\xce\x3d\x02\x01"
        ED25519_OID = b"\x2b\x65\x70"

        if RSA_OID in der_bytes:
            return "RSA"
        if EC_OID in der_bytes:
            return "ECDSA"
        if ED25519_OID in der_bytes:
            return "Ed25519"
        return None
