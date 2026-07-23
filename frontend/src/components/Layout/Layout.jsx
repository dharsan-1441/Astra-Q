import React, { useState, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, LinearProgress } from '@mui/material';
import Navbar, { NAVBAR_HEIGHT } from '../Navbar/Navbar';
import Sidebar, { SIDEBAR_WIDTH } from '../Sidebar/Sidebar';
import PipelineStepper from '../PipelineStepper/PipelineStepper';

function PageLoader() {
  return (
    <Box sx={{ width: '100%', pt: 0.5 }}>
      <LinearProgress
        sx={{
          height: 2,
          '& .MuiLinearProgress-bar': {
            background: 'linear-gradient(90deg, #C9955F 0%, #CE9126 100%)',
          },
        }}
      />
    </Box>
  );
}

function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMenuToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleMobileClose = () => {
    setMobileOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <Navbar onMenuToggle={handleMenuToggle} />
      <Sidebar mobileOpen={mobileOpen} onMobileClose={handleMobileClose} />

      <Box
        component="main"
        id="main-content"
        role="main"
        aria-label="Main content"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
          ml: { md: `${SIDEBAR_WIDTH}px` },
          mt: `${NAVBAR_HEIGHT}px`,
          p: { xs: 2, sm: 2.5, md: 3 },
          minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
          overflow: 'auto',
          maxWidth: { lg: `calc(100vw - ${SIDEBAR_WIDTH}px)` },
        }}
      >
        <PipelineStepper />
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </Box>
    </Box>
  );
}

export default Layout;
