// frontend/config/api.js
// API Configuration for connecting to backend

// For Expo Go on physical device, use your computer's local IP
// For Android Emulator, use 10.0.2.2
// For iOS Simulator, use localhost

const getApiUrl = () => {
  // If running on web
  if (typeof window !== 'undefined' && window.location) {
    return 'http://localhost:8000';
  }

  // For development, replace with your computer's local IP
  // Find your IP: 
  // - macOS/Linux: `ifconfig | grep "inet " | grep -v 127.0.0.1`
  // - Windows: `ipconfig` and look for IPv4 Address
  
  // Example: return 'http://192.168.1.100:8000';
  return 'http://localhost:8000'; // Replace with your actual IP for physical devices
};

export const API_URL = getApiUrl();
export const API_TIMEOUT = 30000; // 30 seconds

export default {
  API_URL,
  API_TIMEOUT,
};