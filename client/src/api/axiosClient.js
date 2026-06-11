// client/src/api/axiosClient.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Attach access token to every request automatically
api.interceptors.request.use((config) => {
  // We import inside the interceptor to avoid circular dependency
  const raw = localStorage.getItem("auth-storage");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // storage malformed — ignore
    }
  }
  return config;
});

// Auto-refresh access token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const raw = localStorage.getItem("auth-storage");
        const parsed = JSON.parse(raw);
        const refreshToken = parsed?.state?.refreshToken;

        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          { refreshToken },
        );

        // Update stored access token
        parsed.state.accessToken = data.accessToken;
        localStorage.setItem("auth-storage", JSON.stringify(parsed));

        // Retry original request with new token
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        // Refresh failed — clear storage and redirect to login
        localStorage.removeItem("auth-storage");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
