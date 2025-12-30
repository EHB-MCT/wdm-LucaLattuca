import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

interface BotInfo {
  id: number;
  name: string;
  personality_type: string;
  balance: number;
  trust_score: number;
}

export default function LobbyScreen() {
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true); // Changed from isSearching
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [loadingMessage, setLoadingMessage] = useState('Finding opponent...');

  // Fetch bot info immediately
  useEffect(() => {
    fetchBotInfo();
  }, []);

  const fetchBotInfo = async () => {
    try {
      setLoadingMessage('Finding opponent...');
      
      // Simulate 2 seconds of "searching"
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setLoadingMessage('Loading opponent details...');
      
      const token = await AsyncStorage.getItem('auth_token');
      
      // Fetch bot information
      const response = await fetch(`${API_URL}/bot/${params.botId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setBotInfo(data.bot);
        setIsLoading(false); // Only stop loading when we have bot info
      } else {
        console.error('Failed to fetch bot info:', data);
        // If API fails, show error or retry
        setLoadingMessage('Failed to load opponent. Retrying...');
        
        // Retry after 1 second
        setTimeout(() => {
          fetchBotInfo();
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to fetch bot info:', error);
      setLoadingMessage('Connection error. Retrying...');
      
      // Retry after 1 second
      setTimeout(() => {
        fetchBotInfo();
      }, 1000);
    }
  };

  // Countdown timer (10 seconds) - only starts when bot info is loaded
  useEffect(() => {
    if (!isLoading && botInfo && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (!isLoading && botInfo && countdown === 0) {
      // Navigate to game screen
    //   router.push(`/(game)/game/${params.gameId}`);
    }
  }, [isLoading, botInfo, countdown, params.gameId]);

  return (
    <View style={styles.container}>
      {isLoading ? (
        // Loading - searching and fetching bot info
        <View style={styles.searchingContainer}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.searchingText}>{loadingMessage}</Text>
        </View>
      ) : (
        // Bot found - show countdown and bot info
        <View style={styles.matchFoundContainer}>
          {/* Countdown */}
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownLabel}>Game starts in</Text>
            <Text style={styles.countdownNumber}>{countdown}</Text>
          </View>

          {/* Bot Information */}
          <View style={styles.botInfoContainer}>
            <Text style={styles.botName}>{botInfo?.name}</Text>
            
            <View style={styles.botStatsContainer}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Balance:</Text>
                <Text style={styles.statValue}>${botInfo?.balance.toLocaleString()}</Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Trust Score:</Text>
                <Text style={styles.statValue}>{botInfo?.trust_score}/100</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  searchingContainer: {
    alignItems: 'center',
  },
  searchingText: {
    color: 'white',
    fontSize: 18,
    marginTop: 20,
  },
  matchFoundContainer: {
    width: '100%',
    alignItems: 'center',
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  countdownLabel: {
    color: 'white',
    fontSize: 16,
    marginBottom: 10,
  },
  countdownNumber: {
    color: 'white',
    fontSize: 72,
    fontWeight: 'bold',
  },
  botInfoContainer: {
    width: '100%',
    alignItems: 'center',
  },
  botName: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  botStatsContainer: {
    width: '100%',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statLabel: {
    color: 'white',
    fontSize: 18,
  },
  statValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});