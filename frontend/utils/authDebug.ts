// utils/authDebug.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Debug utility to check authentication status
 * Use this to troubleshoot 401 errors
 */
export const checkAuthStatus = async () => {
    try {
        // IMPORTANT: Using 'auth_token' to match your login.tsx
        const token = await AsyncStorage.getItem('auth_token');
        const userData = await AsyncStorage.getItem('user');
        
        console.log('=== AUTH DEBUG ===');
        console.log('Token exists:', !!token);
        console.log('Token (first 20 chars):', token?.substring(0, 20) + '...');
        console.log('User data exists:', !!userData);
        console.log('API URL:', process.env.EXPO_PUBLIC_API_URL);
        console.log('==================');
        
        return {
            hasToken: !!token,
            hasUserData: !!userData,
            token: token,
        };
    } catch (error) {
        console.error('Error checking auth status:', error);
        return null;
    }
};

/**
 * Manually set a test token for debugging
 */
export const setTestToken = async (token: string) => {
    try {
        await AsyncStorage.setItem('auth_token', token);
        console.log('Test token saved successfully');
    } catch (error) {
        console.error('Error saving test token:', error);
    }
};

/**
 * Clear all auth data
 */
export const clearAuth = async () => {
    try {
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user');
        console.log('Auth data cleared');
    } catch (error) {
        console.error('Error clearing auth:', error);
    }
};

// Sources
// Created using Claude (Sonnet 4.5)
// Fixed to use 'auth_token' key instead of 'userToken'