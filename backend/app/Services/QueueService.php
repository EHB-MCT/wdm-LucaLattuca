<?php

namespace App\Services;

use App\Models\Bot;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Round;
use Illuminate\Support\Facades\DB;

class QueueService
{
    /**
     * Match a user with a random bot and create a game.
     */
    public function matchWithBot($user): array
    {
        return DB::transaction(function () use ($user) {
            // Get a random active bot
            $bot = Bot::where('is_active', true)
                ->inRandomOrder()
                ->first();

            if (!$bot) {
                throw new \Exception('No active bots available.');
            }

            // Create the game
            $game = Game::create([
                'status' => 'active',
                'started_at' => now(),
                'has_bot' => true,
            ]);

            // Determine player numbers randomly (user can be player 1 or 2)
            $userPlayerNumber = rand(1, 2);
            $botPlayerNumber = $userPlayerNumber === 1 ? 2 : 1;

            // Create game player for user
            $userGamePlayer = GamePlayer::create([
                'game_id' => $game->id,
                'user_id' => $user->id,
                'player_number' => $userPlayerNumber,
                'is_bot' => false,
                'bot_personality' => null,
                'total_invested' => 0,
                'final_earnings' => 0,
                'net_result' => 0,
                'was_betrayed' => false,
            ]);

            // Create game player for bot
            $botGamePlayer = GamePlayer::create([
                'game_id' => $game->id,
                'user_id' => null,
                'player_number' => $botPlayerNumber,
                'is_bot' => true,
                'bot_id' => $bot->id,
                'bot_personality' => $bot->getOceanTraits(),
                'total_invested' => 0,
                'final_earnings' => 0,
                'net_result' => 0,
                'was_betrayed' => false,
            ]);

            // Create first round
            $round = Round::create([
                'game_id' => $game->id,
                'round_number' => 1,
                'started_at' => now(),
                'pot_before_bonus' => 0,
                'trust_bonus_percentage' => 20, // Round 1 bonus
                'pot_after_bonus' => 0,
                'player1_invested' => 0,
                'player2_invested' => 0,
                'player1_choice' => null,
                'player2_choice' => null,
                'both_invested' => false,
                'someone_cashed_out' => false,
                'round_duration' => 30,
            ]);

            return [
                'game' => $game,
                'bot' => $bot,
                'user_player' => $userGamePlayer,
                'bot_player' => $botGamePlayer,
                'current_round' => $round,
            ];
        });
    }
}

// Sources
// QueueService generated using Claude (Sonnet 4.5)
// https://claude.ai/share/4570ac86-c7f2-452d-93e4-b72281a330ba