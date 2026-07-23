"""
Graph domain models — representations of enterprise assets as nodes
and communications as directed edges.
"""

from typing import Any, Optional
from pydantic import BaseModel, Field


class AssetNode(BaseModel):
    """
    Represents an enterprise asset in the communication graph.
    """
    id: str
    name: str
    type: str
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    criticality: str = "unknown"
    legacy: bool = False
    operating_system: Optional[str] = None
    discovery_source: str
    status: str = "active"
    metadata: dict[str, Any] = Field(default_factory=dict)


class CommunicationEdge(BaseModel):
    """
    Represents a directed communication link between two assets.
    """
    source: str  # Source asset ID
    target: str  # Target asset ID
    protocol: str  # e.g., HTTPS, SSH, PostgreSQL, custom, etc.
    port: Optional[int] = None
    tls_enabled: bool = False
    authentication_method: str = "unknown"  # password, mutual_tls, certificate, none, unknown
    encryption_algorithm: str = "unknown"  # RSA-2048, ECDSA-P256, none, unknown, etc.
    communication_type: str = "internal"  # internal or external
    direction: str = "directed"  # directed, incoming, outgoing
    notes: Optional[str] = None
