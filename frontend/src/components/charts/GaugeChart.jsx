import React, { memo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';

const GaugeChart = memo(function GaugeChart({
  value = 0,
  maxValue = 100,
  size = 120,
  strokeWidth = 8,
  label = '',
  sublabel = '',
  colorThresholds = null,
}) {
  const theme = useTheme();
  const normalizedValue = Math.min(Math.max(value, 0), maxValue);
  const percentage = (normalizedValue / maxValue) * 100;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const defaultThresholds = [
    { min: 90, color: theme.palette.success.main },
    { min: 70, color: theme.palette.primary.main },
    { min: 40, color: theme.palette.warning.main },
    { min: 0, color: theme.palette.error.main },
  ];

  const thresholds = colorThresholds || defaultThresholds;
  const activeColor = thresholds.find((t) => percentage >= t.min)?.color || theme.palette.primary.main;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={alpha(theme.palette.text.disabled, 0.1)}
            strokeWidth={strokeWidth}
          />
          {/* Value arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={activeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 800ms ease-out, stroke 300ms ease',
              filter: `drop-shadow(0 0 4px ${alpha(activeColor, 0.3)})`,
            }}
          />
        </svg>
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              fontFamily: '"JetBrains Mono", monospace',
              color: activeColor,
              fontSize: size * 0.22,
              lineHeight: 1,
            }}
          >
            {Math.round(normalizedValue)}
          </Typography>
          {label && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.disabled',
                fontSize: size * 0.085,
                mt: 0.25,
              }}
            >
              {label}
            </Typography>
          )}
        </Box>
      </Box>
      {sublabel && (
        <Typography variant="caption" color="text.secondary" align="center" sx={{ fontSize: '0.6875rem' }}>
          {sublabel}
        </Typography>
      )}
    </Box>
  );
});

export default GaugeChart;
