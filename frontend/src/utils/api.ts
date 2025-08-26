import axios from 'axios';

// Konstanta untuk URL API yang bisa digunakan di seluruh aplikasi
export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const API_BASE_URL = `${BASE_URL}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 detik timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor untuk menambahkan token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor untuk handling error dan token expiration
api.interceptors.response.use((response) => {
  return response;
}, (error) => {
  // Handle 401 Unauthorized - redirect ke login
  if (error.response?.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    return Promise.reject(error);
  }
  
  // Handle 403 Forbidden
  if (error.response?.status === 403) {
    // Bisa ditambahkan notification untuk forbidden access
    return Promise.reject(error);
  }
  
  // Handle 500 Server Error
  if (error.response?.status >= 500) {
    // Bisa ditambahkan notification untuk server error
    return Promise.reject(error);
  }
  
  return Promise.reject(error);
});

// Utility function untuk error handling yang konsisten
export const handleApiError = (error: any, context: string = 'API Call') => {
  const errorMessage = error.response?.data?.message || error.message || 'Terjadi kesalahan';
  return errorMessage;
};

export default api; 