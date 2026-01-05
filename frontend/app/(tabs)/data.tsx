import React, { useState, useEffect } from 'react';
import { 
    View, 
    ScrollView, 
    Text, 
    StyleSheet, 
    ActivityIndicator,
    Dimensions,
    RefreshControl,
    TouchableOpacity 
} from 'react-native';
import { 
    BarChart, 
    LineChart, 
    PieChart 
} from 'react-native-gifted-charts';
import { gameDataApi } from '../../utils/gameDataApi';
import { checkAuthStatus } from '../../utils/authDebug';

const { width } = Dimensions.get('window');

// Type Definitions
interface OceanDataPoint {
    label: string;
    value: number;
}

interface LeaderboardPlayer {
    username: string;
    balance: number;
    trust_score: number;
}

interface TrustInvestmentPoint {
    x: number;
    y: number;
}

interface ChoiceDistribution {
    round: number;
    invest_percentage: number;
    cash_out_percentage: number;
    invest_count: number;
    cash_out_count: number;
}

interface AverageInvestment {
    round: number;
    average_investment: number;
}

interface UserStats {
    total_matches: number;
    times_cooperated: number;
    times_defected: number;
    times_betrayed: number;
    average_earnings: number;
    trust_score: number;
    balance: number;
}

interface Summary {
    total_users: number;
    total_games: number;
    total_rounds: number;
    cooperation_rate: number;
    betrayal_rate: number;
    user_stats?: UserStats;
}

interface GameData {
    ocean_model: {
        population_average: OceanDataPoint[];
        user_data: OceanDataPoint[] | null;
    };
    leaderboard: LeaderboardPlayer[];
    trust_vs_investment: TrustInvestmentPoint[];
    choice_distribution: ChoiceDistribution[];
    average_investment: AverageInvestment[];
    summary: Summary;
}

interface PieChartDataPoint {
    value: number;
    label: string;
    color: string;
}

interface BarChartDataPoint {
    value: number;
    label?: string;
    spacing?: number;
    labelWidth?: number;
    labelTextStyle?: { fontSize: number };
    frontColor: string;
}

interface LineChartDataPoint {
    value: number;
    label: string;
    dataPointText: string;
}

