import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Backend API Configuration
// Set your computer's local IP address here for testing on physical devices
// Find it using: ipconfig (Windows) or ifconfig (Mac/Linux)
const LOCAL_DEV_IP = '192.168.1.56';//'192.168.172.219'; // Current local IP

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';

const getApiUrl = () => {
  if (isDev) {
    if (Platform.OS === 'web') {
      return 'http://localhost:3000/api';
    }
    // Android & iOS physical devices — use local network IP
    console.log('[API] Using local dev IP:', LOCAL_DEV_IP);
    return `http://${LOCAL_DEV_IP}:3000/api`;
  } else {
    return 'https://admin-panel-darsh1153s-projects.vercel.app/api';
  }
};

export const API_BASE_URL = getApiUrl();
export const MOBILE_API_URL = `${API_BASE_URL}/mobile`;

// Debug log for mobile API URL (development only)
if (isDev) {
  console.log('[API] MOBILE_API_URL:', MOBILE_API_URL);
}

// Helper function to get full URL
export const getApiEndpoint = (endpoint) => {
  return `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
};

export const getMobileApiEndpoint = (endpoint) => {
  return `${MOBILE_API_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
};



export default {
  API_BASE_URL,
  MOBILE_API_URL,
  getApiEndpoint,
  getMobileApiEndpoint,
};

