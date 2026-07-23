import React, { memo } from 'react';
import { Box, Typography, Divider, alpha, useTheme, Skeleton } from '@mui/material';

const ChartWrapper = memo(function ChartWrapper({
  title,
  subtitle,
  loading = false,
  isEmpty = false,
  emptyMessage = 'No data available',
  action,
  footer,
  children,
  sx = {},
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: '100%',
        minWidth: '100%',
        height: { xs: 'auto', md: '380px' },
        display: 'flex',
        flexDirection: 'column',
        p: 2.5,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '10px',
        bgcolor: alpha(theme.palette.background.paper, 0.4),
        boxSizing: 'border-box',
        overflow: 'hidden',
        ...sx,
      }}
    >
      {/* Header section */}
      {(title || subtitle || action) && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, minHeight: 40 }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {title && (
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  fontSize: '1.0625rem', // ~17px
                  color: 'text.primary',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontSize: '0.8125rem',
                  mt: 0.25,
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          {action && <Box sx={{ ml: 1.5, flexShrink: 0 }}>{action}</Box>}
        </Box>
      )}

      {/* Standard Divider */}
      <Divider sx={{ mb: 2, borderColor: alpha(theme.palette.divider, 0.4) }} />

      {/* Chart Area */}
      <Box
        sx={{
          width: '100%',
          height: { xs: '260px', md: '300px' },
          minHeight: { xs: '260px', md: '300px' },
          position: 'relative',
          flexGrow: 1,
        }}
      >
        {loading ? (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Skeleton variant="rectangular" height="75%" sx={{ borderRadius: '6px', bgcolor: alpha(theme.palette.text.disabled, 0.05) }} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Skeleton variant="rectangular" width="30%" height={16} sx={{ borderRadius: '4px', bgcolor: alpha(theme.palette.text.disabled, 0.05) }} />
              <Skeleton variant="rectangular" width="20%" height={16} sx={{ borderRadius: '4px', bgcolor: alpha(theme.palette.text.disabled, 0.05) }} />
            </Box>
          </Box>
        ) : isEmpty ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px dashed ${alpha(theme.palette.divider, 0.5)}`,
              borderRadius: '10px',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {emptyMessage}
            </Typography>
          </Box>
        ) : (
          children
        )}
      </Box>

      {/* Footer */}
      {footer && (
        <Box sx={{ mt: 1.5, pt: 1, borderTop: `1px solid ${alpha(theme.palette.divider, 0.2)}`, display: 'flex', alignItems: 'center' }}>
          {typeof footer === 'string' ? (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              {footer}
            </Typography>
          ) : (
            footer
          )}
        </Box>
      )}
    </Box>
  );
});

export default ChartWrapper;
