"""
Graph exporter — serializes the communication graph to JSON,
GraphML, and renders PNG visualization.
"""

import io
import json
import logging
from typing import Any
import networkx as nx

# Configure matplotlib to run headlessly
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from app.graph.builder import get_graph_store
from app.graph.layout import compute_layout
from app.graph.schemas import GraphSchema, CommunicationEdgeSchema
from app.graph.exceptions import ExportError

logger = logging.getLogger("pqc_engine.graph.exporter")


class GraphExporter:
    """
    Handles graph format serialization and rendering.
    """

    def __init__(self, store=None) -> None:
        self.store = store or get_graph_store()

    def export_json(self) -> dict[str, Any]:
        """
        Export the graph structure to a standardized JSON representation.
        """
        try:
            nodes = self.store.get_nodes()
            edges = self.store.get_edges()
            
            # Compute layout coordinates
            layout_nodes = compute_layout(nodes, edges)
            
            schema_edges = [
                CommunicationEdgeSchema(
                    id=f"{edge.source}-{edge.target}-{edge.protocol}",
                    **edge.model_dump()
                )
                for edge in edges
            ]
            
            graph_data = GraphSchema(nodes=layout_nodes, edges=schema_edges)
            return graph_data.model_dump()
        except Exception as exc:
            logger.error("Failed to export graph to JSON: %s", exc)
            raise ExportError("JSON export failed", details=str(exc))

    def export_graphml(self) -> str:
        """
        Export the graph to GraphML format, preserving node and edge attributes.
        """
        try:
            nodes = self.store.get_nodes()
            edges = self.store.get_edges()
            
            G = nx.DiGraph()
            
            # Add nodes with serialized metadata to comply with GraphML simple types
            for node in nodes:
                node_data = node.model_dump()
                # GraphML cannot store complex dictionaries; convert metadata to JSON string
                if "metadata" in node_data:
                    node_data["metadata"] = json.dumps(node_data["metadata"])
                
                # Filter out None values which GraphML writer doesn't support
                node_data_filtered = {k: v for k, v in node_data.items() if v is not None}
                G.add_node(node.id, **node_data_filtered)
                
            for edge in edges:
                edge_data = edge.model_dump()
                edge_data_filtered = {k: v for k, v in edge_data.items() if v is not None}
                G.add_edge(edge.source, edge.target, **edge_data_filtered)

            # Generate GraphML string
            lines = list(nx.generate_graphml(G))
            return "\n".join(lines)
        except Exception as exc:
            logger.error("Failed to export graph to GraphML: %s", exc)
            raise ExportError("GraphML export failed", details=str(exc))

    def export_png(self) -> bytes:
        """
        Render a high-resolution PNG image of the graph matching the SOC dark theme.
        """
        try:
            nodes = self.store.get_nodes()
            edges = self.store.get_edges()
            
            if not nodes:
                raise ExportError("Cannot export empty graph to PNG")

            # Run layout to assign coordinates
            layout_nodes = compute_layout(nodes, edges)
            
            # Build networkx graph
            G = nx.DiGraph()
            for node in layout_nodes:
                G.add_node(node.id, name=node.name)
            for edge in edges:
                G.add_edge(edge.source, edge.target)

            # Build positions mapping
            # Flip y coordinate to draw top-down in matplotlib
            pos = {node.id: (node.x, -node.y) for node in layout_nodes}

            # Configure figure with dark SOC appearance
            fig, ax = plt.subplots(figsize=(12, 10))
            fig.patch.set_facecolor('#0a0e1a')  # INTENSITY_DARK
            ax.set_facecolor('#0a0e1a')

            # Draw nodes
            nx.draw_networkx_nodes(
                G, 
                pos, 
                node_size=1200, 
                node_color='#121824',      # SURFACE_BG
                edgecolors='#334155',       # BORDER_COLOR
                linewidths=1.5,
                ax=ax
            )

            # Draw node labels
            labels = {node.id: node.name for node in layout_nodes}
            nx.draw_networkx_labels(
                G, 
                pos, 
                labels=labels, 
                font_color='#f8fafc',       # TEXT_PRIMARY
                font_size=8, 
                font_weight='bold',
                font_family='monospace',
                ax=ax
            )

            # Draw edges
            nx.draw_networkx_edges(
                G, 
                pos, 
                edgelist=[(edge.source, edge.target) for edge in edges],
                edge_color='#3b82f6',       # PRIMARY_COLOR
                arrows=True, 
                arrowsize=18, 
                arrowstyle='-|>',
                node_size=1200,
                connectionstyle='arc3,rad=0.15',  # Curved edges to prevent overlap in reciprocal links
                ax=ax
            )

            plt.title("Nexus Communication Dependency Graph", color='#f8fafc', fontsize=14, fontweight='bold', pad=20)
            ax.axis('off')
            plt.tight_layout()

            # Save image to bytes stream
            buf = io.BytesIO()
            plt.savefig(buf, format='png', facecolor=fig.get_facecolor(), edgecolor='none', dpi=150)
            plt.close(fig)
            
            buf.seek(0)
            return buf.getvalue()
        except Exception as exc:
            logger.error("Failed to export graph to PNG: %s", exc)
            raise ExportError("PNG export failed", details=str(exc))
