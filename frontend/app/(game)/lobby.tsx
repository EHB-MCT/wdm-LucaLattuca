import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
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
  const [isLoading, setIsLoading] = useState(true);
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [countdown, setCountdown] = useState(8);
  const [loadingMessage, setLoadingMessage] = useState('Finding opponent...');
  const [error, setError] = useState(false);
  const retryCountRef = useRef(0);

  useEffect(() => {
    fetchBotInfo();
  }, []);

  const fetchBotInfo = async () => {
    try {
      setLoadingMessage('Finding opponent...');
      setError(false);

      // Simulate 2 seconds of "searching"
      await new Promise(resolve => setTimeout(resolve, 2000));

      setLoadingMessage('Loading opponent details...');

      const token = await AsyncStorage.getItem('auth_token');

      console.log('Fetching bot info from:', `${API_URL}/bot/${params.botId}`);

      // Manual timeout implementation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(`${API_URL}/bot/${params.botId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId); // Clear timeout if request succeeds

        const data = await response.json();

        console.log('Bot info response:', data);

        if (response.ok && data.success) {
          setBotInfo(data.bot);
          setIsLoading(false);
          retryCountRef.current = 0;
        } else {
          console.error('Failed to fetch bot info:', data);
          handleError();
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (fetchError) {
      console.error('Failed to fetch bot info:', fetchError);
      handleError();
    }
  };

  const handleError = () => {
    retryCountRef.current += 1;

    console.log('Retry attempt:', retryCountRef.current);

    if (retryCountRef.current <= 2) {
      setLoadingMessage('Connection error. Retrying...');
      setTimeout(() => {
        fetchBotInfo();
      }, 1000);
    } else {
      setError(true);
      setIsLoading(false);
      setLoadingMessage('Cannot connect to server');
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  // Countdown timer (8 seconds)
  useEffect(() => {
    if (!isLoading && botInfo && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 800);
      return () => clearTimeout(timer);
    } else if (!isLoading && botInfo && countdown === 0) {
      router.push({
        pathname: '/game',
        params: { gameId: params.gameId as string },
      });
    }
  }, [isLoading, botInfo, countdown, params.gameId]);

  return (
    <View style={styles.container}>
      {isLoading || error ? (
        <View style={styles.searchingContainer}>
          {!error && <ActivityIndicator size="large" color="white" />}
          <Text style={styles.searchingText}>{loadingMessage}</Text>

          {error && (
            <TouchableOpacity
              style={styles.goBackButton}
              onPress={handleGoBack}
            >
              <Text style={styles.goBackText}>Go Back</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.matchFoundContainer}>
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownLabel}>Game starts in</Text>
            <Text style={styles.countdownNumber}>{countdown}</Text>
          </View>

          <View style={styles.botInfoContainer}>
            <Text style={styles.botName}>{botInfo?.name}</Text>

            <View style={styles.botStatsContainer}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Balance:</Text>
                <Text style={styles.statValue}>
                  ${botInfo?.balance.toLocaleString()}
                </Text>
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
  goBackButton: {
    marginTop: 30,
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  goBackText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
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

// Sources
// generated lobby screen using Claude (Sonnet 4.5)
// https://claude.ai/share/4570ac86-c7f2-452d-93e4-b72281a330ba
