import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';

const NAVBAR_HEIGHT = 60; // 60px premium height

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/discovery': 'Enterprise Discovery',
  '/dependency-graph': 'Dependency Graph',
  '/compatibility': 'Compatibility Hub',
  '/readiness': 'Readiness Assessment',
  '/benchmark': 'Benchmark Engine',
  '/planner': 'Migration Planner',
  '/report': 'Audit Report',
};

function Navbar({ onMenuToggle }) {
  const theme = useTheme();
  const location = useLocation();
  const currentPage = PAGE_TITLES[location.pathname] || 'Dashboard';

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        height: NAVBAR_HEIGHT,
        zIndex: theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar
        sx={{
          height: NAVBAR_HEIGHT,
          minHeight: `${NAVBAR_HEIGHT}px !important`,
          px: { xs: 2, sm: 3 },
          gap: 1.5,
        }}
      >
        <IconButton
          id="nav-menu-toggle"
          edge="start"
          color="inherit"
          aria-label="Toggle sidebar navigation"
          onClick={onMenuToggle}
          sx={{
            display: { md: 'none' },
            mr: 0.5,
          }}
        >
          <MenuIcon sx={{ fontSize: 22 }} />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ShieldIcon
            sx={{
              fontSize: 24,
              color: '#CE9126', // Logo gold accent
            }}
          />
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              fontSize: '1.0625rem', // 17px
              color: '#F5EFE0', // linkTextColor
              letterSpacing: '-0.02em',
            }}
          >
            AstraQ
          </Typography>
          <Chip
            label="v0.1"
            size="small"
            sx={{
              height: 18,
              fontSize: '0.625rem',
              fontWeight: 600,
              borderColor: 'rgba(201, 149, 95, 0.3)',
              color: '#C9BFA6', // linkTextColorMuted
              bgcolor: 'rgba(201, 149, 95, 0.08)',
              border: '1px solid rgba(201, 149, 95, 0.2)',
            }}
          />
        </Box>

        {/* Breadcrumb-style page indicator */}
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            alignItems: 'center',
            gap: 1.5,
            ml: 2.5,
          }}
        >
          <Box
            sx={{
              width: 1,
              height: 20,
              bgcolor: 'divider',
            }}
          />
          <Typography
            variant="body2"
            sx={{
              color: '#C9BFA6', // linkTextColorMuted
              fontSize: '0.875rem', // ~14px
              fontWeight: 500,
            }}
          >
            {currentPage}
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            px: 2,
            py: 0.75,
            borderRadius: 1.5,
            border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            bgcolor: alpha(theme.palette.success.main, 0.04),
          }}
        >
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              bgcolor: 'success.main',
              boxShadow: `0 0 8px ${theme.palette.success.main}`,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.75rem',
              color: 'success.light',
              fontWeight: 600,
              display: { xs: 'none', md: 'block' },
            }}
          >
            NIST FIPS 203/204
          </Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export { Navbar, NAVBAR_HEIGHT };
export default Navbar;
