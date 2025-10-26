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

// App Configuration
export const APP_CONFIG = {
  APP_NAME: 'SHEild',
  APP_SUBTITLE: 'Women Safety App',
  VERSION: '1.0.0',
  ONBOARDING_TIMEOUT: 2000, // 2 seconds
};
