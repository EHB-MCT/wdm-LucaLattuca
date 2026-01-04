<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Round;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GameHistoryController extends Controller
{
    /**
     * Get the authenticated user's game history.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        
        // Get all completed games for this user
        $games = Game::where('status', 'completed')
            ->whereHas('gamePlayers', function($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->with([
                'gamePlayers.user',
                'gamePlayers.bot',
                'rounds' => function($query) {
                    $query->orderBy('round_number', 'desc')->limit(1);
                }
            ])
            ->orderBy('ended_at', 'desc')
            ->get();

        $history = $games->map(function($game) use ($user) {
            // Get the user's game player record
            $userPlayer = $game->gamePlayers->firstWhere('user_id', $user->id);
            
            // Get the opponent's game player record
            $opponentPlayer = $game->gamePlayers->firstWhere('id', '!=', $userPlayer->id);
            
            // Get the final round (last round)
            $finalRound = $game->rounds->first();
            
            if (!$finalRound) {
                return null;
            }

            // Determine user's choice and opponent's choice from final round
            $userChoice = $userPlayer->player_number === 1 
                ? $finalRound->player1_choice 
                : $finalRound->player2_choice;
            
            $opponentChoice = $opponentPlayer->player_number === 1 
                ? $finalRound->player1_choice 
                : $finalRound->player2_choice;

            // Get opponent name
            $opponentName = $opponentPlayer->is_bot 
                ? $opponentPlayer->bot->name 
                : $opponentPlayer->user->username;

            return [
                'id' => $game->id,
                'total_rounds' => $game->total_rounds,
                'ended_at' => $game->ended_at,
                'player1' => [
                    'name' => $userPlayer->player_number === 1 
                        ? $user->username 
                        : $opponentName,
                    'is_bot' => $userPlayer->player_number === 1 
                        ? false 
                        : $opponentPlayer->is_bot,
                    'final_choice' => $userPlayer->player_number === 1 
                        ? $userChoice 
                        : $opponentChoice,
                    'final_earnings' => $userPlayer->player_number === 1 
                        ? $userPlayer->final_earnings 
                        : $opponentPlayer->final_earnings,
                    'net_result' => $userPlayer->player_number === 1 
                        ? $userPlayer->net_result 
                        : $opponentPlayer->net_result,
                ],
                'player2' => [
                    'name' => $userPlayer->player_number === 2 
                        ? $user->username 
                        : $opponentName,
                    'is_bot' => $userPlayer->player_number === 2 
                        ? false 
                        : $opponentPlayer->is_bot,
                    'final_choice' => $userPlayer->player_number === 2 
                        ? $userChoice 
                        : $opponentChoice,
                    'final_earnings' => $userPlayer->player_number === 2 
                        ? $userPlayer->final_earnings 
                        : $opponentPlayer->final_earnings,
                    'net_result' => $userPlayer->player_number === 2 
                        ? $userPlayer->net_result 
                        : $opponentPlayer->net_result,
                ],
            ];
        })->filter(); // Remove null values

        return response()->json([
            'success' => true,
            'history' => $history->values(),
        ]);
    }
}

// Sources
// Created by Claude (Sonnet 4.5)
// https://claude.ai/share/7505ce54-ca95-413e-8aba-ab94e2c4d97a