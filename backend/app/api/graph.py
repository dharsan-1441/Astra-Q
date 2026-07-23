"""
API router for Phase 3 — Enterprise Communication Graph Engine.
Exposes endpoints for building the graph, querying its nodes, edges,
and statistics, and exporting to JSON, GraphML, and PNG formats.
"""

import json
import logging
from fastapi import APIRouter, HTTPException, Response

from app.graph.builder import GraphBuilder, get_graph_store
from app.graph.analyzer import GraphAnalyzer
from app.graph.exporter import GraphExporter
from app.graph.exceptions import GraphError, ExportError
from app.graph.schemas import (
    GraphSchema,
    GraphBuildResponse,
    GraphStatisticsSchema,
    AssetNodeSchema,
    CommunicationEdgeSchema,
)

logger = logging.getLogger("pqc_engine.api.graph")
router = APIRouter()


def _ensure_graph_built() -> None:
    """Helper to automatically build the graph if it is currently empty but inventory has assets."""
    store = get_graph_store()
    from app.discovery.inventory import get_inventory
    
    # If graph is empty, but inventory is not, auto-build
    if len(store.get_nodes()) == 0 and get_inventory().count() > 0:
        logger.info("Graph is empty but inventory has assets. Triggering auto-build.")
        try:
            GraphBuilder(store).build()
        except Exception as exc:
            logger.error("Failed to auto-build graph: %s", exc)


# ---------------------------------------------------------------------------
# POST /graph/build
# ---------------------------------------------------------------------------

@router.post(
    "/graph/build", 
    response_model=GraphBuildResponse,
    summary="Build communication graph from normalized inventory"
)
async def build_graph():
    """
    Constructs the communication graph by analyzing relationships between discovered assets.
    """
    try:
        builder = GraphBuilder()
        result = builder.build()
        
        return GraphBuildResponse(
            message=f"Successfully built communication graph with {result['node_count']} nodes and {result['edge_count']} connections.",
            node_count=result["node_count"],
            edge_count=result["edge_count"],
            warnings=result["warnings"],
        )
    except GraphError as exc:
        logger.error("Failed to build graph: %s", exc.message)
        raise HTTPException(status_code=500, detail=exc.message)
    except Exception as exc:
        logger.error("Unexpected error building graph: %s", exc)
        raise HTTPException(status_code=500, detail=f"Unexpected error building graph: {exc}")


# ---------------------------------------------------------------------------
# GET /graph
# ---------------------------------------------------------------------------

@router.get(
    "/graph", 
    response_model=GraphSchema,
    summary="Get the complete communication graph"
)
async def get_graph():
    """
    Retrieves the complete communication graph including node coordinates for layout.
    """
    _ensure_graph_built()
    try:
        exporter = GraphExporter()
        data = exporter.export_json()
        return data
    except ExportError as exc:
        raise HTTPException(status_code=500, detail=exc.message)


# ---------------------------------------------------------------------------
# GET /graph/statistics
# ---------------------------------------------------------------------------

@router.get(
    "/graph/statistics", 
    response_model=GraphStatisticsSchema,
    summary="Get communication graph statistics and analysis"
)
async def get_graph_statistics():
    """
    Computes graph metrics and returns structural statistics and health warnings.
    """
    _ensure_graph_built()
    try:
        analyzer = GraphAnalyzer()
        stats = analyzer.analyze()
        return stats
    except Exception as exc:
        logger.error("Failed to analyze graph: %s", exc)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")


# ---------------------------------------------------------------------------
# GET /graph/nodes
# ---------------------------------------------------------------------------

@router.get(
    "/graph/nodes", 
    response_model=list[AssetNodeSchema],
    summary="Get list of graph nodes"
)
async def get_graph_nodes():
    """
    Retrieves only the list of nodes inside the communication graph.
    """
    _ensure_graph_built()
    try:
        exporter = GraphExporter()
        data = exporter.export_json()
        return data["nodes"]
    except ExportError as exc:
        raise HTTPException(status_code=500, detail=exc.message)


# ---------------------------------------------------------------------------
# GET /graph/edges
# ---------------------------------------------------------------------------

@router.get(
    "/graph/edges", 
    response_model=list[CommunicationEdgeSchema],
    summary="Get list of communication edges"
)
async def get_graph_edges():
    """
    Retrieves only the list of communication edges inside the communication graph.
    """
    _ensure_graph_built()
    try:
        exporter = GraphExporter()
        data = exporter.export_json()
        return data["edges"]
    except ExportError as exc:
        raise HTTPException(status_code=500, detail=exc.message)


# ---------------------------------------------------------------------------
# GET /graph/export/json
# ---------------------------------------------------------------------------

@router.get(
    "/graph/export/json", 
    summary="Export communication graph as a JSON file download"
)
async def export_graph_json():
    """
    Exports the communication graph as a downloadable JSON file.
    """
    _ensure_graph_built()
    try:
        exporter = GraphExporter()
        data = exporter.export_json()
        json_content = json.dumps(data, indent=2)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={
                "Content-Disposition": "attachment; filename=nexus_communication_graph.json",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except ExportError as exc:
        raise HTTPException(status_code=500, detail=exc.message)


# ---------------------------------------------------------------------------
# GET /graph/export/graphml
# ---------------------------------------------------------------------------

@router.get(
    "/graph/export/graphml", 
    summary="Export communication graph as a GraphML file download"
)
async def export_graph_graphml():
    """
    Exports the communication graph in GraphML format.
    """
    _ensure_graph_built()
    try:
        exporter = GraphExporter()
        xml_content = exporter.export_graphml()
        return Response(
            content=xml_content,
            media_type="application/xml",
            headers={
                "Content-Disposition": "attachment; filename=nexus_communication_graph.graphml",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except ExportError as exc:
        raise HTTPException(status_code=500, detail=exc.message)


# ---------------------------------------------------------------------------
# GET /graph/export/png
# ---------------------------------------------------------------------------

@router.get(
    "/graph/export/png", 
    summary="Export communication graph as a PNG image"
)
async def export_graph_png():
    """
    Renders and exports the communication graph as a PNG image.
    """
    _ensure_graph_built()
    try:
        exporter = GraphExporter()
        png_bytes = exporter.export_png()
        return Response(
            content=png_bytes,
            media_type="image/png",
            headers={
                "Content-Disposition": "inline; filename=nexus_communication_graph.png"
            }
        )
    except ExportError as exc:
        raise HTTPException(status_code=500, detail=exc.message)
