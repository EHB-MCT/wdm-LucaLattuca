import { Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Components
import History from "@/components/history/history";
import GameButton from "@/components/game/gameButton";

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const balance = 21034;

   useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userString = await AsyncStorage.getItem('user');

      if (!token || !userString) {
        router.replace('/(auth)/login');
        return;
      }

      const user = JSON.parse(userString);
      
      // If user hasn't completed onboarding, redirect
      if (!user.onboarding_completed) {
        router.replace('/(auth)/onboarding');
        return;
      }

      // User is authenticated and onboarded, continue to app
    } catch (error) {
      console.error('Auth check error:', error);
      router.replace('/(auth)/login');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.balance}>Balance</Text>
        <Text style={styles.balance}>${balance}</Text>
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
  loadingContainer:{
    justifyContent:"center"
  },
  balance: {
    color:'white',
    fontSize: 30,
    fontWeight: "bold",
  }
})