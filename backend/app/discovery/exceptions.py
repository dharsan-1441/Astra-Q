"""
Discovery module exceptions — structured error hierarchy
for all discovery operations.
"""


class DiscoveryError(Exception):
    """Base exception for all discovery operations."""

    def __init__(self, message: str, details: str | None = None):
        self.message = message
        self.details = details
        super().__init__(self.message)


class YAMLParseError(DiscoveryError):
    """Raised when a YAML configuration file cannot be parsed or validated."""
    pass


class YAMLValidationError(DiscoveryError):
    """Raised when YAML content fails schema validation."""
    pass


class TLSScanError(DiscoveryError):
    """Raised when a TLS scan encounters an unrecoverable error."""
    pass


class TLSConnectionError(TLSScanError):
    """Raised when a TLS connection cannot be established."""
    pass


class TLSCertificateError(TLSScanError):
    """Raised when certificate parsing fails."""
    pass


class AssetNotFoundError(DiscoveryError):
    """Raised when a requested asset does not exist in the inventory."""
    pass


class DuplicateAssetError(DiscoveryError):
    """Raised when attempting to register a duplicate asset."""
    pass


class InvalidAssetError(DiscoveryError):
    """Raised when asset data fails validation."""
    pass
