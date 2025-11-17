import Config from 'react-native-config';

// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://192.168.29.17:8000', // Update this with your actual IP
  TIMEOUT: 5000, // 5 seconds
  ENDPOINTS: {
    HEALTH_CHECK: '/onbaording',
    STATUS: '/',
    EMERGENCY: '/emergency',
    LOCATION: '/location',
    CONTACTS: '/contacts',
  },
};

// // Google Places API Configuration
// // IMPORTANT: In production, store this in environment variables or fetch from backend
// export const GOOGLE_PLACES_API_KEY = 'YOUR_GOOGLE_PLACES_API_KEY_HERE';

// App Configuration
export const APP_CONFIG = {
  APP_NAME: 'SHEild',
  APP_SUBTITLE: 'Women Safety App',
  VERSION: '1.0.0',
  ONBOARDING_TIMEOUT: 4000, // 4 seconds
};

// export const GEOAPIFY_API_KEY = 'e2999a4e883c4232b894f21b21bf7a49';

// Use environment variable or fallback to default
export const GEOAPIFY_API_KEY = Config.GEOAPIFY_API_KEY || 'e2999a4e883c4232b894f21b21bf7a49'