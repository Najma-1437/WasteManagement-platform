import axiosClient from './axiosClient';

export const getHeatmap   = (params) => axiosClient.get('/coordinator/heatmap', { params });
export const getStats     = (params) => axiosClient.get('/coordinator/stats',   { params });
export const exportReport = (params) => axiosClient.get('/coordinator/export',  { params, responseType: 'blob' });
