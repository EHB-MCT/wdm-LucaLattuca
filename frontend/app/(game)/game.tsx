import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@/contexts/UserContext';
import type { GameState, RoundState, PlayerState, OpponentState, GameApiResponse } from '@/types/game';


const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';


export default function GameScreen() {
  const params = useLocalSearchParams();
  const { user } = useUser();
  const gameId = params.gameId;
  
  // Game state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roundState, setRoundState] = useState<RoundState | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [opponentState, setOpponentState] = useState<OpponentState | null>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [selectedChoice, setSelectedChoice] = useState<'invest' | 'cash_out' | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState('100');
  const [displayPot, setDisplayPot] = useState(0); // Pot shown on screen (updated after rounds)
  
  // Tracking state
  const [choiceStartTime, setChoiceStartTime] = useState<number>(Date.now());
  const [timeOnInvest, setTimeOnInvest] = useState(0);
  const [timeOnCashOut, setTimeOnCashOut] = useState(0);
  const [numberOfToggles, setNumberOfToggles] = useState(0);
  const [initialChoice, setInitialChoice] = useState<'invest' | 'cash_out' | null>(null);
  
  const timerIntervalRef = useRef<NodeJS.Timeout | number | null>(null);
  const choiceTimerRef = useRef<NodeJS.Timeout | number | null>(null);

  // Fetch game state on mount
  useEffect(() => {
    if (gameId) {
      fetchGameState();
      startTimer();
    } else {
      setError('No game ID provided');
      setIsLoading(false);
    }
    
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (choiceTimerRef.current) clearInterval(choiceTimerRef.current);
    };
  }, [gameId]);

  const fetchGameState = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = await AsyncStorage.getItem('auth_token');
      
      console.log('Fetching game state from:', `${API_URL}/game/${gameId}`);
      
      const response = await fetch(`${API_URL}/game/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      const data = await response.json();
      
      console.log('Game state response:', data);

      if (response.ok && data.success) {
        setGameState(data.game);
        setRoundState(data.current_round);
        setPlayerState(data.player);
        setOpponentState(data.opponent);
        setTimeRemaining(data.current_round.time_remaining);
        
        // Set pot to previous round's pot_after_bonus (or 0 for round 1)
        if (data.current_round.round_number === 1) {
          setDisplayPot(0);
        } else {
          setDisplayPot(data.current_round.pot_before_bonus);
        }
        
        setIsLoading(false);
      } else {
        setError(data.message || 'Failed to load game');
        setIsLoading(false);
      }
    } catch (fetchError) {
      console.error('Failed to fetch game state:', fetchError);
      setError('Connection error. Please try again.');
      setIsLoading(false);
    }
  };

  const startTimer = () => {
    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleRoundEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Track time spent on each choice
  useEffect(() => {
    if (selectedChoice) {
      choiceTimerRef.current = setInterval(() => {
        if (selectedChoice === 'invest') {
          setTimeOnInvest(prev => prev + 0.1);
        } else {
          setTimeOnCashOut(prev => prev + 0.1);
        }
      }, 100);
    }

    return () => {
      if (choiceTimerRef.current) clearInterval(choiceTimerRef.current);
    };
  }, [selectedChoice]);

  const handleChoiceToggle = (choice: 'invest' | 'cash_out') => {
    // Track initial choice
    if (!initialChoice) {
      setInitialChoice(choice);
    }

    // Count toggles
    if (selectedChoice && selectedChoice !== choice) {
      setNumberOfToggles(prev => prev + 1);
    }

    setSelectedChoice(choice);
    setChoiceStartTime(Date.now());
  };

  const handleRoundEnd = async () => {
    console.log('Round ended');
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (choiceTimerRef.current) clearInterval(choiceTimerRef.current);

    // Auto-lock the current choice (or default to invest if none selected)
    const finalChoice = selectedChoice || 'invest';
    const finalInvestment = finalChoice === 'invest' ? parseFloat(investmentAmount) : 100;

    const decisionData = {
      choice: finalChoice,
      investment_amount: finalInvestment,
      decision_time: (Date.now() - choiceStartTime) / 1000,
      time_on_invest: timeOnInvest,
      time_on_cash_out: timeOnCashOut,
      number_of_toggles: numberOfToggles,
      initial_choice: initialChoice || finalChoice,
    };

    console.log('Auto-locking choice:', decisionData);

    // Submit choice to backend
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await fetch(`${API_URL}/game/${gameId}/round/${roundState?.id}/choice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(decisionData)
      });
    } catch (error) {
      console.error('Failed to submit choice:', error);
    }
    
    // Wait for results, then move to next round or end game
    setTimeout(() => {
      if (gameState && roundState && roundState.round_number < 3) {
        // Next round
        fetchGameState();
        setSelectedChoice(null);
        setInvestmentAmount('100');
        setTimeRemaining(30);
        setTimeOnInvest(0);
        setTimeOnCashOut(0);
        setNumberOfToggles(0);
        setInitialChoice(null);
        startTimer();
      } else {
        // Game ended
        router.push('/');
      }
    }, 3000); // 3 second delay to show results
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="black" />
        <Text style={{ marginTop: 20, fontSize: 16 }}>Loading game...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ fontSize: 18, marginBottom: 20, textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity 
          style={styles.goBackButton}
          onPress={() => router.back()}
        >
          <Text style={styles.goBackButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header - Round and Timer */}
      <View style={styles.header}>
        <Text style={styles.roundText}>Round {roundState?.round_number || 1}</Text>
        <Text style={styles.timerText}>{timeRemaining}s</Text>
      </View>

      {/* Player 1 (User) */}
      <View style={styles.playerSection}>
        <View style={styles.avatar} />
        <View style={styles.playerInfo}>
          <Text style={styles.playerLabel}>Reliable player</Text>
          <Text style={styles.playerName}>{user?.username || 'You'}</Text>
          <View style={styles.playerStats}>
            <Text style={styles.statText}>🇧🇪 {user?.age || 25}</Text>
            <Text style={styles.statText}>{user?.gender === 'male' ? '♂️' : user?.gender === 'female' ? '♀️' : '⚧'}</Text>
          </View>
        </View>
        <View style={styles.playerScores}>
          <Text style={styles.trustScoreText}>Trust score {user?.trust_score || 68}</Text>
          <Text style={styles.balanceText}>${user?.balance?.toLocaleString() || '0'}</Text>
        </View>
      </View>

      {/* Center Section - Choice Buttons and Pot */}
      <View style={styles.centerSection}>
        {/* Left side - Choices */}
        <View style={styles.choicesContainer}>
          {/* Invest Button with Amount Input */}
          <View style={styles.investRow}>
            <TouchableOpacity
              style={[
                styles.choiceButton,
                styles.investButton,
                selectedChoice === 'invest' && styles.selectedButton
              ]}
              onPress={() => handleChoiceToggle('invest')}
            >
              <Text style={styles.choiceButtonText}>Invest</Text>
            </TouchableOpacity>

            <View style={styles.investmentInputContainer}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.investmentInput}
                value={investmentAmount}
                onChangeText={setInvestmentAmount}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Cash Out Button */}
          <TouchableOpacity
            style={[
              styles.choiceButton,
              styles.cashOutButton,
              selectedChoice === 'cash_out' && styles.selectedButton
            ]}
            onPress={() => handleChoiceToggle('cash_out')}
          >
            <Text style={styles.choiceButtonText}>Cash out</Text>
          </TouchableOpacity>
        </View>

        {/* Right side - Pot */}
        <View style={styles.potContainer}>
          <Text style={styles.potAmount}>${displayPot.toFixed(2)}</Text>
        </View>
      </View>

      {/* Player 2 (Opponent/Bot) */}
      <View style={styles.playerSection}>
        <View style={styles.avatar} />
        <View style={styles.playerInfo}>
          <Text style={styles.playerLabel}>{opponentState?.is_bot ? 'Neutral player' : 'Player'}</Text>
          <Text style={styles.playerName}>{opponentState?.name || 'Opponent'}</Text>
          <View style={styles.playerStats}>
            <Text style={styles.statText}>🇷🇴 21</Text>
            <Text style={styles.statText}>♀️</Text>
          </View>
        </View>
        <View style={styles.playerScores}>
          <Text style={styles.trustScoreText}>Trust score {opponentState?.trust_score || 56}</Text>
          <Text style={styles.balanceText}>${opponentState?.balance?.toLocaleString() || '12,231'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  roundText: {
    fontSize: 18,
    color: 'black',
    textDecorationLine: 'underline',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
  playerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    marginRight: 15,
  },
  playerInfo: {
    flex: 1,
  },
  playerLabel: {
    fontSize: 12,
    color: '#666',
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    marginVertical: 2,
  },
  playerStats: {
    flexDirection: 'row',
    gap: 10,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  playerScores: {
    alignItems: 'flex-end',
  },
  trustScoreText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  balanceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },
  centerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginVertical: 30,
  },
  choicesContainer: {
    flex: 1,
    marginRight: 20,
  },
  investRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  choiceButton: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    flex: 1,
  },
  investButton: {
    backgroundColor: '#e8f5e9',
  },
  cashOutButton: {
    backgroundColor: '#ffebee',
  },
  selectedButton: {
    borderColor: 'black',
    borderWidth: 3,
  },
  choiceButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'black',
  },
  investmentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dollarSign: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 3,
    color: 'black',
  },
  investmentInput: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    minWidth: 60,
    padding: 0,
  },
  potContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  potAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'black',
  },
  goBackButton: {
    backgroundColor: 'black',
    padding: 15,
    borderRadius: 8,
  },
  goBackButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});