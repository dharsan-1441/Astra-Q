"""
Graph builder — constructs nodes and edges from normalized inventory,
resolves dependencies, and maintains the current graph in memory.
"""

import logging
from threading import Lock
from typing import Any, Optional

from app.discovery.inventory import get_inventory
from app.graph.models import AssetNode, CommunicationEdge

logger = logging.getLogger("pqc_engine.graph.builder")


class GraphStore:
    """
    Thread-safe in-memory storage for the constructed communication graph.
    """

    def __init__(self) -> None:
        self._nodes: dict[str, AssetNode] = {}
        self._edges: list[CommunicationEdge] = []
        self._warnings: list[str] = []
        self._lock = Lock()

    def set_graph(self, nodes: list[AssetNode], edges: list[CommunicationEdge], warnings: list[str]) -> None:
        """Update the stored graph nodes, edges, and warnings."""
        with self._lock:
            self._nodes = {node.id: node for node in nodes}
            self._edges = list(edges)
            self._warnings = list(warnings)
            logger.info("Graph updated in store: %d nodes, %d edges", len(nodes), len(edges))

    def get_nodes(self) -> list[AssetNode]:
        """Get all stored nodes."""
        with self._lock:
            return list(self._nodes.values())

    def get_edges(self) -> list[CommunicationEdge]:
        """Get all stored edges."""
        with self._lock:
            return list(self._edges)

    def get_warnings(self) -> list[str]:
        """Get all warnings collected during the last build."""
        with self._lock:
            return list(self._warnings)

    def get_node(self, node_id: str) -> Optional[AssetNode]:
        """Retrieve a specific node by ID."""
        with self._lock:
            return self._nodes.get(node_id)

    def clear(self) -> None:
        """Clear the store."""
        with self._lock:
            self._nodes.clear()
            self._edges.clear()
            self._warnings.clear()
            logger.info("Graph store cleared")


# Global singleton store instance
_graph_store = GraphStore()


def get_graph_store() -> GraphStore:
    """Return the application-wide graph store singleton."""
    return _graph_store


