import React, { useEffect, useRef, memo } from 'react';
import * as d3 from 'd3';
import { useTheme, alpha } from '@mui/material';

const ForceGraph = memo(function ForceGraph({
  nodes = [],
  edges = [],
  onNodeClick = () => {},
  selectedNodeId = null,
}) {
  const svgRef = useRef(null);
  const theme = useTheme();

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous drawing

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 550;

    // Deep copy data for D3 to mutate safely
    const d3Nodes = nodes.map((d) => ({
      id: d.id,
      name: d.data.label,
      type: d.data.type,
      criticality: d.data.criticality,
      legacy: d.data.legacy,
      status: d.data.status,
      ...d, // keep other properties
    }));

    const d3Edges = edges.map((d) => ({
      id: d.id,
      source: d.source,
      target: d.target,
      label: d.label,
      tls_enabled: d.data?.tls_enabled,
      ...d,
    }));

    // Setup main container group for zoom/pan
    const container = svg.append('g').attr('class', 'graph-container');

    // Setup zoom
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Force simulation setup
    const simulation = d3
      .forceSimulation(d3Nodes)
      .force(
        'link',
        d3
          .forceLink(d3Edges)
          .id((d) => d.id)
          .distance(120)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(45));

    // Arrow markers for links
    svg
      .append('defs')
      .selectAll('marker')
      .data(['arrow-normal', 'arrow-tls'])
      .enter()
      .append('marker')
      .attr('id', (d) => d)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22) // positioning offset from node center
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', (d) =>
        d === 'arrow-tls' ? theme.palette.secondary.main : theme.palette.primary.main
      );

    // Draw link elements
    const link = container
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(d3Edges)
      .enter()
      .append('line')
      .attr('stroke', (d) =>
        d.tls_enabled ? theme.palette.secondary.main : theme.palette.primary.main
      )
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', (d) => (d.tls_enabled ? '4,4' : 'none'))
      .attr('marker-end', (d) =>
        d.tls_enabled ? 'url(#arrow-tls)' : 'url(#arrow-normal)'
      );

    // Draw link label texts
    const linkLabel = container
      .append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(d3Edges)
      .enter()
      .append('text')
      .attr('fill', theme.palette.text.disabled)
      .attr('font-size', '8px')
      .attr('font-family', '"JetBrains Mono", monospace')
      .attr('text-anchor', 'middle')
      .text((d) => d.label || '');

    // Draw node groups
    const node = container
      .append('g')
      .attr('class', 'nodes')
      .selectAll('.node-group')
      .data(d3Nodes)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        onNodeClick(event, d);
      })
      .call(
        d3
          .drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

    // Glow filter for selected node
    const glowFilter = svg
      .append('defs')
      .append('filter')
      .attr('id', 'selected-glow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');

    glowFilter
      .append('feGaussianBlur')
      .attr('stdDeviation', 4)
      .attr('result', 'blur');
    glowFilter
      .append('feComposite')
      .attr('in', 'SourceGraphic')
      .attr('in2', 'blur')
      .attr('operator', 'over');

    // Draw main circle
    node
      .append('circle')
      .attr('r', 16)
      .attr('fill', theme.palette.background.paper)
      .attr('stroke', (d) => {
        if (d.id === selectedNodeId) return theme.palette.warning.main;
        if (d.criticality === 'critical') return theme.palette.error.main;
        if (d.legacy) return theme.palette.warning.main;
        return theme.palette.primary.main;
      })
      .attr('stroke-width', (d) => (d.id === selectedNodeId ? 3 : 2))
      .style('filter', (d) => (d.id === selectedNodeId ? 'url(#selected-glow)' : 'none'));

    // Inner indicator circle (pulsing for critical)
    node
      .filter((d) => d.criticality === 'critical')
      .append('circle')
      .attr('r', 6)
      .attr('fill', theme.palette.error.main)
      .style('animation', 'pulse 1.5s infinite alternate')
      .append('animate')
      .attr('attributeName', 'opacity')
      .attr('values', '0.4;1;0.4')
      .attr('dur', '1.5s')
      .attr('repeatCount', 'indefinite');

    // Draw labels
    node
      .append('text')
      .attr('dy', 26)
      .attr('text-anchor', 'middle')
      .attr('fill', theme.palette.text.primary)
      .attr('font-size', '10px')
      .attr('font-weight', 600)
      .text((d) => d.name);

    // Draw type sub-labels
    node
      .append('text')
      .attr('dy', 37)
      .attr('text-anchor', 'middle')
      .attr('fill', theme.palette.text.secondary)
      .attr('font-size', '8px')
      .attr('font-family', '"JetBrains Mono", monospace')
      .text((d) => d.type.toUpperCase());

    // Update coordinates on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);

      linkLabel
        .attr('x', (d) => (d.source.x + d.target.x) / 2)
        .attr('y', (d) => (d.source.y + d.target.y) / 2 - 4);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    // Drag helper functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Default Zoom to fit
    setTimeout(() => {
      const bounds = container.node().getBBox();
      if (bounds.width > 0 && bounds.height > 0) {
        const dx = bounds.width;
        const dy = bounds.height;
        const x = bounds.x + dx / 2;
        const y = bounds.y + dy / 2;
        const scale = Math.max(0.3, Math.min(2, 0.85 / Math.max(dx / width, dy / height)));
        const translate = [width / 2 - scale * x, height / 2 - scale * y];

        svg
          .transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
      }
    }, 100);

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, selectedNodeId, theme]);

  return (
    <svg
      ref={svgRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        backgroundColor: '#0a0e1a',
      }}
    />
  );
});

export default ForceGraph;
