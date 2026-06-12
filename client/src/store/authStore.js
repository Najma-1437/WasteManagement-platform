// client/src/store/authStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "../api/axiosClient";

// Role → dashboard path mapping
export const ROLE_DASHBOARDS = {
  collector: "/collector",
  buyer: "/buyer",
  coordinator: "/coordinator",
  admin: "/admin",
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      // ── Login ───────────────────────────────────────────────
      login: async (email, password) => {
        set({ loading: true, error: null });
        try {
          const { data } = await api.post("/auth/login", { email, password });
          set({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
          return data.user; // caller uses role to redirect
        } catch (err) {
          const message =
            err.response?.data?.error || "Login failed. Please try again.";
          set({ loading: false, error: message });
          throw new Error(message, { cause: err });
        }
      },

      // ── Logout ──────────────────────────────────────────────
      logout: async () => {
        try {
          await api.post("/auth/logout", { refreshToken: get().refreshToken });
        } catch {
          // Even if server call fails, clear local state
        } finally {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      // ── Register ────────────────────────────────────────────
      register: async (formData) => {
        set({ loading: true, error: null });
        try {
          const { data } = await api.post("/auth/register", formData);
          set({ loading: false });
          return data; // { message, userId }
        } catch (err) {
          const message =
            err.response?.data?.error ||
            err.response?.data?.errors?.[0]?.msg ||
            "Registration failed.";
          set({ loading: false, error: message });
          throw new Error(message, { cause: err });
        }
      },

      // ── Clear error ─────────────────────────────────────────
      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage", // localStorage key
      partialize: (state) => ({
        // Only persist these — never persist loading/error
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
