import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme/theme';
import router from './router/AppRouter';
import { PipelineProvider } from './context/PipelineContext';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <PipelineProvider>
        <RouterProvider router={router} />
      </PipelineProvider>
    </ThemeProvider>
  );
}

export default App;
