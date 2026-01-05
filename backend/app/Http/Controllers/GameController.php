<?php

namespace App\Http\Controllers;

use App\Services\QueueService;
use App\Services\GameService;
use App\Models\Game;
use App\Models\Round;
use App\Models\RoundStat;
use App\Models\RoundResult;
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
                    'trust_score' => $this->calculateBotTrustScore($bot->getOceanTraits()),
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
            
            Log::info('Getting game state', [
                'game_id' => $gameId,
                'game_status' => $game->status,
                'total_rounds' => $game->total_rounds,
            ]);
            
            // Verify user is part of this game
            $userGamePlayer = $game->gamePlayers->where('user_id', $user->id)->first();
            if (!$userGamePlayer) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are not part of this game.',
                ], 403);
            }
            
            // Check if game is completed
            if ($game->status === 'completed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Game has ended.',
                    'game_completed' => true,
                ], 200);
            }
            
            // Get current round - the one without ended_at
            $currentRound = $game->rounds()
                ->whereNull('ended_at')
                ->orderBy('round_number', 'desc')
                ->first();
            
            Log::info('Current round query result', [
                'found_round' => $currentRound ? true : false,
                'round_id' => $currentRound?->id,
                'round_number' => $currentRound?->round_number,
                'all_rounds' => $game->rounds()->pluck('round_number', 'id')->toArray(),
            ]);
            
            if (!$currentRound) {
                return response()->json([
                    'success' => false,
                    'message' => 'No active round found. Game may have ended.',
                ], 404);
            }
            
            // Get opponent
            $opponentGamePlayer = $game->gamePlayers->where('id', '!=', $userGamePlayer->id)->first();

            // Build opponent data
            if ($opponentGamePlayer->is_bot) {
                $bot = null;
                if ($opponentGamePlayer->bot_id) {
                    $bot = Bot::find($opponentGamePlayer->bot_id);
                }

                if ($bot) {
                    $opponentData = [
                        'name' => $bot->name,
                        'is_bot' => true,
                        'balance' => config('game.bot_default_balance', 10000),
                        'trust_score' => $this->calculateBotTrustScore($bot->getOceanTraits()),
                    ];
                } else {
                    $opponentData = [
                        'name' => 'Bot Player',
                        'is_bot' => true,
                        'balance' => config('game.bot_default_balance', 10000),
                        'trust_score' => $this->calculateBotTrustScore($opponentGamePlayer->bot_personality ?? []),
                    ];
                }
            } else {
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
                'current_round' => [
                    'id' => $currentRound->id,
                    'round_number' => $currentRound->round_number,
                    'pot_before_bonus' => $currentRound->pot_before_bonus,
                    'pot_after_bonus' => $currentRound->pot_after_bonus,
                    'trust_bonus_percentage' => $currentRound->trust_bonus_percentage,
                    'started_at' => $currentRound->started_at,
                    'time_remaining' => $this->calculateTimeRemaining($currentRound),
                ],
                'player' => [
                    'id' => $userGamePlayer->id,
                    'player_number' => $userGamePlayer->player_number,
                    'total_invested' => $userGamePlayer->total_invested,
                    'final_earnings' => $userGamePlayer->final_earnings,
                    'net_result' => $userGamePlayer->net_result,
                ],
                'opponent' => $opponentData,
                'user_balance' => $user->fresh()->balance,
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
     * Submit player choice for current round.
     */
    public function submitChoice(Request $request, $gameId, $roundId)
    {
        try {
            $user = $request->user();
            
            Log::info('=== SUBMIT CHOICE START ===', [
                'game_id' => $gameId,
                'round_id' => $roundId,
                'user_id' => $user->id,
            ]);
            
            $validated = $request->validate([
                'choice' => 'required|in:invest,cash_out',
                'investment_amount' => 'required|numeric|min:0',
                'decision_time' => 'required|numeric',
                'time_on_invest' => 'required|numeric',
                'time_on_cash_out' => 'required|numeric',
                'number_of_toggles' => 'required|integer',
                'initial_choice' => 'required|in:invest,cash_out',
            ]);

            $round = Round::findOrFail($roundId);
            $game = Game::findOrFail($gameId);

            Log::info('💰 Received investment amount from frontend', [
                'raw_input' => $request->input('investment_amount'),
                'validated_amount' => $validated['investment_amount'],
                'choice' => $validated['choice'],
            ]);
            
            Log::info('Round and game loaded', [
                'round_number' => $round->round_number,
                'game_status' => $game->status,
            ]);
            
            // Verify user is part of this game
            $gamePlayer = GamePlayer::where('game_id', $gameId)
                ->where('user_id', $user->id)
                ->firstOrFail();

            // Save the user's choice to the round
            if ($gamePlayer->player_number === 1) {
                $round->player1_choice = $validated['choice'];
                $round->player1_invested = $validated['investment_amount'];
            } else {
                $round->player2_choice = $validated['choice'];
                $round->player2_invested = $validated['investment_amount'];
            }
            $round->save();

            Log::info('✅ User choice saved', [
                'player_number' => $gamePlayer->player_number,
                'choice' => $validated['choice'],
                'investment' => $validated['investment_amount'],
            ]);

            // Save tracking data to RoundStat
            RoundStat::updateOrCreate(
                [
                    'round_id' => $roundId,
                    'game_player_id' => $gamePlayer->id,
                ],
                [
                    'initial_choice' => $validated['initial_choice'],
                    'final_choice' => $validated['choice'],
                    'choice_changed' => $validated['initial_choice'] !== $validated['choice'],
                    'made_decision' => true,
                    'defaulted_to_invest' => false,
                    'time_to_first_choice' => $validated['decision_time'],
                    'time_on_invest' => $validated['time_on_invest'],
                    'time_on_cash_out' => $validated['time_on_cash_out'],
                    'number_of_toggles' => $validated['number_of_toggles'],
                    'choice_locked_at' => now(),
                ]
            );

            // Get opponent (bot)
            $opponent = $gamePlayer->opponent();
            
            Log::info('Opponent info', [
                'opponent_id' => $opponent->id,
                'opponent_player_number' => $opponent->player_number,
                'is_bot' => $opponent->is_bot,
            ]);
            
            // If opponent is a bot, make bot choice now
            if ($opponent->is_bot) {
                // Refresh round to get latest data
                $round->refresh();
                
                // Check if bot has already made a choice
                $botHasChosen = ($opponent->player_number === 1 && $round->player1_choice !== null) ||
                               ($opponent->player_number === 2 && $round->player2_choice !== null);
                
                Log::info('Bot choice check', [
                    'bot_has_chosen' => $botHasChosen,
                    'player1_choice' => $round->player1_choice,
                    'player2_choice' => $round->player2_choice,
                ]);
                
                if (!$botHasChosen) {
                    $botChoice = $this->makeBotChoice($opponent, $round);
                    
                    if ($opponent->player_number === 1) {
                        $round->player1_choice = $botChoice['choice'];
                        $round->player1_invested = $botChoice['investment'];
                    } else {
                        $round->player2_choice = $botChoice['choice'];
                        $round->player2_invested = $botChoice['investment'];
                    }
                    $round->save();
                    
                    Log::info('✅ Bot choice made and saved', [
                        'bot_player_number' => $opponent->player_number,
                        'bot_choice' => $botChoice['choice'],
                        'bot_investment' => $botChoice['investment'],
                    ]);
                } else {
                    Log::warning('⚠️ Bot already has choice, skipping');
                }
            }

            // Refresh round to get updated data
            $round->refresh();
            
            Log::info('Round state before finalization', [
                'player1_choice' => $round->player1_choice,
                'player2_choice' => $round->player2_choice,
                'player1_invested' => $round->player1_invested,
                'player2_invested' => $round->player2_invested,
            ]);
            
            // Both players have chosen - finalize the round
            if ($round->player1_choice !== null && $round->player2_choice !== null) {
                Log::info('✅ Both players have chosen, finalizing round');
                $this->gameService->finalizeRound($round);
                $round->refresh();
                $game->refresh();
                
                Log::info('Round finalized, game status', [
                    'game_status' => $game->status,
                    'round_ended_at' => $round->ended_at,
                ]);
            } else {
                Log::error('❌ NOT FINALIZING - missing player choice!', [
                    'player1_choice' => $round->player1_choice,
                    'player2_choice' => $round->player2_choice,
                ]);
            }

            // Get round results for response
            $roundResults = $this->getRoundResults($round, $gamePlayer);
            
            Log::info('=== SUBMIT CHOICE END ===', [
                'round_results' => $roundResults,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Choice submitted successfully',
                'round_results' => $roundResults,
            ], 200);

        } catch (\Exception $e) {
            Log::error('❌ Submit choice failed: ' . $e->getMessage());
            Log::error($e->getTraceAsString());
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit choice.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Make bot decision based on personality.
     */
    private function makeBotChoice(GamePlayer $botPlayer, Round $round): array
    {
    $bot = Bot::find($botPlayer->bot_id);
    
    if (!$bot) {
        // Default to cooperate if bot not found
        return [
            'choice' => 'invest',
            'investment' => 100,
        ];
    }
    
    // Get bot's cooperation tendency (0-100) and risk tolerance
    $cooperationTendency = $bot->cooperation_tendency;
    $riskTolerance = $bot->risk_tolerance;
    
    // Random number to determine choice
    $random = rand(0, 100);
    
    if ($random <= $cooperationTendency) {
        // Bot cooperates - investment amount based on risk tolerance
        // Higher risk tolerance = higher investment
        // Range: 100 to 500
        $baseInvestment = 100;
        $maxAdditional = 400;
        $riskFactor = $riskTolerance / 100; // 0 to 1
        $additionalAmount = $maxAdditional * $riskFactor;
        $totalInvestment = $baseInvestment + $additionalAmount;
        
        // Round to nearest 10
        $totalInvestment = round($totalInvestment / 10) * 10;
        
        Log::info('🤖 Bot investing', [
            'cooperation_tendency' => $cooperationTendency,
            'risk_tolerance' => $riskTolerance,
            'investment' => $totalInvestment,
        ]);
        
        return [
            'choice' => 'invest',
            'investment' => $totalInvestment,
        ];
    } else {
        // Bot defects
        Log::info('🤖 Bot cashing out', [
            'cooperation_tendency' => $cooperationTendency,
        ]);
        
        return [
            'choice' => 'cash_out',
            'investment' => 0,
        ];
    }
    }

    /**
     * Get round results for display.
     */
    private function getRoundResults(Round $round, GamePlayer $gamePlayer)
    {
        $opponent = $gamePlayer->opponent();

        // Get round results from database
        $userResult = RoundResult::where('round_id', $round->id)
            ->where('game_player_id', $gamePlayer->id)
            ->first();

        $opponentResult = RoundResult::where('round_id', $round->id)
            ->where('game_player_id', $opponent->id)
            ->first();

        return [
            'user_choice' => $gamePlayer->player_number === 1 ? $round->player1_choice : $round->player2_choice,
            'user_investment' => $gamePlayer->player_number === 1 ? $round->player1_invested : $round->player2_invested,
            'user_payout' => $userResult ? $userResult->payout_amount : 0,
            'opponent_choice' => $opponent->player_number === 1 ? $round->player1_choice : $round->player2_choice,
            'opponent_investment' => $opponent->player_number === 1 ? $round->player1_invested : $round->player2_invested,
            'opponent_payout' => $opponentResult ? $opponentResult->payout_amount : 0,
            'pot_before_bonus' => $round->pot_before_bonus,
            'pot_after_bonus' => $round->pot_after_bonus,
            'both_invested' => $round->both_invested,
            'trust_bonus_percentage' => $round->trust_bonus_percentage,
            'next_round_number' => $round->round_number < 3 && !$round->someone_cashed_out ? $round->round_number + 1 : null,
            'display_time_ms' => config('game.round_results_display_time', 5) * 1000,
        ];
    }

    /**
     * Leave queue (for future implementation if needed).
     */
    public function leaveQueue(Request $request)
    {
        return response()->json([
            'success' => true,
            'message' => 'Left queue successfully.',
        ], 200);
    }
}