import Config from 'react-native-config';

// API Configuration
export const API_CONFIG = {
  BASE_URL: Config.API_BASE_URL as string,
  TIMEOUT: 5000, // 5 seconds
  ENDPOINTS: {
    HEALTH_CHECK: '/onboarding',
    STATUS: '/',
    EMERGENCY: '/emergency',
    LOCATION: '/location',
    CONTACTS: '/contacts',
  },
};

// App Configuration
export const APP_CONFIG = {
  APP_NAME: 'SHEild',
  APP_SUBTITLE: 'Women Safety App',
  VERSION: '1.0.0',
  ONBOARDING_TIMEOUT: 4000, // 4 seconds
};

// Use environment variable from Config
export const GEOAPIFY_API_KEY = Config.GEOAPIFY_API_KEY as string;