import React, { memo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';

const STATUS_CONFIG = {
  success: { label: 'Ready', dotColor: 'success.main' },
  warning: { label: 'Needs Review', dotColor: 'warning.main' },
  error: { label: 'Critical', dotColor: 'error.main' },
  info: { label: 'In Progress', dotColor: 'info.main' },
  neutral: { label: 'Pending', dotColor: 'text.disabled' },
};

const StatusBadge = memo(function StatusBadge({
  status = 'neutral', // 'success' | 'warning' | 'error' | 'info' | 'neutral'
  label = '',
  size = 'default', // 'small' | 'default'
  showDot = true,
  sx = {},
}) {
  const theme = useTheme();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.neutral;
  const displayLabel = label || config.label;

  const colorMap = {
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
    neutral: theme.palette.text.disabled,
  };

  const color = colorMap[status] || colorMap.neutral;
  const isSmall = size === 'small';

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? 0.5 : 0.75,
        px: isSmall ? 0.75 : 1,
        py: isSmall ? 0.25 : 0.375,
        borderRadius: 1,
        border: `1px solid ${alpha(color, 0.2)}`,
        bgcolor: alpha(color, 0.06),
        ...sx,
      }}
      role="status"
      aria-label={`Status: ${displayLabel}`}
    >
      {showDot && (
        <Box
          sx={{
            width: isSmall ? 5 : 6,
            height: isSmall ? 5 : 6,
            borderRadius: '50%',
            bgcolor: color,
            boxShadow: `0 0 4px ${alpha(color, 0.4)}`,
            flexShrink: 0,
          }}
        />
      )}
      <Typography
        variant="caption"
        sx={{
          fontSize: isSmall ? '0.5625rem' : '0.625rem',
          fontWeight: 600,
          color: color,
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          lineHeight: 1,
        }}
      >
        {displayLabel}
      </Typography>
    </Box>
  );
});

export default StatusBadge;
