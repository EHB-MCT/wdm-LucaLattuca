<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Round;
use App\Services\GameService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GameController extends Controller
{
    protected GameService $gameService;

    public function __construct(GameService $gameService)
    {
        $this->gameService = $gameService;
    }

    /**
     * Create a new game
     * POST /api/games
     */
    public function createGame(Request $request)
    {
        $user = Auth::user();
        $withBot = $request->boolean('with_bot', true);

        $game = $this->gameService->createGame($user, $withBot);

        return response()->json([
            'success' => true,
            'game' => $this->gameService->getGameStatus($game),
        ], 201);
    }

    /**
     * Get game status
     * GET /api/games/{game}
     */
    public function getGame(Game $game)
    {
        // Verify user is part of this game
        $user = Auth::user();
        if (!$game->players()->where('user_id', $user->id)->exists()) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json([
            'success' => true,
            'game' => $this->gameService->getGameStatus($game),
        ]);
    }

    /**
     * Submit a choice for current round
     * POST /api/games/{game}/rounds/{round}/choice
     */
    public function submitChoice(Request $request, Game $game, Round $round)
    {
        $request->validate([
            'choice' => 'required|in:cooperate,defect',
            'interaction_data' => 'nullable|array',
            'interaction_data.interactions' => 'nullable|array',
            'interaction_data.clicked_on_flag' => 'nullable|boolean',
            'interaction_data.clicked_on_info' => 'nullable|boolean',
            'interaction_data.screen_taps_count' => 'nullable|integer',
            'interaction_data.info_views_count' => 'nullable|integer',
            'interaction_data.opponent_profile_views' => 'nullable|integer',
        ]);

        $user = Auth::user();
        $player = $game->players()->where('user_id', $user->id)->firstOrFail();

        // Check if player already submitted choice for this round
        if ($round->results()->where('game_player_id', $player->id)->exists()) {
            return response()->json([
                'error' => 'Choice already submitted for this round'
            ], 400);
        }

        $result = $this->gameService->submitChoice(
            $player,
            $round,
            $request->input('choice'),
            $request->input('interaction_data')
        );

        // Reload game to get updated status
        $game->refresh();

        return response()->json([
            'success' => true,
            'result' => [
                'earnings' => $result->earnings,
                'losses' => $result->losses,
                'was_betrayed' => $result->was_betrayed,
            ],
            'game' => $this->gameService->getGameStatus($game),
        ]);
    }

    /**
     * Get round results (after both players submitted)
     * GET /api/games/{game}/rounds/{round}/results
     */
    public function getRoundResults(Game $game, Round $round)
    {
        if (!$round->isComplete()) {
            return response()->json([
                'success' => false,
                'message' => 'Round not yet complete',
            ], 400);
        }

        $results = $round->results()->with('gamePlayer')->get();

        return response()->json([
            'success' => true,
            'round' => [
                'round_number' => $round->round_number,
                'pot_before' => $round->pot_before_round,
                'pot_after' => $round->pot_after_round,
            ],
            'results' => $results->map(function($result) {
                return [
                    'player_name' => $result->gamePlayer->display_name,
                    'is_bot' => $result->gamePlayer->is_bot,
                    'choice' => $result->final_choice,
                    'earnings' => $result->earnings,
                    'losses' => $result->losses,
                    'was_betrayed' => $result->was_betrayed,
                ];
            }),
        ]);
    }

    /**
     * Get user profile with statistics
     * GET /api/profile
     */
    public function getProfile()
    {
        $user = Auth::user();

        return response()->json([
            'success' => true,
            'profile' => [
                'username' => $user->username,
                'avatar' => $user->avatar,
                'balance' => $user->balance,
                'trust_profile' => $user->trust_profile,
                'statistics' => $user->getStatistics(),
                'game_history' => $this->gameService->getUserGameHistory($user, 10),
                'behavior_analysis' => $this->gameService->analyzeUserBehavior($user),
            ],
        ]);
    }

    /**
     * Get user's game history
     * GET /api/games/history
     */
    public function getGameHistory(Request $request)
    {
        $user = Auth::user();
        $limit = $request->input('limit', 10);

        return response()->json([
            'success' => true,
            'games' => $this->gameService->getUserGameHistory($user, $limit),
        ]);
    }

    /**
     * Get leaderboard
     * GET /api/leaderboard
     */
    public function getLeaderboard(Request $request)
    {
        $sortBy = $request->input('sort_by', 'trust_score'); // trust_score, total_earnings, cooperation_rate
        $limit = $request->input('limit', 20);

        $query = User::query();

        switch ($sortBy) {
            case 'total_earnings':
                $query->orderBy('total_earnings', 'desc');
                break;
            case 'cooperation_rate':
                $query->selectRaw('*, (times_cooperated * 100.0 / NULLIF(times_cooperated + times_defected, 0)) as coop_rate')
                    ->orderBy('coop_rate', 'desc');
                break;
            default:
                $query->orderBy('trust_score', 'desc');
        }

        $users = $query->limit($limit)->get();

        return response()->json([
            'success' => true,
            'leaderboard' => $users->map(function($user, $index) {
                return [
                    'rank' => $index + 1,
                    'username' => $user->username,
                    'avatar' => $user->avatar,
                    'trust_score' => $user->trust_score,
                    'total_earnings' => $user->total_earnings,
                    'cooperation_rate' => round($user->cooperation_rate, 1),
                    'total_matches' => $user->total_matches_played,
                ];
            }),
        ]);
    }

    /**
     * Update user personality (admin/testing)
     * PUT /api/profile/personality
     */
    public function updatePersonality(Request $request)
    {
        $request->validate([
            'openness' => 'nullable|integer|min:0|max:100',
            'conscientiousness' => 'nullable|integer|min:0|max:100',
            'extraversion' => 'nullable|integer|min:0|max:100',
            'agreeableness' => 'nullable|integer|min:0|max:100',
            'neuroticism' => 'nullable|integer|min:0|max:100',
        ]);

        $user = Auth::user();
        $user->update($request->only([
            'openness',
            'conscientiousness',
            'extraversion',
            'agreeableness',
            'neuroticism',
        ]));

        return response()->json([
            'success' => true,
            'ocean_profile' => $user->ocean_profile,
        ]);
    }

    /**
     * Get available bots for game creation
     * GET /api/bots
     */
    public function getAvailableBots()
    {
        $archetypes = [
            'saint' => 'The Saint - Highly cooperative and trusting',
            'psychopath' => 'The Psychopath - Selfish and untrustworthy',
            'strategist' => 'The Strategist - Calculated and adaptive',
            'wounded' => 'The Wounded - Sensitive to betrayal',
            'gambler' => 'The Gambler - Unpredictable risk-taker',
            'diplomat' => 'The Diplomat - Balanced and fair',
            'paranoid' => 'The Paranoid - Distrustful from the start',
            'opportunist' => 'The Opportunist - Exploits weaknesses',
        ];

        return response()->json([
            'success' => true,
            'bots' => collect($archetypes)->map(function($description, $type) {
                return [
                    'type' => $type,
                    'description' => $description,
                ];
            })->values(),
        ]);
    }
}

// sources
// controller generated using Claude (Sonnet 4.5)
// https://claude.ai/share/fdba5ca3-50f7-42ba-a0ab-98387b5a4fcc
