import React, { useMemo, memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, useTheme, alpha, Tooltip, Divider, Paper, Button
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Refresh as RefreshIcon,
  ArrowForward as ArrowIcon,
  CheckCircle as ReadyIcon,
  Error as BlockedIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';

import { usePipeline, PIPELINE_STEPS } from '../context/PipelineContext';
import useEnterpriseData from '../hooks/useEnterpriseData';
import GaugeChart from '../components/charts/GaugeChart';
import AnimatedCounter from '../components/charts/AnimatedCounter';
import ChartWrapper from '../components/charts/ChartWrapper';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import EmptyState from '../components/ui/EmptyState';

// CyberSecurity-DarkGold Palette colors
const CHART_COLORS = [
  '#C9955F', // Warm Gold/Bronze
  '#CE9126', // Gold Accent
  '#E8A33D', // Bright Gold Accent
  '#3FA189', // Teal Swirl Accent
  '#8A6D1F', // Dark Olive Gold
  '#1E242C', // Deep Blue/Navy
  '#10B981', // Success Green
  '#F59E0B', // Warning Amber
];

const tooltipStyle = {
  backgroundColor: '#28221B', // theme.palette.background.elevated
  border: '1px solid rgba(180, 120, 70, 0.15)',
  borderRadius: 10,
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: 13,
  color: '#FFF6C8',
};

const KpiCard = memo(function KpiCard({ label, value, suffix, icon: Icon, color, trend }) {
  const theme = useTheme();
  return (
    <Card sx={{ height: '100%', border: '1px solid rgba(180, 120, 70, 0.15)' }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography
            variant="overline"
            sx={{ fontSize: '0.8125rem', color: 'text.secondary', fontWeight: 600, lineHeight: 1.3 }}
          >
            {label}
          </Typography>
          <Box
            sx={{
              width: 32, height: 32, borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: alpha(color && color !== 'text.secondary' ? color : theme.palette.primary.main, 0.08),
              border: `1px solid ${alpha(color && color !== 'text.secondary' ? color : theme.palette.primary.main, 0.15)}`,
            }}
          >
            <Icon sx={{ fontSize: 18, color: color && color !== 'text.secondary' ? color : 'primary.main' }} />
          </Box>
        </Box>
        {typeof value === 'number' ? (
          <AnimatedCounter
            value={value}
            suffix={suffix}
            variant="h2"
            fontWeight={700}
            sx={{ fontSize: '1.875rem', lineHeight: 1.2, fontFamily: '"JetBrains Mono", monospace', color: color && color !== 'text.secondary' ? color : 'text.primary' }}
          />
        ) : (
          <Typography
            variant="h2"
            sx={{
              fontSize: '1.875rem',
              lineHeight: 1.2,
              fontFamily: '"JetBrains Mono", monospace',
              color: 'text.secondary',
              fontWeight: 700,
            }}
          >
            {value}
          </Typography>
        )}
        {trend && (
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.75, display: 'block', fontSize: '0.75rem' }}>
            {trend}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
});

// Interactive 3x3 Risk Heatmap
const RiskHeatmap = ({ data }) => {
  const colOrder = ['Low', 'Medium', 'High'];
  const rowOrder = ['High', 'Medium', 'Low'];

  const getCellStyles = (row, col) => {
    if (row === 'High' && col === 'High') {
      return {
        bg: 'rgba(239, 68, 68, 0.22)',
        border: 'rgba(239, 68, 68, 0.45)',
        text: '#FCA5A5',
        label: 'Critical'
      };
    }
    if ((row === 'High' && col === 'Medium') || (row === 'Medium' && col === 'High')) {
      return {
        bg: 'rgba(249, 115, 22, 0.18)',
        border: 'rgba(249, 115, 22, 0.4)',
        text: '#FDBA74',
        label: 'High'
      };
    }
    if ((row === 'High' && col === 'Low') || (row === 'Medium' && col === 'Medium') || (row === 'Low' && col === 'High')) {
      return {
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.3)',
        text: '#FDE047',
        label: 'Medium'
      };
    }
    if ((row === 'Medium' && col === 'Low') || (row === 'Low' && col === 'Medium')) {
      return {
        bg: 'rgba(16, 185, 129, 0.08)',
        border: 'rgba(16, 185, 129, 0.22)',
        text: '#A7F3D0',
        label: 'Low'
      };
    }
    return {
      bg: 'rgba(16, 185, 129, 0.16)',
      border: 'rgba(16, 185, 129, 0.4)',
      text: '#6EE7B7',
      label: 'Secure'
    };
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', py: 1 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 1fr', gap: 1.5, position: 'relative' }}>
        {/* Y-axis Label */}
        <Box sx={{
          gridRow: '1 / span 3',
          gridColumn: '1',
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
          fontSize: '0.65rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          pr: 1
        }}>
          Asset Criticality
        </Box>

        {rowOrder.map((row) => (
          <React.Fragment key={row}>
            {colOrder.map((col) => {
              const assetsInCell = data[row]?.[col] || [];
              const count = assetsInCell.length;
              const cellStyle = getCellStyles(row, col);
              
              return (
                <Tooltip
                  key={col}
                  title={
                    <Box sx={{ p: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: '#FFF6C8' }}>
                        {row} Criticality × {col} Quantum Vulnerability
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
                        Risk Class: {cellStyle.label} Risk
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>
                        {count} system{count !== 1 ? 's' : ''} affected
                      </Typography>
                      {count > 0 && (
                        <Box sx={{ mt: 1, pl: 1, borderLeft: '2px solid #CE9126' }}>
                          {assetsInCell.slice(0, 3).map(a => (
                            <Typography key={a.id} variant="caption" sx={{ display: 'block', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                              • {a.name}
                            </Typography>
                          ))}
                          {count > 3 && (
                            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', fontStyle: 'italic', color: 'text.muted' }}>
                              + {count - 3} more systems
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  }
                  arrow
                >
                  <Box
                    sx={{
                      aspectRatio: '1.4/1',
                      borderRadius: '6px',
                      bgcolor: cellStyle.bg,
                      border: '1px solid',
                      borderColor: cellStyle.border,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'scale(1.04)',
                        boxShadow: `0 4px 14px ${cellStyle.border}`,
                        borderColor: '#CE9126'
                      }
                    }}
                  >
                    <Typography variant="h5" sx={{ fontWeight: 800, color: cellStyle.text, fontFamily: '"JetBrains Mono", monospace' }}>
                      {count}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.52rem', color: cellStyle.text, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em', mt: 0.25 }}>
                      {cellStyle.label}
                    </Typography>
                  </Box>
                </Tooltip>
              );
            })}
          </React.Fragment>
        ))}

        {/* X-axis labels row */}
        <Box sx={{ gridColumn: '2', textAlign: 'center', color: 'text.secondary', fontSize: '0.65rem', fontWeight: 600 }}>Low</Box>
        <Box sx={{ gridColumn: '3', textAlign: 'center', color: 'text.secondary', fontSize: '0.65rem', fontWeight: 600 }}>Medium</Box>
        <Box sx={{ gridColumn: '4', textAlign: 'center', color: 'text.secondary', fontSize: '0.65rem', fontWeight: 600 }}>High</Box>
        
        {/* X-axis global label */}
        <Box sx={{
          gridColumn: '2 / span 3',
          textAlign: 'center',
          color: 'text.secondary',
          fontSize: '0.65rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          mt: 0.5
        }}>
          Quantum Vulnerability (Attack Likelihood)
        </Box>
      </Box>
    </Box>
  );
};

const PendingWidget = ({ title, moduleLabel, stepPath }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  return (
    <Card sx={{ height: { xs: 'auto', md: '380px' }, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(180, 120, 70, 0.25)', bgcolor: 'rgba(255, 255, 255, 0.01)' }}>
      <CardContent sx={{ textAlign: 'center', p: 3 }}>
        <Box sx={{ color: 'text.secondary', mb: 1.5 }}>
          <LockIcon sx={{ fontSize: 28, color: '#C9955F', opacity: 0.6 }} />
        </Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
          {title} Pending
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, maxWidth: 220, mx: 'auto' }}>
          Please execute the "{moduleLabel}" module to unlock this widget.
        </Typography>
        <Button
          variant="outlined"
          color="primary"
          size="small"
          onClick={() => navigate(stepPath)}
          sx={{ fontSize: '0.68rem', py: 0.5, px: 1.5, fontWeight: 700 }}
        >
          Go to {moduleLabel}
        </Button>
      </CardContent>
    </Card>
  );
};

function Dashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { pipelineState } = usePipeline();
  const { metrics, isLoading, refresh, readiness, discovery } = useEnterpriseData();

  // Readiness distribution data
  const readinessDistData = useMemo(() => {
    if (!readiness.summary?.readiness_distribution) return [];
    return Object.entries(readiness.summary.readiness_distribution).map(([range, count]) => ({
      range,
      count,
    }));
  }, [readiness.summary]);

  // Dynamic algorithm distribution data
  const algoDistributionData = useMemo(() => {
    const counts = {};
    (discovery.assets || []).forEach((a) => {
      const algo = a.metadata?.crypto_algorithm || 'none';
      const cleanAlgo = algo === 'none' ? 'Plaintext / None' : algo;
      counts[cleanAlgo] = (counts[cleanAlgo] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([algo, count]) => ({ algo, count }))
      .sort((a, b) => b.count - a.count);
  }, [discovery.assets]);

  // Compute 3x3 Risk Heatmap
  const heatmapData = useMemo(() => {
    const matrix = {
      High: { High: [], Medium: [], Low: [] },
      Medium: { High: [], Medium: [], Low: [] },
      Low: { High: [], Medium: [], Low: [] }
    };

    const assessmentMap = new Map((readiness.assessments || []).map(ass => [ass.asset_id, ass]));

    (discovery.assets || []).forEach(a => {
      const ass = assessmentMap.get(a.id);
      
      let critLevel = 'Low';
      if (a.criticality === 'critical' || a.criticality === 'high') {
        critLevel = 'High';
      } else if (a.criticality === 'medium') {
        critLevel = 'Medium';
      }

      let vulnLevel = 'Low';
      if (ass) {
        if (ass.classification === 'Legacy Blocker' || ass.classification === 'Unsupported' || a.legacy) {
          vulnLevel = 'High';
        } else if (ass.classification === 'Upgrade Required') {
          vulnLevel = 'Medium';
        }
      } else {
        if (a.legacy) {
          vulnLevel = 'High';
        } else if (a.criticality === 'critical' || a.criticality === 'high') {
          vulnLevel = 'Medium';
        }
      }

      matrix[critLevel][vulnLevel].push(a);
    });

    return matrix;
  }, [discovery.assets, readiness.assessments]);

  if (isLoading && metrics.totalAssets === 0) {
    return (
      <Box id="page-dashboard" sx={{ py: 1.5 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h1" component="h1" sx={{ mb: 1 }}>Executive Dashboard</Typography>
          <Typography variant="subtitle1">Enterprise PQC migration overview</Typography>
        </Box>
        <LoadingSkeleton variant="page" />
      </Box>
    );
  }

  const isDiscovered = pipelineState.discovery === 'completed';
  const isCompatibility = pipelineState.compatibility === 'completed';
  const isReadiness = pipelineState.readiness === 'completed';
  const isSimulator = pipelineState.quantumSimulator === 'completed';
  const isBenchmark = pipelineState.benchmark === 'completed';
  const isPlanner = pipelineState.planner === 'completed';

  const isDiscoveredReady = isDiscovered && metrics.totalAssets > 0;
  const isCompatibilityReady = isDiscoveredReady && isCompatibility;
  const isReadinessReady = isDiscoveredReady && isReadiness;
  const isSimulatorReady = isDiscoveredReady && isSimulator;
  const isBenchmarkReady = isDiscoveredReady && isBenchmark;
  const isPlannerReady = isDiscoveredReady && isPlanner;

  return (
    <Box id="page-dashboard" sx={{ py: 1.5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <DashboardIcon sx={{ color: '#CE9126', fontSize: 28 }} />
            <Typography variant="h1" component="h1" className="heading-gradient">Executive Dashboard</Typography>
          </Box>
          <Typography variant="subtitle1">
            Post-Quantum Cryptography migration overview and risk analytics
          </Typography>
        </Box>
        <Tooltip title="Refresh all data">
          <IconButton onClick={refresh} size="small" aria-label="Refresh dashboard data">
            <RefreshIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Pipeline Modules Status Overview */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {PIPELINE_STEPS.slice(1).map((step) => {
          const status = pipelineState[step.key] || 'locked';
          let bgColor = 'rgba(255, 255, 255, 0.01)';
          let borderColor = 'rgba(255, 255, 255, 0.08)';
          let textColor = 'text.disabled';
          let labelText = 'Waiting';

          if (status === 'completed') {
            bgColor = 'rgba(46, 125, 50, 0.04)';
            borderColor = 'rgba(46, 125, 50, 0.2)';
            textColor = 'success.light';
            labelText = 'Completed';
          } else if (status === 'running') {
            bgColor = 'rgba(206, 145, 38, 0.04)';
            borderColor = 'rgba(206, 145, 38, 0.2)';
            textColor = '#CE9126';
            labelText = 'Running...';
          } else if (status === 'idle') {
            bgColor = 'rgba(201, 149, 95, 0.04)';
            borderColor = 'rgba(201, 149, 95, 0.25)';
            textColor = '#C9955F';
            labelText = 'Ready';
          }

          return (
            <Grid xs={12} sm={6} md={1.5} key={step.key}>
              <Card
                onClick={() => status !== 'locked' && navigate(step.path)}
                sx={{
                  bgcolor: bgColor,
                  border: `1px solid ${borderColor}`,
                  textAlign: 'center',
                  py: 1.5,
                  cursor: status !== 'locked' ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  '&:hover': status !== 'locked' ? { transform: 'translateY(-2px)', bgcolor: alpha(theme.palette.primary.main, 0.02) } : {}
                }}
              >
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: 'text.secondary', fontSize: '0.65rem', textTransform: 'uppercase', px: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {step.label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.5, color: textColor }}>
                  {labelText}
                </Typography>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* KPI Strip */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid xs={12} sm={6} md={2}>
          <KpiCard
            label="Crypto Assets"
            value={isDiscoveredReady ? metrics.totalAssets : "—"}
            icon={SecurityIcon}
            color={isDiscoveredReady ? "#C9955F" : "text.secondary"}
            trend={isDiscoveredReady ? "Discovered systems" : "Run Enterprise Discovery"}
          />
        </Grid>
        <Grid xs={12} sm={6} md={2}>
          <KpiCard
            label="PQC Index"
            value={isReadinessReady ? metrics.readinessScore : "—"}
            suffix={isReadinessReady ? "%" : ""}
            icon={ReadyIcon}
            color={isReadinessReady ? theme.palette.success.main : "text.secondary"}
            trend={isReadinessReady ? "Enterprise readiness" : "Not yet calculated"}
          />
        </Grid>
        <Grid xs={12} sm={6} md={2}>
          <KpiCard
            label="PQC Transition"
            value={isPlannerReady ? metrics.migrationProgress : "—"}
            suffix={isPlannerReady ? "%" : ""}
            icon={TrendingUpIcon}
            color={isPlannerReady ? "#3FA189" : "text.secondary"}
            trend={isPlannerReady ? "Progress rate" : "Not yet calculated"}
          />
        </Grid>
        <Grid xs={12} sm={6} md={2}>
          <KpiCard
            label="Quantum Risk"
            value={isReadinessReady ? metrics.overallRisk : "—"}
            suffix={isReadinessReady ? "%" : ""}
            icon={WarningIcon}
            color={isReadinessReady ? theme.palette.warning.main : "text.secondary"}
            trend={isReadinessReady ? "Overall risk exposure" : "Awaiting analysis"}
          />
        </Grid>
        <Grid xs={12} sm={6} md={2}>
          <KpiCard
            label="Blockers"
            value={isPlannerReady ? metrics.blockers : "—"}
            icon={BlockedIcon}
            color={isPlannerReady ? theme.palette.error.main : "text.secondary"}
            trend={isPlannerReady ? "Migration blockers" : "Awaiting analysis"}
          />
        </Grid>
        <Grid xs={12} sm={6} md={2}>
          <KpiCard
            label="PQC Benchmarks"
            value={isBenchmarkReady ? metrics.benchmarkCount : "—"}
            icon={SpeedIcon}
            color={isBenchmarkReady ? theme.palette.secondary.main : "text.secondary"}
            trend={isBenchmarkReady ? "Performance tests" : "Awaiting analysis"}
          />
        </Grid>
      </Grid>

      {/* Main Analytics Row */}
      <Grid container spacing={3.5} sx={{ mb: 3.5 }}>
        {/* Enterprise PQC Health */}
        <Grid xs={12} md={3}>
          {isReadinessReady ? (
            <ChartWrapper title="Enterprise Quantum Health" height={280} sx={{ height: '100%', border: '1px solid rgba(180, 120, 70, 0.15)' }}>
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 2.5,
                pt: 1,
              }}>
                <GaugeChart
                  value={metrics.readinessScore}
                  size={160}
                  strokeWidth={14}
                  label="Score"
                />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                    Based on {metrics.totalAssets} cryptographic nodes
                  </Typography>
                </Box>
              </Box>
            </ChartWrapper>
          ) : (
            <PendingWidget title="Enterprise Quantum Health" moduleLabel="Readiness Assessment" stepPath="/readiness" />
          )}
        </Grid>

        {/* Compatibility Breakdown */}
        <Grid xs={12} sm={6} md={4.5}>
          {isCompatibilityReady ? (
            <ChartWrapper title="Post-Quantum Compatibility Tiers" height={280} sx={{ border: '1px solid rgba(180, 120, 70, 0.15)' }}>
              {metrics.classificationData.length > 0 ? (
                <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                  {/* Center score display */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '40%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <Typography
                      variant="h2"
                      sx={{
                        fontWeight: 800,
                        fontSize: '2.25rem',
                        fontFamily: '"JetBrains Mono", monospace',
                        color: 'text.primary',
                        lineHeight: 1,
                      }}
                    >
                      {metrics.readinessScore}%
                    </Typography>
                    <Typography
                      variant="overline"
                      sx={{
                        fontSize: '0.75rem',
                        color: 'text.secondary',
                        fontWeight: 600,
                        mt: 0.5,
                        display: 'block',
                      }}
                    >
                      Readiness
                    </Typography>
                  </Box>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.classificationData}
                        cx="50%"
                        cy="48%"
                        innerRadius={68}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                        animationBegin={100}
                        animationDuration={800}
                      >
                        {metrics.classificationData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={tooltipStyle} />
                      <Legend
                        verticalAlign="bottom"
                        height={40}
                        iconSize={10}
                        iconType="circle"
                        formatter={(val) => (
                          <span style={{ fontSize: '0.875rem', color: '#9C9689', fontWeight: 500 }}>{val}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="caption" color="text.secondary">Run readiness analysis first</Typography>
                </Box>
              )}
            </ChartWrapper>
          ) : (
            <PendingWidget title="Post-Quantum Compatibility Tiers" moduleLabel="Compatibility Analysis" stepPath="/compatibility" />
          )}
        </Grid>

        {/* Algorithm Distribution */}
        <Grid xs={12} sm={6} md={4.5}>
          {isDiscoveredReady ? (
            <ChartWrapper title="Cryptographic Algorithm Family Distribution" height={280} sx={{ border: '1px solid rgba(180, 120, 70, 0.15)' }}>
              {algoDistributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={algoDistributionData} layout="vertical" margin={{ left: 24, right: 16, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(180, 120, 70, 0.1)" horizontal={false} />
                    <XAxis type="number" stroke={theme.palette.text.disabled} tick={{ fontSize: 12, fontFamily: '"JetBrains Mono", monospace', fill: '#9C9689' }} />
                    <YAxis dataKey="algo" type="category" stroke={theme.palette.text.disabled} tick={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', fill: '#9C9689' }} width={90} />
                    <RechartsTooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#C9955F" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="caption" color="text.secondary">No cryptography detected</Typography>
                </Box>
              )}
            </ChartWrapper>
          ) : (
            <PendingWidget title="Cryptographic Algorithm Distribution" moduleLabel="Enterprise Discovery" stepPath="/discovery" />
          )}
        </Grid>
      </Grid>

      {/* Second Row — Score Distribution + 3x3 Risk Heatmap + Wave Summary */}
      <Grid container spacing={3.5} sx={{ mb: 3.5 }}>
        <Grid xs={12} md={4}>
          {isReadinessReady ? (
            <ChartWrapper title="Readiness Score Distribution" height={240} sx={{ border: '1px solid rgba(180, 120, 70, 0.15)' }}>
              {readinessDistData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={readinessDistData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(180, 120, 70, 0.1)" />
                    <XAxis dataKey="range" stroke={theme.palette.text.disabled} tick={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', fill: '#9C9689' }} />
                    <YAxis stroke={theme.palette.text.disabled} tick={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', fill: '#9C9689' }} />
                    <RechartsTooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#CE9126" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </ChartWrapper>
          ) : (
            <PendingWidget title="Readiness Score Distribution" moduleLabel="Readiness Assessment" stepPath="/readiness" />
          )}
        </Grid>

        {/* 3x3 Risk Heatmap */}
        <Grid xs={12} md={4}>
          {isSimulatorReady ? (
            <ChartWrapper title="Cryptographic Quantum Risk Matrix (3x3)" height={240} sx={{ border: '1px solid rgba(180, 120, 70, 0.15)' }}>
              <RiskHeatmap data={heatmapData} />
            </ChartWrapper>
          ) : (
            <PendingWidget title="Cryptographic Quantum Risk Matrix" moduleLabel="Quantum Threat Simulator" stepPath="/quantum-simulator" />
          )}
        </Grid>

        <Grid xs={12} md={4}>
          {isPlannerReady ? (
            <ChartWrapper title="Migration Wave Timeline" height={240} sx={{ border: '1px solid rgba(180, 120, 70, 0.15)' }}>
              {metrics.waveSummary.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.waveSummary} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(180, 120, 70, 0.1)" />
                    <XAxis dataKey="name" stroke={theme.palette.text.disabled} tick={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', fill: '#9C9689' }} />
                    <YAxis stroke={theme.palette.text.disabled} tick={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace', fill: '#9C9689' }} />
                    <RechartsTooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="risk" stroke={theme.palette.warning.main} fill={alpha(theme.palette.warning.main, 0.08)} strokeWidth={2} />
                    <Area type="monotone" dataKey="duration" stroke="#C9955F" fill="rgba(201, 149, 95, 0.08)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : null}
            </ChartWrapper>
          ) : (
            <PendingWidget title="Migration Wave Timeline" moduleLabel="Migration Planner" stepPath="/planner" />
          )}
        </Grid>
      </Grid>

      {/* Quantum Readiness & Hybrid Resources */}
      <Grid container spacing={3.5} sx={{ mb: 3.5 }}>
        <Grid xs={12} md={4}>
          {isReadinessReady ? (
            <Card sx={{ height: '100%', border: '1px solid rgba(180, 120, 70, 0.15)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1.0625rem', color: 'text.primary', mb: 2 }}>
                  PQC Readiness Score
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180 }}>
                  <GaugeChart value={metrics.readinessScore} size={150} color={theme.palette.success.main} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                    Your enterprise post-quantum transition readiness score.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <PendingWidget title="PQC Readiness Score" moduleLabel="Readiness Assessment" stepPath="/readiness" />
          )}
        </Grid>

        <Grid xs={12} md={4}>
          {isReadinessReady ? (
            <Card sx={{ height: '100%', border: '1px solid rgba(180, 120, 70, 0.15)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1.0625rem', color: 'text.primary', mb: 2 }}>
                  Active Post-Quantum Security Profile
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ p: 1.5, borderRadius: '8px', border: '1px solid rgba(201, 149, 95, 0.2)', bgcolor: 'rgba(201, 149, 95, 0.04)' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>Security Level 3 (Standard-Compliant)</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, color: 'primary.main', mt: 0.5 }}>
                      ML-KEM-768 &amp; ML-DSA-65 &amp; TLS 1.3
                    </Typography>
                    <Typography variant="caption" color="text.muted" sx={{ display: 'block', mt: 0.5 }}>
                      Lattice-based LWE security parameters with AES-192 equivalent strength.
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">TLS compliance rating</Typography>
                    <Chip label="92% Compliant" size="small" color="success" sx={{ fontWeight: 600 }} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Overall quantum standing</Typography>
                    <Chip label="Ready" size="small" variant="outlined" color="primary" sx={{ fontWeight: 600 }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <PendingWidget title="Active PQC Security Profile" moduleLabel="Readiness Assessment" stepPath="/readiness" />
          )}
        </Grid>

        <Grid xs={12} md={4}>
          {isSimulatorReady ? (
            <Card sx={{ height: '100%', border: '1px solid rgba(180, 120, 70, 0.15)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1.0625rem', color: 'text.primary', mb: 2 }}>
                  Simulated Quantum Resource Standing
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(180, 120, 70, 0.1)', pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Simulated Qubits</Typography>
                    <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>4 Logical / 44 Physical</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(180, 120, 70, 0.1)', pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Quantum Simulator Memory</Typography>
                    <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>256 Bytes</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(180, 120, 70, 0.1)', pb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Quantum Gate Operations</Typography>
                    <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>12 operations</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Circuit depth</Typography>
                    <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontWeight: 600 }}>Level 5 depth</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <PendingWidget title="Simulated Quantum Resource Standing" moduleLabel="Quantum Threat Simulator" stepPath="/quantum-simulator" />
          )}
        </Grid>
      </Grid>

      {/* Bottom Row — Critical Assets + Top Blockers */}
      <Grid container spacing={3.5}>
        {/* Critical Assets Table */}
        <Grid xs={12} md={7}>
          {isDiscoveredReady ? (
            <Card sx={{ border: '1px solid rgba(180, 120, 70, 0.15)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1.0625rem', color: 'text.primary' }}>
                    Critical &amp; Legacy Assets
                  </Typography>
                  <Chip label={`${metrics.criticalAssetList.length} items`} size="small" sx={{ height: 22, fontSize: '0.6875rem', fontWeight: 600 }} />
                </Box>
                {metrics.criticalAssetList.length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Asset</TableCell>
                           <TableCell>Type</TableCell>
                          <TableCell>Criticality</TableCell>
                          <TableCell align="center">Legacy</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {metrics.criticalAssetList.map((asset) => (
                          <TableRow key={asset.id}>
                            <TableCell sx={{ py: 1.5 }}>
                              <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                                {asset.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem' }}>
                                {asset.id}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={asset.type} size="small" sx={{ textTransform: 'uppercase', height: 20, fontSize: '0.6875rem', fontWeight: 600 }} />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={asset.criticality}
                                size="small"
                                sx={{
                                  height: 20, fontSize: '0.6875rem', textTransform: 'uppercase', fontWeight: 600,
                                  bgcolor: alpha(asset.criticality === 'critical' ? theme.palette.error.main : theme.palette.warning.main, 0.1),
                                  color: asset.criticality === 'critical' ? 'error.light' : 'warning.light',
                                  border: `1px solid ${alpha(asset.criticality === 'critical' ? theme.palette.error.main : theme.palette.warning.main, 0.2)}`,
                                }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              {asset.legacy ? (
                                <WarningIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                              ) : (
                                <Typography variant="caption" color="text.secondary">—</Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">No critical assets detected</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : (
            <PendingWidget title="Critical & Legacy Assets" moduleLabel="Enterprise Discovery" stepPath="/discovery" />
          )}
        </Grid>

        {/* Top Blockers */}
        <Grid xs={12} md={5}>
          {isPlannerReady ? (
            <Card sx={{ height: '100%', border: '1px solid rgba(180, 120, 70, 0.15)' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1.0625rem', color: 'text.primary' }}>
                    Migration Blockers
                  </Typography>
                  <Chip
                    label={`${metrics.topBlockers.length} blockers`}
                    size="small"
                    sx={{ height: 22, fontSize: '0.6875rem', fontWeight: 600 }}
                    color={metrics.topBlockers.length > 0 ? 'error' : 'default'}
                  />
                </Box>
                {metrics.topBlockers.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {metrics.topBlockers.slice(0, 5).map((blocker, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          p: 2,
                          border: '1px solid rgba(239, 68, 68, 0.15)',
                          borderRadius: '8px',
                          bgcolor: 'rgba(239, 68, 68, 0.02)',
                          borderLeft: '4px solid rgba(239, 68, 68, 0.5)',
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                            {blocker.asset}
                          </Typography>
                          <Chip
                            label={`Wave ${blocker.wave}`}
                            size="small"
                            sx={{ height: 18, fontSize: '0.625rem', fontWeight: 600 }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: 'block', mt: 0.5 }}>
                          Blocked by: {blocker.blockers.join(', ')}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ py: 6, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <ReadyIcon sx={{ fontSize: 36, color: alpha(theme.palette.success.main, 0.3) }} />
                    <Typography variant="caption" color="text.secondary">No migration blockers</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          ) : (
            <PendingWidget title="Migration Blockers" moduleLabel="Migration Planner" stepPath="/planner" />
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
