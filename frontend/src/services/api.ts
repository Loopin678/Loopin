import axios from 'axios';

export const api = axios.create({
  // Same rule as api/client.ts: the backend's address in production, the Vite proxy locally
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api`,
  withCredentials: true,
});

// Optional response interceptor to handle 401s globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // dispatch custom event or let the auth context handle it
      window.dispatchEvent(new Event('unauthorized'));
    }
    return Promise.reject(error);
  }
);
