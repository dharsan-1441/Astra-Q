import axiosClient from './axiosClient';

/**
 * API service layer — maps each backend endpoint to a callable function.
 * All functions return Axios response promises.
 */

export const healthService = {
  check: () => axiosClient.get('/health'),
  resetSystem: () => axiosClient.post('/system/reset'),
};

export const discoveryService = {
  // Mode 1: YAML Configuration Import (multipart/form-data upload or preset query param)
  importYaml: (formData, preset) => {
    if (preset) {
      return axiosClient.post(`/discovery/yaml?preset=${preset}`);
    }
    return axiosClient.post('/discovery/yaml', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Mode 2: TLS Scan
  scanTls: (payload) => axiosClient.post('/discovery/tls', payload),

  // Mode 3: Manual Asset Registration
  registerManual: (payload) => axiosClient.post('/discovery/manual', payload),

  // Normalized Asset Inventory Management
  listAssets: () => axiosClient.get('/discovery/assets'),
  getAsset: (id) => axiosClient.get(`/discovery/assets/${id}`),
  deleteAsset: (id) => axiosClient.delete(`/discovery/assets/${id}`),
};

export const benchmarkService = {
  run: (payload) => axiosClient.post('/benchmark/run', payload),
  list: () => axiosClient.get('/benchmark/results'),
  get: (id) => axiosClient.get(`/benchmark/results/${id}`),
  delete: (id) => axiosClient.delete(`/benchmark/results/${id}`),
};

export const compatibilityService = {
  analyze: (payload) => axiosClient.post('/compatibility', payload),
};

export const plannerService = {
  generate: (payload) => axiosClient.post('/planner/generate', payload),
  list: () => axiosClient.get('/planner'),
  get: (id) => axiosClient.get(`/planner/${id}`),
  exportJson: (id) => axiosClient.get(`/planner/export/json${id ? '?plan_id=' + id : ''}`),
  exportPdf: (id) => axiosClient.get(`/planner/export/pdf${id ? '?plan_id=' + id : ''}`, { responseType: 'blob' }),
};

export const readinessService = {
  analyze: (profile) => axiosClient.post(`/readiness/analyze${profile ? '?profile=' + encodeURIComponent(profile) : ''}`),
  list: () => axiosClient.get('/readiness'),
  get: (id) => axiosClient.get(`/readiness/${id}`),
  summary: () => axiosClient.get('/readiness/summary'),
};

export const reportService = {
  generate: (payload) => axiosClient.post('/report/generate', payload),
  list: () => axiosClient.get('/report'),
  latest: () => axiosClient.get('/report/latest'),
  getById: (id) => axiosClient.get(`/report/${id}`),
  exportJson: (id) => axiosClient.get(`/report/export/json${id ? '?report_id=' + id : ''}`),
  exportPdf: (id) => axiosClient.get(`/report/export/pdf${id ? '?report_id=' + id : ''}`, { responseType: 'blob' }),
};

export const quantumService = {
  simulate: (payload) => axiosClient.post('/quantum/simulate', payload),
};

