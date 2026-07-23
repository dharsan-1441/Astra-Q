import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, FormControl, InputLabel,
  Select, MenuItem, TextField, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Checkbox, IconButton, LinearProgress, Alert,
  Tooltip as MuiTooltip, useTheme, alpha, Chip, Tabs, Tab,
} from '@mui/material';
import {
  Speed as BenchmarkIcon, PlayArrow as RunIcon, Delete as DeleteIcon,
  Download as ExportIcon, Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { benchmarkService } from '../api/services';
import ChartWrapper from '../components/charts/ChartWrapper';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/ui/StatusBadge';
import { usePipeline } from '../context/PipelineContext';
import ExecutionScreen from '../components/ui/ExecutionScreen';

const CHART_COLORS = [
  '#C9955F', // Primary Gold/Bronze
  '#CE9126', // Gold Accent
  '#E8A33D', // Bright Gold Accent
  '#3FA189', // Teal Swirl
  '#8A6D1F', // Olive Gold
  '#10B981', // Success Green
];

const tooltipStyle = {
  backgroundColor: '#28221B',
  border: '1px solid rgba(180, 120, 70, 0.15)',
  borderRadius: 10,
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: 13,
  color: '#FFF6C8',
};

const MemoizedBarChart = memo(function MemoizedBarChart({ data, selectedSessions, title, yLabel }) {
  const theme = useTheme();
  if (!data || data.length === 0) return null;
  return (
    <ChartWrapper title={title} height={220}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(180, 120, 70, 0.1)" />
          <XAxis dataKey="operation" stroke={theme.palette.text.disabled} tick={{ fontSize: 13, fontFamily: '"JetBrains Mono", monospace', fill: '#9C9689' }} />
          <YAxis stroke={theme.palette.text.disabled} tick={{ fontSize: 13, fontFamily: '"JetBrains Mono", monospace', fill: '#9C9689' }} label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: theme.palette.text.secondary } } : undefined} />
          <RechartsTooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', color: '#9C9689' }} />
          {selectedSessions.map((session, index) => {
            const legendName = `${session.parameter_set} (${session.id.slice(0, 4)})`;
            return <Bar key={session.id} dataKey={legendName} fill={CHART_COLORS[index % CHART_COLORS.length]} radius={[4, 4, 0, 0]} barSize={16} />;
          })}
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
});

