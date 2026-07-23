import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Divider,
  Alert,
  Chip,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  useTheme,
  alpha,
  LinearProgress,
} from '@mui/material';
import {
  FactCheck as ReadinessIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  WarningAmber as WarningIcon,
  CheckCircle as CheckedIcon,
  ArrowForward as ActionIcon,
  Dns as HardwareIcon,
  Code as SoftwareIcon,
  Security as CertificateIcon,
  VpnKey as LibraryIcon,
  Lan as TlsIcon,
  Speed as BenchmarkIcon,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { readinessService } from '../api/services';
import GaugeChart from '../components/charts/GaugeChart';
import ChartWrapper from '../components/charts/ChartWrapper';
import EmptyState from '../components/ui/EmptyState';
import { usePipeline } from '../context/PipelineContext';
import ExecutionScreen from '../components/ui/ExecutionScreen';

const CLASSIFICATION_COLORS = {
  'PQC Ready': '#10B981',       // Success Green
  'Hybrid Ready': '#C9955F',     // Warm Gold/Bronze
  'Upgrade Required': '#F59E0B', // Warning Amber
  'Legacy Blocker': '#EF4444',   // Error Red
  'Unsupported': '#5C564B',      // Dark text disabled
};

const tooltipStyle = {
  backgroundColor: '#28221B',
  border: '1px solid rgba(180, 120, 70, 0.15)',
  borderRadius: 10,
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: 13,
  color: '#FFF6C8',
};

function Readiness() {
  const theme = useTheme();
  const { pipelineState, updateStepStatus, activeProfile } = usePipeline();

  // API data states
  const [assessments, setAssessments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Filters & selection state
  const [searchTerm, setSearchTerm] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const summaryRes = await readinessService.summary();
      setSummary(summaryRes.data.summary);

      const listRes = await readinessService.list();
      setAssessments(listRes.data.assessments || []);
    } catch (err) {
      console.error('Failed to load readiness details:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true);
    try {
      const analyzeRes = await readinessService.analyze(activeProfile);
      setAssessments(analyzeRes.data.assessments || []);
      
      const summaryRes = await readinessService.summary();
      setSummary(summaryRes.data.summary);
      updateStepStatus('readiness', 'completed');
    } catch (err) {
      console.error('Readiness analysis failed:', err);
      alert('Readiness assessment analysis execution failed.');
    } finally {
      setAnalyzing(false);
    }
  }, [activeProfile, updateStepStatus]);

  useEffect(() => {
    const checkCacheAndFetch = async () => {
      try {
        const listRes = await readinessService.list();
        if (listRes.data && listRes.data.assessments && listRes.data.assessments.length > 0) {
          updateStepStatus('readiness', 'completed');
          fetchData();
        }
      } catch (err) {
        console.error(err);
      }
    };

    if (pipelineState.readiness === 'completed') {
      handleAnalyze();
    } else {
      checkCacheAndFetch();
    }
  }, [pipelineState.readiness, handleAnalyze]);

  const handleRowClick = useCallback((assessment) => {
    setSelectedAsset(assessment);
    setDrawerOpen(true);
  }, []);

  // Filter and Search evaluations
  const filteredAssessments = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return (assessments || []).filter((a) => {
      const assetName = String(a?.asset_name || a?.asset_id || 'Unnamed asset').toLowerCase();
      const assetId = String(a?.asset_id || '').toLowerCase();
      const assetType = String(a?.asset_type || '').toLowerCase();

      const matchesSearch =
        assetName.includes(query) ||
        assetId.includes(query) ||
        assetType.includes(query);

      const matchesClassification =
        classificationFilter === 'ALL' || a?.classification === classificationFilter;

      const matchesType = typeFilter === 'ALL' || a?.asset_type === typeFilter;

      return matchesSearch && matchesClassification && matchesType;
    });
  }, [assessments, searchTerm, classificationFilter, typeFilter]);

  // Extract unique asset types for filter dropdown
  const assetTypes = useMemo(() => {
    return Array.from(new Set((assessments || []).map((a) => a?.asset_type).filter(Boolean)));
  }, [assessments]);

  // Prepare classification chart data
  const classChartData = useMemo(() => {
    if (!summary) return [];
    return [
      { name: 'PQC Ready', value: summary?.assets_ready ?? 0 },
      { name: 'Hybrid Ready', value: summary?.assets_requiring_hybrid ?? 0 },
      { name: 'Upgrade Required', value: summary?.assets_requiring_upgrade ?? 0 },
      { name: 'Blocked', value: summary?.blocked_assets ?? 0 },
    ].filter((item) => item.value > 0);
  }, [summary]);

  // Prepare distribution chart data
  const distChartData = useMemo(() => {
    if (!summary || !summary.readiness_distribution) return [];
    return Object.entries(summary.readiness_distribution).map(([range, count]) => ({
      range,
      count,
    }));
  }, [summary]);

  const score = summary?.enterprise_readiness_score ?? 0;

  return (
    <ExecutionScreen
      moduleKey="readiness"
      title="Readiness Assessment"
      subtitle="Engineering analysis of cryptographic migration readiness across discovered assets"
      duration={4000}
      buttonLabel="Run Readiness Assessment"
      runSteps={[
        'Evaluating Key Sizes...',
        'Calculating Algorithm Strength...',
        'Auditing TLS Implementations...',
        'Checking Hardware & Firmware compatibility...',
        'Consolidating Enterprise Readiness Scores...'
      ]}
      assetCount={14}
    >
      <Box id="page-readiness" sx={{ py: 1.5 }}>
      {/* Header section */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <ReadinessIcon sx={{ color: '#CE9126', fontSize: 28 }} />
            <Typography variant="h2" component="h1" className="heading-gradient">
              Readiness Assessment
            </Typography>
          </Box>
          <Typography variant="subtitle1">
            Engineering analysis of cryptographic migration readiness across discovered assets
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
            disabled={loading || analyzing}
            size="small"
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ReadinessIcon />}
            onClick={handleAnalyze}
            disabled={loading || analyzing}
            size="small"
          >
            {analyzing ? 'Analyzing Inventory...' : 'Recalculate Readiness'}
          </Button>
        </Box>
      </Box>

      {/* Top dashboard panels */}
      <Grid container spacing={3.5} sx={{ mb: 4 }}>
        {/* Gauge card */}
        <Grid size={{ xs: 12, md: 4 }}>
          <ChartWrapper title="Enterprise Readiness Score" subtitle={`Computed from ${assessments.length} enterprise assets`}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', pt: 2 }}>
              <GaugeChart
                value={score}
                size={160}
                strokeWidth={10}
                label="Overall"
              />
            </Box>
          </ChartWrapper>
        </Grid>

        {/* Classification distribution pie chart */}
        <Grid size={{ xs: 12, md: 4 }}>
          <ChartWrapper
            title="Classification Tiers"
            subtitle="Discovered asset compliance categories"
            isEmpty={classChartData.length === 0}
            emptyMessage="Run analysis to populate tiers"
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={classChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {classChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CLASSIFICATION_COLORS[entry.name] || '#5C564B'}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1.5, mt: 1.5 }}>
                {classChartData.map((entry) => (
                  <Box key={entry.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box
                      sx={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        bgcolor: CLASSIFICATION_COLORS[entry.name] || '#5C564B',
                      }}
                    />
                    <Typography sx={{ fontSize: '0.75rem', fontFamily: '"JetBrains Mono", monospace', color: 'text.secondary', fontWeight: 500 }}>
                      {entry.name} ({entry.value})
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </ChartWrapper>
        </Grid>

        {/* Readiness distribution bar chart */}
        <Grid size={{ xs: 12, md: 4 }}>
          <ChartWrapper
            title="Score Distribution"
            subtitle="Asset count grouped by score ranges"
            isEmpty={distChartData.length === 0}
            emptyMessage="Run analysis to populate score distribution"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distChartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(180, 120, 70, 0.1)" />
                <XAxis dataKey="range" stroke={theme.palette.text.disabled} tick={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fill: '#9C9689' }} />
                <YAxis stroke={theme.palette.text.disabled} tick={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fill: '#9C9689' }} />
                <RechartsTooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#C9955F" radius={[3, 3, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </ChartWrapper>
        </Grid>
      </Grid>

      {/* Asset Table Filters & Table */}
      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search assets by ID, name, type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <SearchIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />,
                }
              }}
              sx={{ width: 260 }}
            />

            <FormControl size="small" sx={{ width: 180 }}>
              <InputLabel>Classification</InputLabel>
              <Select
                value={classificationFilter}
                label="Classification"
                onChange={(e) => setClassificationFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Classifications</MenuItem>
                <MenuItem value="PQC Ready">PQC Ready</MenuItem>
                <MenuItem value="Hybrid Ready">Hybrid Ready</MenuItem>
                <MenuItem value="Upgrade Required">Upgrade Required</MenuItem>
                <MenuItem value="Legacy Blocker">Legacy Blocker</MenuItem>
                <MenuItem value="Unsupported">Unsupported</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ width: 180 }}>
              <InputLabel>Asset Type</InputLabel>
              <Select
                value={typeFilter}
                label="Asset Type"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="ALL">All Asset Types</MenuItem>
                {assetTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {loading ? (
            <Box sx={{ py: 3 }}>
              <LinearProgress />
            </Box>
          ) : filteredAssessments.length === 0 ? (
            <EmptyState title="No assessments found" description="Select a different filter or run a readiness analysis calculation." minHeight={200} />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Asset ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Readiness Score</TableCell>
                    <TableCell>Classification</TableCell>
                    <TableCell>Identified Issues</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAssessments.map((a) => (
                    <TableRow
                      key={a.asset_id}
                      hover
                      onClick={() => handleRowClick(a)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.9375rem' }}>
                        {a.asset_id}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.9375rem' }}>{a.asset_name}</TableCell>
                      <TableCell sx={{ fontSize: '0.9375rem', textTransform: 'uppercase' }}>{a.asset_type}</TableCell>
                      <TableCell align="right" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, fontSize: '0.9375rem' }}>
                        {a.readiness_score}%
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={a.classification}
                          sx={{
                            height: 20,
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            bgcolor: alpha(CLASSIFICATION_COLORS[a.classification] || '#5C564B', 0.08),
                            color: CLASSIFICATION_COLORS[a.classification] || '#5C564B',
                            border: `1px solid ${alpha(CLASSIFICATION_COLORS[a.classification] || '#5C564B', 0.2)}`,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.9375rem', color: a.identified_issues.length > 0 ? 'warning.light' : 'text.disabled', fontWeight: 500 }}>
                        {a.identified_issues.length > 0
                          ? `${a.identified_issues.length} Issues`
                          : 'None'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Slide-out detail drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: 550 },
              p: 3,
            },
          },
        }}
      >
        {selectedAsset && (
          <Box>
            {/* Drawer Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {selectedAsset?.asset_name || 'Unnamed asset'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem' }}>
                  {selectedAsset?.asset_id || 'unknown'} ({(selectedAsset?.asset_type || 'unknown').toUpperCase()})
                </Typography>
              </Box>
              <IconButton onClick={() => setDrawerOpen(false)} size="small">
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>

            <Divider sx={{ mb: 2.5 }} />

            {/* Score & Classification Header Card */}
            <Card
              sx={{
                mb: 3,
                borderColor: CLASSIFICATION_COLORS[selectedAsset.classification] || 'divider',
                borderLeft: '4px solid',
                borderLeftColor: CLASSIFICATION_COLORS[selectedAsset.classification] || 'transparent',
              }}
            >
              <CardContent sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Overall Classification</Typography>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ color: CLASSIFICATION_COLORS[selectedAsset.classification] }}>
                    {selectedAsset?.classification || 'Unknown'}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Readiness Score</Typography>
                  <Typography variant="h4" fontWeight="bold" color="text.primary" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {selectedAsset?.readiness_score ?? 0}%
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Identified Issues */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
                Identified Issues
              </Typography>
              {(selectedAsset?.identified_issues || []).length === 0 ? (
                <Alert
                  severity="success"
                  icon={<CheckedIcon fontSize="small" />}
                  sx={{ bgcolor: alpha(theme.palette.success.main, 0.03), color: 'success.light' }}
                >
                  No architectural or library blockers identified.
                </Alert>
              ) : (
                <List size="small" disablePadding>
                  {(selectedAsset?.identified_issues || []).map((issue, idx) => (
                    <ListItem key={idx} sx={{ px: 1.5, py: 1, border: `1px solid ${theme.palette.divider}`, mb: 1, bgcolor: 'rgba(239, 68, 68, 0.02)', borderRadius: 1 }}>
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <WarningIcon fontSize="small" sx={{ color: 'warning.light' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={issue}
                        slotProps={{ primary: { fontSize: '0.875rem', color: 'text.secondary' } }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            {/* Recommended Actions */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
                Migration Strategy &amp; Recommendations
              </Typography>
              <List size="small" disablePadding>
                {(selectedAsset?.recommended_actions || []).map((act, idx) => (
                  <ListItem key={idx} sx={{ px: 1.5, py: 1, border: `1px solid ${theme.palette.divider}`, mb: 1, bgcolor: 'rgba(201, 149, 95, 0.02)', borderRadius: 1 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <ActionIcon fontSize="small" sx={{ color: '#C9955F' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={act}
                      slotProps={{ primary: { fontSize: '0.875rem', fontWeight: 600, color: 'text.primary' } }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* Engineering Sub-statuses Grid */}
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'text.primary' }}>
              Sub-status Assessment Details
            </Typography>

            <Grid container spacing={2}>
              {/* Algorithm Status */}
              <Grid size={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <ReadinessIcon sx={{ color: '#C9955F', fontSize: 16 }} />
                      <Typography variant="caption" fontWeight="bold" sx={{ color: 'text.primary' }}>Algorithms</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      ML-KEM: {(selectedAsset?.algorithm_support?.ml_kem_support ?? false) ? 'Supported' : 'No'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      ML-DSA: {(selectedAsset?.algorithm_support?.ml_dsa_support ?? false) ? 'Supported' : 'No'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      Hybrid: {(selectedAsset?.algorithm_support?.hybrid_support ?? false) ? 'Supported' : 'No'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* TLS Status */}
              <Grid size={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <TlsIcon sx={{ color: '#C9955F', fontSize: 16 }} />
                      <Typography variant="caption" fontWeight="bold" sx={{ color: 'text.primary' }}>TLS Handshake</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      Version: {selectedAsset?.tls_status?.tls_version || 'N/A'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      PQC Cipher: {(selectedAsset?.tls_status?.pqc_cipher_availability ?? false) ? 'Yes' : 'No'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Certificate Status */}
              <Grid size={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CertificateIcon sx={{ color: '#C9955F', fontSize: 16 }} />
                      <Typography variant="caption" fontWeight="bold" sx={{ color: 'text.primary' }}>Certificates</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      RSA: {(selectedAsset?.certificate_status?.rsa_certificates ?? false) ? 'Active' : 'No'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      ECC: {(selectedAsset?.certificate_status?.ecc_certificates ?? false) ? 'Active' : 'No'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      Upgrade: {(selectedAsset?.certificate_status?.certificate_upgrade_required ?? false) ? 'Required' : 'No'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Library Status */}
              <Grid size={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <LibraryIcon sx={{ color: '#C9955F', fontSize: 16 }} />
                      <Typography variant="caption" fontWeight="bold" sx={{ color: 'text.primary' }}>Crypto Libraries</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      OpenSSL: {selectedAsset?.library_status?.openssl_version || 'Unknown'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      OQS Provider: {(selectedAsset?.library_status?.oqs_provider ?? false) ? 'Enabled' : 'Disabled'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Hardware Status */}
              <Grid size={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <HardwareIcon sx={{ color: '#C9955F', fontSize: 16 }} />
                      <Typography variant="caption" fontWeight="bold" sx={{ color: 'text.primary' }}>Hardware Platform</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      CPU Arch: {selectedAsset?.hardware_status?.cpu_architecture || 'x86_64 / arm64'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      HSM: {selectedAsset?.hardware_status?.hsm_compatibility || 'Unknown'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Software Status */}
              <Grid size={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <SoftwareIcon sx={{ color: '#C9955F', fontSize: 16 }} />
                      <Typography variant="caption" fontWeight="bold" sx={{ color: 'text.primary' }}>System Software</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }} noWrap>
                      OS: {selectedAsset?.software_status?.operating_system || 'Modern OS'}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      Stack Compatibility: {selectedAsset?.software_status?.dependency_compatibility || 'Unknown'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Benchmark Status */}
              <Grid size={12}>
                <Card variant="outlined">
                  <CardContent sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <BenchmarkIcon sx={{ color: '#C9955F', fontSize: 16 }} />
                      <Typography variant="caption" fontWeight="bold" sx={{ color: 'text.primary' }}>Linked Benchmark Performance</Typography>
                    </Box>
                    {(selectedAsset?.benchmark_status?.status || 'Unavailable') === 'Unavailable' ? (
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                        Benchmark Not Available
                      </Typography>
                    ) : (
                      <Box>
                        <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                          Status: Linked
                        </Typography>
                        <Typography variant="caption" color="primary.light" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem' }}>
                          Session ID: {selectedAsset?.benchmark_status?.benchmark_session_id || 'None'}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </Drawer>
    </Box>
    </ExecutionScreen>
  );
}

export default Readiness;
