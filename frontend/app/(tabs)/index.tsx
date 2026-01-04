import { Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "@/contexts/UserContext";

// Components
import History from "@/components/history/history";
import GameButton from "@/components/game/gameButton";

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  const { user, refreshUser } = useUser();

  useEffect(() => {
    checkAuth();
  }, []);

  // Reload user balance when component mounts or user changes
  useEffect(() => {
    if (!isLoading && user) {
      fetchLatestBalance();
    }
  }, [isLoading, user?.id]);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userString = await AsyncStorage.getItem('user');

      if (!token || !userString) {
        router.replace('/(auth)/login');
        return;
      }

      const userData = JSON.parse(userString);
      
      // If user hasn't completed onboarding, redirect
      if (!userData.onboarding_completed) {
        router.replace('/(auth)/onboarding');
        return;
      }

      // User is authenticated and onboarded
    } catch (error) {
      console.error('Auth check error:', error);
      router.replace('/(auth)/login');
    } finally {
      setIsLoading(false);
    }
  };

  // Get latest updated user balance
  const fetchLatestBalance = async () => {
    try {
      setIsBalanceLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      
      const response = await fetch(`${API_URL}/api/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data) {
        // Update user context
        await refreshUser();
        console.log('✅ Balance refreshed:', data.balance);
      }
    } catch (error) {
      console.error('❌ Failed to fetch balance:', error);
    } finally {
      setIsBalanceLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.balanceLabel}>Balance</Text>
        {isBalanceLoading ? (
          <View style={styles.balanceLoader}>
            <ActivityIndicator size="small" color="white" />
          </View>
        ) : (
          <Text style={styles.balance}>
            ${Math.round(user?.balance || 0).toLocaleString()}
          </Text>
        )}
      </View>
      <History containerStyle={{ height: "40%" }} />
      <GameButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    flex: 1,
    alignItems: "center",
    justifyContent: "space-around",
  },
  loadingContainer: {
    justifyContent: "center"
  },
  balanceLabel: {
    color: '#999',
    fontSize: 16,
    alignSelf: "center",
    marginBottom: 5,
  },
  balance: {
    color: 'white',
    fontSize: 30,
    fontWeight: "bold",
    alignSelf: "center"
  },
  balanceLoader: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});