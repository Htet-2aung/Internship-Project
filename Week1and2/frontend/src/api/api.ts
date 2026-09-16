import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000', // Your NestJS backend URL
});

// Intercept requests to automatically add the JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('jwt_token');
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

export default api;