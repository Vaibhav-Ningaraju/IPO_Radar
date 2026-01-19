/**
 * API Configuration
 * Centralized API URL management for development and production
 */

// Get API URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Validate API URL in development
if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
    console.warn('⚠️ VITE_API_URL not set, using default: http://localhost:5001');
}

// Export API configuration
export const API_CONFIG = {
    BASE_URL: API_URL,
    ENDPOINTS: {
        // Auth
        REGISTER: '/api/register',
        LOGIN: '/api/login',
        GOOGLE_LOGIN: '/api/google-login',
        FORGOT_PASSWORD: '/api/forgot-password',
        VERIFY_RESET_CODE: '/api/verify-reset-code',
        RESET_PASSWORD: '/api/reset-password',
        PROFILE: '/api/profile',

        // IPOs
        IPOS: '/api/ipos',
        LIVE_LISTINGS: '/api/live-listings',

        // Market
        MARKET_STATUS: '/api/market-status',

        // Admin
        ADMIN_SCAN_DUPLICATES: '/api/admin/scan-duplicates',
        ADMIN_MERGE: '/api/admin/merge',
    }
} as const;

/**
 * Helper function to build full API URL
 * @param endpoint - API endpoint path (e.g., '/api/ipos')
 * @returns Full URL (e.g., 'http://localhost:5001/api/ipos')
 */
export const buildApiUrl = (endpoint: string): string => {
    return `${API_CONFIG.BASE_URL}${endpoint}`;
};

/**
 * Fetch with timeout to prevent hanging requests
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeout - Timeout in milliseconds (default: 10000)
 * @returns Promise<Response>
 */
export const fetchWithTimeout = async (
    url: string,
    options: RequestInit = {},
    timeout: number = 10000
): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
};

// Log configuration in development mode
if (import.meta.env.DEV) {
    console.log('🔧 API Configuration:', {
        BASE_URL: API_CONFIG.BASE_URL,
        MODE: import.meta.env.MODE,
    });
}
