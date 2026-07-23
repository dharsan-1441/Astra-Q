import React from 'react';
import {
  Box, Typography, Card, CardContent, Button, LinearProgress,
  Skeleton, Grid, useTheme, alpha, Alert, Divider
} from '@mui/material';
import {
  Lock as LockIcon,
  PlayArrow as PlayIcon,
  CheckCircle as SuccessIcon,
  HourglassEmpty as PendingIcon,
  InfoOutlined as InfoIcon
} from '@mui/icons-material';
import { usePipeline, PIPELINE_STEPS } from '../../context/PipelineContext';
import EmptyState from './EmptyState';


export function ExecutionSuccessBanner({ moduleKey }) {
  const theme = useTheme();
  const { metrics } = usePipeline();
  const moduleMetric = metrics[moduleKey];

  if (!moduleMetric) return null;

  return (
    <Box
      sx={{
        mb: 3,
        p: 2,
        borderRadius: '8px',
        bgcolor: alpha(theme.palette.success.main, 0.05),
        border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <SuccessIcon sx={{ color: 'success.main', fontSize: 22 }} />
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.light' }}>
            Analysis Stage Completed
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Module telemetry captured and aggregated to the executive dashboard.
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 3 }}>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Processed Nodes</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'text.primary' }}>
            {moduleMetric.assetCount} systems
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Execution Time</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'text.primary' }}>
            {moduleMetric.duration}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Timestamp</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'text.primary' }}>
            {moduleMetric.timestamp}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default function ExecutionScreen({
  moduleKey,
  title,
  subtitle,
  runSteps,
  duration = 4000,
  assetCount = 14,
  buttonLabel = 'Run Module Diagnostics',
  onExecute,
  children
}) {
  const theme = useTheme();
  const { pipelineState, runningModule, progress, logText, estimatedTime, runModule } = usePipeline();

  const currentStatus = pipelineState[moduleKey] || 'idle';

  const handleExecute = async () => {
    if (onExecute) {
      try {
        await onExecute();
      } catch (err) {
        console.error(err);
        return;
      }
    }
    await runModule(moduleKey, runSteps, duration, assetCount);
  };

  const requiresYaml = ['discovery', 'dependencyGraph', 'compatibility', 'readiness', 'planner', 'report'].includes(moduleKey);
  const isYamlImported = pipelineState.yamlImport === 'completed';
  const executionImpossible = requiresYaml && !isYamlImported;

  const getPrerequisiteAlert = () => {
    switch (moduleKey) {
      case 'discovery':
        return "No enterprise inventory loaded. Upload an enterprise YAML file to begin discovery.";
      case 'dependencyGraph':
        return "No inventory loaded. Upload an enterprise YAML file to construct the topological boundary graph.";
      case 'compatibility':
        return "No inventory loaded. Upload an enterprise YAML file to evaluate cipher compatibility.";
      case 'readiness':
        return "No inventory loaded. Upload an enterprise YAML file to score transition readiness.";
      case 'planner':
        return "No inventory loaded. Upload an enterprise YAML file to construct migration wave roadmaps.";
      case 'report':
        return "No inventory loaded. Upload an enterprise YAML file to compile the audit report.";
      default:
        return "No enterprise inventory loaded. Please upload a YAML configuration file to begin.";
    }
  };

  const showChildren = currentStatus === 'completed' || moduleKey === 'discovery' || moduleKey === 'benchmark';

  return (
    <Box sx={{ width: '100%', py: 1.5 }}>
      {/* 1. Prerequisites Banner if execution is impossible */}
      {executionImpossible && (
        <Alert
          severity="info"
          icon={<InfoIcon />}
          sx={{
            mb: 3,
            border: '1px solid rgba(201, 149, 95, 0.25)',
            bgcolor: 'rgba(201, 149, 95, 0.05)',
            '& .MuiAlert-icon': { color: '#C9955F' }
          }}
        >
          {getPrerequisiteAlert()}
        </Alert>
      )}

      {/* 2. Diagnostics Execution Panel (Top bar style when idle and showing children) */}
      {currentStatus === 'idle' && showChildren && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            borderRadius: '8px',
            bgcolor: '#1C1A17',
            border: '1px solid rgba(201, 149, 95, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PlayIcon sx={{ color: '#CE9126', fontSize: 24 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#C9955F' }}>
                {title} Diagnostics
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              Est: {(duration / 1000).toFixed(1)}s
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleExecute}
              size="small"
              disabled={executionImpossible || !!runningModule}
              sx={{
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              {buttonLabel}
            </Button>
          </Box>
        </Box>
      )}

      {/* 3. Awaiting Execution Banner & Empty State for hidden children */}
      {currentStatus === 'idle' && !showChildren && (
        <Box sx={{ mb: 3 }}>
          <Alert
            severity="warning"
            icon={<PendingIcon />}
            sx={{
              mb: 3,
              border: '1px solid rgba(206, 145, 38, 0.25)',
              bgcolor: 'rgba(206, 145, 38, 0.05)',
              '& .MuiAlert-icon': { color: '#CE9126' }
            }}
          >
            Awaiting analysis execution. Click "{buttonLabel}" to calculate diagnostics for this stage.
          </Alert>

          <EmptyState
            title={`${title} Diagnostics Pending`}
            description={executionImpossible ? getPrerequisiteAlert() : `Run the manual diagnostics for the ${title} stage to generate and cache telemetry metrics.`}
            actionLabel={executionImpossible ? null : buttonLabel}
            onAction={executionImpossible ? null : handleExecute}
            icon={PlayIcon}
            minHeight={360}
          />
        </Box>
      )}

      {/* 4. Completed Success Banner */}
      {currentStatus === 'completed' && (
        <ExecutionSuccessBanner moduleKey={moduleKey} />
      )}

      {/* 5. Active Area / Children Container with absolute overlay when running */}
      <Box sx={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
        {/* Running Progress Overlay */}
        {currentStatus === 'running' && (
          <Box
            sx={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(20, 18, 15, 0.85)',
              backdropFilter: 'blur(2px)'
            }}
          >
            <Card sx={{ width: '90%', maxWidth: 500, border: '1px solid rgba(180, 120, 70, 0.35)', bgcolor: '#14120F' }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <PendingIcon className="spin" sx={{ color: '#CE9126', fontSize: 40, mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: '#FFF' }}>
                  Executing Diagnostics Suite
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5, minHeight: 40 }}>
                  {logText}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    mb: 1.5,
                    border: '1px solid rgba(180, 120, 70, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #C9955F 0%, #CE9126 100%)',
                      borderRadius: 3
                    }
                  }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{progress}% complete</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Remaining: {estimatedTime}s</Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Underlying Page children */}
        {showChildren && (
          <Box
            sx={{
              opacity: currentStatus === 'running' ? 0.35 : 1,
              pointerEvents: currentStatus === 'running' ? 'none' : 'auto',
              transition: 'opacity 0.3s ease'
            }}
          >
            {children}
          </Box>
        )}
      </Box>
    </Box>
  );
}
