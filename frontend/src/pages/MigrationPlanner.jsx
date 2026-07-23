import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Route as PlannerIcon,
  ExpandMore as ExpandMoreIcon,
  WarningAmber as WarningIcon,
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  PlayArrow as PlayIcon,
  SettingsBackupRestore as RollbackIcon,
  AccessTime as TimeIcon,
  OfflineBolt as RiskIcon,
} from '@mui/icons-material';
import { plannerService } from '../api/services';
import { usePipeline } from '../context/PipelineContext';
import ExecutionScreen from '../components/ui/ExecutionScreen';

const RISK_COLORS = {
  low: '#10b981',       // Green
  medium: '#3b82f6',    // Blue
  high: '#f59e0b',      // Amber
  critical: '#ef4444',  // Red
};

function getRiskColor(score) {
  if (score < 40) return RISK_COLORS.low;
  if (score < 70) return RISK_COLORS.medium;
  if (score < 90) return RISK_COLORS.high;
  return RISK_COLORS.critical;
}

function MigrationPlanner() {
  const theme = useTheme();
  const { pipelineState, updateStepStatus } = usePipeline();

  // Planning states
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [planName, setPlanName] = useState('Enterprise PQC Migration Sequence');
  const [simulation, setSimulation] = useState(true);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await plannerService.list();
      const planList = res.data.plans || [];
      setPlans(planList);
      setSelectedPlan(planList.length > 0 ? planList[0] : null);
    } catch (err) {
      console.error('Failed to retrieve migration plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkCacheAndFetch = async () => {
      try {
        const res = await plannerService.list();
        if (res.data && res.data.plans && res.data.plans.length > 0) {
          updateStepStatus('planner', 'completed');
          fetchPlans();
        }
      } catch (err) {
        console.error(err);
      }
    };

    if (pipelineState.planner === 'completed') {
      fetchPlans();
    } else {
      checkCacheAndFetch();
    }
  }, [pipelineState.planner]);

  const handleGeneratePlan = async () => {
    setGenerating(true);
    try {
      const res = await plannerService.generate({
        name: planName,
        simulation: simulation,
      });
      const newPlan = res.data.plan;
      setSelectedPlan(newPlan);
      
      // Refresh list
      const listRes = await plannerService.list();
      setPlans(listRes.data.plans || []);
    } catch (err) {
      console.error('Failed to generate plan:', err);
      alert(err.response?.data?.detail || 'Plan generation failed. Ensure discovery assets exist.');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportJson = async () => {
    if (!selectedPlan) return;
    try {
      const res = await plannerService.exportJson(selectedPlan.id);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], {
        type: 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pqc_migration_plan_${selectedPlan.id}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('JSON export failed:', err);
    }
  };

  const handleExportPdf = async () => {
    if (!selectedPlan) return;
    try {
      const res = await plannerService.exportPdf(selectedPlan.id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pqc_migration_plan_${selectedPlan.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };

  const planWaves = selectedPlan?.waves || [];
  const blockerCount = selectedPlan?.blockers_detected ?? 0;
  const isPlanBlocked = blockerCount > 0;

  return (
    <ExecutionScreen
      moduleKey="planner"
      title="Migration Planner"
      subtitle="Generate dependency-aware, risk-minimized, sequenced timelines for PQC adoption."
      duration={5000}
      buttonLabel="Generate Migration Plan"
      runSteps={[
        'Evaluating asset migration urgency scores...',
        'Analyzing dependency topology constraints...',
        'Calculating wave schedules and maintenance windows...',
        'Structuring parallel migration steps...',
        'Applying rollback mitigations...',
        'Generating transition plan registry...'
      ]}
      assetCount={14}
    >
      <Box id="page-planner" sx={{ py: 1, px: 2 }}>
      {/* Header section */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <PlannerIcon sx={{ color: 'primary.main', fontSize: 28 }} />
            <Typography variant="h3" component="h1">
              Migration Planner
            </Typography>
          </Box>
          <Typography variant="subtitle1">
            Generate dependency-aware, risk-minimized, sequenced timelines for PQC adoption.
          </Typography>
        </Box>
      </Box>

      {/* Generation Config and List */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid xs={12} md={7}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Generate Transition Plan
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Plan Name"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={simulation}
                        onChange={(e) => setSimulation(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Simulation Mode (Read-only Analysis)"
                  />

                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <PlayIcon />}
                    onClick={handleGeneratePlan}
                    disabled={generating}
                    sx={{ px: 3 }}
                  >
                    {generating ? 'Compiling Sequence...' : 'Generate Plan'}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Existing plans selector */}
        <Grid xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Plan Registry
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : plans.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ my: 'auto' }}>
                  No migration plan generated.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 150, overflowY: 'auto', flexGrow: 1 }}>
                  {plans.map((p) => (
                    <Box
                      key={p.id}
                      onClick={() => setSelectedPlan(p)}
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: selectedPlan?.id === p.id ? 'primary.main' : 'divider',
                        bgcolor: selectedPlan?.id === p.id ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 220 }}>
                          {p.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                          {p.id}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={p.simulation ? 'Simulation' : 'Active'}
                        color={p.simulation ? 'default' : 'primary'}
                        sx={{ borderRadius: 0, height: 18, fontSize: '0.65rem' }}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Plan Display */}
      {selectedPlan ? (
        <Box>
          {/* Plan Metadata summary bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                {selectedPlan.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                Reference ID: {selectedPlan.id} | Generated: {selectedPlan.created_at}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportJson}
              >
                Export JSON
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<PdfIcon />}
                onClick={handleExportPdf}
              >
                Export PDF
              </Button>
            </Box>
          </Box>

          {/* KPI Dashboard Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Risk Card */}
            <Grid xs={12} sm={6} md={3}>
              <Card sx={{ borderLeft: `4px solid ${getRiskColor(selectedPlan.overall_risk_score)}` }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">Overall Risk Score</Typography>
                    <RiskIcon sx={{ color: getRiskColor(selectedPlan.overall_risk_score) }} />
                  </Box>
                  <Typography variant="h4" fontWeight="black">
                    {selectedPlan?.overall_risk_score ?? 0}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Peak wave risk rating
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Waves Count */}
            <Grid xs={12} sm={6} md={3}>
              <Card sx={{ borderLeft: `4px solid ${theme.palette.primary.main}` }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">Total Waves</Typography>
                    <PlannerIcon sx={{ color: 'primary.main' }} />
                  </Box>
                  <Typography variant="h4" fontWeight="black">
                    {planWaves.length} Waves
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Sequenced transition steps
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Total Duration */}
            <Grid xs={12} sm={6} md={3}>
              <Card sx={{ borderLeft: `4px solid ${theme.palette.info.main}` }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">Project Duration</Typography>
                    <TimeIcon sx={{ color: 'info.main' }} />
                  </Box>
                  <Typography variant="h4" fontWeight="black">
                    {selectedPlan?.total_duration_hours ?? 0} hrs
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Summed window times
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Blockers count */}
            <Grid xs={12} sm={6} md={3}>
              <Card sx={{ borderLeft: `4px solid ${selectedPlan.blockers_detected > 0 ? theme.palette.error.main : theme.palette.success.main}` }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">Critical Blockers</Typography>
                    {selectedPlan.blockers_detected > 0 ? (
                      <WarningIcon sx={{ color: 'error.main' }} />
                    ) : (
                      <SuccessIcon sx={{ color: 'success.main' }} />
                    )}
                  </Box>
                  <Typography variant="h4" fontWeight="black" sx={{ color: selectedPlan.blockers_detected > 0 ? 'error.light' : 'text.primary' }}>
                    {blockerCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Required fixes before start
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Timeline waves sequence accordion list */}
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
            Migration Wave Sequence
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {planWaves.length === 0 ? (
              <Box sx={{ py: 3, textAlign: 'center', border: `1px dashed ${theme.palette.divider}` }}>
                <Typography variant="body2" color="text.secondary">
                  This plan does not contain any migration waves yet.
                </Typography>
              </Box>
            ) : (
              planWaves.map((wave) => (
                <Accordion
                  key={wave.wave_number}
                  defaultExpanded={wave.wave_number === 1}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:before': { display: 'none' },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      bgcolor: alpha(theme.palette.divider, 0.03),
                      px: 3,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography
                          variant="subtitle1"
                          fontWeight="black"
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            px: 1.5,
                            py: 0.5,
                            fontSize: '0.8rem',
                            fontFamily: 'monospace',
                          }}
                        >
                          WAVE {wave.wave_number}
                        </Typography>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {wave.name}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 3, pr: 2 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">DURATION</Typography>
                          <Typography variant="body2" fontWeight="bold">{wave.estimated_duration_hours} Hours</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">MAINTENANCE WINDOW</Typography>
                          <Typography variant="body2" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>{wave?.maintenance_window || 'Unscheduled'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">MAX STEP RISK</Typography>
                          <Typography variant="body2" fontWeight="bold" sx={{ color: getRiskColor(wave.wave_risk_score) }}>
                            {wave?.wave_risk_score ?? 0}%
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </AccordionSummary>

                  <AccordionDetails sx={{ p: 3 }}>
                    <TableContainer>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: alpha(theme.palette.divider, 0.05) }}>
                          <TableRow>
                            <TableCell sx={{ width: 80 }}>Step</TableCell>
                            <TableCell>Target Asset</TableCell>
                            <TableCell>Strategy Recommendation</TableCell>
                            <TableCell align="right">Risk</TableCell>
                            <TableCell align="right">Duration</TableCell>
                            <TableCell>Rollback Plan</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(wave?.steps || []).map((step) => (
                            <React.Fragment key={step.step_number}>
                              <TableRow hover>
                                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                                  #{step.step_number}
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={600}>{step.asset_name}</Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                    {step?.asset_id || 'unknown'} ({(step?.asset_type || 'unknown').toUpperCase()})
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={step?.recommended_strategy || 'No recommendation'}
                                    sx={{
                                      borderRadius: 0,
                                      fontWeight: 'bold',
                                      fontSize: '0.7rem',
                                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                                      color: 'primary.light',
                                      border: `1px solid ${theme.palette.primary.main}`,
                                    }}
                                  />
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', color: getRiskColor(step.risk_score), fontFamily: 'monospace' }}>
                                  {step?.risk_score ?? 0}%
                                </TableCell>
                                <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                                  {step?.duration_hours ?? 0}h
                                </TableCell>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <RollbackIcon fontSize="inherit" color="action" />
                                    <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                      {step?.rollback_plan || 'No rollback plan provided.'}
                                    </Typography>
                                  </Box>
                                </TableCell>
                              </TableRow>

                              {(step?.blockers || []).length > 0 && (
                                <TableRow>
                                  <TableCell colSpan={6} sx={{ py: 1, bgcolor: alpha(theme.palette.error.main, 0.02) }}>
                                    <Alert
                                      severity="error"
                                      icon={<ErrorIcon fontSize="small" />}
                                      sx={{
                                        py: 0,
                                        borderRadius: 0,
                                        border: '1px solid',
                                        borderColor: 'error.main',
                                        bgcolor: 'transparent',
                                        color: 'error.light',
                                      }}
                                    >
                                      <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.75rem' }}>
                                        Migration blocked by: {(step?.blockers || []).join(', ')}
                                      </Typography>
                                    </Alert>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </Box>
        </Box>
      ) : (
        <Box sx={{ py: 12, textAlign: 'center', border: `1px dashed ${theme.palette.divider}` }}>
          <Typography variant="h6" color="text.secondary">
            No migration plan generated.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Generate a new sequence plan above to start mapping waves.
          </Typography>
        </Box>
      )}
    </Box>
    </ExecutionScreen>
  );
}

export default MigrationPlanner;
