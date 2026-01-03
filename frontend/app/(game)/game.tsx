import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity,  ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@/contexts/UserContext';
import type { GameState, RoundState, PlayerState, OpponentState, GameApiResponse, RoundResultsState } from '@/types/game';


import ValuePicker from '../../components/game/valuePicker';

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
  const [investmentAmount, setInvestmentAmount] = useState<number>(100);
  const [displayPot, setDisplayPot] = useState(0); // Pot shown on screen (updated after rounds)
  const [currentBalance, setCurrentBalance] = useState(0);
  const [currentBotBalance, setCurrentBotBalance] = useState(10000);

  // Tracking state
  const [choiceStartTime, setChoiceStartTime] = useState<number>(Date.now());
  const [timeOnInvest, setTimeOnInvest] = useState(0);
  const [timeOnCashOut, setTimeOnCashOut] = useState(0);
  const [numberOfToggles, setNumberOfToggles] = useState(0);
  const [initialChoice, setInitialChoice] = useState<'invest' | 'cash_out' | null>(null);

  // Round results modal state
  const [showRoundResults, setShowRoundResults] = useState(false);
  const [roundResults, setRoundResults] = useState<RoundResultsState | null>(null);
  
  const timerIntervalRef = useRef<NodeJS.Timeout | number | null>(null);
  const choiceTimerRef = useRef<NodeJS.Timeout | number | null>(null);

  const investmentAmountRef = useRef<number>(100);
  const selectedChoiceRef = useRef<'invest' | 'cash_out' | null>('invest');

  const roundIdRef = useRef<number | null>(null);

  // Fetch game state on mount
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

  const fetchGameState = async () => {
  try {
    setIsLoading(true);
    setError(null);
    
    const token = await AsyncStorage.getItem('auth_token');
    
    console.log('🎮 Fetching game state from:', `${API_URL}/game/${gameId}`);
    
    const response = await fetch(`${API_URL}/game/${gameId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    
    console.log('📦 Game state response:', data);

    if (response.ok && data.success) {
      console.log('✅ Setting game state');
      console.log('🎯 Current round ID:', data.current_round.id);
      console.log('🎯 Round number:', data.current_round.round_number);
      
      // Store round ID in ref so it's accessible in callbacks
      roundIdRef.current = data.current_round.id;
      
      // Set state FIRST with the round data we received
      setGameState(data.game);
      setRoundState(data.current_round);
      setPlayerState(data.player);
      setOpponentState(data.opponent);
      setCurrentBalance(data.user_balance); 

      // Set bot balance - start at 10000, then subtract based on rounds played
      if (data.opponent.is_bot) {
        const botBaseBalance = data.opponent.balance || 10000;
        // Calculate bot's current balance by subtracting previous round investments
        const roundsPlayed = data.game.total_rounds || 0;
        const botBalance = botBaseBalance - (roundsPlayed * 100); // Each round bot invests $100
        setCurrentBotBalance(Math.max(0, botBalance));
        console.log('🤖 Bot balance set to:', botBalance);
      }
      
      // AUTO-SELECT INVEST at start of each round
      setSelectedChoice('invest');
      setInitialChoice('invest');
      console.log('✅ Auto-selected INVEST for new round');
      
      // Verify it was set
      console.log('✓ Round state should be set now');
      console.log('✓ Round ID stored in ref:', roundIdRef.current);
      
      // Start the round on backend SECOND
      console.log('▶️ Starting round:', data.current_round.id);
      const startResponse = await fetch(
          `${API_URL}/game/${gameId}/round/${data.current_round.id}/start`,
          {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/json'
              }
          }
      );
      
      const startData = await startResponse.json();
      console.log('⏱️ Round started, time remaining:', startData.time_remaining);
      
      // Update time remaining from backend
      setTimeRemaining(startData.time_remaining || 30);
      
      // Set pot display - Round all values
      const potValue = data.current_round.round_number === 1 
        ? 200  // Round 1 starts with base $200 pot
        : Math.round(data.current_round.pot_before_bonus);
      
      setDisplayPot(potValue);
      console.log('💰 Pot set to:', potValue);
      console.log('💵 User balance:', data.user_balance); // ADD THIS LOG
        
      setIsLoading(false);
      
      // Clear any existing timer before starting new one
      if (timerIntervalRef.current) {
        console.log('⏰ Clearing existing timer');
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      // Start new timer
      console.log('⏰ Starting countdown timer');
      startTimer();
    } else if (data.game_completed) {
        console.log('🏁 Game completed, returning to home');
        router.push('/');
        return;
    } else {
        setError(data.message || 'Failed to load game');
        setIsLoading(false);
    }
  } catch (fetchError) {
    console.error('❌ Failed to fetch game state:', fetchError);
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
          setTimeOnInvest(prev => {
            const newValue = prev + 0.1;
            console.log('Time on invest:', newValue.toFixed(1));
            return newValue;
          });
        } else {
          setTimeOnCashOut(prev => {
            const newValue = prev + 0.1;
            console.log('Time on cash out:', newValue.toFixed(1));
            return newValue;
          });
        }
      }, 100);
    }

    return () => {
      if (choiceTimerRef.current) clearInterval(choiceTimerRef.current);
    };
  }, [selectedChoice]);

  const handleChoiceToggle = (choice: 'invest' | 'cash_out') => {
    console.log('🔄 Choice toggled to:', choice);
  
    // Track initial choice
    if (!initialChoice) {
      setInitialChoice(choice);
      console.log('✅ Initial choice set:', choice);
    }

    // Count toggles
    if (selectedChoice && selectedChoice !== choice) {
      setNumberOfToggles(prev => {
        const newCount = prev + 1;
        console.log('🔢 Toggle count:', newCount);
        return newCount;
      });
    }

    setSelectedChoice(choice);
    selectedChoiceRef.current = choice;
    setChoiceStartTime(Date.now());
  };


  
  const handleRoundEnd = async () => {
    console.log('⏰ Round ended');
    console.log('📊 Current roundState:', roundState);
    console.log('📊 Round ID from ref:', roundIdRef.current);
    console.log('📊 Game ID:', gameId);
  
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (choiceTimerRef.current) clearInterval(choiceTimerRef.current);

  // Use the ref instead of state
  const currentRoundId = roundIdRef.current;
  
  // Verify we have the round ID
  if (!currentRoundId) {
    console.error('❌ No round ID available in ref!');
    setError('Round data missing. Please restart the game.');
    return;
  }

  
  const finalChoice = selectedChoiceRef.current || 'invest';
  const parsedInvestment = investmentAmountRef.current || 100;
  const finalInvestment = finalChoice === 'invest' ? parsedInvestment : 0;

  console.log('💵 Investment amount:', {
    raw: investmentAmountRef.current,
    parsed: parsedInvestment,
    final: finalInvestment,
    choice: finalChoice
  });

  const decisionData = {
    choice: finalChoice,
    investment_amount: finalInvestment,
    decision_time: (Date.now() - choiceStartTime) / 1000,
    time_on_invest: timeOnInvest,
    time_on_cash_out: timeOnCashOut,
    number_of_toggles: numberOfToggles,
    initial_choice: initialChoice || finalChoice,
  };

  console.log('🔒 Auto-locking choice:', decisionData);
  console.log('📤 Submitting to URL:', `${API_URL}/game/${gameId}/round/${currentRoundId}/choice`);

  // Submit choice to backend
  try {
    const token = await AsyncStorage.getItem('auth_token');
    const response = await fetch(`${API_URL}/game/${gameId}/round/${currentRoundId}/choice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(decisionData)
    });

    const resultData = await response.json();
    console.log('📥 Round result:', resultData);

    if (resultData.success && resultData.round_results) {
      // Use real data from backend
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

      // Update bot balance if opponent is bot
      if (opponentState?.is_bot) {
        const botInvestment = resultData.round_results.opponent_investment || 0;
        const botPayout = resultData.round_results.opponent_payout || 0;
        setCurrentBotBalance(prev => prev - botInvestment + botPayout);
        console.log('🤖 Bot balance updated:', {
          previous: currentBotBalance,
          investment: botInvestment,
          payout: botPayout,
          new: currentBotBalance - botInvestment + botPayout
        });
      }

      console.log('✅ Round results set, showing modal');
      
      // Show modal
      setShowRoundResults(true);

      // Wait 3 seconds
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('⏭️ Hiding modal, checking for next round');
      
      // Hide modal
      setShowRoundResults(false);

      // Check if game continues
      if (resultData.round_results?.next_round_number) {
        console.log('🔄 Moving to next round:', resultData.round_results.next_round_number);
        
        // Reset tracking state
      setSelectedChoice(null);
      selectedChoiceRef.current = 'invest'; 
      setInvestmentAmount(100);
      investmentAmountRef.current = 100; 
      setTimeOnInvest(0);
      setTimeOnCashOut(0);
      setNumberOfToggles(0);
      setInitialChoice(null);
        
        // Fetch next round
        await fetchGameState();
      } else {
        console.log('🏁 Game ended, returning to home');
        // Game ended
        router.push('/');
      }
    } else {
      console.error('❌ Backend error:', resultData.message || resultData.error);
      // Still show modal with partial data
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
        nextRoundNumber: roundState && roundState.round_number < 3 ? roundState.round_number + 1 : null,
      });
      setShowRoundResults(true);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      setShowRoundResults(false);
      
      // Try to continue anyway
      if (roundState && roundState.round_number < 3) {
        await fetchGameState();
      } else {
        router.push('/');
      }
    }
  } catch (error) {
    console.error('❌ Failed to submit choice:', error);
    // Show error but still try to continue
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
  <View style={styles.container}>
    <View style={styles.contentContainer}>
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
          <Text style={styles.balanceText}>${Math.round(currentBalance).toLocaleString()}</Text>
        </View>
      </View>

      {/* Center Section - Choice Buttons and Pot */}
      <View style={styles.centerSection}>
        {/* Left side - Choices */}
        <View style={styles.choicesContainer}>
          {/* Invest Button */}
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
          
          {/* Investment Amount Picker */}
          <View style={styles.investmentInputContainer}>
            <Text style={styles.dollarSign}>$</Text>
            <ValuePicker 
              minValue={100} 
              maxValue={Math.min(currentBalance, 5000)} 
              increment={10} 
              initialValue={investmentAmount}
              onValueSettled={(value) => {
                console.log('💰 Investment amount updated:', value);
                setInvestmentAmount(value);
                investmentAmountRef.current = value; // ADD THIS
              }}
            />
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
          <Text style={styles.potAmount}>${Math.round(displayPot)}</Text>
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
          <Text style={styles.balanceText}>
            ${Math.round(opponentState?.is_bot ? currentBotBalance : (opponentState?.balance || 0)).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Round Results Modal */}
      {showRoundResults && roundResults && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Round {roundState?.round_number} Results</Text>
      
            {/* Trust Bonus Notice (if both invested) */}
            {roundResults.bothInvested && (
              <View style={styles.trustBonusNotice}>
                <Text style={styles.trustBonusText}>
                  🤝 Both Invested! +{roundResults.trustBonusPercentage}% Trust Bonus
                </Text>
              </View>
            )}
      
            {/* User Result */}
            <View style={styles.resultRow}>
              <View style={styles.resultPlayerInfo}>
                <View style={styles.smallAvatar} />
                <Text style={styles.resultPlayerName}>{user?.username || 'You'}</Text>
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
                  
            {/* Pot Display */}
            <View style={styles.modalPotSection}>
              <Text style={styles.modalPotLabel}>
                {roundResults.bothInvested ? 'Pot After Trust Bonus' : 'Total Pot'}
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
                    +{roundResults.trustBonusPercentage}% Trust Bonus: ${Math.round(roundResults.potAfterBonus - roundResults.potBeforeBonus)}
                  </Text>
                </View>
              )}
            </View>
                  
            {/* Opponent Result */}
            <View style={styles.resultRow}>
              <View style={styles.resultPlayerInfo}>
                <View style={styles.smallAvatar} />
                <Text style={styles.resultPlayerName}>{opponentState?.name || 'Opponent'}</Text>
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
                  
            {/* Next Round Info */}
            {roundResults.nextRoundNumber && (
              <Text style={styles.nextRoundText}>
                Proceeding to Round {roundResults.nextRoundNumber}...
              </Text>
            )}
            {!roundResults.nextRoundNumber && (
              <Text style={styles.nextRoundText}>
                Game Complete!
              </Text>
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
    fontWeight:"bold"
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
  playerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop:15,
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
    justifyContent: 'center', // Center the picker
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 15, // Add spacing before Cash Out button
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
  // Modal styling
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