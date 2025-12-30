import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from 'react-native';

// Types
interface Bot {
  id: number;
  name: string;
  personality_type: string;
  cooperation_tendency: number;
  risk_tolerance: number;
}

interface User {
  id: number;
  username: string;
  balance: number;
  trust_score: number;
}

const LobbyScreen = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [matchedBot, setMatchedBot] = useState<Bot | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [user, setUser] = useState<User | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));

  // Pulse animation for searching
  useEffect(() => {
    if (isSearching && !matchedBot) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isSearching, matchedBot]);

  // Fetch user data
  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      // TODO: Replace with actual API call using stored token
      // const token = await AsyncStorage.getItem('token');
      // const response = await fetch(`${API_URL}/api/user`, {
      //   headers: {
      //     'Authorization': `Bearer ${token}`,
      //     'Accept': 'application/json'
      //   }
      // });
      // const data = await response.json();
      // setUser(data.user);
      
      // Simulated user data
      setUser({
        id: 1,
        username: "Player",
        balance: 5000,
        trust_score: 75
      });
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const handleJoinQueue = async () => {
    setIsSearching(true);
    
    try {
      // TODO: Replace with actual API call
      // const token = await AsyncStorage.getItem('token');
      // const response = await fetch(`${API_URL}/api/queue/join`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${token}`,
      //     'Content-Type': 'application/json',
      //     'Accept': 'application/json'
      //   }
      // });
      // const data = await response.json();
      
      // Simulate finding a match
      setTimeout(() => {
        const bots = [
          { name: 'Cooperative_Carl', type: 'cooperative' },
          { name: 'Selfish_Steve', type: 'selfish' },
          { name: 'Cautious_Cathy', type: 'cautious' },
          { name: 'Random_Randy', type: 'unpredictable' },
          { name: 'Trustworthy_Tina', type: 'trustworthy' }
        ];
        
        const randomBot = bots[Math.floor(Math.random() * bots.length)];
        
        setMatchedBot({
          id: Math.floor(Math.random() * 5) + 1,
          name: randomBot.name,
          personality_type: randomBot.type,
          cooperation_tendency: Math.random() * 100,
          risk_tolerance: Math.random() * 100
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to join queue:', error);
      setIsSearching(false);
    }
  };

  const handleCancelQueue = async () => {
    setIsSearching(false);
    setMatchedBot(null);
    setCountdown(3);
    
    // TODO: Call API to leave queue
    // const token = await AsyncStorage.getItem('token');
    // await fetch(`${API_URL}/api/queue/leave`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${token}`,
    //     'Accept': 'application/json'
    //   }
    // });
  };

  // Countdown timer
  useEffect(() => {
    if (matchedBot && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (matchedBot && countdown === 0) {
      // Navigate to game screen
      // router.push(`/game/${gameId}`);
      console.log('Navigating to game...');
    }
  }, [matchedBot, countdown]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Trust Game</Text>
        <Text style={styles.subtitle}>Test your trust and strategy</Text>
      </View>

      {/* User Info Card */}
      {user && (
        <View style={styles.userCard}>
          <View style={styles.userInfo}>
            <Text style={styles.username}>{user.username}</Text>
            <Text style={styles.trustScore}>Trust Score: {user.trust_score}/100</Text>
          </View>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text style={styles.balance}>${user.balance.toFixed(2)}</Text>
          </View>
        </View>
      )}

      {/* Main Content */}
      <View style={styles.mainCard}>
        {!isSearching && !matchedBot && (
          <View style={styles.readySection}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>👥</Text>
            </View>
            <Text style={styles.readyTitle}>Ready to Play?</Text>
            <Text style={styles.readySubtitle}>You'll be matched with an AI opponent</Text>

            <TouchableOpacity
              style={styles.findMatchButton}
              onPress={handleJoinQueue}
              activeOpacity={0.8}
            >
              <Text style={styles.findMatchText}>Find Match</Text>
            </TouchableOpacity>

            {/* Game Info */}
            <View style={styles.gameInfoGrid}>
              <View style={styles.gameInfoItem}>
                <Text style={styles.gameInfoValue}>3</Text>
                <Text style={styles.gameInfoLabel}>Rounds</Text>
              </View>
              <View style={styles.gameInfoItem}>
                <Text style={styles.gameInfoValue}>30s</Text>
                <Text style={styles.gameInfoLabel}>Per Round</Text>
              </View>
              <View style={styles.gameInfoItem}>
                <Text style={styles.gameInfoValue}>$100</Text>
                <Text style={styles.gameInfoLabel}>Min Bet</Text>
              </View>
            </View>
          </View>
        )}

        {isSearching && !matchedBot && (
          <View style={styles.searchingSection}>
            <Animated.View style={[styles.loadingContainer, { transform: [{ scale: pulseAnim }] }]}>
              <ActivityIndicator size="large" color="#a855f7" />
            </Animated.View>
            <Text style={styles.searchingTitle}>Finding Opponent...</Text>
            <Text style={styles.searchingSubtitle}>Matching you with an AI player</Text>
            
            <TouchableOpacity onPress={handleCancelQueue}>
              <Text style={styles.cancelButton}>Cancel Search</Text>
            </TouchableOpacity>
          </View>
        )}

        {matchedBot && (
          <View style={styles.matchFoundSection}>
            <View style={styles.checkmarkContainer}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
            
            <Text style={styles.matchFoundTitle}>Match Found!</Text>
            <Text style={styles.matchFoundSubtitle}>You're playing against:</Text>
            
            <View style={styles.botCard}>
              <Text style={styles.botName}>{matchedBot.name}</Text>
              <View style={styles.botTypeTag}>
                <Text style={styles.botTypeText}>{matchedBot.personality_type}</Text>
              </View>
            </View>

            <View style={styles.countdownContainer}>
              <Text style={styles.countdownLabel}>Game starting in</Text>
              <Text style={styles.countdownNumber}>{countdown}</Text>
              <Text style={styles.countdownSubtext}>Get ready...</Text>
            </View>
          </View>
        )}
      </View>

      {/* Tip */}
      <View style={styles.tipContainer}>
        <Text style={styles.tipText}>
          💡 Tip: Cooperate to multiply your earnings, or cash out to take it all!
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#9ca3af',
  },
  userCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  trustScore: {
    fontSize: 14,
    color: '#9ca3af',
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  balance: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4ade80',
  },
  mainCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 24,
    flex: 1,
  },
  readySection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconText: {
    fontSize: 48,
  },
  readyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  readySubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 32,
  },
  findMatchButton: {
    backgroundColor: '#a855f7',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginBottom: 32,
    width: '100%',
    alignItems: 'center',
  },
  findMatchText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  gameInfoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  gameInfoItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  gameInfoValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  gameInfoLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  searchingSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  loadingContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  searchingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  searchingSubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 24,
  },
  cancelButton: {
    color: '#9ca3af',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  matchFoundSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  checkmarkContainer: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  checkmark: {
    fontSize: 56,
    color: '#4ade80',
  },
  matchFoundTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  matchFoundSubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 16,
  },
  botCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    alignItems: 'center',
    width: '100%',
  },
  botName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#a855f7',
    marginBottom: 12,
  },
  botTypeTag: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  botTypeText: {
    color: '#c084fc',
    fontSize: 14,
  },
  countdownContainer: {
    alignItems: 'center',
  },
  countdownLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  countdownNumber: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  countdownSubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  tipContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  tipText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default LobbyScreen;