import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  InputAdornment,
  Drawer,
  IconButton,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useTheme,
  alpha,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  AccountTree as GraphIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Terminal as TerminalIcon,
  Dns as DnsIcon,
  Lan as LanIcon,
  SettingsInputComponent as PortIcon,
  VpnKey as VpnKeyIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Computer as ComputerIcon,
  BubbleChart as ForceIcon,
  ViewWeek as TieredIcon,
  Hub as FreeformIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import axiosClient from '../api/axiosClient';
import ForceGraph from '../components/charts/ForceGraph';
import TopologicalView from '../components/charts/TopologicalView';
import { usePipeline } from '../context/PipelineContext';
import ExecutionScreen from '../components/ui/ExecutionScreen';

function DependencyGraph() {
  const theme = useTheme();
  const { pipelineState, updateStepStatus } = usePipeline();

  // State Management
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buildLoading, setBuildLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('freeform'); // 'freeform', 'topological', 'force'
  
  // Node Drawer state
  const [selectedNode, setSelectedNode] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Export menu anchor
  const [exportAnchorEl, setExportAnchorEl] = useState(null);
  const isExportMenuOpen = Boolean(exportAnchorEl);

  // Fetch Graph Data and Statistics
  const loadGraphData = async (triggerBuild = false) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (triggerBuild) {
        setBuildLoading(true);
        await axiosClient.post('/graph/build');
        setBuildLoading(false);
      }

      // Fetch Graph Structure and Statistics in parallel
      const [graphRes, statsRes] = await Promise.all([
        axiosClient.get('/graph'),
        axiosClient.get('/graph/statistics'),
      ]);

      const graphData = graphRes.data;
      const statsData = statsRes.data;

      // Map backend nodes to React Flow format
      const rfNodes = graphData.nodes.map((node) => {
        const isCritical = node.criticality === 'critical';
        const isLegacy = node.legacy;
        
        return {
          id: node.id,
          position: { x: node.x, y: node.y },
          data: {
            label: node.name,
            type: node.type,
            hostname: node.hostname,
            ip_address: node.ip_address,
            criticality: node.criticality,
            legacy: node.legacy,
            operating_system: node.operating_system,
            discovery_source: node.discovery_source,
            status: node.status,
            metadata: node.metadata,
          },
          // Custom styles satisfying SOC theme (sharp corners, no gradients)
          style: {
            background: '#201A10',
            color: '#FFFFFF',
            border: `1.5px solid ${
              isCritical ? '#EF4444' : isLegacy ? '#F59E0B' : 'rgba(180, 120, 70, 0.25)'
            }`,
            borderRadius: 10,
            padding: '12px',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '13px',
            minWidth: '160px',
            boxShadow: 'none',
          },
        };
      });

      // Map backend edges to React Flow format
      const rfEdges = graphData.edges.map((edge) => {
        const isTls = edge.tls_enabled;
        return {
          id: edge.id || `${edge.source}-${edge.target}-${edge.protocol}`,
          source: edge.source,
          target: edge.target,
          label: `${edge.protocol}${edge.port ? `:${edge.port}` : ''}`,
          type: 'smoothstep',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isTls ? '#CE9126' : '#C9955F',
            width: 15,
            height: 15,
          },
          style: {
            stroke: isTls ? '#CE9126' : '#C9955F',
            strokeWidth: 2,
          },
          labelStyle: {
            fill: '#9C9689',
            fontSize: 10,
            fontWeight: 600,
            fontFamily: '"JetBrains Mono", monospace',
          },
          labelBgStyle: {
            fill: '#28221B',
            fillOpacity: 0.9,
          },
          data: edge,
        };
      });

      setNodes(rfNodes);
      setEdges(rfEdges);
      setStatistics(statsData);
    } catch (err) {
      console.error('Error loading graph data:', err);
      setErrorMessage(
        err.response?.data?.detail || 
        err.message || 
        'Failed to fetch enterprise communication graph.'
      );
    } finally {
      setLoading(false);
      setBuildLoading(false);
    }
  };

  useEffect(() => {
    const checkCacheAndFetch = async () => {
      try {
        const res = await axiosClient.get('/graph');
        if (res.data && res.data.nodes && res.data.nodes.length > 0) {
          updateStepStatus('dependencyGraph', 'completed');
          loadGraphData(false);
        } else {
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    };

    if (pipelineState.dependencyGraph === 'completed') {
      loadGraphData(true);
    } else {
      checkCacheAndFetch();
    }
  }, [pipelineState.dependencyGraph]);

  // Rebuild Graph handler
  const handleRebuild = () => {
    loadGraphData(true);
  };

  // Node Search Filter and Highlight
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) {
      return nodes.map(n => ({
        ...n,
        style: { ...n.style, opacity: 1 }
      }));
    }
    
    const query = searchQuery.toLowerCase().trim();
    return nodes.map((node) => {
      const match =
        node.id.toLowerCase().includes(query) ||
        node.data.label.toLowerCase().includes(query) ||
        (node.data.hostname || '').toLowerCase().includes(query) ||
        (node.data.ip_address || '').toLowerCase().includes(query) ||
        node.data.type.toLowerCase().includes(query);

      return {
        ...node,
        style: {
          ...node.style,
          opacity: match ? 1 : 0.25,
          border: match 
            ? `2px solid #CE9126` 
            : node.style.border,
        },
      };
    });
  }, [searchQuery, nodes, theme]);

  // Handle Node Click
  const handleNodeClick = useCallback((event, node) => {
    const nodeId = node.id;
    const nodeData = node.data || node; // D3 nodes flat-map directly

    // Find all incoming and outgoing connections
    const incoming = edges
      .filter((e) => e.target === nodeId)
      .map((e) => ({
        nodeId: e.source,
        name: nodes.find((n) => n.id === e.source)?.data.label || e.source,
        protocol: e.data?.protocol,
        port: e.data?.port,
        tls: e.data?.tls_enabled,
      }));

    const outgoing = edges
      .filter((e) => e.source === nodeId)
      .map((e) => ({
        nodeId: e.target,
        name: nodes.find((n) => n.id === e.target)?.data.label || e.target,
        protocol: e.data?.protocol,
        port: e.data?.port,
        tls: e.data?.tls_enabled,
      }));

    setSelectedNode({
      id: nodeId,
      ...nodeData,
      incoming,
      outgoing,
    });
    setDrawerOpen(true);
  }, [nodes, edges]);

  // Export handlers
  const handleExportClick = (event) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportClose = () => {
    setExportAnchorEl(null);
  };

  const triggerExport = async (format) => {
    handleExportClose();
    try {
      const response = await axiosClient.get(`/graph/export/${format}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const fileNames = {
        json: 'nexus_communication_graph.json',
        graphml: 'nexus_communication_graph.graphml',
        png: 'nexus_communication_graph.png',
      };
      
      link.setAttribute('download', fileNames[format]);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(`Export to ${format} failed:`, err);
      setErrorMessage(`Failed to export graph to ${format.toUpperCase()}`);
    }
  };

  // Stats Card data helper
  const statsCards = useMemo(() => {
    if (!statistics) return [];
    const criticalCount = statistics.root_nodes.filter(id => {
      const node = nodes.find(n => n.id === id);
      return node?.data?.criticality === 'critical';
    }).length || statistics.warnings.filter(w => w.includes('critical')).length || 0;

    return [
      { label: 'Total Nodes', value: statistics.node_count, color: '#C9955F' },
      { label: 'Total Connections', value: statistics.edge_count, color: '#CE9126' },
      { label: 'Critical Assets', value: criticalCount, color: '#EF4444' },
      { label: 'Root Systems', value: statistics.root_nodes.length, color: '#10B981' },
      { label: 'Leaf Systems', value: statistics.leaf_nodes.length, color: '#9C9689' },
      { label: 'Disconnected Systems', value: statistics.isolated_nodes.length, color: '#F59E0B' },
      { label: 'Circular Loops', value: statistics.circular_dependencies.length, color: '#EF4444' },
    ];
  }, [statistics, nodes]);

  // Handle drawer node click (allows jumping to dependencies in the drawer)
  const handleDrawerNodeClick = (nodeId) => {
    const rfNode = nodes.find((n) => n.id === nodeId);
    if (rfNode) {
      handleNodeClick(null, rfNode);
    }
  };

  const handleViewChange = (event, newView) => {
    if (newView !== null) {
      setActiveView(newView);
    }
  };

  return (
    <ExecutionScreen
      moduleKey="dependencyGraph"
      title="Communication Graph Engine"
      subtitle="Construct, analyze, and inspect communication topologies and cryptographic dependency warnings."
      duration={4000}
      buttonLabel="Build Dependency Graph"
      runSteps={[
        'Scanning Asset Registry...',
        'Tracing Network Packets...',
        'Mapping Host to Host Connections...',
        'Extracting Protocol Dependencies...',
        'Resolving Circular Routing Paths...',
        'Generating Interactive Topology Map...'
      ]}
      assetCount={14}
    >
      <Box id="page-dependency-graph" sx={{ py: 1.5, display: 'flex', flexDirection: 'column', gap: 3.5 }}>
        
        {/* Header Panel */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <GraphIcon sx={{ color: '#CE9126', fontSize: 28 }} />
              <Typography variant="h2" component="h1" className="heading-gradient">
                Communication Graph Engine
              </Typography>
            </Box>
            <Typography variant="subtitle1">
              Construct, analyze, and inspect communication topologies and cryptographic dependency warnings.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRebuild}
              disabled={buildLoading || loading}
              size="small"
            >
              {buildLoading ? 'Rebuilding...' : 'Rebuild Graph'}
            </Button>

            <Button
              variant="contained"
              color="primary"
              startIcon={<DownloadIcon />}
              onClick={handleExportClick}
              disabled={loading}
              size="small"
            >
              Export
            </Button>
            <Menu
              anchorEl={exportAnchorEl}
              open={isExportMenuOpen}
              onClose={handleExportClose}
              disableScrollLock
            >
              <MenuItem onClick={() => triggerExport('json')}>Export as JSON</MenuItem>
              <MenuItem onClick={() => triggerExport('graphml')}>Export as GraphML</MenuItem>
              <MenuItem onClick={() => triggerExport('png')}>Export as PNG</MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* Error display */}
        {errorMessage && (
          <Alert severity="error" sx={{ borderRadius: '10px' }} onClose={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        )}

        {loading && !buildLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <CircularProgress color="primary" />
          </Box>
        ) : (
          <>
            {/* Statistics Grid */}
            <Grid container spacing={2}>
              {statsCards.map((card, index) => (
                <Grid size={{ xs: 6, sm: 4, md: 3, lg: 1.71 }} key={index}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
                      <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                        {card.label}
                      </Typography>
                      <Typography variant="h2" sx={{ mt: 1, color: card.color, fontFamily: '"JetBrains Mono", monospace', fontSize: '1.75rem', fontWeight: 700 }}>
                        {card.value}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
   
            {/* Core Layout Panel */}
            <Grid container spacing={3.5}>
              {/* Graph Canvas */}
              <Grid size={{ xs: 12, lg: 9 }}>
                <Card sx={{ height: { xs: 'auto', md: '380px' }, display: 'flex', flexDirection: 'column' }}>
                  {/* Canvas Toolbar */}
                  <Box
                    sx={{
                      p: 2,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: alpha(theme.palette.background.paper, 0.5),
                      flexWrap: 'wrap',
                      gap: 1.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: 'text.primary' }}>
                        TOPOLOGY VIEW
                      </Typography>

                      <ToggleButtonGroup
                        value={activeView}
                        exclusive
                        onChange={handleViewChange}
                        aria-label="graph layout view selector"
                        size="small"
                        sx={{ height: 28 }}
                      >
                        <ToggleButton value="freeform" aria-label="freeform layout" title="Freeform Coordinates">
                          <FreeformIcon sx={{ fontSize: 16, mr: 0.5 }} />
                          <Typography sx={{ fontSize: 10, fontWeight: 600 }}>Freeform</Typography>
                        </ToggleButton>
                        <ToggleButton value="topological" aria-label="tiered layout" title="Tiered Topological Columns">
                          <TieredIcon sx={{ fontSize: 16, mr: 0.5 }} />
                          <Typography sx={{ fontSize: 10, fontWeight: 600 }}>Tiered</Typography>
                        </ToggleButton>
                        <ToggleButton value="force" aria-label="force layout" title="D3 Force-Directed Map">
                          <ForceIcon sx={{ fontSize: 16, mr: 0.5 }} />
                          <Typography sx={{ fontSize: 10, fontWeight: 600 }}>Interactive Force</Typography>
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                    
                    <TextField
                      size="small"
                      placeholder="Search systems..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      sx={{ width: 220 }}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon sx={{ fontSize: 18 }} />
                            </InputAdornment>
                          ),
                          endAdornment: searchQuery && (
                            <InputAdornment position="end">
                              <IconButton size="small" onClick={() => setSearchQuery('')}>
                                <CloseIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </InputAdornment>
                          )
                        }
                      }}
                    />
                  </Box>

                   {/* Graph View Container */}
                  <Box sx={{ flexGrow: 1, position: 'relative', width: '100%', height: '100%', background: '#0D0B09', overflow: 'hidden' }}>
                    {nodes.length === 0 && !loading ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2, color: 'text.secondary' }}>
                        <GraphIcon sx={{ fontSize: 48, color: 'rgba(180, 120, 70, 0.3)' }} />
                        <Typography variant="body1">No graph generated.</Typography>
                      </Box>
                    ) : (
                      <>
                        {activeView === 'freeform' && (
                          <ReactFlow
                            nodes={filteredNodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onNodeClick={handleNodeClick}
                            fitView
                            minZoom={0.2}
                            maxZoom={2}
                          >
                            <Controls showInteractive={false} />
                            <MiniMap
                              style={{ background: '#201A10', border: `1px solid ${theme.palette.divider}`, borderRadius: 10 }}
                              nodeColor={(node) => {
                                if (node.data?.criticality === 'critical') return '#EF4444';
                                if (node.data?.legacy) return '#F59E0B';
                                return '#C9955F';
                              }}
                              maskColor="rgba(13, 11, 9, 0.7)"
                            />
                            <Background color="rgba(180, 120, 70, 0.15)" gap={16} />
                          </ReactFlow>
                        )}

                        {activeView === 'topological' && (
                          <TopologicalView
                            nodes={filteredNodes}
                            edges={edges}
                            onNodeClick={handleNodeClick}
                            selectedNodeId={selectedNode?.id}
                          />
                        )}

                        {activeView === 'force' && (
                          <ForceGraph
                            nodes={filteredNodes}
                            edges={edges}
                            onNodeClick={handleNodeClick}
                            selectedNodeId={selectedNode?.id}
                          />
                        )}
                      </>
                    )}
                  </Box>
                </Card>
              </Grid>

              {/* Health warnings and analysis */}
              <Grid size={{ xs: 12, lg: 3 }}>
                <Card sx={{ height: { xs: 'auto', md: '380px' }, display: 'flex', flexDirection: 'column' }}>
                  <Box
                    sx={{
                      p: 2,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      backgroundColor: alpha(theme.palette.background.paper, 0.5),
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, color: 'text.primary' }}>
                      GRAPH HEALTH ALERTS
                    </Typography>
                  </Box>
                  
                  <Box sx={{ p: 2, overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {statistics && statistics.warnings.length > 0 ? (
                      statistics.warnings.map((warning, idx) => {
                        const isError = warning.toLowerCase().includes('circular') || warning.toLowerCase().includes('missing');
                        return (
                          <Alert
                            key={idx}
                            severity={isError ? "error" : "warning"}
                            variant="outlined"
                            sx={{ 
                              borderLeftWidth: 3, 
                              borderColor: isError ? 'error.main' : 'warning.main',
                              '& .MuiAlert-icon': { alignSelf: 'center' }
                            }}
                          >
                            <Typography variant="body2" sx={{ fontSize: '11px', fontFamily: '"JetBrains Mono", monospace', wordBreak: 'break-word', color: 'text.secondary' }}>
                              {warning}
                            </Typography>
                          </Alert>
                        );
                      })
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 5, textAlign: 'center' }}>
                        <CheckCircleIcon sx={{ fontSize: 44, color: '#10B981', mb: 2 }} />
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'text.primary' }}>
                          All Checks Passed
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          No circular dependencies, duplicate edges, missing targets, or isolated systems detected in the graph.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Card>
              </Grid>
            </Grid>
          </>
        )}

        {/* Asset Inspection Side Drawer */}
        <Drawer
          anchor="right"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          slotProps={{
            paper: {
              sx: { width: 480, p: 3 },
            },
          }}
        >
          {selectedNode && (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              {/* Drawer Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h4" sx={{ mb: 1, fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: 'text.primary' }}>
                    {selectedNode.label || selectedNode.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={(selectedNode.type || '').toUpperCase()}
                      size="small"
                      icon={<TerminalIcon />}
                      color="primary"
                      variant="outlined"
                      sx={{ height: 22, fontWeight: 600 }}
                    />
                    <Chip
                      label={(selectedNode.criticality || '').toUpperCase()}
                      size="small"
                      color={
                        selectedNode.criticality === 'critical'
                          ? 'error'
                          : selectedNode.criticality === 'high'
                          ? 'warning'
                          : 'info'
                      }
                      sx={{ height: 22, fontWeight: 600 }}
                    />
                    {selectedNode.legacy && (
                      <Chip label="LEGACY" size="small" color="warning" variant="filled" sx={{ height: 22, fontWeight: 600 }} />
                    )}
                  </Box>
                </Box>
                <IconButton onClick={() => setDrawerOpen(false)} size="small">
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Drawer Content */}
              <Box sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                
                {/* System Metadata Section */}
                <Box>
                  <Typography variant="overline" color="text.secondary" display="block" gutterBottom sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    System Metadata
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid size={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DnsIcon color="disabled" sx={{ fontSize: 16 }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">Hostname</Typography>
                          <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.875rem' }}>
                            {selectedNode.hostname || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid size={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LanIcon color="disabled" sx={{ fontSize: 16 }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">IP Address</Typography>
                          <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.875rem' }}>
                            {selectedNode.ip_address || 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid size={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ComputerIcon color="disabled" sx={{ fontSize: 16 }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">OS</Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>{selectedNode.operating_system || 'Unknown'}</Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid size={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <InfoIcon color="disabled" sx={{ fontSize: 16 }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">Discovery Source</Typography>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize', fontSize: '0.875rem' }}>
                            {selectedNode.discovery_source?.replace('_', ' ')}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                {/* Cryptographic Details Section */}
                <Box>
                  <Typography variant="overline" color="text.secondary" display="block" gutterBottom sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    Security & Encryption
                  </Typography>
                  <Card sx={{ mt: 1, backgroundColor: alpha(theme.palette.background.default, 0.5) }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Grid container spacing={2}>
                        <Grid size={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PortIcon sx={{ fontSize: 18, color: 'primary.light' }} />
                            <Box>
                              <Typography variant="caption" color="text.secondary">Configured Port</Typography>
                              <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.875rem' }}>
                                {selectedNode.metadata?.port || 'N/A'}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                        <Grid size={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {selectedNode.metadata?.tls_version && selectedNode.metadata?.tls_version.toLowerCase() !== 'none' ? (
                              <LockIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
                            ) : (
                              <LockOpenIcon sx={{ fontSize: 18, color: 'error.main' }} />
                            )}
                            <Box>
                              <Typography variant="caption" color="text.secondary">TLS Version</Typography>
                              <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.875rem' }}>
                                {selectedNode.metadata?.tls_version || 'None'}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                        <Grid size={12}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <VpnKeyIcon sx={{ fontSize: 18, color: 'warning.light' }} />
                            <Box>
                              <Typography variant="caption" color="text.secondary">Active Cryptographic Algorithm</Typography>
                              <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', wordBreak: 'break-all', fontSize: '0.875rem' }}>
                                {selectedNode.metadata?.crypto_algorithm || selectedNode.metadata?.cipher_suite || 'none'}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Box>

                {/* Connections Panel */}
                <Box>
                  <Typography variant="overline" color="text.secondary" display="block" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    Network Dependencies
                  </Typography>
                  
                  {/* Outgoing Connections (Dependencies) */}
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontFamily: '"JetBrains Mono", monospace', fontSize: '0.875rem', fontWeight: 600, color: 'text.primary' }}>
                    OUTGOING CONNECTIONS (DEPENDS ON)
                  </Typography>
                  {selectedNode.outgoing && selectedNode.outgoing.length > 0 ? (
                    <List dense sx={{ border: `1px solid ${theme.palette.divider}`, backgroundColor: '#201A10', p: 0, borderRadius: 1 }}>
                      {selectedNode.outgoing.map((out, idx) => (
                        <ListItem
                          key={idx}
                          sx={{
                            borderBottom: idx < selectedNode.outgoing.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: 'rgba(201, 149, 95, 0.08)' },
                          }}
                          onClick={() => handleDrawerNodeClick(out.nodeId)}
                        >
                          <ListItemText
                            primary={out.name}
                            secondary={`Protocol: ${out.protocol} | Port: ${out.port || 'N/A'} | TLS: ${out.tls ? 'YES' : 'NO'}`}
                            slotProps={{
                              primary: { variant: 'body2', sx: { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.875rem' } },
                              secondary: { sx: { fontSize: '11px' } },
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.875rem' }}>
                      No dependencies specified.
                    </Typography>
                  )}

                  {/* Incoming Connections */}
                  <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, fontFamily: '"JetBrains Mono", monospace', fontSize: '0.875rem', fontWeight: 600, color: 'text.primary' }}>
                    INCOMING CONNECTIONS (REQUIRED BY)
                  </Typography>
                  {selectedNode.incoming && selectedNode.incoming.length > 0 ? (
                    <List dense sx={{ border: `1px solid ${theme.palette.divider}`, backgroundColor: '#201A10', p: 0, borderRadius: 1 }}>
                      {selectedNode.incoming.map((inc, idx) => (
                        <ListItem
                          key={idx}
                          sx={{
                            borderBottom: idx < selectedNode.incoming.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: 'rgba(201, 149, 95, 0.08)' },
                          }}
                          onClick={() => handleDrawerNodeClick(inc.nodeId)}
                        >
                          <ListItemText
                            primary={inc.name}
                            secondary={`Protocol: ${inc.protocol} | Port: ${inc.port || 'N/A'} | TLS: ${inc.tls ? 'YES' : 'NO'}`}
                            slotProps={{
                              primary: { variant: 'body2', sx: { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.875rem' } },
                              secondary: { sx: { fontSize: '11px' } },
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.875rem' }}>
                      No incoming connections detected.
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </Drawer>
      </Box>
    </ExecutionScreen>
  );
}

export default DependencyGraph;
