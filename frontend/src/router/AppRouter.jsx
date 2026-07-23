import React, { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';
import Dashboard from '../pages/Dashboard';

// Lazy-loaded pages for better initial load performance
const EnterpriseDiscovery = lazy(() => import('../pages/EnterpriseDiscovery'));
const ConfigurationConverter = lazy(() => import('../pages/ConfigurationConverter'));
const DependencyGraph = lazy(() => import('../pages/DependencyGraph'));
const Benchmark = lazy(() => import('../pages/Benchmark'));
const Compatibility = lazy(() => import('../pages/Compatibility'));
const MigrationPlanner = lazy(() => import('../pages/MigrationPlanner'));
const DeploymentReport = lazy(() => import('../pages/DeploymentReport'));
const Readiness = lazy(() => import('../pages/Readiness'));
const QuantumSimulator = lazy(() => import('../pages/QuantumSimulator'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'converter',
        element: <ConfigurationConverter />,
      },
      {
        path: 'discovery',
        element: <EnterpriseDiscovery />,
      },
      {
        path: 'dependency-graph',
        element: <DependencyGraph />,
      },
      {
        path: 'benchmark',
        element: <Benchmark />,
      },
      {
        path: 'compatibility',
        element: <Compatibility />,
      },
      {
        path: 'readiness',
        element: <Readiness />,
      },
      {
        path: 'planner',
        element: <MigrationPlanner />,
      },
      {
        path: 'report',
        element: <DeploymentReport />,
      },
      {
        path: 'quantum-simulator',
        element: <QuantumSimulator />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

export default router;

