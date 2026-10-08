import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
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
