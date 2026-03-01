import axios from 'axios';

const apiRoot = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const rootApiClient = axios.create({
  baseURL: apiRoot,
});

export const apiClient = axios.create({
  baseURL: `${apiRoot}/inventory`,
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
