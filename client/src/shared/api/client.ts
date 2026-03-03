import axios from 'axios';

const apiRoot = import.meta.env.VITE_API_URL || '/api';
const REQUEST_TIMEOUT_MS = 15000;

export const rootApiClient = axios.create({
  baseURL: apiRoot,
  timeout: REQUEST_TIMEOUT_MS,
});

export const apiClient = axios.create({
  baseURL: `${apiRoot}/inventory`,
  timeout: REQUEST_TIMEOUT_MS,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

rootApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const handleUnauthorized = (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    localStorage.removeItem('access_token');
    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }

  return Promise.reject(error);
};

apiClient.interceptors.response.use((response) => response, handleUnauthorized);
rootApiClient.interceptors.response.use((response) => response, handleUnauthorized);
