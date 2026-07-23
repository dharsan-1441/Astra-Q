"""
Enterprise YAML configuration parser.

Reads enterprise YAML files, validates against the schema,
and converts system entries into normalized assets.
"""

import logging
from pathlib import Path

import yaml
from pydantic import ValidationError

from app.discovery.exceptions import YAMLParseError, YAMLValidationError
from app.discovery.models import (
    DiscoverySource,
    EnterpriseYAMLConfig,
    NormalizedAsset,
    YAMLSystemEntry,
)

logger = logging.getLogger("pqc_engine.discovery.parser")


class YAMLParser:
    """Parses enterprise YAML configuration files into normalized assets."""

    def parse_file(self, file_path: Path) -> list[NormalizedAsset]:
        """
        Read and parse a YAML file from the filesystem.

        Args:
            file_path: Absolute or relative path to the YAML file.

        Returns:
            List of normalized assets extracted from the file.

        Raises:
            YAMLParseError: If the file cannot be read or parsed.
            YAMLValidationError: If the content fails schema validation.
        """
        logger.info("Parsing YAML file: %s", file_path)

        if not file_path.exists():
            raise YAMLParseError(
                message=f"File not found: {file_path}",
                details=str(file_path),
            )

        try:
            content = file_path.read_text(encoding="utf-8")
        except OSError as exc:
            raise YAMLParseError(
                message=f"Cannot read file: {file_path}",
                details=str(exc),
            ) from exc

        return self.parse_content(content, source_label=file_path.name)

    def parse_content(
        self,
        content: str,
        source_label: str = "upload",
    ) -> list[NormalizedAsset]:
        """
        Parse raw YAML content string into normalized assets.

        Args:
            content: Raw YAML string.
            source_label: Label identifying the source (filename, "upload", etc.).

        Returns:
            List of normalized assets.

        Raises:
            YAMLParseError: If the YAML syntax is invalid.
            YAMLValidationError: If the content fails schema validation.
        """
        try:
            raw = yaml.safe_load(content)
        except yaml.YAMLError as exc:
            raise YAMLParseError(
                message="Invalid YAML syntax",
                details=str(exc),
            ) from exc

        if not raw or not isinstance(raw, dict):
            raise YAMLParseError(
                message="YAML content is empty or not a mapping",
                details=f"source={source_label}",
            )

        try:
            config = EnterpriseYAMLConfig.model_validate(raw)
        except ValidationError as exc:
            raise YAMLValidationError(
                message="YAML content does not match the enterprise schema",
                details=str(exc),
            ) from exc

        assets = [
            self._system_to_asset(system, config.enterprise.name)
            for system in config.enterprise.systems
        ]

        logger.info(
            "Parsed %d systems from '%s' (enterprise: %s)",
            len(assets),
            source_label,
            config.enterprise.name,
        )
        return assets

    def _system_to_asset(
        self,
        system: YAMLSystemEntry,
        enterprise_name: str,
    ) -> NormalizedAsset:
        """Convert a single YAML system entry into a normalized asset."""
        metadata: dict = {
            "enterprise": enterprise_name,
            "original_id": system.id,
            "hostname": system.hostname,
            "ip": system.ip,
            "port": system.port,
            "operating_system": system.operating_system,
            "crypto_algorithm": system.crypto_algorithm,
            "tls_version": system.tls_version,
            "dependencies": system.dependencies,
            "criticality": system.criticality,
            "owner": system.owner,
            "notes": system.notes,
            "legacy": system.legacy,
        }

        if system.certificate:
            metadata["certificate"] = system.certificate.model_dump()

        return NormalizedAsset(
            name=system.name,
            type=system.type,
            discovery_source=DiscoverySource.YAML_IMPORT.value,
            metadata=metadata,
            status="active",
        )
