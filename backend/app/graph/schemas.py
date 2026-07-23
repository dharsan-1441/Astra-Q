"""
Graph schemas — Pydantic schemas for API requests, responses,
and statistical metrics.
"""

from typing import Optional
from pydantic import BaseModel, Field
from app.graph.models import AssetNode, CommunicationEdge


class Position(BaseModel):
    x: float
    y: float


class AssetNodeSchema(AssetNode):
    """
    Asset node representation returned by the API, including coordinates for layout.
    """
    x: float = 0.0
    y: float = 0.0
    position: Position = Field(default_factory=lambda: Position(x=0.0, y=0.0))


class CommunicationEdgeSchema(CommunicationEdge):
    """
    Communication edge representation returned by the API.
    """
    id: Optional[str] = None  # Optional unique identifier for React Flow: "source-target-protocol"


class GraphSchema(BaseModel):
    """
    Schema for the complete communication graph.
    """
    nodes: list[AssetNodeSchema]
    edges: list[CommunicationEdgeSchema]


class GraphBuildResponse(BaseModel):
    """
    Response payload for the graph build action.
    """
    message: str
    node_count: int
    edge_count: int
    warnings: list[str]


class GraphStatisticsSchema(BaseModel):
    """
    Comprehensive metrics and structural analysis of the communication graph.
    """
    node_count: int
    edge_count: int
    density: float
    average_degree: float
    connected_components_count: int
    max_depth: int
    max_chain_length: int
    circular_dependencies: list[list[str]]
    isolated_nodes: list[str]
    root_nodes: list[str]
    leaf_nodes: list[str]
    bridge_nodes: list[str]
    warnings: list[str]
