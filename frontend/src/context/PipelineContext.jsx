import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const LOCAL_STORAGE_KEY = 'pqc_pipeline_state_v1';
import { healthService } from '../api/services';

export const PIPELINE_STEPS = [
  { key: 'yamlImport', label: 'Import YAML', path: '/converter', description: 'Assess YAML inputs' },
  { key: 'discovery', label: 'Enterprise Discovery', path: '/discovery', description: 'Discover cryptography infrastructure' },
  { key: 'dependencyGraph', label: 'Dependency Graph', path: '/dependency-graph', description: 'Analyze topology boundaries' },
  { key: 'compatibility', label: 'Compatibility Analysis', path: '/compatibility', description: 'Evaluate library ciphers' },
  { key: 'readiness', label: 'Readiness Assessment', path: '/readiness', description: 'Score risk posture' },
  { key: 'quantumSimulator', label: 'Quantum Simulator', path: '/quantum-simulator', description: 'Model attack resilience' },
  { key: 'benchmark', label: 'PQC Benchmarks', path: '/benchmark', description: 'Test ciphers execution' },
  { key: 'planner', label: 'Migration Planner', path: '/planner', description: 'Generate wave rollouts' },
  { key: 'report', label: 'Deployment Report', path: '/report', description: 'Export compliance document' }
];

const INITIAL_PIPELINE_STATE = {
  yamlImport: 'idle',
  discovery: 'idle',
  dependencyGraph: 'idle',
  compatibility: 'idle',
  readiness: 'idle',
  quantumSimulator: 'idle',
  benchmark: 'idle',
  planner: 'idle',
  report: 'idle'
};

const PipelineContext = createContext(null);

export function PipelineProvider({ children }) {
  const [pipelineState, setPipelineState] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_PIPELINE_STATE;
    } catch {
      return INITIAL_PIPELINE_STATE;
    }
  });

  const [runningModule, setRunningModule] = useState(null);
  const [progress, setProgress] = useState(0);
  const [logText, setLogText] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [metrics, setMetrics] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_metrics');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeProfile, setActiveProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('pqc_active_profile');
      return saved ? saved : 'ML-KEM-512 + ML-DSA Level 1 (Hybrid Level 1)';
    } catch {
      return 'ML-KEM-512 + ML-DSA Level 1 (Hybrid Level 1)';
    }
  });

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pipelineState));
  }, [pipelineState]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY + '_metrics', JSON.stringify(metrics));
  }, [metrics]);

  useEffect(() => {
    localStorage.setItem('pqc_active_profile', activeProfile);
  }, [activeProfile]);

  const resetPipeline = useCallback(async () => {
    try {
      await healthService.resetSystem();
    } catch (err) {
      console.error('Failed to reset backend:', err);
    }
    setPipelineState(INITIAL_PIPELINE_STATE);
    setMetrics({});
    setRunningModule(null);
    setProgress(0);
    setLogText('');
    setEstimatedTime(0);
    setActiveProfile('ML-KEM-512 + ML-DSA Level 1 (Hybrid Level 1)');
  }, []);

  const setYamlLoaded = useCallback((assetCount) => {
    setPipelineState(prev => ({
      ...prev,
      yamlImport: 'completed',
      discovery: prev.discovery === 'locked' ? 'idle' : prev.discovery
    }));
    setMetrics(prev => ({
      ...prev,
      yamlImport: {
        timestamp: new Date().toLocaleTimeString(),
        duration: 'Instant',
        assetCount
      }
    }));
  }, []);

  const updateStepStatus = useCallback((key, status) => {
    setPipelineState(prev => ({
      ...prev,
      [key]: status
    }));
  }, []);

  const runModule = useCallback(async (key, steps, durationMs, assetCount = 14) => {
    if (runningModule) return;

    setRunningModule(key);
    setProgress(0);
    setPipelineState(prev => ({ ...prev, [key]: 'running' }));

    const stepInterval = durationMs / steps.length;
    let stepIndex = 0;

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (stepIndex < steps.length) {
          setLogText(steps[stepIndex]);
          setEstimatedTime(Math.round(((steps.length - stepIndex) * stepInterval) / 1000));
          setProgress(Math.round(((stepIndex + 1) / steps.length) * 100));
          stepIndex++;
        } else {
          clearInterval(interval);
          setPipelineState(prev => ({ ...prev, [key]: 'completed' }));
          setMetrics(prev => ({
            ...prev,
            [key]: {
              timestamp: new Date().toLocaleTimeString(),
              duration: `${(durationMs / 1000).toFixed(1)}s`,
              assetCount
            }
          }));
          setRunningModule(null);
          setProgress(0);
          setLogText('');
          setEstimatedTime(0);
          resolve();
        }
      }, stepInterval);
    });
  }, [runningModule]);

  const forceCompleteStep = useCallback((key, assetCount = 14) => {
    setPipelineState(prev => ({ ...prev, [key]: 'completed' }));
    setMetrics(prev => ({
      ...prev,
      [key]: {
        timestamp: new Date().toLocaleTimeString(),
        duration: 'Manual Integration',
        assetCount
      }
    }));
  }, []);

  // Determine the active step (first step that is not completed)
  const activeStepIndex = useMemo(() => {
    const index = PIPELINE_STEPS.findIndex(step => pipelineState[step.key] !== 'completed');
    return index === -1 ? PIPELINE_STEPS.length - 1 : index;
  }, [pipelineState]);

  return (
    <PipelineContext.Provider
      value={{
        pipelineState,
        activeStepIndex,
        runningModule,
        progress,
        logText,
        estimatedTime,
        metrics,
        runModule,
        setYamlLoaded,
        resetPipeline,
        forceCompleteStep,
        updateStepStatus,
        activeProfile,
        setActiveProfile
      }}
    >
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const context = useContext(PipelineContext);
  if (!context) {
    throw new Error('usePipeline must be used within a PipelineProvider');
  }
  return context;
}
