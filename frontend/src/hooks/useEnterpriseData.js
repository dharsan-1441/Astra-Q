import { useState, useEffect, useMemo, useCallback } from 'react';
import { discoveryService, readinessService, plannerService, benchmarkService, reportService } from '../api/services';

/**
 * Custom hook to aggregate enterprise data from multiple API endpoints
 * for the executive dashboard. Each dataset loads independently.
 */
export default function useEnterpriseData() {
  const [discovery, setDiscovery] = useState({ assets: [], summary: null, loading: true });
  const [readiness, setReadiness] = useState({ summary: null, assessments: [], loading: true });
  const [planner, setPlanner] = useState({ plans: [], loading: true });
  const [benchmark, setBenchmark] = useState({ sessions: [], loading: true });
  const [report, setReport] = useState({ latest: null, loading: true });

  const loadDiscovery = useCallback(async () => {
    try {
      const res = await discoveryService.listAssets();
      setDiscovery({ assets: res.data.assets || [], summary: res.data.summary || null, loading: false });
    } catch {
      setDiscovery((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const loadReadiness = useCallback(async () => {
    try {
      const [summaryRes, listRes] = await Promise.all([
        readinessService.summary(),
        readinessService.list(),
      ]);
      setReadiness({
        summary: summaryRes.data.summary || null,
        assessments: listRes.data.assessments || [],
        loading: false,
      });
    } catch {
      setReadiness((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const loadPlanner = useCallback(async () => {
    try {
      const res = await plannerService.list();
      setPlanner({ plans: res.data.plans || [], loading: false });
    } catch {
      setPlanner((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const loadBenchmark = useCallback(async () => {
    try {
      const res = await benchmarkService.list();
      setBenchmark({ sessions: res.data.sessions || [], loading: false });
    } catch {
      setBenchmark((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const loadReport = useCallback(async () => {
    // Disabled automatic request to prevent unwanted 404s before a report exists
    setReport({ latest: null, loading: false });
  }, []);

  useEffect(() => {
    loadDiscovery();
    loadReadiness();
    loadPlanner();
    loadBenchmark();
    loadReport();
  }, [loadDiscovery, loadReadiness, loadPlanner, loadBenchmark, loadReport]);

  const refresh = useCallback(() => {
    setDiscovery((prev) => ({ ...prev, loading: true }));
    setReadiness((prev) => ({ ...prev, loading: true }));
    setPlanner((prev) => ({ ...prev, loading: true }));
    setBenchmark((prev) => ({ ...prev, loading: true }));
    setReport({ latest: null, loading: false });
    loadDiscovery();
    loadReadiness();
    loadPlanner();
    loadBenchmark();
    loadReport();
  }, [loadDiscovery, loadReadiness, loadPlanner, loadBenchmark, loadReport]);

  const isLoading = discovery.loading || readiness.loading || planner.loading || benchmark.loading;

  // Computed dashboard metrics
  const metrics = useMemo(() => {
    const assets = discovery.assets;
    const rSummary = readiness.summary;
    const plans = planner.plans;
    const sessions = benchmark.sessions;

    const totalAssets = assets.length;
    const criticalAssets = assets.filter((a) => a.criticality === 'critical').length;
    const legacyAssets = assets.filter((a) => a.legacy).length;
    const serverAssets = assets.filter((a) => a.type === 'server').length;

    const readinessScore = rSummary?.enterprise_readiness_score || 0;
    const assetsReady = rSummary?.assets_ready || 0;
    const assetsBlocked = rSummary?.blocked_assets || 0;
    const assetsHybrid = rSummary?.assets_requiring_hybrid || 0;
    const assetsUpgrade = rSummary?.assets_requiring_upgrade || 0;

    const latestPlan = plans.length > 0 ? plans[0] : null;
    const totalWaves = latestPlan?.waves?.length || 0;
    const totalDuration = latestPlan?.total_duration_hours || 0;
    const overallRisk = latestPlan?.overall_risk_score || 0;
    const blockers = latestPlan?.blockers_detected || 0;

    const benchmarkCount = sessions.length;

    // Migration progress (% of assets that are PQC Ready or Hybrid Ready)
    const migrationProgress = totalAssets > 0
      ? Math.round(((assetsReady + assetsHybrid) / totalAssets) * 100)
      : 0;

    // Asset type distribution
    const assetTypeDistribution = {};
    assets.forEach((a) => {
      assetTypeDistribution[a.type] = (assetTypeDistribution[a.type] || 0) + 1;
    });

    // Criticality distribution
    const criticalityDistribution = {};
    assets.forEach((a) => {
      const crit = a.criticality || 'unknown';
      criticalityDistribution[crit] = (criticalityDistribution[crit] || 0) + 1;
    });

    // Readiness classification data
    const classificationData = [];
    if (rSummary) {
      if (assetsReady > 0) classificationData.push({ name: 'PQC Ready', value: assetsReady, color: '#10B981' });
      if (assetsHybrid > 0) classificationData.push({ name: 'Hybrid Ready', value: assetsHybrid, color: '#3B82F6' });
      if (assetsUpgrade > 0) classificationData.push({ name: 'Upgrade Required', value: assetsUpgrade, color: '#F59E0B' });
      if (assetsBlocked > 0) classificationData.push({ name: 'Blocked', value: assetsBlocked, color: '#EF4444' });
    }

    // Top blockers from latest plan
    const topBlockers = [];
    if (latestPlan?.waves) {
      latestPlan.waves.forEach((wave) => {
        wave.steps?.forEach((step) => {
          if (step.blockers && step.blockers.length > 0) {
            topBlockers.push({
              asset: step.asset_name,
              blockers: step.blockers,
              risk: step.risk_score,
              wave: wave.wave_number,
            });
          }
        });
      });
    }

    // Critical assets needing attention
    const criticalAssetList = assets
      .filter((a) => a.criticality === 'critical' || a.legacy)
      .slice(0, 8);

    // Wave summary data for timeline
    const waveSummary = latestPlan?.waves?.map((w) => ({
      name: `Wave ${w.wave_number}`,
      label: w.name,
      steps: w.steps?.length || 0,
      duration: w.estimated_duration_hours || 0,
      risk: w.wave_risk_score || 0,
    })) || [];

    return {
      totalAssets,
      criticalAssets,
      legacyAssets,
      serverAssets,
      readinessScore,
      assetsReady,
      assetsBlocked,
      assetsHybrid,
      assetsUpgrade,
      migrationProgress,
      totalWaves,
      totalDuration,
      overallRisk,
      blockers,
      benchmarkCount,
      assetTypeDistribution,
      criticalityDistribution,
      classificationData,
      topBlockers,
      criticalAssetList,
      waveSummary,
    };
  }, [discovery.assets, readiness.summary, planner.plans, benchmark.sessions]);

  return {
    discovery,
    readiness,
    planner,
    benchmark,
    report,
    metrics,
    isLoading,
    refresh,
  };
}