export default function DataScreen() {
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [data, setData] = useState<GameData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Debug: Check if we have auth token
            const authStatus = await checkAuthStatus();
            if (!authStatus?.hasToken) {
                setError('Not authenticated. Please log in first.');
                setLoading(false);
                setRefreshing(false);
                return;
            }
            
            const response = await gameDataApi.getAllData();
            
            if (response.success) {
                setData(response.data);
            }
        } catch (err) {
            let errorMessage = 'An unknown error occurred';
            
            if (err instanceof Error) {
                errorMessage = err.message;
            }
            
            // More specific error messages
            if (errorMessage.includes('401')) {
                errorMessage = 'Authentication failed. Please log in again.';
            } else if (errorMessage.includes('Network Error')) {
                errorMessage = 'Cannot connect to server. Check your internet connection.';
            } else if (errorMessage.includes('timeout')) {
                errorMessage = 'Request timed out. Please try again.';
            }
            
            setError(errorMessage);
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchAllData();
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#0066cc" />
                <Text style={styles.loadingText}>Loading statistics...</Text>
            </View>
        );
    }

    if (error && !data) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
                <TouchableOpacity 
                    onPress={fetchAllData}
                    style={styles.retryButton}
                >
                    <Text style={styles.retryButtonText}>Tap to Retry</Text>
                </TouchableOpacity>
                <Text style={styles.debugText}>
                    API: {process.env.EXPO_PUBLIC_API_URL}
                </Text>
            </View>
        );
    }

    if (!data) {
        return (
            <View style={styles.centerContainer}>
                <Text>No data available</Text>
            </View>
        );
    }

    // Prepare OCEAN Model Pie Chart Data (Population Average)
    const oceanPieData: PieChartDataPoint[] = data.ocean_model.population_average.map((item: OceanDataPoint, index: number) => ({
        value: item.value,
        label: item.label,
        color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][index],
    }));

    // Prepare User OCEAN Model Pie Chart Data
    const userOceanPieData: PieChartDataPoint[] = data.ocean_model.user_data 
        ? data.ocean_model.user_data.map((item: OceanDataPoint, index: number) => ({
            value: item.value,
            label: item.label,
            color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][index],
        }))
        : [];

    // Prepare Leaderboard Grouped Bar Chart Data
    const groupedLeaderboardData: BarChartDataPoint[] = [];
    data.leaderboard.forEach((player: LeaderboardPlayer) => {
        groupedLeaderboardData.push({
            value: player.balance,
            label: (player.username || 'Unknown').substring(0, 8),
            spacing: 2,
            labelWidth: 70,
            labelTextStyle: { fontSize: 10 },
            frontColor: '#4ECDC4',
        });
        groupedLeaderboardData.push({
            value: player.trust_score,
            frontColor: '#FF6B6B',
        });
    });

    // Prepare Choice Distribution Line Chart Data
    const investLineData: LineChartDataPoint[] = data.choice_distribution.map((round: ChoiceDistribution) => ({
        value: round.invest_percentage,
        label: `R${round.round}`,
        dataPointText: `${round.invest_percentage}%`,
    }));

    const cashOutLineData: LineChartDataPoint[] = data.choice_distribution.map((round: ChoiceDistribution) => ({
        value: round.cash_out_percentage,
        label: `R${round.round}`,
        dataPointText: `${round.cash_out_percentage}%`,
    }));

    // Prepare Average Investment Line Chart Data
    const avgInvestmentLineData: LineChartDataPoint[] = data.average_investment.map((round: AverageInvestment) => ({
        value: round.average_investment,
        label: `Round ${round.round}`,
        dataPointText: `$${round.average_investment}`,
    }));

    return (
        <ScrollView 
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {/* Summary Stats */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📊 Overview</Text>
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{data.summary.total_users}</Text>
                        <Text style={styles.statLabel}>Total Users</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{data.summary.total_games}</Text>
                        <Text style={styles.statLabel}>Total Games</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: '#4ECDC4' }]}>
                            {data.summary.cooperation_rate}%
                        </Text>
                        <Text style={styles.statLabel}>Cooperation</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: '#FF6B6B' }]}>
                            {data.summary.betrayal_rate}%
                        </Text>
                        <Text style={styles.statLabel}>Betrayal</Text>
                    </View>
                </View>
            </View>

            {/* User Personal Stats */}
            {data.summary.user_stats && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>👤 Your Stats</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>
                                {data.summary.user_stats.total_matches}
                            </Text>
                            <Text style={styles.statLabel}>Games Played</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                                ${data.summary.user_stats.balance}
                            </Text>
                            <Text style={styles.statLabel}>Balance</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>
                                {data.summary.user_stats.trust_score}
                            </Text>
                            <Text style={styles.statLabel}>Trust Score</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statValue}>
                                ${data.summary.user_stats.average_earnings}
                            </Text>
                            <Text style={styles.statLabel}>Avg Earnings</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Population OCEAN Model */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🧠 Population OCEAN Model</Text>
                <Text style={styles.chartDescription}>
                    Average personality traits across all players
                </Text>
                <View style={styles.chartContainer}>
                    <PieChart
                        data={oceanPieData}
                        donut
                        radius={120}
                        innerRadius={60}
                        centerLabelComponent={() => (
                            <View>
                                <Text style={styles.centerLabel}>Average</Text>
                                <Text style={styles.centerSubLabel}>Population</Text>
                            </View>
                        )}
                    />
                    <View style={styles.legendContainer}>
                        {oceanPieData.map((item: PieChartDataPoint, index: number) => (
                            <View key={index} style={styles.legendItem}>
                                <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                                <Text style={styles.legendText}>
                                    {item.label}: <Text style={styles.legendValue}>{item.value}</Text>
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            {/* User OCEAN Model */}
            {userOceanPieData.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🎭 Your OCEAN Personality</Text>
                    <Text style={styles.chartDescription}>
                        Your unique personality profile
                    </Text>
                    <View style={styles.chartContainer}>
                        <PieChart
                            data={userOceanPieData}
                            donut
                            radius={120}
                            innerRadius={60}
                            centerLabelComponent={() => (
                                <View>
                                    <Text style={styles.centerLabel}>Your</Text>
                                    <Text style={styles.centerSubLabel}>Profile</Text>
                                </View>
                            )}
                        />
                        <View style={styles.legendContainer}>
                            {userOceanPieData.map((item: PieChartDataPoint, index: number) => (
                                <View key={index} style={styles.legendItem}>
                                    <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                                    <Text style={styles.legendText}>
                                        {item.label}: <Text style={styles.legendValue}>{item.value}</Text>
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            )}

            {/* Leaderboard */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🏆 Top 10 Players</Text>
                <Text style={styles.chartDescription}>
                    💰 Blue bars = Balance | ❤️ Red bars = Trust Score
                </Text>
                <View style={styles.chartContainer}>
                    <BarChart
                        data={groupedLeaderboardData}
                        barWidth={16}
                        spacing={4}
                        hideRules
                        xAxisThickness={1}
                        yAxisThickness={1}
                        yAxisTextStyle={{ fontSize: 10 }}
                        noOfSections={4}
                        maxValue={Math.max(
                            ...data.leaderboard.map((p: LeaderboardPlayer) => Math.max(p.balance, p.trust_score))
                        )}
                        height={220}
                        width={width - 60}
                    />
                </View>
            </View>

            {/* Choice Distribution by Round */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📈 Invest vs Cash Out Trends</Text>
                <Text style={styles.chartDescription}>
                    Player choices across rounds 1, 2, and 3
                </Text>
                <View style={styles.chartContainer}>
                    <LineChart
                        data={investLineData}
                        data2={cashOutLineData}
                        height={220}
                        width={width - 80}
                        spacing={80}
                        initialSpacing={20}
                        color1="#4ECDC4"
                        color2="#FF6B6B"
                        dataPointsColor1="#4ECDC4"
                        dataPointsColor2="#FF6B6B"
                        textColor1="#4ECDC4"
                        textColor2="#FF6B6B"
                        textShiftY={-8}
                        textShiftX={-10}
                        textFontSize={10}
                        thickness={3}
                        yAxisColor="#666"
                        xAxisColor="#666"
                        yAxisTextStyle={{ fontSize: 10 }}
                        xAxisLabelTextStyle={{ fontSize: 10 }}
                        curved
                        showVerticalLines
                        verticalLinesColor="rgba(200,200,200,0.3)"
                    />
                    <View style={styles.legendContainer}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: '#4ECDC4' }]} />
                            <Text style={styles.legendText}>Invest %</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: '#FF6B6B' }]} />
                            <Text style={styles.legendText}>Cash Out %</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Average Investment by Round */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>💵 Investment Progression</Text>
                <Text style={styles.chartDescription}>
                    How average investments grow from round 1 to 3
                </Text>
                <View style={styles.chartContainer}>
                    <LineChart
                        data={avgInvestmentLineData}
                        height={220}
                        width={width - 80}
                        spacing={100}
                        initialSpacing={30}
                        color="#45B7D1"
                        dataPointsColor="#45B7D1"
                        textColor="#45B7D1"
                        textShiftY={-8}
                        textShiftX={-15}
                        textFontSize={10}
                        thickness={3}
                        yAxisColor="#666"
                        xAxisColor="#666"
                        yAxisTextStyle={{ fontSize: 10 }}
                        xAxisLabelTextStyle={{ fontSize: 10 }}
                        curved
                        showVerticalLines
                        verticalLinesColor="rgba(200,200,200,0.3)"
                        startFillColor="#45B7D1"
                        startOpacity={0.3}
                        endOpacity={0.1}
                        areaChart
                    />
                </View>
            </View>

            {/* Trust vs Investment Info */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🤝 Trust vs Investment</Text>
                <Text style={styles.note}>
                    📌 Scatter plot showing correlation between opponent trust scores and investment amounts.
                    Data points: {data.trust_vs_investment.length}
                </Text>
                <View style={styles.dataPreview}>
                    <Text style={styles.dataTitle}>Sample Data Points:</Text>
                    {data.trust_vs_investment.slice(0, 5).map((point: TrustInvestmentPoint, index: number) => (
                        <Text key={index} style={styles.dataText}>
                            • Trust: {point.x} → Investment: ${point.y}
                        </Text>
                    ))}
                    {data.trust_vs_investment.length > 5 && (
                        <Text style={styles.dataText}>
                            ... and {data.trust_vs_investment.length - 5} more points
                        </Text>
                    )}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    errorText: {
        fontSize: 16,
        color: '#ff4444',
        textAlign: 'center',
        marginBottom: 15,
    },
    retryText: {
        fontSize: 16,
        color: '#0066cc',
        textDecorationLine: 'underline',
    },
    retryButton: {
        backgroundColor: '#0066cc',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 10,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    debugText: {
        fontSize: 10,
        color: '#999',
        marginTop: 20,
        textAlign: 'center',
    },
    section: {
        backgroundColor: '#fff',
        marginHorizontal: 15,
        marginVertical: 10,
        padding: 15,
        borderRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    chartDescription: {
        fontSize: 12,
        color: '#666',
        marginBottom: 15,
        fontStyle: 'italic',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statCard: {
        width: '48%',
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0066cc',
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    chartContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    centerLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    centerSubLabel: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    legendContainer: {
        marginTop: 20,
        width: '100%',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    legendColor: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 8,
    },
    legendText: {
        fontSize: 14,
        color: '#333',
    },
    legendValue: {
        fontWeight: 'bold',
    },
    note: {
        fontSize: 12,
        color: '#555',
        fontStyle: 'italic',
        marginTop: 5,
        padding: 10,
        backgroundColor: '#e3f2fd',
        borderRadius: 5,
        borderLeftWidth: 3,
        borderLeftColor: '#2196F3',
    },
    dataPreview: {
        marginTop: 15,
        padding: 10,
        backgroundColor: '#f8f9fa',
        borderRadius: 5,
    },
    dataTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    dataText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
});

// Sources
// Created using Claude (Sonnet 4.5)
// https://claude.ai/share/7dd11964-5d7e-4736-a272-801a7f3db088
