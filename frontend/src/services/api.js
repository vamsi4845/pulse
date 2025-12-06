import axios from 'axios';
import { API_URL } from '../utils/constants.js';
import { deleteCookie } from '../lib/utils.js';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        localStorage.removeItem('user');
        deleteCookie('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

