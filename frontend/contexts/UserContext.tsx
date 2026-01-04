import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

import {User} from '@/types/user'

interface UserContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        setUser(JSON.parse(userString));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      if (!token) {
        console.log('❌ [USER_CONTEXT] No token found');
        setUser(null);
        return;
      }

      const fullUrl = `${API_URL}/user`;
      console.log('📡 [USER_CONTEXT] Refreshing user from:', fullUrl);
      console.log('🔑 [USER_CONTEXT] Token exists:', !!token);

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 [USER_CONTEXT] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [USER_CONTEXT] Response error:', errorText);
        throw new Error(`Failed to fetch user data: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ [USER_CONTEXT] User data received:', {
        hasUser: !!data.user,
        username: data.user?.username
      });
      setUser(data.user);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
    } catch (error) {
      console.error('❌ [USER_CONTEXT] Error refreshing user:', error);
    }
  };

  const logout = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      if (token) {
        await fetch(`${API_URL}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user');
      setUser(null);
      router.replace('/(auth)/login');
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, setUser, refreshUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// Sources
// userContext generated using claude code (Sonnet 4.5)
// https://claude.ai/share/a86909b9-6271-4878-afd6-981beba52b92