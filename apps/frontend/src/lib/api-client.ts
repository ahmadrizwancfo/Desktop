import axios, { AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Validate environment configuration
if (!process.env.NEXT_PUBLIC_API_URL && typeof window !== 'undefined') {
    console.warn('⚠️ NEXT_PUBLIC_API_URL not set, using default: http://localhost:3000');
}

export const apiClient = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
    timeout: 30000, // 30 second timeout
});

// Add a request interceptor to include the JWT token
apiClient.interceptors.request.use(
    (config) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle errors globally
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // Handle 401 Unauthorized - redirect to login
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth-storage');

                // Only redirect if not already on login page
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login?session=expired';
                }
            }
        }

        // Handle 429 Too Many Requests - rate limited
        if (error.response?.status === 429) {
            console.error('⚠️ Rate limit exceeded. Please wait before making more requests.');
        }

        // Handle 500 Server Error
        if (error.response?.status && error.response.status >= 500) {
            console.error('⚠️ Server error. Please try again later.');
        }

        // Handle network errors
        if (!error.response) {
            console.error('⚠️ Network error. Please check your connection.');
        }

        return Promise.reject(error);
    }
);

// Helper function to handle API errors
export function getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message?: string }>;

        if (axiosError.response?.data?.message) {
            return axiosError.response.data.message;
        }

        switch (axiosError.response?.status) {
            case 400:
                return 'Invalid request. Please check your input.';
            case 401:
                return 'Session expired. Please login again.';
            case 403:
                return 'You do not have permission to perform this action.';
            case 404:
                return 'The requested resource was not found.';
            case 429:
                return 'Too many requests. Please wait a moment.';
            case 500:
                return 'Server error. Please try again later.';
            default:
                return 'An unexpected error occurred.';
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return 'An unexpected error occurred.';
}
