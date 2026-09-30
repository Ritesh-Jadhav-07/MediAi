import axios from 'axios';
import { TOKEN_KEY } from '../utils/constants';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('mediai:unauthorized'));

      const path = window.location.pathname;
      if (!path.startsWith('/login') && !path.startsWith('/register')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
