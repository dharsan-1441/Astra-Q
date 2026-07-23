import React, { memo } from 'react';
import { Box, Skeleton, alpha, useTheme } from '@mui/material';

const LoadingSkeleton = memo(function LoadingSkeleton({
  variant = 'cards', // 'cards' | 'table' | 'chart' | 'page'
  count = 4,
}) {
  const theme = useTheme();
  const skeletonSx = {
    bgcolor: alpha(theme.palette.text.disabled, 0.04),
    borderRadius: 1,
  };

  if (variant === 'cards') {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: `repeat(${Math.min(count, 4)}, 1fr)` }, gap: 2 }}>
        {Array.from({ length: count }).map((_, i) => (
          <Box
            key={i}
            sx={{
              p: 2.5,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.background.paper, 0.5),
            }}
          >
            <Skeleton variant="text" width="60%" height={14} sx={skeletonSx} />
            <Skeleton variant="text" width="40%" height={28} sx={{ ...skeletonSx, mt: 1 }} />
            <Skeleton variant="text" width="80%" height={10} sx={{ ...skeletonSx, mt: 1.5 }} />
          </Box>
        ))}
      </Box>
    );
  }

  if (variant === 'table') {
    return (
      <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
          <Box sx={{ display: 'flex', gap: 3 }}>
            {[80, 120, 100, 60].map((w, i) => (
              <Skeleton key={i} variant="text" width={w} height={12} sx={skeletonSx} />
            ))}
          </Box>
        </Box>
        {Array.from({ length: count }).map((_, i) => (
          <Box key={i} sx={{ p: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', gap: 3 }}>
              {[80, 120, 100, 60].map((w, j) => (
                <Skeleton key={j} variant="text" width={w} height={14} sx={skeletonSx} />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    );
  }

  if (variant === 'chart') {
    return (
      <Box sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
        <Skeleton variant="text" width="40%" height={14} sx={skeletonSx} />
        <Skeleton variant="rectangular" height={200} sx={{ ...skeletonSx, mt: 1.5 }} />
      </Box>
    );
  }

  // variant === 'page'
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Skeleton variant="text" width={200} height={24} sx={skeletonSx} />
        <Skeleton variant="text" width={320} height={14} sx={{ ...skeletonSx, mt: 0.5 }} />
      </Box>
      <LoadingSkeleton variant="cards" count={4} />
      <LoadingSkeleton variant="chart" />
      <LoadingSkeleton variant="table" count={5} />
    </Box>
  );
});

export default LoadingSkeleton;
