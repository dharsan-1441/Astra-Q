import React, { memo } from 'react';
import { Box, Typography, Button, alpha, useTheme } from '@mui/material';
import { InboxOutlined } from '@mui/icons-material';

const EmptyState = memo(function EmptyState({
  icon: Icon = InboxOutlined,
  title = 'No data available',
  description = '',
  actionLabel = '',
  onAction = null,
  minHeight = 300,
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight,
        py: 6,
        px: 3,
        textAlign: 'center',
        border: `1px dashed ${alpha(theme.palette.divider, 0.5)}`,
        borderRadius: '10px',
        bgcolor: alpha(theme.palette.background.paper, 0.3),
      }}
    >
      <Icon
        sx={{
          fontSize: 40,
          color: alpha(theme.palette.text.disabled, 0.3),
          mb: 2,
        }}
      />
      <Typography
        variant="body1"
        sx={{ fontWeight: 500, color: 'text.secondary', mb: 0.5 }}
      >
        {title}
      </Typography>
      {description && (
        <Typography variant="caption" color="text.disabled" sx={{ maxWidth: 360, mb: actionLabel ? 2.5 : 0 }}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button
          variant="outlined"
          size="small"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
});

export default EmptyState;