class GraphBuilder:
    """
    Constructs the communication graph by resolving asset dependencies
    and populating node/edge metadata.
    """

    def __init__(self, store: Optional[GraphStore] = None) -> None:
        self.store = store or get_graph_store()

    def build(self) -> dict[str, Any]:
        """
        Build the graph from the current normalized asset inventory.
        
        Returns:
            A dictionary summary: { "node_count": int, "edge_count": int, "warnings": list[str] }
        """
        logger.info("Initiating communication graph construction from inventory...")
        inventory = get_inventory()
        assets = inventory.get_all()

        nodes: list[AssetNode] = []
        edges: list[CommunicationEdge] = []
        warnings: list[str] = []

        # 1. Create nodes and populate lookup maps
        lookup_map: dict[str, AssetNode] = {}  # Resolves references to AssetNodes
        
        for asset in assets:
            # Extract fields from asset and metadata
            meta = asset.metadata
            node_id = asset.id
            name = asset.name
            
            node = AssetNode(
                id=node_id,
                name=name,
                type=asset.type,
                hostname=meta.get("hostname") or meta.get("subject"),
                ip_address=meta.get("ip") or meta.get("ip_address"),
                criticality=meta.get("criticality") or "unknown",
                legacy=meta.get("legacy") or False,
                operating_system=meta.get("operating_system"),
                discovery_source=asset.discovery_source,
                status=asset.status,
                metadata=meta,
            )
            nodes.append(node)
            
            # Map multiple keys to enable flexible dependency resolution
            lookup_map[node_id] = node
            lookup_map[name] = node
            
            # YAML import uses 'original_id' (e.g. 'nfs-app-001')
            orig_id = meta.get("original_id")
            if orig_id:
                lookup_map[orig_id] = node
                
            # If hostname or IP is defined, map them too
            host = meta.get("hostname")
            if host:
                lookup_map[host] = node
            ip = meta.get("ip") or meta.get("ip_address")
            if ip:
                lookup_map[ip] = node

        # Track existing edges to prevent duplicates
        seen_edges: set[tuple[str, str]] = set()

        # 2. Resolve dependencies to build communication edges
        for asset in assets:
            source_id = asset.id
            source_name = asset.name
            
            # Read dependencies list from metadata
            deps = asset.metadata.get("dependencies")
            if not deps:
                continue
                
            if not isinstance(deps, list):
                logger.warning("Asset %s dependencies is not a list: %s", source_id, deps)
                continue

            for target_ref in deps:
                if not target_ref or not isinstance(target_ref, str):
                    continue
                
                target_ref_stripped = target_ref.strip()
                target_node = lookup_map.get(target_ref_stripped)

                if not target_node:
                    # Target node is missing from inventory
                    warning_msg = f"Missing target: Asset '{source_name}' ({source_id}) references non-existent dependency '{target_ref}'"
                    warnings.append(warning_msg)
                    logger.warning(warning_msg)
                    continue

                target_id = target_node.id
                edge_key = (source_id, target_id)

                if edge_key in seen_edges:
                    # Duplicate dependency detected
                    warning_msg = f"Duplicate dependency: Connection from '{source_name}' to '{target_node.name}' is specified more than once"
                    warnings.append(warning_msg)
                    logger.warning(warning_msg)
                    continue

                seen_edges.add(edge_key)

                # Infer edge parameters based on target metadata
                target_meta = target_node.metadata
                port = target_meta.get("port")
                tls_version = target_meta.get("tls_version")
                crypto_algorithm = target_meta.get("crypto_algorithm") or target_meta.get("cipher_suite")
                cert = target_meta.get("certificate")

                # TLS Enabled inference
                tls_enabled = False
                if tls_version and str(tls_version).lower() not in ("none", "null", "false"):
                    tls_enabled = True
                elif cert:
                    tls_enabled = True

                # Protocol inference based on port and type
                protocol = "TCP"
                if port == 443:
                    protocol = "HTTPS"
                elif port == 80:
                    protocol = "HTTP"
                elif port == 22:
                    protocol = "SSH"
                elif port == 5432:
                    protocol = "PostgreSQL"
                elif port == 3306:
                    protocol = "MySQL"
                elif port == 6379:
                    protocol = "Redis"
                elif port in (587, 25, 465):
                    protocol = "SMTP"
                elif port == 53:
                    protocol = "DNS"
                elif port == 1194:
                    protocol = "OpenVPN"
                elif target_node.type == "vpn":
                    protocol = "VPN"
                elif target_node.type == "database":
                    protocol = "SQL"
                elif tls_enabled:
                    protocol = "TLS/TCP"

                # Authentication method inference
                auth_method = "unknown"
                if tls_enabled and cert:
                    # Check if client cert or similar might be inferred
                    if "mutual" in str(target_meta.get("notes") or "").lower():
                        auth_method = "mutual_tls"
                    else:
                        auth_method = "certificate"
                elif target_node.type == "database":
                    auth_method = "password"
                elif target_node.type == "cache":
                    auth_method = "none" if not tls_enabled else "password"

                # Encryption algorithm inference
                encryption_algo = crypto_algorithm or ("TLS_AES_256_GCM" if tls_enabled else "none")

                # Communication type inference (internal vs external)
                comm_type = "internal"
                ip_addr = target_node.ip_address
                hostname = target_node.hostname

                if ip_addr:
                    # Simple RFC 1918 private IP check
                    is_private = (
                        ip_addr.startswith("10.") or
                        ip_addr.startswith("192.168.") or
                        (ip_addr.startswith("172.") and len(ip_addr) > 6 and ip_addr[4:6].isdigit() and 16 <= int(ip_addr[4:6]) <= 31) or
                        ip_addr == "127.0.0.1" or
                        ip_addr == "localhost"
                    )
                    if not is_private:
                        comm_type = "external"
                elif hostname:
                    if not (hostname.endswith(".local") or hostname.endswith(".internal") or "nexusfs" in hostname):
                        comm_type = "external"

                edge = CommunicationEdge(
                    source=source_id,
                    target=target_id,
                    protocol=protocol,
                    port=port,
                    tls_enabled=tls_enabled,
                    authentication_method=auth_method,
                    encryption_algorithm=encryption_algo,
                    communication_type=comm_type,
                    direction="directed",
                    notes=target_meta.get("notes") or f"Communication from {source_name} to {target_node.name}",
                )
                edges.append(edge)

        # 3. Store graph in the shared GraphStore
        self.store.set_graph(nodes, edges, warnings)

        return {
            "node_count": len(nodes),
            "edge_count": len(edges),
            "warnings": warnings,
        }
