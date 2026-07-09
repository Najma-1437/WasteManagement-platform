import axiosClient from './axiosClient';

export const getStats          = ()           => axiosClient.get('/admin/stats');
export const getUsers          = ()           => axiosClient.get('/admin/users');
export const updateUserStatus  = (id, status) => axiosClient.patch(`/admin/users/${id}/status`, { status });
export const getDisputes       = ()           => axiosClient.get('/admin/disputes');
export const resolveDispute    = (id, action) => axiosClient.patch(`/admin/disputes/${id}/resolve`, { action });
