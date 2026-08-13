import axios from 'axios';

let abortController = new AbortController();

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.lfessiwan.in/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const cancelAllPendingRequests = () => {
  abortController.abort();
  abortController = new AbortController();
};

// Add a request interceptor to add the JWT token to headers and attach signal
api.interceptors.request.use(
  (config) => {
    if (!config.signal) {
      config.signal = abortController.signal;
    }
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle request cancellations gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error) || error.name === 'CanceledError' || error.name === 'AbortError') {
      return new Promise(() => {}); // Silent return for canceled requests
    }
    return Promise.reject(error);
  }
);

export default api;
