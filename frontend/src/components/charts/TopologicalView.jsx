import React, { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  MarkerType,
} from '@xyflow/react';
import { useTheme, alpha } from '@mui/material';
import '@xyflow/react/dist/style.css';

function TopologicalView({
  nodes = [],
  edges = [],
  onNodeClick = () => {},
  selectedNodeId = null,
}) {
  const theme = useTheme();

  // Compute layered topological coordinates for nodes
  const layeredNodes = useMemo(() => {
    // 1. Group nodes by architectural tier
    const tiers = {
      client: [],      // Tier 1: Client / Web
      gateway: [],     // Tier 1.5: Gateways
      service: [],     // Tier 2: App Services
      server: [],      // Tier 2: Servers
      database: [],    // Tier 3: Database / Vault
      hsm: [],         // Tier 3: Security Modules
      other: [],       // Tier 4: Unknown / Misc
    };

    nodes.forEach((node) => {
      const type = (node.data?.type || '').toLowerCase();
      if (type.includes('client') || type.includes('web') || type.includes('browser')) {
        tiers.client.push(node);
      } else if (type.includes('gateway') || type.includes('proxy') || type.includes('load')) {
        tiers.gateway.push(node);
      } else if (type.includes('db') || type.includes('database') || type.includes('sql') || type.includes('redis') || type.includes('mongo')) {
        tiers.database.push(node);
      } else if (type.includes('hsm') || type.includes('vault') || type.includes('kms')) {
        tiers.hsm.push(node);
      } else if (type.includes('service') || type.includes('api') || type.includes('app')) {
        tiers.service.push(node);
      } else if (type.includes('server')) {
        tiers.server.push(node);
      } else {
        tiers.other.push(node);
      }
    });

    // Arrange tiers in columns from left to right
    const tierColumns = [
      [...tiers.client],
      [...tiers.gateway],
      [...tiers.service, ...tiers.server],
      [...tiers.database, ...tiers.hsm],
      [...tiers.other],
    ].filter((col) => col.length > 0);

    const columnWidth = 240;
    const rowHeight = 100;
    const computedNodes = [];

    tierColumns.forEach((colNodes, colIndex) => {
      const colX = colIndex * columnWidth;
      const totalColHeight = (colNodes.length - 1) * rowHeight;
      const colYOffset = -totalColHeight / 2; // Center columns vertically

      colNodes.forEach((node, rowIndex) => {
        const isSelected = node.id === selectedNodeId;
        const isCritical = node.data?.criticality === 'critical';
        const isLegacy = node.data?.legacy;

        computedNodes.push({
          ...node,
          position: {
            x: colX,
            y: 250 + colYOffset + (rowIndex * rowHeight),
          },
          style: {
            ...node.style,
            background: '#121824',
            color: '#f8fafc',
            border: `1.5px solid ${
              isSelected
                ? theme.palette.warning.main
                : isCritical
                ? theme.palette.error.main
                : isLegacy
                ? theme.palette.warning.main
                : theme.palette.divider
            }`,
            borderRadius: 2,
            padding: '10px 14px',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '11px',
            minWidth: '170px',
            boxShadow: isSelected ? `0 0 10px ${alpha(theme.palette.warning.main, 0.4)}` : 'none',
          },
        });
      });
    });

    return computedNodes;
  }, [nodes, selectedNodeId, theme]);

  // Style edges consistently
  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      const isTls = edge.data?.tls_enabled || edge.tls_enabled;
      return {
        ...edge,
        type: 'smoothstep',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isTls ? theme.palette.secondary.main : theme.palette.primary.main,
          width: 14,
          height: 14,
        },
        style: {
          stroke: isTls ? theme.palette.secondary.main : theme.palette.primary.main,
          strokeWidth: 2,
        },
        labelStyle: {
          fill: theme.palette.text.disabled,
          fontSize: 8,
          fontWeight: 600,
          fontFamily: '"JetBrains Mono", monospace',
        },
        labelBgStyle: {
          fill: '#121824',
          fillOpacity: 0.9,
        },
      };
    });
  }, [edges, theme]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={layeredNodes}
        edges={styledEdges}
        onNodeClick={onNodeClick}
        fitView
        minZoom={0.2}
        maxZoom={2}
      >
        <Controls showInteractive={false} />
        <MiniMap
          style={{ background: '#121824', border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}
          nodeColor={(node) => {
            if (node.data?.criticality === 'critical') return theme.palette.error.main;
            if (node.data?.legacy) return theme.palette.warning.main;
            return theme.palette.primary.main;
          }}
          maskColor="rgba(10, 14, 26, 0.7)"
        />
        <Background color="#334155" gap={16} />
      </ReactFlow>
    </div>
  );
}

export default TopologicalView;