function Benchmark() {
  const theme = useTheme();
  const { pipelineState, updateStepStatus, activeProfile, setActiveProfile } = usePipeline();
  const [connected, setConnected] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [algorithm, setAlgorithm] = useState('ML-KEM');
  const [parameterSet, setParameterSet] = useState('ML-KEM-768');
  const [iterations, setIterations] = useState(100);
  const [warmupRuns, setWarmupRuns] = useState(10);
  const [threadCount, setThreadCount] = useState(1);
  const [repeatCount, setRepeatCount] = useState(1);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [chartTab, setChartTab] = useState(0);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await benchmarkService.list();
      setConnected(res.data.connected);
      setSessions(res.data.sessions || []);
      if (res.data.sessions && res.data.sessions.length > 0) {
        const firstAlgo = res.data.sessions[0].algorithm;
        const matchingIds = res.data.sessions.filter((s) => s.algorithm === firstAlgo).slice(0, 3).map((s) => s.id);
        setSelectedIds(matchingIds);
      }
    } catch (err) { console.error('Failed to load benchmark sessions:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const checkCacheAndFetch = async () => {
      try {
        const res = await benchmarkService.list();
        if (res.data && res.data.sessions && res.data.sessions.length > 0) {
          updateStepStatus('benchmark', 'completed');
          loadSessions();
        }
      } catch (err) {
        console.error(err);
      }
    };

    if (pipelineState.benchmark === 'completed') {
      loadSessions();
    } else {
      checkCacheAndFetch();
    }
  }, [pipelineState.benchmark]);

  // Sync dropdowns from context activeProfile on mount/change
  useEffect(() => {
    if (!activeProfile) return;
    if (activeProfile === 'Classical Only') {
      setAlgorithm('CLASSICAL');
      setParameterSet('Classical Only');
    } else if (activeProfile.endsWith('only')) {
      const name = activeProfile.replace(' only', '');
      if (name.startsWith('ML-KEM')) {
        setAlgorithm('ML-KEM');
        setParameterSet(name);
      } else if (name.startsWith('ML-DSA')) {
        setAlgorithm('ML-DSA');
        if (name === 'ML-DSA Level 1') setParameterSet('ML-DSA-44');
        else if (name === 'ML-DSA Level 3') setParameterSet('ML-DSA-65');
        else if (name === 'ML-DSA Level 5') setParameterSet('ML-DSA-87');
      }
    } else if (activeProfile.includes('Hybrid')) {
      setAlgorithm('HYBRID');
      if (activeProfile.includes('Hybrid Level 1')) setParameterSet('Level 1');
      else if (activeProfile.includes('Hybrid Level 2')) setParameterSet('Level 2');
      else if (activeProfile.includes('Hybrid Level 3')) setParameterSet('Level 3');
    }
  }, [activeProfile]);

  const updateProfileInContext = useCallback((algo, param) => {
    if (!setActiveProfile) return;
    let profileStr = 'ML-KEM-512 + ML-DSA Level 1 (Hybrid Level 1)';
    if (algo === 'CLASSICAL') {
      profileStr = 'Classical Only';
    } else if (algo === 'ML-KEM') {
      profileStr = `${param} only`;
    } else if (algo === 'ML-DSA') {
      if (param === 'ML-DSA-44') profileStr = 'ML-DSA Level 1 only';
      else if (param === 'ML-DSA-65') profileStr = 'ML-DSA Level 3 only';
      else if (param === 'ML-DSA-87') profileStr = 'ML-DSA Level 5 only';
    } else if (algo === 'HYBRID') {
      if (param === 'Level 1') profileStr = 'ML-KEM-512 + ML-DSA Level 1 (Hybrid Level 1)';
      else if (param === 'Level 2') profileStr = 'ML-KEM-768 + ML-DSA Level 3 (Hybrid Level 2)';
      else if (param === 'Level 3') profileStr = 'ML-KEM-1024 + ML-DSA Level 5 (Hybrid Level 3)';
    }
    setActiveProfile(profileStr);
  }, [setActiveProfile]);

  const handleAlgorithmChange = useCallback((e) => {
    const algo = e.target.value;
    setAlgorithm(algo);
    let newParam;

    if (algo === 'HYBRID') {
      newParam = 'Level 2';
    } else if (algo === 'CLASSICAL') {
      newParam = 'Classical Only';
    } else {
      newParam = algo === 'ML-KEM' ? 'ML-KEM-768' : 'ML-DSA-65';
    }
    setParameterSet(newParam);
    updateProfileInContext(algo, newParam);
  }, [updateProfileInContext]);

  const handleParameterSetChange = useCallback((e) => {
    const param = e.target.value;
    setParameterSet(param);
    updateProfileInContext(algorithm, param);
  }, [algorithm, updateProfileInContext]);

  const handleRun = useCallback(async () => {
    setRunning(true); setProgress(5);
    setStatusMessage('Initializing native cryptographic context...');
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + (prev < 50 ? 15 : prev < 75 ? 8 : 2);
      });
    }, 300);
    try {
      setStatusMessage(`Benchmarking ${parameterSet} (${iterations} iterations, ${threadCount} threads)...`);
      const payload = {
        algorithm: algorithm === 'HYBRID' ? undefined : algorithm,
        parameter_set: algorithm === 'HYBRID' ? undefined : parameterSet,
        security_level: algorithm === 'HYBRID' ? Number(parameterSet.replace('Level ', '').trim()) : undefined,
        iterations: Number(iterations),
        warmup_runs: Number(warmupRuns),
        thread_count: Number(threadCount),
        repeat_count: Number(repeatCount)
      };
      const res = await benchmarkService.run(payload);
      clearInterval(interval); setProgress(100);
      setStatusMessage('Benchmark run completed successfully.');
      setTimeout(() => {
        setSessions((prev) => [res.data, ...prev]);
        setSelectedIds([res.data.id]);
        setRunning(false); setProgress(0); setStatusMessage('');
        updateStepStatus('benchmark', 'completed');
      }, 500);
    } catch (err) {
      clearInterval(interval); setRunning(false); setProgress(0); setStatusMessage('');
      console.error(err);
      const detail = err.response?.data?.detail || 'An execution error occurred.';
      alert(`Benchmark execution failed: ${detail}`);
    }
  }, [algorithm, parameterSet, iterations, warmupRuns, threadCount, repeatCount, updateStepStatus]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Delete this benchmark session?')) return;
    try {
      await benchmarkService.delete(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setSelectedIds((prev) => prev.filter((sid) => sid !== id));
    } catch (err) { console.error('Failed to delete session:', err); }
  }, []);

  const handleExportJSON = useCallback((session) => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(session, null, 2))}`;
    const a = document.createElement('a');
    a.setAttribute('href', jsonString);
    a.setAttribute('download', `pqc_benchmark_${session.algorithm}_${session.parameter_set}_${session.id.slice(0, 8)}.json`);
    document.body.appendChild(a); a.click(); a.remove();
  }, []);

  const handleExportCSV = useCallback(() => {
    const selected = sessions.filter((s) => selectedIds.includes(s.id));
    if (selected.length === 0) return;
    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'Session ID,Timestamp,Algorithm,Parameter Set,Iterations,Threads,KeyGen/Handshake Avg (s),Throughput,Encap/Sign/Cert Avg (s),Decap/Verify/Session Avg (s)\n';
    selected.forEach((s) => {
      const isKEM = s.algorithm === 'ML-KEM';
      const isHybrid = s.algorithm === 'HYBRID';
      const op1 = isHybrid ? 'tls_handshake' : 'keygen';
      const op2 = isHybrid ? 'tls_cert_validation' : isKEM ? 'encap' : 'sign';
      const op3 = isHybrid ? 'tls_session_establishment' : isKEM ? 'decap' : 'verify';
      csv += [s.id, s.timestamp, s.algorithm, s.parameter_set, s.parameters.iterations, s.parameters.thread_count,
        s.metrics[op1]?.latency?.average || 0, s.metrics[op1]?.throughput || 0,
        s.metrics[op2]?.latency?.average || 0, s.metrics[op3]?.latency?.average || 0].join(',') + '\n';
    });
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `pqc_benchmark_comparison_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link); link.click(); link.remove();
  }, [sessions, selectedIds]);

  const handleToggleSelect = useCallback((id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  }, []);

  const selectedSessions = useMemo(() => sessions.filter((s) => selectedIds.includes(s.id)), [sessions, selectedIds]);
  const primaryAlgo = selectedSessions[0]?.algorithm || 'ML-KEM';
  const isHybridSelected = primaryAlgo === 'HYBRID';

  const getChartData = useCallback((metricKey, subKey = null) => {
    if (selectedSessions.length === 0) return [];
    const operations = primaryAlgo === 'ML-KEM'
      ? ['keygen', 'encap', 'decap']
      : primaryAlgo === 'ML-DSA'
        ? ['keygen', 'sign', 'verify']
        : ['tls_handshake', 'tls_cert_validation', 'tls_session_establishment', 'aes_encrypt'];

    const labels = {
      keygen: 'KeyGen',
      encap: 'Encap',
      decap: 'Decap',
      sign: 'Sign',
      verify: 'Verify',
      tls_handshake: 'Handshake',
      tls_cert_validation: 'Cert Verify',
      tls_session_establishment: 'Session Est',
      aes_encrypt: 'AES Encrypt'
    };

    return operations.map((op) => {
      const dp = { operation: labels[op] || op };
      selectedSessions.forEach((session) => {
        if (session.algorithm === primaryAlgo) {
          const val = session.metrics[op]?.[metricKey];
          const displayValue = subKey && val ? val[subKey] : val;
          dp[`${session.parameter_set} (${session.id.slice(0, 4)})`] = Number(displayValue) || 0;
        }
      });
      return dp;
    });
  }, [selectedSessions, primaryAlgo]);

  const latencyData = useMemo(() => getChartData('latency', 'average'), [getChartData]);
  const cpuData = useMemo(() => getChartData('cpu_usage', 'average'), [getChartData]);
  const memoryData = useMemo(() => getChartData('memory_usage', 'average'), [getChartData]);
  const throughputData = useMemo(() => getChartData('throughput'), [getChartData]);

  // Performance distribution data (min/max/p95/median)
  const perfDistData = useMemo(() => {
    if (selectedSessions.length === 0) return [];
    const session = selectedSessions[0];
    const operations = primaryAlgo === 'ML-KEM'
      ? ['keygen', 'encap', 'decap']
      : primaryAlgo === 'ML-DSA'
        ? ['keygen', 'sign', 'verify']
        : ['tls_handshake', 'tls_cert_validation', 'tls_session_establishment', 'aes_encrypt'];

    const labels = {
      keygen: 'KeyGen',
      encap: 'Encap',
      decap: 'Decap',
      sign: 'Sign',
      verify: 'Verify',
      tls_handshake: 'Handshake',
      tls_cert_validation: 'Cert Verify',
      tls_session_establishment: 'Session Est',
      aes_encrypt: 'AES Encrypt'
    };

    return operations.map((op) => ({
      operation: labels[op],
      min: (session.metrics[op]?.latency?.min || 0) * 1000,
      median: (session.metrics[op]?.latency?.median || 0) * 1000,
      average: (session.metrics[op]?.latency?.average || 0) * 1000,
      p95: (session.metrics[op]?.latency?.p95 || 0) * 1000,
      max: (session.metrics[op]?.latency?.max || 0) * 1000,
    }));
  }, [selectedSessions, primaryAlgo]);

  // Radar data for algorithm comparison
  const radarData = useMemo(() => {
    if (selectedSessions.length === 0) return [];
    const operations = primaryAlgo === 'ML-KEM'
      ? ['keygen', 'encap', 'decap']
      : primaryAlgo === 'ML-DSA'
        ? ['keygen', 'sign', 'verify']
        : ['tls_handshake', 'tls_cert_validation', 'tls_session_establishment', 'aes_encrypt'];

    const labels = {
      keygen: 'KeyGen',
      encap: 'Encap',
      decap: 'Decap',
      sign: 'Sign',
      verify: 'Verify',
      tls_handshake: 'Handshake',
      tls_cert_validation: 'Cert Verify',
      tls_session_establishment: 'Session Est',
      aes_encrypt: 'AES Encrypt'
    };

    return operations.map((op) => {
      const point = { operation: labels[op] };
      selectedSessions.forEach((s) => {
        point[`${s.parameter_set}`] = s.metrics[op]?.throughput || 0;
      });
      return point;
    });
  }, [selectedSessions, primaryAlgo]);

  return (
    <ExecutionScreen
      moduleKey="benchmark"
      title="Benchmark Engine"
      subtitle="Performance analysis of post-quantum cryptographic schemes."
      duration={4500}
      buttonLabel="Run PQC Benchmarking"
      runSteps={[
        'Warming up processor core affinities...',
        'Benchmarking ML-KEM-512/768/1024...',
        'Benchmarking ML-DSA-44/65/87...',
        'Benchmarking SLH-DSA-128/192/256...',
        'Calculating operations per second and clock cycles...',
        'Synthesizing benchmark telemetry dashboard...'
      ]}
      assetCount={14}
    >
      <Box id="page-benchmark" sx={{ py: 1.5 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <BenchmarkIcon sx={{ color: '#CE9126', fontSize: 28 }} />
            <Typography variant="h1" component="h1" className="heading-gradient">Benchmark Engine</Typography>
          </Box>
          <Typography variant="subtitle1">Performance analysis of post-quantum cryptographic schemes</Typography>
        </Box>
        <StatusBadge status={connected ? 'success' : 'error'} label={connected ? 'liboqs connected' : 'Disconnected'} />
      </Box>

      {!connected && (
        <Alert severity="error" variant="outlined" sx={{ mb: 4, bgcolor: 'rgba(239, 68, 68, 0.02)' }}>
          <strong>Backend not connected:</strong> Native Open Quantum Safe (liboqs) wrapper is not loaded.
        </Alert>
      )}

      <Grid container spacing={3.5}>
        {/* Configuration Panel */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2.5, pb: 1, borderBottom: `1px solid ${theme.palette.divider}`, color: 'text.primary' }}>
                Configuration
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="algo-select-label">Algorithm</InputLabel>
                  <Select labelId="algo-select-label" value={algorithm} label="Algorithm" onChange={handleAlgorithmChange} disabled={running || !connected}>
                    <MenuItem value="ML-KEM">ML-KEM (Key Encapsulation)</MenuItem>
                    <MenuItem value="ML-DSA">ML-DSA (Digital Signature)</MenuItem>
                    <MenuItem value="HYBRID">Hybrid PQC Security Profiles</MenuItem>
                    <MenuItem value="CLASSICAL">Classical Security Profiles</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel id="param-select-label">Parameter Set</InputLabel>
                  <Select labelId="param-select-label" value={parameterSet} label="Parameter Set" onChange={handleParameterSetChange} disabled={running || !connected}>
                    {algorithm === 'ML-KEM' ? [
                      <MenuItem key="512" value="ML-KEM-512">ML-KEM-512 (AES-128)</MenuItem>,
                      <MenuItem key="768" value="ML-KEM-768">ML-KEM-768 (AES-192)</MenuItem>,
                      <MenuItem key="1024" value="ML-KEM-1024">ML-KEM-1024 (AES-256)</MenuItem>,
                    ] : algorithm === 'ML-DSA' ? [
                      <MenuItem key="44" value="ML-DSA-44">ML-DSA-44 (Level 2)</MenuItem>,
                      <MenuItem key="65" value="ML-DSA-65">ML-DSA-65 (Level 3)</MenuItem>,
                      <MenuItem key="87" value="ML-DSA-87">ML-DSA-87 (Level 5)</MenuItem>,
                    ] : algorithm === 'CLASSICAL' ? [
                      <MenuItem key="classical" value="Classical Only">Classical Only (RSA / ECC)</MenuItem>,
                    ] : [
                      <MenuItem key="L1" value="Level 1">Security Level 1 (ML-KEM-512 &amp; ML-DSA-44 &amp; TLS 1.2)</MenuItem>,
                      <MenuItem key="L2" value="Level 2">Security Level 2 (ML-KEM-768 &amp; ML-DSA-65 &amp; TLS 1.3)</MenuItem>,
                      <MenuItem key="L3" value="Level 3">Security Level 3 (ML-KEM-1024 &amp; ML-DSA-87 &amp; TLS 1.3)</MenuItem>,
                    ]}
                  </Select>
                </FormControl>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <TextField fullWidth label="Iterations" type="number" size="small" value={iterations} onChange={(e) => setIterations(Math.max(1, parseInt(e.target.value) || 0))} disabled={running || !connected} slotProps={{ htmlInput: { min: 1, max: 10000 } }} />
                  </Grid>
                  <Grid size={6}>
                    <TextField fullWidth label="Warmup" type="number" size="small" value={warmupRuns} onChange={(e) => setWarmupRuns(Math.max(0, parseInt(e.target.value) || 0))} disabled={running || !connected} slotProps={{ htmlInput: { min: 0, max: 1000 } }} />
                  </Grid>
                  <Grid size={6}>
                    <TextField fullWidth label="Threads" type="number" size="small" value={threadCount} onChange={(e) => setThreadCount(Math.max(1, parseInt(e.target.value) || 0))} disabled={running || !connected} slotProps={{ htmlInput: { min: 1, max: 64 } }} />
                  </Grid>
                  <Grid size={6}>
                    <TextField fullWidth label="Repeats" type="number" size="small" value={repeatCount} onChange={(e) => setRepeatCount(Math.max(1, parseInt(e.target.value) || 0))} disabled={running || !connected} slotProps={{ htmlInput: { min: 1, max: 100 } }} />
                  </Grid>
                </Grid>
                <Button fullWidth variant="contained" startIcon={<RunIcon />} onClick={handleRun} disabled={running || !connected} sx={{ mt: 1 }}>
                  {running ? 'Running Job...' : 'Run Benchmark'}
                </Button>
              </Box>
              {running && (
                <Box sx={{ mt: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>{statusMessage}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.light', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem' }}>{progress}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={progress} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Charts Panel */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Performance Metrics ({primaryAlgo})
                </Typography>
                {selectedSessions.length > 0 && (
                  <Button size="small" variant="outlined" startIcon={<ExportIcon />} onClick={handleExportCSV} sx={{ fontSize: '0.75rem' }}>
                    Export CSV
                  </Button>
                )}
              </Box>

              {selectedIds.length === 0 ? (
                <EmptyState title="No benchmark executed." description="Select sessions from history below or run a benchmark job to compare performance metrics." minHeight={340} icon={BenchmarkIcon} />
              ) : (
                <>
                  {/* Premium KPI cards for Hybrid profile highlight */}
                  {isHybridSelected && selectedSessions[0] && (
                    <Grid container spacing={2} sx={{ mb: 3.5 }}>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ bgcolor: 'rgba(201, 149, 95, 0.05)', border: '1px solid rgba(201, 149, 95, 0.15)' }}>
                          <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
                            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>TLS Handshake</Typography>
                            <Typography variant="h3" sx={{ color: 'primary.main', fontWeight: 700, mt: 0.5, fontFamily: '"JetBrains Mono", monospace' }}>
                              {((selectedSessions[0].metrics.tls_handshake?.latency?.average || 0) * 1000).toFixed(1)} ms
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ bgcolor: 'rgba(201, 149, 95, 0.05)', border: '1px solid rgba(201, 149, 95, 0.15)' }}>
                          <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
                            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>Cert validation</Typography>
                            <Typography variant="h3" sx={{ color: 'secondary.main', fontWeight: 700, mt: 0.5, fontFamily: '"JetBrains Mono", monospace' }}>
                              {((selectedSessions[0].metrics.tls_cert_validation?.latency?.average || 0) * 1000).toFixed(2)} ms
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ bgcolor: 'rgba(201, 149, 95, 0.05)', border: '1px solid rgba(201, 149, 95, 0.15)' }}>
                          <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
                            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>Session Est.</Typography>
                            <Typography variant="h3" sx={{ color: '#E8A33D', fontWeight: 700, mt: 0.5, fontFamily: '"JetBrains Mono", monospace' }}>
                              {((selectedSessions[0].metrics.tls_session_establishment?.latency?.average || 0) * 1000).toFixed(1)} ms
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card sx={{ bgcolor: 'rgba(201, 149, 95, 0.05)', border: '1px solid rgba(201, 149, 95, 0.15)' }}>
                          <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
                            <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 600 }}>Throughput</Typography>
                            <Typography variant="h3" sx={{ color: 'success.main', fontWeight: 700, mt: 0.5, fontFamily: '"JetBrains Mono", monospace' }}>
                              {(selectedSessions[0].metrics.tls_session_establishment?.throughput || 0).toFixed(1)} /s
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  )}

                  <Tabs value={chartTab} onChange={(e, v) => setChartTab(v)} sx={{ mb: 2.5, borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <Tab label="Overview" sx={{ fontSize: '0.8125rem' }} />
                    <Tab label="Distribution" sx={{ fontSize: '0.8125rem' }} />
                    <Tab label="Comparison" sx={{ fontSize: '0.8125rem' }} />
                  </Tabs>

                  {chartTab === 0 && (
                    <Grid container spacing={2.5}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <MemoizedBarChart data={latencyData} selectedSessions={selectedSessions} title="Average Latency (s) — Lower is Better" yLabel="seconds" />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <MemoizedBarChart data={throughputData} selectedSessions={selectedSessions} title="Throughput (ops/sec) — Higher is Better" yLabel="ops/s" />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <MemoizedBarChart data={cpuData} selectedSessions={selectedSessions} title="CPU Usage (%)" yLabel="%" />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <MemoizedBarChart data={memoryData} selectedSessions={selectedSessions} title="Memory Delta (KB)" yLabel="KB" />
                      </Grid>
                    </Grid>
                  )}

                  {chartTab === 1 && (
                    <ChartWrapper title="Latency Distribution (ms) — Min / Median / Avg / P95 / Max" height={300}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={perfDistData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(180, 120, 70, 0.1)" />
                          <XAxis dataKey="operation" stroke={theme.palette.text.disabled} tick={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', fill: '#9C9689' }} />
                          <YAxis stroke={theme.palette.text.disabled} tick={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', fill: '#9C9689' }} />
                          <RechartsTooltip contentStyle={tooltipStyle} />
                          <Legend wrapperStyle={{ fontSize: 11, color: '#9C9689' }} />
                          <Bar dataKey="min" fill="#10B981" radius={[3, 3, 0, 0]} barSize={12} />
                          <Bar dataKey="median" fill="#C9955F" radius={[3, 3, 0, 0]} barSize={12} />
                          <Bar dataKey="average" fill="#CE9126" radius={[3, 3, 0, 0]} barSize={12} />
                          <Bar dataKey="p95" fill="#E8A33D" radius={[3, 3, 0, 0]} barSize={12} />
                          <Bar dataKey="max" fill="#EF4444" radius={[3, 3, 0, 0]} barSize={12} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartWrapper>
                  )}

                  {chartTab === 2 && (
                    <ChartWrapper title="Throughput Radar — Algorithm Comparison" height={300}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                          <PolarGrid stroke="rgba(180, 120, 70, 0.15)" />
                          <PolarAngleAxis dataKey="operation" tick={{ fontSize: 11, fill: '#9C9689', fontWeight: 500 }} />
                          <PolarRadiusAxis tick={{ fontSize: 10, fill: '#5C564B' }} />
                          {selectedSessions.map((s, i) => (
                            <Radar key={s.id} dataKey={s.parameter_set} stroke={CHART_COLORS[i % CHART_COLORS.length]} fill={alpha(CHART_COLORS[i % CHART_COLORS.length], 0.1)} strokeWidth={2} />
                          ))}
                          <Legend wrapperStyle={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', color: '#9C9689' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </ChartWrapper>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* History Table */}
        <Grid size={12}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>Execution History</Typography>
                <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={loadSessions} disabled={loading} sx={{ fontSize: '0.75rem' }}>
                  Refresh
                </Button>
              </Box>

              {loading && sessions.length === 0 ? (
                <LinearProgress sx={{ my: 2 }} />
              ) : sessions.length === 0 ? (
                <EmptyState title="No benchmark history" description="Run a benchmark above to populate history." minHeight={160} icon={BenchmarkIcon} />
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" sx={{ width: 40 }}></TableCell>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>Algorithm</TableCell>
                        <TableCell>Parameter Set</TableCell>
                        <TableCell align="right">Iterations</TableCell>
                        <TableCell align="right">KeyGen / Handshake</TableCell>
                        <TableCell align="right">Encap / Sign / Cert</TableCell>
                        <TableCell align="right">Decap / Verify / Est</TableCell>
                        <TableCell align="center" sx={{ width: 90 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sessions.map((session) => {
                        const isSelected = selectedIds.includes(session.id);
                        const isKEM = session.algorithm === 'ML-KEM';
                        const isHybrid = session.algorithm === 'HYBRID';
                        const op1 = isHybrid ? 'tls_handshake' : 'keygen';
                        const op2 = isHybrid ? 'tls_cert_validation' : isKEM ? 'encap' : 'sign';
                        const op3 = isHybrid ? 'tls_session_establishment' : isKEM ? 'decap' : 'verify';

                        const getAvg = (op) => {
                          const lat = session.metrics[op]?.latency?.average;
                          return lat !== undefined ? `${(lat * 1000).toFixed(2)} ms` : '—';
                        };

                        return (
                          <TableRow key={session.id} selected={isSelected}>
                            <TableCell padding="checkbox">
                              <Checkbox size="small" checked={isSelected} onChange={() => handleToggleSelect(session.id)} />
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.9375rem', whiteSpace: 'nowrap', fontFamily: '"JetBrains Mono", monospace' }}>
                              {new Date(session.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell><Typography variant="body1" sx={{ fontWeight: 600, fontSize: '0.9375rem' }}>{session.algorithm}</Typography></TableCell>
                            <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.9375rem' }}>{session.parameter_set}</TableCell>
                            <TableCell align="right" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.9375rem' }}>{session.parameters.iterations}</TableCell>
                            <TableCell align="right" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.9375rem' }}>{getAvg(op1)}</TableCell>
                            <TableCell align="right" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.9375rem' }}>{getAvg(op2)}</TableCell>
                            <TableCell align="right" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.9375rem' }}>{getAvg(op3)}</TableCell>
                            <TableCell align="center">
                              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                                <MuiTooltip title="Export JSON"><IconButton size="small" onClick={() => handleExportJSON(session)}><ExportIcon sx={{ fontSize: 16 }} /></IconButton></MuiTooltip>
                                <MuiTooltip title="Delete"><IconButton size="small" color="error" onClick={() => handleDelete(session.id)}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton></MuiTooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
    </ExecutionScreen>
  );
}

export default Benchmark;
