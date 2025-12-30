import { Text, View, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { useState, useCallback } from "react";

// Components
import History from "@/components/history/history";
import Stats from "@/components/profile/stats";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Define User type
interface User {
  id: number;
  username: string;
  email: string;
  balance: string | number;
  age: number;
  gender: string;
  nationality: string;
  trust_score: number;
  avatar?: string;
  onboarding_completed: boolean;
  // OCEAN Model
  openness?: number;
  conscientiousness?: number;
  extraversion?: number;
  agreeableness?: number;
  neuroticism?: number;
  // Game Statistics
  total_matches_played?: number;
  times_cooperated?: number;
  times_defected?: number;
  times_betrayed?: number;
  average_earnings?: number;
}

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      
      if (!token) {
        router.replace('/(auth)/login');
        return;
      }

      // Fetch fresh user data from backend
      const response = await fetch(`${API_URL}/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      
      // Update both state and AsyncStorage
      setUser(data.user);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              
              // Call backend logout endpoint
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
              console.error('Logout API error:', error);
            } finally {
              // Always clear local storage and redirect
              try {
                await AsyncStorage.multiRemove(['auth_token', 'user']);
                router.replace('/(auth)/login');
              } catch (storageError) {
                console.error('Storage clear error:', storageError);
              }
            }
          },
        },
      ]
    );
  };

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Show error if user data couldn't be loaded
  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadUserData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Helper function to determine player type based on trust score
  const getPlayerType = (trustScore: number) => {
    if (trustScore >= 80) return "Highly Trustworthy";
    if (trustScore >= 60) return "Reliable Player";
    if (trustScore <= 60 || trustScore >=40) return "Neutral Player";
    if (trustScore <= 40) return "Cautious Player";
    if (trustScore <= 20) return "Unpredictable";
    return "New Player";
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.userInfo}>
        <Text style={styles.username}>{user.username}</Text>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.avatar}    
        />
        <Text style={styles.playerType}>{getPlayerType(user.trust_score)}</Text>
        
        <Text style={styles.balance}>Balance</Text>
        <Text style={styles.balance}>${parseFloat(user.balance.toString()).toFixed(2)}</Text>
      </View>
      
      <Stats user={user}/>
      <History scrollEnabled={false} />

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    flex: 1
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textStyle: {
    color:'white',
  },
  content:{
    alignItems: "center",
    paddingBottom: 20,
  },
  userInfo:{
    alignItems: "center",
    marginBottom: 10,
  },
  username:{
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginVertical: 10,
  },
  avatar:{
    width: 100,
    height: 100,
    borderRadius: 100,
    marginBottom: 10,
  },
  playerType:{
    fontSize: 18,
    color: "white",
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
    color: "#999",
    marginBottom: 10,
  },
  balance:{
    fontSize: 29,
    fontWeight: "bold",
    color: "white",
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginTop: 30,
    width: '90%',
    alignItems: 'center',
    marginBottom: 10
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});