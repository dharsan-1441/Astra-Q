import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  TableSortLabel,
  Drawer,
  IconButton,
  Chip,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  UploadFile as UploadIcon,
  Radar as RadarIcon,
  AddBox as AddBoxIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Timeline as TimelineIcon,
  Computer as ServerIcon,
  SettingsInputComponent as ClientIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Transform as ConverterIcon,
} from '@mui/icons-material';
import { discoveryService } from '../api/services';
import { usePipeline } from '../context/PipelineContext';
import ExecutionScreen from '../components/ui/ExecutionScreen';

const CRITICALITY_COLORS = {
  critical: '#EF4444', // Red
  high: '#F59E0B', // Orange
  medium: '#CE9126', // Gold Accent
  low: '#C9955F', // Bronze Gold
  unknown: '#5C564B', // Dark Grey
};

function EnterpriseDiscovery() {
  const theme = useTheme();
  const navigate = useNavigate();
  // ---------------------------------------------------------------------------
  // State Variables
  // ---------------------------------------------------------------------------
  const [assets, setAssets] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    servers: 0,
    clients: 0,
    legacy: 0,
    unknown: 0,
  });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Active form view: 'yaml' | 'tls' | 'manual' | null
  const [activeMode, setActiveMode] = useState(null);

  // Form State: YAML Import
  const [selectedPreset, setSelectedPreset] = useState('small');
  const [uploadedFile, setUploadedFile] = useState(null);

  // Form State: TLS Scan
  const [tlsHost, setTlsHost] = useState('');
  const [tlsPort, setTlsPort] = useState(443);
  const [tlsTimeout, setTlsTimeout] = useState(5);

  // Form State: Manual Registration
  const [manualAsset, setManualAsset] = useState({
    name: '',
    type: 'server',
    vendor: '',
    legacy: false,
    pqc_support: false,
    hybrid_support: false,
    criticality: 'medium',
    dependencies: '',
    notes: '',
  });

  // Table State
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('name');
  const [order, setOrder] = useState('asc');

  // Drawer State
  const [selectedAsset, setSelectedAsset] = useState(null);

  const { pipelineState, updateStepStatus } = usePipeline();

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------
  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await discoveryService.listAssets();
      const loadedAssets = response.data.assets || [];
      setAssets(loadedAssets);
      setSummary(response.data.summary || {
        total: 0,
        servers: 0,
        clients: 0,
        legacy: 0,
        unknown: 0,
      });
      setErrorMsg(null);
      if (loadedAssets.length > 0) {
        updateStepStatus('yamlImport', 'completed');
        updateStepStatus('discovery', 'completed');
      } else {
        updateStepStatus('yamlImport', 'idle');
        updateStepStatus('discovery', 'idle');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load asset inventory from backend.');
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------
  const handleYamlImport = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let response;
      if (uploadedFile) {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        response = await discoveryService.importYaml(formData);
      } else {
        response = await discoveryService.importYaml(null, selectedPreset);
      }

      setSuccessMsg(response.data.message || 'Import successful.');
      setUploadedFile(null);
      setActiveMode(null);
      fetchInventory();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to parse/import enterprise YAML configuration.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTlsScan = async (e) => {
    e.preventDefault();
    if (!tlsHost.trim()) return;
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await discoveryService.scanTls({
        hostname: tlsHost.trim(),
        port: Number(tlsPort),
        timeout: Number(tlsTimeout),
      });

      const { scan_result } = response.data;
      if (scan_result.reachable) {
        setSuccessMsg(`TLS Scan Successful. Found version ${scan_result.tls_version} on ${tlsHost}`);
      } else {
        setErrorMsg(`Target Host Unreachable: ${scan_result.error}`);
      }

      setTlsHost('');
      setActiveMode(null);
      fetchInventory();
    } catch (err) {
      console.error(err);
      setErrorMsg('TLS Scan connection or validation error.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualRegister = async (e) => {
    e.preventDefault();
    if (!manualAsset.name.trim()) return;
    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        ...manualAsset,
        dependencies: manualAsset.dependencies
          ? manualAsset.dependencies.split(',').map(d => d.trim()).filter(Boolean)
          : [],
      };

      await discoveryService.registerManual(payload);
      setSuccessMsg(`Manual asset "${manualAsset.name}" registered successfully.`);

      // Reset Form
      setManualAsset({
        name: '',
        type: 'server',
        vendor: '',
        legacy: false,
        pqc_support: false,
        hybrid_support: false,
        criticality: 'medium',
        dependencies: '',
        notes: '',
      });
      setActiveMode(null);
      fetchInventory();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Manual registration validation failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAsset = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Confirm removal of this asset from the inventory?')) return;

    try {
      await discoveryService.deleteAsset(id);
      if (selectedAsset?.id === id) {
        setSelectedAsset(null);
      }
      setSuccessMsg('Asset removed from inventory.');
      fetchInventory();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to delete asset.');
    }
  };

  // ---------------------------------------------------------------------------
  // Helper Tables & Sorts
  // ---------------------------------------------------------------------------
  const handleSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const filteredAssets = (assets || []).filter((asset) => {
    const searchLower = searchTerm.toLowerCase();
    const searchableFields = [
      asset?.name,
      asset?.type,
      asset?.discovery_source,
      asset?.id,
    ].filter(Boolean).map((value) => String(value).toLowerCase());

    return searchableFields.some((value) => value.includes(searchLower));
  });

  const sortedAssets = [...filteredAssets].sort((a, b) => {
    const getComparableValue = (value) => {
      if (value == null) return '';
      return typeof value === 'string' ? value.toLowerCase() : String(value).toLowerCase();
    };

    const valA = getComparableValue(a?.[orderBy]);
    const valB = getComparableValue(b?.[orderBy]);

    if (valA < valB) return order === 'asc' ? -1 : 1;
    if (valA > valB) return order === 'asc' ? 1 : -1;
    return 0;
  });

  const paginatedAssets = sortedAssets.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <ExecutionScreen
      moduleKey="discovery"
      title="Enterprise Discovery"
      subtitle="Identify, inventory, and classify cryptographic assets and endpoints."
      duration={4000}
      buttonLabel="Run Enterprise Discovery"
      runSteps={[
        'Scanning Assets...',
        'Identifying Active Network Endpoints...',
        'Interrogating Cryptographic Handshakes...',
        'Parsing Cipher Suite Signatures...',
        'Compiling Cryptographic Asset Database...',
        'Scanning TLS Configuration...'
      ]}
      assetCount={14}
    >
      <Box id="page-discovery" sx={{ py: 1.5 }}>
        {/* Page Title */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <SearchIcon sx={{ color: '#CE9126', fontSize: 28 }} />
            <Typography variant="h2" component="h1" className="heading-gradient">
              Enterprise Discovery
            </Typography>
          </Box>
          <Typography variant="subtitle1">
            Identify, inventory, and classify cryptographic assets and live endpoints.
          </Typography>
        </Box>

        {/* Notifications */}
        {errorMsg && (
          <Alert severity="error" variant="outlined" sx={{ mb: 4, bgcolor: 'rgba(239, 68, 68, 0.02)' }} onClose={() => setErrorMsg(null)}>
            {errorMsg}
          </Alert>
        )}
        {successMsg && (
          <Alert severity="success" variant="outlined" sx={{ mb: 4, bgcolor: 'rgba(16, 185, 129, 0.02)' }} onClose={() => setSuccessMsg(null)}>
            {successMsg}
          </Alert>
        )}

        {/* Discovery Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { label: 'Total Systems', val: summary?.total ?? 0, icon: ServerIcon, color: '#C9955F' },
            { label: 'Servers/Gateways', val: summary?.servers ?? 0, icon: ServerIcon, color: '#10B981' },
            { label: 'Clients', val: summary?.clients ?? 0, icon: ClientIcon, color: '#CE9126' },
            { label: 'Legacy Systems', val: summary?.legacy ?? 0, icon: WarningIcon, color: '#F59E0B' },
            { label: 'Unknown Systems', val: summary?.unknown ?? 0, icon: InfoIcon, color: '#5C564B' },
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={idx}>
                <Card>
                  <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="overline" sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontWeight: 600 }}>
                        {card.label}
                      </Typography>
                      <Box sx={{ width: 32, height: 32, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(card.color, 0.08), border: `1px solid ${alpha(card.color, 0.15)}` }}>
                        <Icon sx={{ color: card.color, fontSize: 18 }} />
                      </Box>
                    </Box>
                    <Typography variant="h2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, mt: 1.5, fontSize: '1.75rem', color: 'text.primary' }}>
                      {card.val}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Discovery Mode Cards */}
        <Grid container spacing={3.5} sx={{ mb: 4 }}>
          {/* YAML Import Card */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              sx={{
                borderColor: activeMode === 'yaml' ? 'primary.main' : undefined,
                borderWidth: activeMode === 'yaml' ? 2 : 1,
                cursor: 'pointer',
                transition: 'all 200ms ease',
              }}
              onClick={() => setActiveMode(activeMode === 'yaml' ? null : 'yaml')}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <UploadIcon sx={{ fontSize: 22 }} color={activeMode === 'yaml' ? 'primary' : 'inherit'} />
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.0625rem' }}>
                    Import Configuration File
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary">
                  Upload or select a configuration file containing inventory, asset metadata, and dependencies.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* TLS Scan Card */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              sx={{
                borderColor: activeMode === 'tls' ? 'primary.main' : undefined,
                borderWidth: activeMode === 'tls' ? 2 : 1,
                cursor: 'pointer',
                transition: 'all 200ms ease',
              }}
              onClick={() => setActiveMode(activeMode === 'tls' ? null : 'tls')}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <RadarIcon sx={{ fontSize: 22 }} color={activeMode === 'tls' ? 'primary' : 'inherit'} />
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.0625rem' }}>
                    TLS Endpoint Scan
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary">
                  Query public or internal hostnames/IP addresses dynamically to inspect active cryptographic handshakes.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Manual Entry Card */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              sx={{
                borderColor: activeMode === 'manual' ? 'primary.main' : undefined,
                borderWidth: activeMode === 'manual' ? 2 : 1,
                cursor: 'pointer',
                transition: 'all 200ms ease',
              }}
              onClick={() => setActiveMode(activeMode === 'manual' ? null : 'manual')}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <AddBoxIcon sx={{ fontSize: 22 }} color={activeMode === 'manual' ? 'primary' : 'inherit'} />
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.0625rem' }}>
                    Manual Registration
                  </Typography>
                </Box>
                <Typography variant="body1" color="text.secondary">
                  Manually catalog cryptographic assets like HSMs, air-gapped PKIs, or offline systems.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Discovery Mode Forms (Conditional) */}
        {activeMode && (
          <Card sx={{ mb: 4, p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {activeMode === 'yaml' && 'YAML Inventory Parser'}
                {activeMode === 'tls' && 'TLS Handshake Inspector'}
                {activeMode === 'manual' && 'Manual System Registration'}
              </Typography>
              <IconButton onClick={() => setActiveMode(null)} size="small">
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>

            {/* Form 1: YAML Import */}
            {activeMode === 'yaml' && (
              <form onSubmit={handleYamlImport}>
                <Grid container spacing={3.5}>
                  <Grid xs={12} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="preset-select-label">Preset Sample Inventory</InputLabel>
                      <Select
                        labelId="preset-select-label"
                        value={selectedPreset}
                        label="Preset Sample Inventory"
                        onChange={(e) => {
                          setSelectedPreset(e.target.value);
                          setUploadedFile(null);
                        }}
                      >
                        <MenuItem value="small">Small Enterprise (7 nodes)</MenuItem>
                        <MenuItem value="medium">Medium Enterprise (6 nodes)</MenuItem>
                        <MenuItem value="large">Large Enterprise (9 nodes)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid xs={12} md={4}>
                    <Button
                      variant="outlined"
                      component="label"
                      fullWidth
                      startIcon={<UploadIcon />}
                    >
                      {uploadedFile ? uploadedFile.name : 'Upload Custom YAML File'}
                      <input
                        type="file"
                        hidden
                        accept=".yaml,.yml"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setUploadedFile(e.target.files[0]);
                            setSelectedPreset('');
                          }
                        }}
                      />
                    </Button>
                  </Grid>
                  <Grid xs={12} md={4}>
                    <Button
                      variant="outlined"
                      color="secondary"
                      fullWidth
                      startIcon={<ConverterIcon />}
                      onClick={() => navigate('/converter')}
                    >
                      Convert to YAML
                    </Button>
                  </Grid>
                  <Grid xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Processing Configuration...' : 'Process Configuration'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            )}

            {/* Form 2: TLS Scan */}
            {activeMode === 'tls' && (
              <form onSubmit={handleTlsScan}>
                <Grid container spacing={3.5}>
                  <Grid xs={12} md={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Target Hostname / IP"
                      placeholder="e.g. google.com"
                      value={tlsHost}
                      onChange={(e) => setTlsHost(e.target.value)}
                      required
                      slotProps={{ input: { style: { fontFamily: '"JetBrains Mono", monospace' } } }}
                    />
                  </Grid>
                  <Grid xs={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Port"
                      value={tlsPort}
                      onChange={(e) => setTlsPort(e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid xs={6} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Timeout (seconds)"
                      value={tlsTimeout}
                      onChange={(e) => setTlsTimeout(e.target.value)}
                    />
                  </Grid>
                  <Grid xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={actionLoading || !tlsHost}
                    >
                      {actionLoading ? 'Launching Scanner...' : 'Launch Scanner'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            )}

            {/* Form 3: Manual Entry */}
            {activeMode === 'manual' && (
              <form onSubmit={handleManualRegister}>
                <Grid container spacing={3}>
                  <Grid xs={12} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Asset Name"
                      value={manualAsset.name}
                      onChange={(e) => setManualAsset({ ...manualAsset, name: e.target.value })}
                      required
                    />
                  </Grid>
                  <Grid xs={12} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="manual-type-label">System Type</InputLabel>
                      <Select
                        labelId="manual-type-label"
                        value={manualAsset.type}
                        label="System Type"
                        onChange={(e) => setManualAsset({ ...manualAsset, type: e.target.value })}
                      >
                        <MenuItem value="server">Server</MenuItem>
                        <MenuItem value="hsm">Hardware Security Module (HSM)</MenuItem>
                        <MenuItem value="vpn">VPN Gateway</MenuItem>
                        <MenuItem value="pki">Public Key Infrastructure (PKI)</MenuItem>
                        <MenuItem value="controller">Industrial Controller (SCADA)</MenuItem>
                        <MenuItem value="embedded">Embedded System</MenuItem>
                        <MenuItem value="database">Database</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid xs={12} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Vendor"
                      value={manualAsset.vendor}
                      onChange={(e) => setManualAsset({ ...manualAsset, vendor: e.target.value })}
                    />
                  </Grid>
                  <Grid xs={12} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel id="manual-crit-label">Criticality</InputLabel>
                      <Select
                        labelId="manual-crit-label"
                        value={manualAsset.criticality}
                        label="Criticality"
                        onChange={(e) => setManualAsset({ ...manualAsset, criticality: e.target.value })}
                      >
                        <MenuItem value="critical">Critical</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="low">Low</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid xs={12} md={8}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Dependencies (comma separated IDs)"
                      placeholder="e.g. system-01, system-02"
                      value={manualAsset.dependencies}
                      onChange={(e) => setManualAsset({ ...manualAsset, dependencies: e.target.value })}
                    />
                  </Grid>
                  <Grid xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={manualAsset.legacy}
                          onChange={(e) => setManualAsset({ ...manualAsset, legacy: e.target.checked })}
                        />
                      }
                      label="Legacy Cryptography System"
                    />
                  </Grid>
                  <Grid xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={manualAsset.pqc_support}
                          onChange={(e) => setManualAsset({ ...manualAsset, pqc_support: e.target.checked })}
                        />
                      }
                      label="PQC Algorithm Support"
                    />
                  </Grid>
                  <Grid xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={manualAsset.hybrid_support}
                          onChange={(e) => setManualAsset({ ...manualAsset, hybrid_support: e.target.checked })}
                        />
                      }
                      label="Hybrid Mode Support"
                    />
                  </Grid>
                  <Grid xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      rows={2}
                      label="Engineering Notes"
                      value={manualAsset.notes}
                      onChange={(e) => setManualAsset({ ...manualAsset, notes: e.target.value })}
                    />
                  </Grid>
                  <Grid xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={actionLoading || !manualAsset.name}
                    >
                      {actionLoading ? 'Saving System Record...' : 'Save System Record'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            )}
          </Card>
        )}

        {/* Grid containing Table and Timeline */}
        <Grid container spacing={3.5}>
          {/* Table Grid */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Inventory Registry
                </Typography>
                <TextField
                  size="small"
                  placeholder="Search registry..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
                    }
                  }}
                  sx={{ width: 250 }}
                />
              </Box>

              {loading ? (
                <Box sx={{ py: 4 }}>
                  <LinearProgress />
                </Box>
              ) : assets.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography color="text.secondary" variant="body1">
                    No enterprise imported.
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          <TableSortLabel
                            active={orderBy === 'id'}
                            direction={orderBy === 'id' ? order : 'asc'}
                            onClick={() => handleSort('id')}
                          >
                            Asset ID
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          <TableSortLabel
                            active={orderBy === 'name'}
                            direction={orderBy === 'name' ? order : 'asc'}
                            onClick={() => handleSort('name')}
                          >
                            System Name
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          <TableSortLabel
                            active={orderBy === 'type'}
                            direction={orderBy === 'type' ? order : 'asc'}
                            onClick={() => handleSort('type')}
                          >
                            Type
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          <TableSortLabel
                            active={orderBy === 'discovery_source'}
                            direction={orderBy === 'discovery_source' ? order : 'asc'}
                            onClick={() => handleSort('discovery_source')}
                          >
                            Source
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="center" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedAssets.map((asset) => (
                        <TableRow
                          key={asset.id}
                          hover
                          onClick={() => setSelectedAsset(asset)}
                          sx={{
                            cursor: 'pointer',
                          }}
                        >
                          <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.9375rem' }}>{asset.id}</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.9375rem' }}>{asset.name}</TableCell>
                          <TableCell>
                            <Chip
                              label={asset.type}
                              size="small"
                              sx={{ textTransform: 'uppercase', fontSize: '0.75rem', height: 22, fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.9375rem' }}>{asset.discovery_source}</TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={(e) => handleDeleteAsset(asset.id, e)}
                              sx={{ color: 'error.main' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <TablePagination
                    component="div"
                    count={filteredAssets.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                      setRowsPerPage(parseInt(e.target.value, 10));
                      setPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 20]}
                  />
                </TableContainer>
              )}
            </Paper>
          </Grid>

          {/* Timeline Grid */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper sx={{ p: 2.5, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TimelineIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Discovery Timeline
                </Typography>
              </Box>

              <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                {assets.length === 0 ? (
                  <Typography color="text.secondary" variant="body2" sx={{ p: 1 }}>
                    Timeline empty. Discover systems to view timestamps.
                  </Typography>
                ) : (
                  <List dense>
                    {assets
                      .slice()
                      .sort((a, b) => new Date(b.discovery_timestamp) - new Date(a.discovery_timestamp))
                      .map((asset, index) => {
                        const dt = asset?.discovery_timestamp ? new Date(asset.discovery_timestamp) : null;
                        const timeStr = dt ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
                        const dateStr = dt ? dt.toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
                        const displayName = asset?.name || asset?.asset_name || 'Unnamed asset';

                        return (
                          <React.Fragment key={asset?.id || index}>
                            <ListItem alignItems="flex-start" sx={{ px: 1 }}>
                              <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                                <InfoIcon fontSize="small" sx={{ color: '#C9955F' }} />
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Typography variant="body1" component="span" fontWeight={600} sx={{ fontSize: '0.9375rem' }}>
                                    {displayName}
                                  </Typography>
                                }
                                secondary={
                                  <Box sx={{ display: 'flex', flexDirection: 'column', mt: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                      Source: {asset?.discovery_source || 'Unknown'}
                                    </Typography>
                                    <Typography variant="caption" color="primary.light" sx={{ fontFamily: '"JetBrains Mono", monospace', mt: 0.5, fontSize: '0.75rem' }}>
                                      {dateStr} {timeStr}
                                    </Typography>
                                  </Box>
                                }
                                slotProps={{
                                  secondary: { component: 'div' }
                                }}
                              />
                            </ListItem>
                            {index < assets.length - 1 && <Divider component="li" />}
                          </React.Fragment>
                        );
                      })}
                  </List>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Asset Details Drawer */}
        <Drawer
          anchor="right"
          open={Boolean(selectedAsset)}
          onClose={() => setSelectedAsset(null)}
          slotProps={{
            paper: {
              sx: {
                width: { xs: '100%', sm: 480 },
                p: 3,
              },
            },
          }}
        >
          {selectedAsset && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Asset Details
                </Typography>
                <IconButton onClick={() => setSelectedAsset(null)}>
                  <CloseIcon />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <div>
                  <Typography variant="overline" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', fontWeight: 600 }}>
                    Asset ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, fontSize: '0.875rem' }}>
                    {selectedAsset.id}
                  </Typography>
                </div>

                <div>
                  <Typography variant="overline" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', fontWeight: 600 }}>
                    Asset Name
                  </Typography>
                  <Typography variant="body1" fontWeight={700} sx={{ fontSize: '0.9375rem' }}>
                    {selectedAsset.name}
                  </Typography>
                </div>

                <div>
                  <Typography variant="overline" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', fontWeight: 600 }}>
                    System Type
                  </Typography>
                  <Box>
                    <Chip
                      label={selectedAsset.type}
                      size="small"
                      sx={{ textTransform: 'uppercase', fontWeight: 600, height: 22 }}
                    />
                  </Box>
                </div>

                <div>
                  <Typography variant="overline" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', fontWeight: 600 }}>
                    Discovery Source
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.875rem' }}>
                    {selectedAsset.discovery_source.toUpperCase()}
                  </Typography>
                </div>

                <div>
                  <Typography variant="overline" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', fontWeight: 600 }}>
                    Discovery Timestamp
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.875rem' }}>
                    {new Date(selectedAsset.discovery_timestamp).toLocaleString()}
                  </Typography>
                </div>

                <div>
                  <Typography variant="overline" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', fontWeight: 600 }}>
                    PQC Migration Status
                  </Typography>
                  <Box>
                    <Chip
                      label="UNKNOWN"
                      size="small"
                      color="warning"
                      sx={{ height: 22, fontWeight: 600 }}
                    />
                  </Box>
                </div>

                <Divider />

                {/* Metadata details based on source */}
                <Typography variant="subtitle2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 700, color: 'text.primary' }}>
                  ENGINEERING METADATA
                </Typography>

                {Object.entries(selectedAsset.metadata).map(([key, value]) => {
                  if (value === null || value === undefined) return null;

                  // Handle nested structures like certificate
                  if (typeof value === 'object') {
                    return (
                      <div key={key}>
                        <Typography variant="overline" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', fontWeight: 600 }}>
                          {key.replace('_', ' ')}
                        </Typography>
                        <Box sx={{ pl: 2, borderLeft: `2px solid ${theme.palette.divider}`, mt: 0.5 }}>
                          {Object.entries(value).map(([subKey, subVal]) => (
                            <Box key={subKey} sx={{ mb: 1 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem' }}>
                                {subKey.replace('_', ' ')}
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                                {String(subVal)}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </div>
                    );
                  }

                  // Handle dependencies array
                  if (key === 'dependencies' && Array.isArray(value)) {
                    return (
                      <div key={key}>
                        <Typography variant="overline" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', fontWeight: 600 }}>
                          Dependencies
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                          {value.length === 0 ? (
                            <Typography variant="body2" color="text.disabled">None</Typography>
                          ) : (
                            value.map((dep) => (
                              <Chip
                                key={dep}
                                label={dep}
                                size="small"
                                variant="outlined"
                                sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6875rem', height: 20 }}
                              />
                            ))
                          )}
                        </Box>
                      </div>
                    );
                  }

                  return (
                    <div key={key}>
                      <Typography variant="overline" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem', fontWeight: 600 }}>
                        {key.replace('_', ' ')}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: key === 'ip' || key === 'hostname' || key === 'port' ? '"JetBrains Mono", monospace' : 'inherit',
                          wordBreak: 'break-all',
                          fontSize: '0.875rem',
                        }}
                      >
                        {typeof value === 'boolean' ? (value ? 'YES' : 'NO') : String(value)}
                      </Typography>
                    </div>
                  );
                })}

                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    color="error"
                    fullWidth
                    startIcon={<DeleteIcon />}
                    onClick={(e) => handleDeleteAsset(selectedAsset.id, e)}
                  >
                    Deregister Asset
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </Drawer>
      </Box>
    </ExecutionScreen>
  );
}

export default EnterpriseDiscovery;
