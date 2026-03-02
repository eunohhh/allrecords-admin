import axios from 'axios';

export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true, // For Better Auth session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to add App JWT if available
axiosInstance.interceptors.request.use(
  (config) => {
    // We will store the APP_JWT in localStorage after login
    // Note: In a more secure env, consider httpOnly cookies or memory.
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('app_access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response Interceptor for global error handling (optional)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized globally if needed
    if (error.response?.status === 401) {
      // Possibly redirect to login or clear token
    }
    return Promise.reject(error);
  },
);
