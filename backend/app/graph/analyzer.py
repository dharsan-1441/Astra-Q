"""
Graph analyzer — computes network statistics, identifies critical/isolated nodes,
detects circular dependencies, and validates overall graph structural health.
"""

import logging
import networkx as nx
from app.graph.schemas import GraphStatisticsSchema
from app.graph.builder import get_graph_store

logger = logging.getLogger("pqc_engine.graph.analyzer")


class GraphAnalyzer:
    """
    Computes graph theory metrics and validates communication topology.
    """

    def __init__(self, store=None) -> None:
        self.store = store or get_graph_store()

    def analyze(self) -> GraphStatisticsSchema:
        """
        Analyze the current constructed communication graph.
        
        Returns:
            Structured graph metrics and health warnings.
        """
        nodes = self.store.get_nodes()
        edges = self.store.get_edges()
        builder_warnings = self.store.get_warnings()

        # Initialize networkx directed graph
        G = nx.DiGraph()
        for node in nodes:
            G.add_node(
                node.id, 
                name=node.name,
                type=node.type,
                criticality=node.criticality,
                legacy=node.legacy
            )
        for edge in edges:
            G.add_edge(edge.source, edge.target)

        node_count = len(nodes)
        edge_count = len(edges)

        # 1. Base network properties
        density = nx.density(G) if node_count > 1 else 0.0
        
        # Average degree (in + out degree divided by node count)
        total_degrees = sum(dict(G.degree()).values())
        average_degree = total_degrees / node_count if node_count > 0 else 0.0

        # Weakly connected components (undirected groupings)
        cc_count = nx.number_weakly_connected_components(G) if node_count > 0 else 0

        # 2. Structural role identification
        root_nodes: list[str] = []
        leaf_nodes: list[str] = []
        isolated_nodes: list[str] = []

        for node_id in G.nodes:
            in_deg = G.in_degree(node_id)
            out_deg = G.out_degree(node_id)

            if in_deg == 0 and out_deg == 0:
                isolated_nodes.append(node_id)
            elif in_deg == 0:
                root_nodes.append(node_id)
            elif out_deg == 0:
                leaf_nodes.append(node_id)

        # Sort for consistency
        root_nodes.sort()
        leaf_nodes.sort()
        isolated_nodes.sort()

        # 3. Bridge Nodes (Articulation points in undirected version)
        bridge_nodes: list[str] = []
        if node_count > 2:
            try:
                undirected_G = G.to_undirected()
                bridge_nodes = list(nx.articulation_points(undirected_G))
                bridge_nodes.sort()
            except Exception as exc:
                logger.error("Failed to compute bridge nodes: %s", exc)

        # 4. Circular dependencies (Simple cycles in directed graph)
        circular_deps: list[list[str]] = []
        if node_count > 0:
            try:
                # Find all simple cycles
                cycles = list(nx.simple_cycles(G))
                # Filter out single-node self loops if they represent a non-issue,
                # but let's include them if they exist. Let's keep all.
                circular_deps = [list(c) for c in cycles]
            except Exception as exc:
                logger.error("Failed to compute cycles: %s", exc)

        # 5. Dependency Depth & Max Chain Length
        max_depth = 0
        max_chain_length = 0

        if node_count > 0:
            # Max Chain Length
            try:
                if nx.is_directed_acyclic_graph(G):
                    max_chain_length = nx.dag_longest_path_length(G)
                else:
                    # Graph has cycles; find longest shortest path length
                    path_lengths = dict(nx.all_pairs_shortest_path_length(G))
                    max_chain_length = max(
                        max(node_lengths.values())
                        for node_lengths in path_lengths.values()
                        if node_lengths
                    )
            except Exception as exc:
                logger.warning("Could not calculate max dependency chain: %s", exc)

            # Max Depth (longest path starting from any root node)
            try:
                depths: dict[str, int] = {node_id: 0 for node_id in G.nodes}
                
                # BFS to calculate layers / depth from root nodes
                roots_to_use = root_nodes if root_nodes else (list(G.nodes)[:1] if G.nodes else [])
                import collections
                queue = collections.deque([(r, 0) for r in roots_to_use])
                visited = set(roots_to_use)

                while queue:
                    curr, d = queue.popleft()
                    depths[curr] = max(depths[curr], d)
                    for nxt in G.successors(curr):
                        if nxt not in visited:
                            visited.add(nxt)
                            queue.append((nxt, d + 1))
                            
                max_depth = max(depths.values()) if depths else 0
            except Exception as exc:
                logger.warning("Could not calculate max depth: %s", exc)

        # 6. Warning Generation
        warnings = list(builder_warnings)  # Start with builder warnings (missing targets, duplicates)

        # Warnings for Isolated Systems
        for node_id in isolated_nodes:
            node_name = G.nodes[node_id].get("name", node_id)
            warnings.append(
                f"Disconnected system: Asset '{node_name}' ({node_id}) is isolated and has no communication dependencies."
            )

        # Warnings for Circular Dependencies
        for cycle in circular_deps:
            cycle_names = [G.nodes[nid].get("name", nid) for nid in cycle]
            cycle_str = " -> ".join(cycle_names)
            warnings.append(
                f"Circular dependency: Communication loop detected: {cycle_str} -> {cycle_names[0]}"
            )

        # 7. Package and return the results
        return GraphStatisticsSchema(
            node_count=node_count,
            edge_count=edge_count,
            density=density,
            average_degree=average_degree,
            connected_components_count=cc_count,
            max_depth=max_depth,
            max_chain_length=max_chain_length,
            circular_dependencies=circular_deps,
            isolated_nodes=isolated_nodes,
            root_nodes=root_nodes,
            leaf_nodes=leaf_nodes,
            bridge_nodes=bridge_nodes,
            warnings=warnings,
        )
