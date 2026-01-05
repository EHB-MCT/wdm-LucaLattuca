import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';

// Components
import History from '@/components/history/history';
import Stats from '@/components/profile/stats';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ProfileScreen() {
  const { user, loading, refreshUser, logout } = useUser();

  // Load user data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [])
  );

  // Helper function to determine player type based on trust score
  const getPlayerType = (trustScore: number) => {
    if (trustScore >= 80) return 'Highly Trustworthy';
    if (trustScore >= 60) return 'Reliable Player';
    if (trustScore <= 60 || trustScore >= 40) return 'Neutral Player';
    if (trustScore <= 40) return 'Cautious Player';
    if (trustScore <= 20) return 'Unpredictable';
    return 'New Player';
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
        <TouchableOpacity style={styles.retryButton} onPress={refreshUser}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.userInfo}>
        <Text style={styles.username}>{user.username}</Text>
        <Image
          source={require('../../assets/images/icon.png')}
          style={styles.avatar}
        />
        <Text style={styles.playerType}>{getPlayerType(user.trust_score)}</Text>

        <Text style={styles.balance}>Balance</Text>
        <Text style={styles.balance}>
          ${parseFloat(user.balance.toString()).toFixed(2)}
        </Text>
      </View>

      <Stats />
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
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textStyle: {
    color: 'white',
  },
  content: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 10,
  },
  username: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginVertical: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 100,
    marginBottom: 10,
  },
  playerType: {
    fontSize: 18,
    color: 'white',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 10,
  },
  balance: {
    fontSize: 29,
    fontWeight: 'bold',
    color: 'white',
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginTop: 30,
    width: '90%',
    alignItems: 'center',
    marginBottom: 10,
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

// Sources
// user data populated, generated logout button using Claude code (Sonnet 4.5)
// https://claude.ai/share/a86909b9-6271-4878-afd6-981beba52b92
