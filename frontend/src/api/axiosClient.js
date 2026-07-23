import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

axiosClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const transformAsset = (asset) => {
  if (asset && asset.metadata) {
    return {
      ...asset,
      criticality: asset.metadata.criticality || 'unknown',
      legacy: !!asset.metadata.legacy,
    };
  }
  return asset;
};

axiosClient.interceptors.response.use(
  (response) => {
    if (response && response.data) {
      if (Array.isArray(response.data.assets)) {
        response.data.assets = response.data.assets.map(transformAsset);
      }
      if (response.data.asset) {
        response.data.asset = transformAsset(response.data.asset);
      }
    }
    return response;
  },
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, message);

    return Promise.reject(error);
  }
);

export default axiosClient;
