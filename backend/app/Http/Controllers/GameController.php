<?php

namespace App\Http\Controllers;

use App\Services\QueueService;
use App\Services\GameService;
use App\Models\Game;
use App\Models\Round;
use App\Models\GamePlayer;
use App\Models\Bot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class GameController extends Controller
{
    protected QueueService $queueService;
    protected GameService $gameService;

    public function __construct(QueueService $queueService, GameService $gameService)
    {
        $this->queueService = $queueService;
        $this->gameService = $gameService;
    }

    /**
     * Join queue and get matched with a bot.
     */
    public function joinQueue(Request $request)
    {
        try {
            $user = $request->user();

            // Check if user has sufficient balance
            $minBalance = config('game.minimum_investment', 100);
            if ($user->balance < $minBalance) {
                return response()->json([
                    'success' => false,
                    'message' => "Insufficient balance. You need at least \${$minBalance} to play.",
                ], 400);
            }

            // Match user with bot and create game
            $matchData = $this->queueService->matchWithBot($user);

            return response()->json([
                'success' => true,
                'message' => 'Match found!',
                'game_id' => $matchData['game']->id,
                'bot' => [
                    'id' => $matchData['bot']->id,
                    'name' => $matchData['bot']->name,
                    'personality_type' => $matchData['bot']->personality_type,
                ],
                'user_player_number' => $matchData['user_player']->player_number,
                'round' => [
                    'id' => $matchData['current_round']->id,
                    'round_number' => $matchData['current_round']->round_number,
                    'trust_bonus' => $matchData['current_round']->trust_bonus_percentage,
                ],
            ], 200);

        } catch (\Exception $e) {
            Log::error('Queue join failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to join queue. Please try again.',
            ], 500);
        }
    }

        /**
         * Get bot information.
         */
        public function getBotInfo(Request $request, $botId)
        {
            try {
                $bot = Bot::findOrFail($botId);
            
                return response()->json([
                    'success' => true,
                    'bot' => [
                        'id' => $bot->id,
                        'name' => $bot->name,
                        'personality_type' => $bot->personality_type,
                        'balance' => config('game.bot_default_balance', 10000), 
                        'trust_score' => $this->calculateBotTrustScore($bot->getOceanTraits()), // Pass array
                        'cooperation_tendency' => $bot->cooperation_tendency,
                        'risk_tolerance' => $bot->risk_tolerance,
                    ],
                ], 200);
            
            } catch (\Exception $e) {
                Log::error('Get bot info failed: ' . $e->getMessage());
                return response()->json([
                    'success' => false,
                    'message' => 'Bot not found.',
                ], 404);
            }
        }
    
           /**
        * Get current game state.
        */
        public function getGameState(Request $request, $gameId)
        {
            try {
                $user = $request->user();

                $game = Game::with(['gamePlayers', 'rounds.roundStats', 'rounds.roundResults'])
                    ->findOrFail($gameId);
            
                // Verify user is part of this game
                $userGamePlayer = $game->gamePlayers->where('user_id', $user->id)->first();
                if (!$userGamePlayer) {
                    return response()->json([
                        'success' => false,
                        'message' => 'You are not part of this game.',
                    ], 403);
                }
            
                // Get current round
                $currentRound = $game->rounds()
                    ->whereNull('ended_at')
                    ->orderBy('round_number', 'desc')
                    ->first();
            
                // Get opponent
                $opponentGamePlayer = $game->gamePlayers->where('id', '!=', $userGamePlayer->id)->first();

                // Build opponent data
                if ($opponentGamePlayer->is_bot) {
                    // Try to get bot from bot_id first
                    $bot = null;
                    if ($opponentGamePlayer->bot_id) {
                        $bot = Bot::find($opponentGamePlayer->bot_id);
                    }

                    if ($bot) {
                        // We have the actual bot
                        $opponentData = [
                            'name' => $bot->name,
                            'is_bot' => true,
                            'balance' => config('game.bot_default_balance', 10000),
                            'trust_score' => $this->calculateBotTrustScore($bot->getOceanTraits()),
                        ];
                    } else {
                        // Fallback to bot_personality JSON
                        $opponentData = [
                            'name' => 'Bot Player',
                            'is_bot' => true,
                            'balance' => config('game.bot_default_balance', 10000),
                            'trust_score' => $this->calculateBotTrustScore($opponentGamePlayer->bot_personality ?? []),
                        ];
                    }
                } else {
                    // Human opponent
                    $opponentData = [
                        'name' => $opponentGamePlayer->user->username ?? 'Unknown',
                        'is_bot' => false,
                        'balance' => $opponentGamePlayer->user->balance ?? 0,
                        'trust_score' => $opponentGamePlayer->user->trust_score ?? 50,
                    ];
                }
            
                return response()->json([
                    'success' => true,
                    'game' => [
                        'id' => $game->id,
                        'status' => $game->status,
                        'total_rounds' => $game->total_rounds,
                        'started_at' => $game->started_at,
                    ],
                    'current_round' => $currentRound ? [
                        'id' => $currentRound->id,
                        'round_number' => $currentRound->round_number,
                        'pot_before_bonus' => $currentRound->pot_before_bonus,
                        'pot_after_bonus' => $currentRound->pot_after_bonus,
                        'trust_bonus_percentage' => $currentRound->trust_bonus_percentage,
                        'started_at' => $currentRound->started_at,
                        'time_remaining' => $this->calculateTimeRemaining($currentRound),
                    ] : null,
                    'player' => [
                        'id' => $userGamePlayer->id,
                        'player_number' => $userGamePlayer->player_number,
                        'total_invested' => $userGamePlayer->total_invested,
                        'final_earnings' => $userGamePlayer->final_earnings,
                        'net_result' => $userGamePlayer->net_result,
                    ],
                    'opponent' => $opponentData,
                    'user_balance' => $user->balance,
                ], 200);
            
            } catch (\Exception $e) {
                Log::error('Get game state failed: ' . $e->getMessage());
                Log::error($e->getTraceAsString());
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to get game state.',
                    'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
                ], 500);
            }
        }
    
    /**
     * Calculate trust score from personality traits.
     */
    private function calculateBotTrustScore(array $personality): float
    {
        $agreeableness = $personality['agreeableness'] ?? 50;
        $cooperationTendency = $personality['cooperation_tendency'] ?? 50;
        $neuroticism = $personality['neuroticism'] ?? 50;

        $trustScore = (
            ($agreeableness * 0.4) + 
            ($cooperationTendency * 0.4) + 
            ((100 - $neuroticism) * 0.2)
        );

        return round(min(100, max(0, $trustScore)), 1);
    }

       /**
     * Start the round timer when user enters game screen
     */
    public function startRound(Request $request, $gameId, $roundId)
    {
        try {
            $round = Round::findOrFail($roundId);

            Log::info('Start round request', [
                'round_id' => $roundId,
                'current_started_at' => $round->started_at,
                'now' => now(),
                'diff' => $round->started_at->diffInSeconds(now(), false)
            ]);

            // Always reset the round start time when the game screen loads
            $round->started_at = now();
            $round->save();

            // Refresh the model to get the updated value
            $round->refresh();

            $timeRemaining = $this->calculateTimeRemaining($round);

            Log::info('Round started', [
                'updated_started_at' => $round->started_at,
                'time_remaining' => $timeRemaining
            ]);

            return response()->json([
                'success' => true,
                'time_remaining' => $timeRemaining,
            ]);
        } catch (\Exception $e) {
            Log::error('Start round failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Calculate time remaining in current round.
     */
    private function calculateTimeRemaining(Round $round): int
    {
        $roundDuration = config('game.round_duration', 30);
        $elapsed = now()->diffInSeconds($round->started_at);
        $remaining = max(0, $roundDuration - $elapsed);
        
        return $remaining;
    }

    /**
     * Leave queue (for future implementation if needed).
     */
    public function leaveQueue(Request $request)
    {
        // For now, just return success
        // In the future, you might want to track active queue members
        return response()->json([
            'success' => true,
            'message' => 'Left queue successfully.',
        ], 200);
    }
}

// Sources
// GameController generated using Claude (Sonnet 4.5)
// https://claude.ai/share/4570ac86-c7f2-452d-93e4-b72281a330ba


