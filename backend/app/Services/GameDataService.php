<?php

namespace App\Services;

use App\Models\User;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Round;
use App\Models\RoundResult;
use Illuminate\Support\Facades\DB;

class GameDataService
{
    /**
     * Get OCEAN model data for radar chart
     * Returns average OCEAN scores across all users and the logged-in user's scores
     */
    public function getOceanModelData(?User $user = null): array
    {
        // Calculate average OCEAN scores across all users
        $averageScores = User::where('onboarding_completed', true)
            ->selectRaw('
                AVG(openness) as avg_openness,
                AVG(conscientiousness) as avg_conscientiousness,
                AVG(extraversion) as avg_extraversion,
                AVG(agreeableness) as avg_agreeableness,
                AVG(neuroticism) as avg_neuroticism
            ')
            ->first();

        $populationData = [
            ['label' => 'Openness', 'value' => round($averageScores->avg_openness ?? 0, 2)],
            ['label' => 'Conscientiousness', 'value' => round($averageScores->avg_conscientiousness ?? 0, 2)],
            ['label' => 'Extraversion', 'value' => round($averageScores->avg_extraversion ?? 0, 2)],
            ['label' => 'Agreeableness', 'value' => round($averageScores->avg_agreeableness ?? 0, 2)],
            ['label' => 'Neuroticism', 'value' => round($averageScores->avg_neuroticism ?? 0, 2)],
        ];

        $userData = null;
        if ($user) {
            $userData = [
                ['label' => 'Openness', 'value' => round($user->openness ?? 0, 2)],
                ['label' => 'Conscientiousness', 'value' => round($user->conscientiousness ?? 0, 2)],
                ['label' => 'Extraversion', 'value' => round($user->extraversion ?? 0, 2)],
                ['label' => 'Agreeableness', 'value' => round($user->agreeableness ?? 0, 2)],
                ['label' => 'Neuroticism', 'value' => round($user->neuroticism ?? 0, 2)],
            ];
        }

        return [
            'population_average' => $populationData,
            'user_data' => $userData,
        ];
    }

    /**
     * Get leaderboard data for grouped bar chart
     * Returns top 10 richest players with their balance and trust scores
     */
    public function getLeaderboardData(): array
    {
        $topPlayers = User::where('onboarding_completed', true)
            ->orderBy('balance', 'desc')
            ->limit(10)
            ->get(['username', 'balance', 'trust_score']);

        $data = [];
        foreach ($topPlayers as $player) {
            $data[] = [
                'username' => $player->username ?? 'Unknown',
                'balance' => round($player->balance ?? 0, 2),
                'trust_score' => round($player->trust_score ?? 0, 2),
            ];
        }

        return $data;
    }

    /**
     * Get scatter plot data: opponent trust vs investment amount
     * Checks if users invest more when opponent has high trust score
     */
    public function getTrustVsInvestmentData(): array
    {
        // Get all rounds with both players' data
        $data = DB::table('rounds')
            ->join('games', 'rounds.game_id', '=', 'games.id')
            ->join('game_players as gp1', function($join) {
                $join->on('games.id', '=', 'gp1.game_id')
                     ->where('gp1.player_number', '=', 1);
            })
            ->join('game_players as gp2', function($join) {
                $join->on('games.id', '=', 'gp2.game_id')
                     ->where('gp2.player_number', '=', 2);
            })
            ->join('users as u1', 'gp1.user_id', '=', 'u1.id')
            ->join('users as u2', 'gp2.user_id', '=', 'u2.id')
            ->whereNotNull('gp1.user_id')
            ->whereNotNull('gp2.user_id')
            ->select(
                'u2.trust_score as opponent_trust',
                'rounds.player1_invested as investment',
                'u1.trust_score as player_trust',
                'rounds.player2_invested as opponent_investment'
            )
            ->get();

        $scatterPoints = [];
        
        foreach ($data as $row) {
            // Player 1's investment vs Player 2's trust
            if ($row->investment > 0) {
                $scatterPoints[] = [
                    'x' => round($row->opponent_trust ?? 50, 2),
                    'y' => round($row->investment, 2),
                ];
            }
            
            // Player 2's investment vs Player 1's trust
            if ($row->opponent_investment > 0) {
                $scatterPoints[] = [
                    'x' => round($row->player_trust ?? 50, 2),
                    'y' => round($row->opponent_investment, 2),
                ];
            }
        }

        return $scatterPoints;
    }

    /**
     * Get choice distribution by round (line chart)
     * Shows what percentage of users chose invest vs cash_out in each round
     */
    public function getChoiceDistributionByRound(): array
    {
    $distribution = [];

    for ($roundNumber = 1; $roundNumber <= 3; $roundNumber++) {
        // Use SINGLE QUOTES for string values in PostgreSQL!
        $stats = Round::join('games', 'rounds.game_id', '=', 'games.id')
            ->join('game_players', 'games.id', '=', 'game_players.game_id')
            ->join('users', 'game_players.user_id', '=', 'users.id')
            ->where('rounds.round_number', $roundNumber)
            ->whereNotNull('game_players.user_id')
            ->selectRaw("
                SUM(CASE 
                    WHEN (game_players.player_number = 1 AND rounds.player1_choice = 'invest') 
                      OR (game_players.player_number = 2 AND rounds.player2_choice = 'invest') 
                    THEN 1 ELSE 0 END) as invest_count,
                SUM(CASE 
                    WHEN (game_players.player_number = 1 AND rounds.player1_choice = 'cash_out') 
                      OR (game_players.player_number = 2 AND rounds.player2_choice = 'cash_out') 
                    THEN 1 ELSE 0 END) as cash_out_count,
                COUNT(*) as total_count
            ")
            ->first();

        $totalCount = $stats->total_count ?? 0;
        $investCount = $stats->invest_count ?? 0;
        $cashOutCount = $stats->cash_out_count ?? 0;

        $distribution[] = [
            'round' => $roundNumber,
            'invest_percentage' => $totalCount > 0 ? round(($investCount / $totalCount) * 100, 1) : 0,
            'cash_out_percentage' => $totalCount > 0 ? round(($cashOutCount / $totalCount) * 100, 1) : 0,
            'invest_count' => $investCount,
            'cash_out_count' => $cashOutCount,
        ];
    }

    return $distribution;
    }

    /**
     * Get average investment amounts by round (line chart)
     * Shows how investment amounts change across rounds 1, 2, 3
     */
    public function getAverageInvestmentByRound(): array
    {
        $investmentStats = [];

        for ($roundNum = 1; $roundNum <= 3; $roundNum++) {
            // Calculate average investment for this round
            $avgInvestment = DB::table('rounds')
                ->join('games', 'rounds.game_id', '=', 'games.id')
                ->join('game_players', 'games.id', '=', 'game_players.game_id')
                ->where('rounds.round_number', $roundNum)
                ->whereNotNull('game_players.user_id')
                ->selectRaw('
                    AVG(CASE 
                        WHEN game_players.player_number = 1 THEN rounds.player1_invested 
                        WHEN game_players.player_number = 2 THEN rounds.player2_invested 
                    END) as avg_investment
                ')
                ->first();

            $investmentStats[] = [
                'round' => $roundNum,
                'average_investment' => round($avgInvestment->avg_investment ?? 0, 2),
            ];
        }

        return $investmentStats;
    }

    /**
     * Get comprehensive stats summary
     */
    public function getStatsSummary(?User $user = null): array
    {
        $totalUsers = User::where('onboarding_completed', true)->count();
        $totalGames = Game::where('status', 'completed')->count();
        $totalRounds = Round::count();
        
        $cooperationRate = $this->calculateCooperationRate();
        $betrayalRate = $this->calculateBetrayalRate();

        $summary = [
            'total_users' => $totalUsers,
            'total_games' => $totalGames,
            'total_rounds' => $totalRounds,
            'cooperation_rate' => $cooperationRate,
            'betrayal_rate' => $betrayalRate,
        ];

        if ($user) {
            $summary['user_stats'] = [
                'total_matches' => $user->total_matches_played ?? 0,
                'times_cooperated' => $user->times_cooperated ?? 0,
                'times_defected' => $user->times_defected ?? 0,
                'times_betrayed' => $user->times_betrayed ?? 0,
                'average_earnings' => round($user->average_earnings ?? 0, 2),
                'trust_score' => round($user->trust_score ?? 0, 2),
                'balance' => round($user->balance ?? 0, 2),
            ];
        }

        return $summary;
    }

    /**
     * Calculate overall cooperation rate
     */
    private function calculateCooperationRate(): float
    {
        $totalRounds = Round::count();
        if ($totalRounds === 0) return 0.0;

        $cooperations = Round::where('both_invested', true)->count();
        return round(($cooperations / $totalRounds) * 100, 2);
    }

    /**
     * Calculate overall betrayal rate
     */
    private function calculateBetrayalRate(): float
    {
        $totalRounds = Round::count();
        if ($totalRounds === 0) return 0.0;

        $betrayals = Round::where('someone_cashed_out', true)->count();
        return round(($betrayals / $totalRounds) * 100, 2);
    }

    /**
     * Get all data in one call (for dashboard)
     */
    public function getAllChartData(?User $user = null): array
    {
        return [
            'ocean_model' => $this->getOceanModelData($user),
            'leaderboard' => $this->getLeaderboardData(),
            'trust_vs_investment' => $this->getTrustVsInvestmentData(),
            'choice_distribution' => $this->getChoiceDistributionByRound(),
            'average_investment' => $this->getAverageInvestmentByRound(),
            'summary' => $this->getStatsSummary($user),
        ];
    }
}

// Sources
// Created using Claude (Sonnet 4.5)