import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Button, useTheme, alpha } from '@mui/material';
import {
  Lock as LockIcon,
  PlayArrow as PlayIcon,
  CheckCircle as SuccessIcon,
  RotateLeft as ResetIcon,
  Autorenew as RunningIcon
} from '@mui/icons-material';
import { usePipeline, PIPELINE_STEPS } from '../../context/PipelineContext';

export default function PipelineStepper() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { pipelineState, activeStepIndex, runningModule, resetPipeline } = usePipeline();

  const handleStepClick = (step) => {
    navigate(step.path);
  };

  return (
    <Box
      sx={{
        mb: 3,
        p: 2,
        borderRadius: '8px',
        bgcolor: '#14171C',
        border: '1px solid rgba(180, 120, 70, 0.15)',
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2
      }}
    >
      {/* Pipeline Label */}
      <Box sx={{ minWidth: 160, borderRight: { lg: '1px solid rgba(180, 120, 70, 0.15)' }, pr: { lg: 2 } }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#C9955F', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          PQC Assessment Pipeline
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.72rem' }}>
          Interactive Execution Workflow
        </Typography>
      </Box>

      {/* Steps List */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          overflowX: 'auto',
          px: 1,
          '&::-webkit-scrollbar': { height: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(180, 120, 70, 0.2)', borderRadius: 2 }
        }}
      >
        {PIPELINE_STEPS.map((step, index) => {
          const status = pipelineState[step.key] || 'idle';
          const isActive = location.pathname === step.path;
          const isClickable = true;

          // Color assignments based on status
          let color = '#C9955F';
          let icon = <PlayIcon sx={{ fontSize: 15 }} />;
          let borderStyle = `1px dashed ${color}`;

          if (status === 'completed') {
            color = theme.palette.success.main;
            icon = <SuccessIcon sx={{ fontSize: 15 }} />;
            borderStyle = `1px solid ${color}`;
          } else if (status === 'running') {
            color = '#CE9126';
            icon = <RunningIcon className="spin" sx={{ fontSize: 15 }} />;
            borderStyle = `1px solid ${color}`;
          }

          return (
            <React.Fragment key={step.key}>
              {/* Step Bubble */}
              <Box
                onClick={() => isClickable && handleStepClick(step)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: '16px',
                  bgcolor: isActive ? 'rgba(201, 149, 95, 0.08)' : 'transparent',
                  border: isActive ? '1px solid rgba(201, 149, 95, 0.35)' : '1px solid transparent',
                  cursor: isClickable ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  '&:hover': isClickable ? {
                    bgcolor: isActive ? 'rgba(201, 149, 95, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    transform: 'translateY(-1px)'
                  } : {}
                }}
              >
                {/* Status indicator bubble */}
                <Box sx={{
                  width: 22, height: 22, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: alpha(color, 0.08),
                  border: borderStyle,
                  color: color
                }}>
                  {icon}
                </Box>
                <Box>
                  <Typography variant="body2" sx={{
                    fontSize: '0.78rem',
                    fontWeight: isActive || status === 'running' ? 800 : 500,
                    color: isActive ? '#FFF' : isClickable ? 'text.primary' : 'text.disabled',
                    whiteSpace: 'nowrap'
                  }}>
                    {step.label}
                  </Typography>
                  <Typography variant="caption" sx={{
                    fontSize: '0.62rem',
                    color: color,
                    display: 'block',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                    fontWeight: 600
                  }}>
                    {status}
                  </Typography>
                </Box>
              </Box>

              {/* Connecting arrow/line */}
              {index < PIPELINE_STEPS.length - 1 && (
                <Box
                  sx={{
                    flexGrow: 1,
                    mx: 1,
                    height: '1px',
                    minWidth: 15,
                    maxWidth: 50,
                    bgcolor: index < activeStepIndex ? 'rgba(46, 125, 50, 0.4)' : 'rgba(255, 255, 255, 0.08)'
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </Box>

      {/* Control panel (Reset) */}
      <Box sx={{ minWidth: 120, pl: { lg: 2 }, borderLeft: { lg: '1px solid rgba(180, 120, 70, 0.15)' } }}>
        <Button
          variant="outlined"
          color="inherit"
          size="small"
          onClick={resetPipeline}
          startIcon={<ResetIcon />}
          sx={{
            borderColor: 'rgba(239, 68, 68, 0.25)',
            color: 'rgba(239, 68, 68, 0.8)',
            fontSize: '0.72rem',
            px: 1.5,
            py: 0.5,
            textTransform: 'uppercase',
            fontWeight: 700,
            '&:hover': {
              borderColor: 'rgba(239, 68, 68, 0.4)',
              bgcolor: 'rgba(239, 68, 68, 0.04)'
            }
          }}
        >
          Reset Demo
        </Button>
      </Box>
    </Box>
  );
}
