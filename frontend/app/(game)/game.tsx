import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@/contexts/UserContext';
import type {
  GameState,
  RoundState,
  PlayerState,
  OpponentState,
  GameApiResponse,
  RoundResultsState,
} from '@/types/game';

import ValuePicker from '../../components/game/valuePicker';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * GameScreen - Main gameplay interface for trust investment game
 * Manages 3-round games where players choose to invest or cash out
 * Tracks decision metrics for behavioral analysis
 */
export default function GameScreen() {
  const params = useLocalSearchParams();
  const { user } = useUser();
  const gameId = params.gameId;

  // Game state from API
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roundState, setRoundState] = useState<RoundState | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [opponentState, setOpponentState] = useState<OpponentState | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [selectedChoice, setSelectedChoice] = useState<'invest' | 'cash_out' | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState<number>(100);
  const [displayPot, setDisplayPot] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [currentBotBalance, setCurrentBotBalance] = useState(10000);

  // Player behavior tracking for research analysis
  const [choiceStartTime, setChoiceStartTime] = useState<number>(Date.now());
  const [timeOnInvest, setTimeOnInvest] = useState(0);
  const [timeOnCashOut, setTimeOnCashOut] = useState(0);
  const [numberOfToggles, setNumberOfToggles] = useState(0);
  const [initialChoice, setInitialChoice] = useState<'invest' | 'cash_out' | null>(null);

  // Round results modal
  const [showRoundResults, setShowRoundResults] = useState(false);
  const [roundResults, setRoundResults] = useState<RoundResultsState | null>(null);

  // Refs for accessing latest values in async callbacks
  const timerIntervalRef = useRef<NodeJS.Timeout | number | null>(null);
  const choiceTimerRef = useRef<NodeJS.Timeout | number | null>(null);
  const investmentAmountRef = useRef<number>(100);
  const selectedChoiceRef = useRef<'invest' | 'cash_out' | null>('invest');
  const roundIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (gameId) {
      fetchGameState();
    } else {
      setError('No game ID provided');
      setIsLoading(false);
    }

    selectedChoiceRef.current = 'invest';
    investmentAmountRef.current = 100;

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (choiceTimerRef.current) clearInterval(choiceTimerRef.current);
    };
  }, [gameId]);

  /**
   * Fetches current game state and initializes round
   * Starts backend round timer and countdown
   */
  const fetchGameState = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_URL}/game/${gameId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        roundIdRef.current = data.current_round.id;

        setGameState(data.game);
        setRoundState(data.current_round);
        setPlayerState(data.player);
        setOpponentState(data.opponent);
        setCurrentBalance(data.user_balance);

        // Calculate bot balance based on rounds played
        if (data.opponent.is_bot) {
          const botBaseBalance = data.opponent.balance || 10000;
          const roundsPlayed = data.game.total_rounds || 0;
          const botBalance = botBaseBalance - roundsPlayed * 100;
          setCurrentBotBalance(Math.max(0, botBalance));
        }

        // Auto-select invest at round start
        setSelectedChoice('invest');
        setInitialChoice('invest');

        // Start round on backend
        const startResponse = await fetch(
          `${API_URL}/game/${gameId}/round/${data.current_round.id}/start`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        );

        const startData = await startResponse.json();
        setTimeRemaining(startData.time_remaining || 30);

        // Set initial pot display
        const potValue =
          data.current_round.round_number === 1
            ? 200
            : Math.round(data.current_round.pot_before_bonus);

        setDisplayPot(potValue);
        setIsLoading(false);

        // Clear existing timer and start new countdown
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }

        startTimer();
      } else if (data.game_completed) {
        router.push('/');
        return;
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

  /**
   * Starts 30-second countdown timer for round
   */
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

  /**
   * Tracks time spent hovering on each choice option
   * Used for behavioral analysis
   */
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

  /**
   * Handles player toggling between invest/cash out choices
   * Tracks initial choice and number of toggles for analysis
   */
  const handleChoiceToggle = (choice: 'invest' | 'cash_out') => {
    if (!initialChoice) {
      setInitialChoice(choice);
    }

    if (selectedChoice && selectedChoice !== choice) {
      setNumberOfToggles(prev => prev + 1);
    }

    setSelectedChoice(choice);
    selectedChoiceRef.current = choice;
    setChoiceStartTime(Date.now());
  };

  /**
   * Handles round completion - submits choice and displays results
   * Manages round transitions and game completion
   */
  const handleRoundEnd = async () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (choiceTimerRef.current) clearInterval(choiceTimerRef.current);

    const currentRoundId = roundIdRef.current;

    if (!currentRoundId) {
      console.error('No round ID available');
      setError('Round data missing. Please restart the game.');
      return;
    }

    const finalChoice = selectedChoiceRef.current || 'invest';
    const parsedInvestment = investmentAmountRef.current || 100;
    const finalInvestment = finalChoice === 'invest' ? parsedInvestment : 0;

    // Compile decision data with behavioral metrics
    const decisionData = {
      choice: finalChoice,
      investment_amount: finalInvestment,
      decision_time: (Date.now() - choiceStartTime) / 1000,
      time_on_invest: timeOnInvest,
      time_on_cash_out: timeOnCashOut,
      number_of_toggles: numberOfToggles,
      initial_choice: initialChoice || finalChoice,
    };

    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(
        `${API_URL}/game/${gameId}/round/${currentRoundId}/choice`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(decisionData),
        }
      );

      const resultData = await response.json();

      if (resultData.success && resultData.round_results) {
        setRoundResults({
          userChoice: resultData.round_results.user_choice,
          userInvestment: resultData.round_results.user_investment,
          opponentChoice: resultData.round_results.opponent_choice,
          opponentInvestment: resultData.round_results.opponent_investment,
          userPayout: resultData.round_results.user_payout,
          opponentPayout: resultData.round_results.opponent_payout,
          potBeforeBonus: resultData.round_results.pot_before_bonus,
          potAfterBonus: resultData.round_results.pot_after_bonus,
          bothInvested: resultData.round_results.both_invested,
          trustBonusPercentage: resultData.round_results.trust_bonus_percentage,
          nextRoundNumber: resultData.round_results.next_round_number,
        });

        // Update bot balance after round
        if (opponentState?.is_bot) {
          const botInvestment = resultData.round_results.opponent_investment || 0;
          const botPayout = resultData.round_results.opponent_payout || 0;
          setCurrentBotBalance(prev => prev - botInvestment + botPayout);
        }

        setShowRoundResults(true);

        // Display results for configured time
        const displayTime = resultData.round_results.display_time_ms || 5000;
        await new Promise(resolve => setTimeout(resolve, displayTime));

        setShowRoundResults(false);

        // Continue to next round or end game
        if (resultData.round_results?.next_round_number) {
          // Reset tracking state for next round
          setSelectedChoice(null);
          selectedChoiceRef.current = 'invest';
          setInvestmentAmount(100);
          investmentAmountRef.current = 100;
          setTimeOnInvest(0);
          setTimeOnCashOut(0);
          setNumberOfToggles(0);
          setInitialChoice(null);

          await fetchGameState();
        } else {
          router.push('/');
        }
      } else {
        console.error('Backend error:', resultData.message || resultData.error);
        
        // Show fallback results on error
        setRoundResults({
          userChoice: finalChoice,
          userInvestment: finalInvestment,
          opponentChoice: 'invest',
          opponentInvestment: 100,
          userPayout: 0,
          opponentPayout: 0,
          potBeforeBonus: displayPot,
          potAfterBonus: displayPot,
          bothInvested: false,
          trustBonusPercentage: 0,
          nextRoundNumber:
            roundState && roundState.round_number < 3
              ? roundState.round_number + 1
              : null,
        });
        setShowRoundResults(true);

        await new Promise(resolve => setTimeout(resolve, 3000));
        setShowRoundResults(false);

        if (roundState && roundState.round_number < 3) {
          await fetchGameState();
        } else {
          router.push('/');
        }
      }
    } catch (error) {
      console.error('Failed to submit choice:', error);
      setError('Failed to submit choice. Continuing...');

      setTimeout(() => {
        setError(null);
        if (roundState && roundState.round_number < 3) {
          fetchGameState();
        } else {
          router.push('/');
        }
      }, 2000);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="black" />
        <Text style={{ marginTop: 20, fontSize: 16 }}>Loading game...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ fontSize: 18, marginBottom: 20, textAlign: 'center' }}>
          {error}
        </Text>
        <TouchableOpacity style={styles.goBackButton} onPress={() => router.back()}>
          <Text style={styles.goBackButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Header - Round number and countdown timer */}
        <View style={styles.header}>
          <Text style={styles.roundText}>
            Round {roundState?.round_number || 1}
          </Text>
          <Text style={styles.timerText}>{timeRemaining}s</Text>
        </View>

        {/* Player 1 (Current User) */}
        <View style={styles.playerSection}>
          <View style={styles.avatar} />
          <View style={styles.playerInfo}>
            <Text style={styles.playerLabel}>Reliable player</Text>
            <Text style={styles.playerName}>{user?.username || 'You'}</Text>
            <View style={styles.playerStats}>
              <Text style={styles.statText}>🇧🇪 {user?.age || 25}</Text>
              <Text style={styles.statText}>
                {user?.gender === 'male'
                  ? '♂️'
                  : user?.gender === 'female'
                    ? '♀️'
                    : '⚧'}
              </Text>
            </View>
          </View>
          <View style={styles.playerScores}>
            <Text style={styles.trustScoreText}>
              Trust score {user?.trust_score || 68}
            </Text>
            <Text style={styles.balanceText}>
              ${Math.round(currentBalance).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Center Section - Player choices and current pot */}
        <View style={styles.centerSection}>
          <View style={styles.choicesContainer}>
            <TouchableOpacity
              style={[
                styles.choiceButton,
                styles.investButton,
                selectedChoice === 'invest' && styles.selectedButton,
              ]}
              onPress={() => handleChoiceToggle('invest')}
            >
              <Text style={styles.choiceButtonText}>Invest</Text>
            </TouchableOpacity>

            {/* Investment amount selector */}
            <View style={styles.investmentInputContainer}>
              <Text style={styles.dollarSign}>$</Text>
              <ValuePicker
                minValue={100}
                maxValue={Math.min(currentBalance, 5000)}
                increment={10}
                initialValue={investmentAmount}
                onValueSettled={value => {
                  setInvestmentAmount(value);
                  investmentAmountRef.current = value;
                }}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.choiceButton,
                styles.cashOutButton,
                selectedChoice === 'cash_out' && styles.selectedButton,
              ]}
              onPress={() => handleChoiceToggle('cash_out')}
            >
              <Text style={styles.choiceButtonText}>Cash out</Text>
            </TouchableOpacity>
          </View>

          {/* Current pot display */}
          <View style={styles.potContainer}>
            <Text style={styles.potAmount}>${Math.round(displayPot)}</Text>
          </View>
        </View>

        {/* Player 2 (Opponent/Bot) */}
        <View style={styles.playerSection}>
          <View style={styles.avatar} />
          <View style={styles.playerInfo}>
            <Text style={styles.playerLabel}>
              {opponentState?.is_bot ? 'Neutral player' : 'Player'}
            </Text>
            <Text style={styles.playerName}>
              {opponentState?.name || 'Opponent'}
            </Text>
            <View style={styles.playerStats}>
              <Text style={styles.statText}>🇷🇴 21</Text>
              <Text style={styles.statText}>♀️</Text>
            </View>
          </View>
          <View style={styles.playerScores}>
            <Text style={styles.trustScoreText}>
              Trust score {opponentState?.trust_score || 56}
            </Text>
            <Text style={styles.balanceText}>
              $
              {Math.round(
                opponentState?.is_bot
                  ? currentBotBalance
                  : opponentState?.balance || 0
              ).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Round Results Modal - Shows after each round */}
        {showRoundResults && roundResults && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                Round {roundState?.round_number} Results
              </Text>

              {/* Trust bonus notification if both players invested */}
              {roundResults.bothInvested && (
                <View style={styles.trustBonusNotice}>
                  <Text style={styles.trustBonusText}>
                    🤝 Both Invested! +{roundResults.trustBonusPercentage}%
                    Trust Bonus
                  </Text>
                </View>
              )}

              {/* User result */}
              <View style={styles.resultRow}>
                <View style={styles.resultPlayerInfo}>
                  <View style={styles.smallAvatar} />
                  <Text style={styles.resultPlayerName}>
                    {user?.username || 'You'}
                  </Text>
                </View>
                <View style={styles.resultChoice}>
                  <Text style={styles.resultChoiceText}>
                    {roundResults.userChoice === 'invest'
                      ? `Invested $${Math.round(roundResults.userInvestment)}`
                      : 'Cashed Out'}
                  </Text>
                  <Text style={styles.resultPayoutText}>
                    ${Math.round(roundResults.userPayout)}
                  </Text>
                </View>
              </View>

              {/* Pot display with trust bonus breakdown */}
              <View style={styles.modalPotSection}>
                <Text style={styles.modalPotLabel}>
                  {roundResults.bothInvested
                    ? 'Pot After Trust Bonus'
                    : 'Total Pot'}
                </Text>
                <Text style={styles.modalPotAmount}>
                  ${Math.round(roundResults.potAfterBonus)}
                </Text>
                {roundResults.bothInvested && (
                  <View style={styles.bonusBreakdown}>
                    <Text style={styles.potBeforeBonusText}>
                      Base Pot: ${Math.round(roundResults.potBeforeBonus)}
                    </Text>
                    <Text style={styles.bonusAppliedText}>
                      +{roundResults.trustBonusPercentage}% Trust Bonus: $
                      {Math.round(
                        roundResults.potAfterBonus - roundResults.potBeforeBonus
                      )}
                    </Text>
                  </View>
                )}
              </View>

              {/* Opponent result */}
              <View style={styles.resultRow}>
                <View style={styles.resultPlayerInfo}>
                  <View style={styles.smallAvatar} />
                  <Text style={styles.resultPlayerName}>
                    {opponentState?.name || 'Opponent'}
                  </Text>
                </View>
                <View style={styles.resultChoice}>
                  <Text style={styles.resultChoiceText}>
                    {roundResults.opponentChoice === 'invest'
                      ? `Invested $${Math.round(roundResults.opponentInvestment)}`
                      : 'Cashed Out'}
                  </Text>
                  <Text style={styles.resultPayoutText}>
                    ${Math.round(roundResults.opponentPayout)}
                  </Text>
                </View>
              </View>

              {/* Next round or game complete message */}
              {roundResults.nextRoundNumber && (
                <Text style={styles.nextRoundText}>
                  Proceeding to Round {roundResults.nextRoundNumber}...
                </Text>
              )}
              {!roundResults.nextRoundNumber && (
                <Text style={styles.nextRoundText}>Game Complete!</Text>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
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
    fontSize: 28,
    color: 'black',
    fontWeight: 'bold',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
  playerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
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
    marginVertical: 30,
  },
  choicesContainer: {
    flex: 1,
    marginRight: 40,
  },
  choiceButton: {
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginBottom: 15,
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
  investmentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 15,
  },
  choiceButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'black',
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
    textAlign: 'center',
    marginBottom: 25,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  resultPlayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  smallAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#e0e0e0',
    marginRight: 10,
  },
  resultPlayerName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'black',
  },
  resultChoice: {
    alignItems: 'flex-end',
  },
  resultChoiceText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  resultPayoutText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
  },
  modalPotSection: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalPotLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  modalPotAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'black',
  },
  nextRoundText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
  trustBonusNotice: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  trustBonusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
    textAlign: 'center',
  },
  bonusBreakdown: {
    marginTop: 8,
    alignItems: 'center',
  },
  potBeforeBonusText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  bonusAppliedText: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '600',
  },
});

// Sources
// Game developed using Claude (Sonnet 4.5)
// https://claude.ai/share/4570ac86-c7f2-452d-93e4-b72281a330ba
// https://claude.ai/share/a12f69bf-4d58-491c-a32c-e5dea7c58683