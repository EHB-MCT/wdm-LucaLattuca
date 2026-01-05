import {
  Text,
  StyleSheet,
  View,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Type definitions for game history data
type GameHistory = {
  id: number;
  total_rounds: number;
  ended_at: string;
  player1: PlayerData;
  player2: PlayerData;
};

type PlayerData = {
  name: string;
  is_bot: boolean;
  final_choice: 'invest' | 'cash_out';
  final_earnings: number;
  net_result: number;
};

type HistoryScroll = {
  scrollEnabled?: boolean;
  containerStyle?: ViewStyle;
};

/**
 * History component - Displays user's game history with results
 * Can be embedded in other screens with custom scroll and style props
 */
export default function History({
  scrollEnabled = true,
  containerStyle,
}: HistoryScroll) {
  const [games, setGames] = useState<GameHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGameHistory();
  }, []);

  /**
   * Fetches user's game history from API
   */
  const fetchGameHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem('auth_token');

      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(`${API_URL}/game-history`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch game history: ${response.status}`);
      }

      const data = await response.json();
      setGames(data.history);
    } catch (err) {
      console.error('Error fetching game history:', err);
      setError('Failed to load game history');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for styling game results
  const getBackgroundColor = (choice: 'invest' | 'cash_out'): string => {
    return choice === 'invest' ? '#ffffffff' : '#edededff';
  };

  const getChoiceTextColor = (choice: 'invest' | 'cash_out'): string => {
    return choice === 'invest' ? '#22C55E' : '#EF4444';
  };

  const getNetResultColor = (netResult: number): string => {
    return netResult >= 0 ? '#22C55E' : '#EF4444';
  };

  const formatEarnings = (netResult: number): string => {
    const sign = netResult >= 0 ? '+' : '';
    return `${sign} $${netResult}`;
  };

  const getChoiceText = (choice: 'invest' | 'cash_out'): string => {
    return choice === 'invest' ? 'Invested' : 'Cashed Out';
  };

  // Loading state
  if (loading) {
    return (
      <View style={[styles.history, containerStyle]}>
        <Text style={styles.textStyle}>History</Text>
        <ActivityIndicator
          size="large"
          color="#ffffff"
          style={{ marginTop: 20 }}
        />
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.history, containerStyle]}>
        <Text style={styles.textStyle}>History</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // Empty state
  if (games.length === 0) {
    return (
      <View style={[styles.history, containerStyle]}>
        <Text style={styles.textStyle}>History</Text>
        <Text style={styles.emptyText}>No games played yet</Text>
      </View>
    );
  }

  return (
    <View style={[styles.history, containerStyle]}>
      <Text style={styles.textStyle}>History</Text>
      <FlatList
        data={games}
        scrollEnabled={scrollEnabled}
        style={{ width: '100%' }}
        keyExtractor={game => game.id.toString()}
        renderItem={({ item }) => (
          <>
            {/* Divider between games */}
            <View
              style={{
                height: 1,
                backgroundColor: '#ccc',
                width: '100%',
                marginVertical: 10,
              }}
            />
            
            {/* Player names */}
            <View style={styles.playerInfo}>
              <Text style={styles.player}>
                {item.player1.name}
                {item.player1.is_bot && ' (Bot)'}
              </Text>

              <Text style={styles.player}>
                {item.player2.name}
                {item.player2.is_bot && ' (Bot)'}
              </Text>
            </View>

            {/* Game results card */}
            <View style={styles.match}>
              <View style={styles.matchContent}>
                {/* Player 1 result */}
                <View
                  style={[
                    styles.playerResult,
                    {
                      backgroundColor: getBackgroundColor(
                        item.player1.final_choice
                      ),
                      borderTopLeftRadius: 10,
                      borderBottomLeftRadius: 10,
                    },
                  ]}
                >
                  <Text style={styles.playerResultText}>
                    {getChoiceText(item.player1.final_choice)}
                  </Text>
                  <Text
                    style={[
                      styles.playerResultText,
                      { color: getNetResultColor(item.player1.net_result) },
                    ]}
                  >
                    {formatEarnings(item.player1.net_result)}
                  </Text>
                </View>

                {/* Player 2 result */}
                <View
                  style={[
                    styles.playerResult,
                    {
                      backgroundColor: getBackgroundColor(
                        item.player2.final_choice
                      ),
                      borderTopRightRadius: 10,
                      borderBottomRightRadius: 10,
                    },
                  ]}
                >
                  <Text style={styles.playerResultText}>
                    {getChoiceText(item.player2.final_choice)}
                  </Text>
                  <Text
                    style={[
                      styles.playerResultText,
                      { color: getNetResultColor(item.player2.net_result) },
                    ]}
                  >
                    {formatEarnings(item.player2.net_result)}
                  </Text>
                </View>
              </View>
            </View>
            
            <Text style={styles.rounds}>Rounds: {item.total_rounds}</Text>
          </>
        )}
        contentContainerStyle={styles.matchList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 17,
  },
  history: {
    backgroundColor: 'black',
    alignItems: 'center',
    width: '90%',
    borderRadius: 10,
  },
  matchList: {
    width: '90%',
    alignSelf: 'center',
    paddingBottom: 10,
  },
  match: {
    height: 80,
    borderWidth: 1,
    borderColor: '#000000ff',
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  matchContent: {
    width: '100%',
    height: '100%',
    flex: 1,
    flexDirection: 'row',
    borderRadius: 10,
  },
  playerResult: {
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '50%',
    height: '100%',
  },
  playerInfo: {
    flex: 1,
    width: '100%',
    paddingBottom: 5,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignSelf: 'center',
  },
  player: {
    color: 'white',
  },
  playerResultText: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  rounds: {
    color: 'white',
    alignSelf: 'center',
  },
  errorText: {
    color: 'red',
    marginTop: 20,
    fontSize: 14,
  },
  emptyText: {
    color: 'white',
    marginTop: 20,
    fontSize: 14,
    fontStyle: 'italic',
  },
});

// Sources
// FlatList: https://chatgpt.com/share/694d9388-8240-800a-bff4-f83cfb9a45a1
// fetching history data:  https://claude.ai/share/7505ce54-ca95-413e-8aba-ab94e2c4d97a