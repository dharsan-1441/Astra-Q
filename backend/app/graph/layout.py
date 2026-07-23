"""
Graph layout coordinator — calculates x and y coordinates for graph nodes
to ensure clean, non-overlapping layouts in the React Flow canvas.
"""

import collections
import logging
import networkx as nx

from app.graph.models import AssetNode, CommunicationEdge
from app.graph.schemas import AssetNodeSchema, Position

logger = logging.getLogger("pqc_engine.graph.layout")


def compute_layout(nodes: list[AssetNode], edges: list[CommunicationEdge]) -> list[AssetNodeSchema]:
    """
    Computes visual coordinate layout (x, y) for nodes using a hierarchical
    layering algorithm. Falls back to a spring layout if needed.
    """
    if not nodes:
        return []

    # Build NetworkX graph for analysis
    G = nx.DiGraph()
    for node in nodes:
        G.add_node(node.id)
    for edge in edges:
        G.add_edge(edge.source, edge.target)

    # 1. Assign nodes to vertical layers (hierarchical layout)
    # A node's layer corresponds to its maximum distance from any root node.
    layers: dict[str, int] = {}
    
    # Identify root nodes (in-degree = 0)
    roots = [n for n, d in G.in_degree() if d == 0]
    
    # If no root nodes exist but there are nodes, choose the one(s) with the minimum in-degree
    if not roots and nodes:
        min_in_degree = min(dict(G.in_degree()).values())
        roots = [n for n, d in G.in_degree() if d == min_in_degree]

    # Run BFS/DFS to assign layers, avoiding cycles
    queue = collections.deque([(root, 0) for root in roots])
    visited: dict[str, int] = {}

    for root in roots:
        visited[root] = 0
        layers[root] = 0

    while queue:
        curr_node, curr_layer = queue.popleft()
        
        # Traverse neighbors
        for neighbor in G.successors(curr_node):
            next_layer = curr_layer + 1
            # If we haven't visited neighbor, or found a deeper path to it
            if neighbor not in visited or next_layer > visited[neighbor]:
                visited[neighbor] = next_layer
                layers[neighbor] = max(layers.get(neighbor, 0), next_layer)
                # To prevent infinite loop in cycles, we only queue if it is within reasonable depth limit
                if next_layer < len(nodes):
                    queue.append((neighbor, next_layer))

    # Assign default layer 0 to any disconnected/unvisited nodes (just in case)
    for node in nodes:
        if node.id not in layers:
            layers[node.id] = 0

    # 2. Group nodes by layer
    layer_groups: dict[int, list[str]] = collections.defaultdict(list)
    for node_id, layer_val in layers.items():
        layer_groups[layer_val].append(node_id)

    # 3. Calculate absolute coordinates
    # Spacing configuration
    X_SPACING = 300  # Horizontal spacing between nodes in the same layer
    Y_SPACING = 180  # Vertical spacing between layers
    
    node_coords: dict[str, tuple[float, float]] = {}

    for layer_val, node_ids in sorted(layer_groups.items()):
        # Sort nodes in the layer to maintain stable layout
        node_ids.sort()
        n_nodes = len(node_ids)
        
        # Center the layer horizontally around x = 0
        layer_width = (n_nodes - 1) * X_SPACING
        start_x = -layer_width / 2.0
        
        for idx, node_id in enumerate(node_ids):
            x = start_x + (idx * X_SPACING)
            y = layer_val * Y_SPACING
            node_coords[node_id] = (x, y)

    # Shift all coordinates to be positive and add padding (so they don't render off-canvas)
    if node_coords:
        min_x = min(coords[0] for coords in node_coords.values())
        min_y = min(coords[1] for coords in node_coords.values())
        
        # We want coordinates to start around (100, 100)
        x_shift = 100 - min_x
        y_shift = 100 - min_y
        
        for node_id in node_coords:
            cx, cy = node_coords[node_id]
            node_coords[node_id] = (cx + x_shift, cy + y_shift)

    # 4. Construct AssetNodeSchema list with assigned coordinates
    schema_nodes: list[AssetNodeSchema] = []
    for node in nodes:
        x, y = node_coords.get(node.id, (100.0, 100.0))
        schema_nodes.append(
            AssetNodeSchema(
                id=node.id,
                name=node.name,
                type=node.type,
                hostname=node.hostname,
                ip_address=node.ip_address,
                criticality=node.criticality,
                legacy=node.legacy,
                operating_system=node.operating_system,
                discovery_source=node.discovery_source,
                status=node.status,
                metadata=node.metadata,
                x=x,
                y=y,
                position=Position(x=x, y=y)
            )
        )

    return schema_nodes
