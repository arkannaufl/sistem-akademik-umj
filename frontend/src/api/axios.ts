import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Jangan munculkan modal session expired jika request ke /login
    if (
      error.response?.status === 401 &&
      !(error.config && error.config.url && error.config.url.includes('/login'))
    ) {
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Check if it's a login from another device
      if (error.response?.data?.message === 'Token has been revoked') {
        window.dispatchEvent(new CustomEvent('sessionExpired', { 
          detail: { message: 'Akun Anda telah login di perangkat lain. Silakan login kembali.' }
        }));
      } else {
        // Regular session expiration
        window.dispatchEvent(new Event('sessionExpired'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
