import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axiosClient';

export const ROLE_DASHBOARDS = {
  collector:   '/collector',
  buyer:       '/buyer/dashboard',
  coordinator: '/coordinator',
  admin:       '/admin',
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null, accessToken: null, refreshToken: null,
      isAuthenticated: false, loading: false, error: null,

      login: async (identifier, password) => {
        set({ loading: true, error: null });
        try {
          const { data } = await api.post('/auth/login', { identifier, password });
          set({
            user: data.user, accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true, loading: false,
          });
          return data.user;
        } catch (err) {
          const message = err.response?.data?.error || 'Login failed.';
          set({ loading: false, error: message });
          throw new Error(message, { cause: err });
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout', { refreshToken: get().refreshToken });
        } finally {
          set({ user: null, accessToken: null, refreshToken: null,
                isAuthenticated: false, error: null });
        }
      },

      register: async (formData) => {
        set({ loading: true, error: null });
        try {
          const { data } = await api.post('/auth/register', formData);
          set({ loading: false });
          return data;
        } catch (err) {
          const message = err.response?.data?.error
            || err.response?.data?.errors?.[0]?.msg
            || 'Registration failed.';
          set({ loading: false, error: message });
          throw new Error(message, { cause: err });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user, accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);