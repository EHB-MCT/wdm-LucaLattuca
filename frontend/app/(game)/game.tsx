import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@/contexts/UserContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

interface GameState {
  id: number;
  status: string;
  currentRound: number;
  totalRounds: number;
}

interface RoundState {
  id: number;
  round_number: number;
  pot_before_bonus: number;
  pot_after_bonus: number;
  trust_bonus_percentage: number;
  time_remaining: number;
}

interface PlayerState {
  id: number;
  player_number: number;
  total_invested: number;
  final_earnings: number;
  net_result: number;
}

interface OpponentState {
  name: string;
  is_bot: boolean;
  balance: number;
  trust_score: number;
}

export default function GameScreen() {
  const params = useLocalSearchParams();
  const gameId = params.gameId;
  const { user } = useUser();
  
  // Game state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roundState, setRoundState] = useState<RoundState | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [opponentState, setOpponentState] = useState<OpponentState | null>(null);
  
  // UI state
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [selectedChoice, setSelectedChoice] = useState<'invest' | 'cash_out' | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState('100');
  const [isLocked, setIsLocked] = useState(false);
  
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
    fetchGameState();
    startTimer();
    
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (choiceTimerRef.current) clearInterval(choiceTimerRef.current);
    };
  }, []);

  const fetchGameState = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/game/${params.gameId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setGameState(data.game);
        setRoundState(data.current_round);
        setPlayerState(data.player);
        setOpponentState(data.opponent);
        setTimeRemaining(data.current_round.time_remaining);
      }
    } catch (error) {
      console.error('Failed to fetch game state:', error);
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
    if (selectedChoice && !isLocked) {
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
  }, [selectedChoice, isLocked]);

  const handleChoiceToggle = (choice: 'invest' | 'cash_out') => {
    if (isLocked) return;

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

  const handleLockChoice = async () => {
    if (!selectedChoice) return;

    setIsLocked(true);

    const decisionData = {
      choice: selectedChoice,
      investment_amount: selectedChoice === 'invest' ? parseFloat(investmentAmount) : 100,
      decision_time: (Date.now() - choiceStartTime) / 1000,
      time_on_invest: timeOnInvest,
      time_on_cash_out: timeOnCashOut,
      number_of_toggles: numberOfToggles,
      initial_choice: initialChoice,
    };

    console.log('Locking choice:', decisionData);

    // TODO: Send to backend
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await fetch(`${API_URL}/game/${params.gameId}/round/${roundState?.id}/choice`, {
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
  };

  const handleRoundEnd = () => {
    console.log('Round ended');
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    // TODO: Fetch round results and move to next round or end game
    setTimeout(() => {
      if (gameState && roundState && roundState.round_number < 3) {
        // Next round
        fetchGameState();
        setIsLocked(false);
        setSelectedChoice(null);
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
    }, 2000);
  };

  const pot = roundState?.pot_before_bonus || 0;

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
            <Text style={styles.statText}>♂️</Text>
          </View>
        </View>
        <View style={styles.playerScores}>
          <Text style={styles.trustScoreText}>Trust score {user?.trust_score || 68}</Text>
          <Text style={styles.balanceText}>${user?.balance?.toLocaleString() || '0'}</Text>
        </View>
      </View>

      {/* Choice Buttons */}
      <View style={styles.choiceSection}>
        <TouchableOpacity
          style={[
            styles.choiceButton,
            styles.investButton,
            selectedChoice === 'invest' && styles.selectedButton
          ]}
          onPress={() => handleChoiceToggle('invest')}
          disabled={isLocked}
        >
          <Text style={styles.choiceButtonText}>Invest</Text>
        </TouchableOpacity>

        {selectedChoice === 'invest' && (
          <View style={styles.investmentInputContainer}>
            <Text style={styles.dollarSign}>$</Text>
            <TextInput
              style={styles.investmentInput}
              value={investmentAmount}
              onChangeText={setInvestmentAmount}
              keyboardType="numeric"
              editable={!isLocked}
            />
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.choiceButton,
            styles.cashOutButton,
            selectedChoice === 'cash_out' && styles.selectedButton
          ]}
          onPress={() => handleChoiceToggle('cash_out')}
          disabled={isLocked}
        >
          <Text style={styles.choiceButtonText}>Cash out</Text>
        </TouchableOpacity>

        {!isLocked && selectedChoice && (
          <TouchableOpacity style={styles.lockButton} onPress={handleLockChoice}>
            <Text style={styles.lockButtonText}>Lock Choice</Text>
          </TouchableOpacity>
        )}

        {isLocked && (
          <Text style={styles.lockedText}>Choice locked! Waiting for round to end...</Text>
        )}
      </View>

      {/* Pot Display */}
      <View style={styles.potSection}>
        <Text style={styles.potAmount}>${pot.toFixed(2)}</Text>
      </View>

      {/* Player 2 (Opponent) */}
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
          <Text style={styles.balanceText}>${opponentState?.balance?.toLocaleString() || '0'}</Text>
          <Text style={styles.trustScoreText}>Trust score {opponentState?.trust_score || 56}</Text>
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
  choiceSection: {
    marginVertical: 20,
  },
  choiceButton: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
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
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'black',
  },
  investmentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  dollarSign: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 5,
    color: 'black',
  },
  investmentInput: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'black',
    minWidth: 100,
  },
  lockButton: {
    backgroundColor: 'black',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  lockButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  lockedText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
    fontSize: 14,
  },
  potSection: {
    alignItems: 'flex-end',
    marginVertical: 20,
  },
  potAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
});


// Sources
// generated lobby screen using Claude (Sonnet 4.5)
// https://claude.ai/share/4570ac86-c7f2-452d-93e4-b72281a330ba