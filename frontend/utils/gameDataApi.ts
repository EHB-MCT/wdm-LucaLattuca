import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    // Required for ngrok
    'ngrok-skip-browser-warning': 'true',
  },
});

// Request interceptor to add token from AsyncStorage
apiClient.interceptors.request.use(
  async config => {
    try {
      // IMPORTANT: Using 'auth_token' to match your login.tsx
      const token = await AsyncStorage.getItem('auth_token');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor for better error handling
apiClient.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user');
      console.error('Authentication failed - token may be expired');
    }
    return Promise.reject(error);
  }
);

// Add auth token to requests (manual method - optional)
export const setAuthToken = (token: string) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};

// Game Data API calls
export const gameDataApi = {
  // Get all chart data in one call
  getAllData: async () => {
    const response = await apiClient.get('/game-data/all');
    return response.data;
  },

  // Get OCEAN model data
  getOceanModel: async () => {
    const response = await apiClient.get('/game-data/ocean-model');
    return response.data;
  },

  // Get leaderboard data
  getLeaderboard: async () => {
    const response = await apiClient.get('/game-data/leaderboard');
    return response.data;
  },

  // Get trust vs investment data
  getTrustVsInvestment: async () => {
    const response = await apiClient.get('/game-data/trust-vs-investment');
    return response.data;
  },

  // Get choice distribution
  getChoiceDistribution: async () => {
    const response = await apiClient.get('/game-data/choice-distribution');
    return response.data;
  },

  // Get average investment by round
  getAverageInvestment: async () => {
    const response = await apiClient.get('/game-data/average-investment');
    return response.data;
  },

  // Get summary stats
  getSummary: async () => {
    const response = await apiClient.get('/game-data/summary');
    return response.data;
  },
};

export default apiClient;

// Sources
// Created using Claude (Sonnet 4.5)
// Fixed to use 'auth_token' key instead of 'userToken'
