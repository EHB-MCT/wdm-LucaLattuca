<?php

namespace App\Services;

use App\Models\Bot;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Round;
use App\Models\RoundStat;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GameSimulator
{
    private GameService $gameService;

    public function __construct(GameService $gameService)
    {
        $this->gameService = $gameService;
    }

    /**
     * Simulate a complete game between two bots.
     */
    public function simulateGame(?Bot $bot1 = null, ?Bot $bot2 = null, bool $verbose = false): Game
    {
        // Get random bots if not specified
        $bot1 = $bot1 ?? Bot::where('is_active', true)->inRandomOrder()->first();
        $bot2 = $bot2 ?? Bot::where('is_active', true)->where('id', '!=', $bot1->id)->inRandomOrder()->first();

        if (!$bot1 || !$bot2) {
            throw new \Exception('Not enough bots available. Run seedBots() first.');
        }

        if ($verbose) {
            Log::info("=== Starting Simulation: {$bot1->name} vs {$bot2->name} ===");
        }

        return DB::transaction(function () use ($bot1, $bot2, $verbose) {
            // Create game
            $game = Game::create([
                'status' => 'active',
                'started_at' => now(),
                'has_bot' => true,
            ]);

            // Create game players
            $gamePlayer1 = GamePlayer::create([
                'game_id' => $game->id,
                'user_id' => null,
                'player_number' => 1,
                'is_bot' => true,
                'bot_personality' => $bot1->getOceanTraits(),
            ]);

            $gamePlayer2 = GamePlayer::create([
                'game_id' => $game->id,
                'user_id' => null,
                'player_number' => 2,
                'is_bot' => true,
                'bot_personality' => $bot2->getOceanTraits(),
            ]);

            // Simulate 3 rounds
            for ($roundNum = 1; $roundNum <= 3; $roundNum++) {
                if ($verbose) {
                    Log::info("--- Round {$roundNum} ---");
                }

                $this->simulateRound($game, $gamePlayer1, $gamePlayer2, $bot1, $bot2, $roundNum, $verbose);
            }

            // Finalize game
            $game->refresh();

            if ($verbose) {
                $this->logGameSummary($game, $bot1, $bot2);
            }

            return $game;
        });
    }

    /**
     * Simulate a single round.
     */
    private function simulateRound(
        Game $game,
        GamePlayer $gamePlayer1,
        GamePlayer $gamePlayer2,
        Bot $bot1,
        Bot $bot2,
        int $roundNumber,
        bool $verbose
    ): void {
        // Create round
        $round = Round::create([
            'game_id' => $game->id,
            'round_number' => $roundNumber,
            'started_at' => now(),
        ]);

        // Get previous round's pot for cumulative calculation
        $previousRound = Round::where('game_id', $game->id)
            ->where('round_number', '<', $roundNumber)
            ->orderBy('round_number', 'desc')
            ->first();

        $cumulativePot = $previousRound ? $previousRound->pot_after_bonus : 0;

        // Bot 1 makes decision
        $decision1 = $bot1->makeDecision($round, $gamePlayer1);
        $this->processDecision($round, $gamePlayer1, $decision1, $verbose ? $bot1->name : null);

        // Bot 2 makes decision
        $decision2 = $bot2->makeDecision($round, $gamePlayer2);
        $this->processDecision($round, $gamePlayer2, $decision2, $verbose ? $bot2->name : null);

        // Add investments to cumulative pot
        $round->pot_before_bonus = $cumulativePot + $round->player1_invested + $round->player2_invested;

        // Simulate round duration (30 seconds)
        $round->round_duration = 30;
        $round->save();

        // Finalize the round
        $this->gameService->finalizeRound($round);

        if ($verbose) {
            $round->refresh();
            $this->logRoundSummary($round, $bot1, $bot2);
        }
    }

    /**
     * Process bot decision and create round stats.
     */
    private function processDecision(Round $round, GamePlayer $gamePlayer, array $decision, ?string $botName): void
    {
        // Process investment
        if ($decision['choice'] === 'invest') {
            $this->gameService->processPlayerInvestment(
                $round,
                $gamePlayer,
                $decision['investment_amount']
            );
        } else {
            // If cashing out, still set a nominal investment
            $this->gameService->processPlayerInvestment(
                $round,
                $gamePlayer,
                config('game.minimum_investment', 100)
            );
        }

        // Process choice
        $this->gameService->processPlayerChoice(
            $round,
            $gamePlayer,
            $decision['choice'],
            $decision['decision_time']
        );

        // Create detailed round stat
        $hesitationData = $decision['hesitation_data'];

        RoundStat::updateOrCreate(
            [
                'round_id' => $round->id,
                'game_player_id' => $gamePlayer->id,
            ],
            [
                'initial_choice' => $decision['choice'],
                'final_choice' => $decision['choice'],
                'choice_changed' => $hesitationData['changed_choice'],
                'made_decision' => true,
                'defaulted_to_invest' => false,
                'time_to_first_choice' => $decision['decision_time'],
                'time_on_invest' => $decision['choice'] === 'invest' ? 25 : 5,
                'time_on_cash_out' => $decision['choice'] === 'cash_out' ? 25 : 5,
                'number_of_toggles' => $hesitationData['number_of_toggles'],
                'hesitation_detected' => $hesitationData['hesitation_detected'],
                'hesitation_score' => $hesitationData['hesitation_score'],
                'choice_locked_at' => now(),
                'device_info' => [
                    'type' => 'bot_simulation',
                    'bot_name' => $botName ?? 'unknown',
                ],
            ]
        );
    }

    /**
     * Simulate multiple games for testing.
     */
    public function simulateMultipleGames(int $count = 10, bool $verbose = false): array
    {
        $results = [];

        Log::info("Starting simulation of {$count} games...");

        for ($i = 1; $i <= $count; $i++) {
            try {
                $game = $this->simulateGame(null, null, $verbose);
                $results[] = [
                    'game_id' => $game->id,
                    'status' => 'completed',
                ];

                if ($i % 10 === 0) {
                    Log::info("Completed {$i}/{$count} games");
                }
            } catch (\Exception $e) {
                $results[] = [
                    'game_id' => null,
                    'status' => 'failed',
                    'error' => $e->getMessage(),
                ];
                Log::error("Game simulation failed: " . $e->getMessage());
            }
        }

        Log::info("Simulation complete. {$count} games simulated.");

        return $results;
    }

    /**
     * Log round summary.
     */
    private function logRoundSummary(Round $round, Bot $bot1, Bot $bot2): void
    {
        $p1Choice = $round->player1_choice;
        $p2Choice = $round->player2_choice;

        Log::info(
            "{$bot1->name}: {$p1Choice} (\${$round->player1_invested})\n" .
            "{$bot2->name}: {$p2Choice} (\${$round->player2_invested})\n" .
            "Pot before bonus: \${$round->pot_before_bonus}\n" .
            "Trust bonus: {$round->trust_bonus_percentage}%\n" .
            "Pot after bonus: \${$round->pot_after_bonus}"
        );
    }

    /**
     * Log game summary.
     */
    private function logGameSummary(Game $game, Bot $bot1, Bot $bot2): void
    {
        $gp1 = $game->gamePlayers->where('player_number', 1)->first();
        $gp2 = $game->gamePlayers->where('player_number', 2)->first();

        Log::info(
            "=== Game Complete ===\n" .
            "{$bot1->name}: Invested \${$gp1->total_invested}, Earned \${$gp1->final_earnings}, Net: \${$gp1->net_result}\n" .
            "{$bot2->name}: Invested \${$gp2->total_invested}, Earned \${$gp2->final_earnings}, Net: \${$gp2->net_result}\n" .
            "===================="
        );
    }

    /**
     * Get statistics from simulated games.
     */
    public function getSimulationStats(): array
    {
        $games = Game::where('has_bot', true)->get();

        return [
            'total_games' => $games->count(),
            'completed_games' => $games->where('status', 'completed')->count(),
            'total_rounds' => Round::whereIn('game_id', $games->pluck('id'))->count(),
            'cooperation_rate' => $this->calculateCooperationRate($games),
            'betrayal_rate' => $this->calculateBetrayalRate($games),
            'average_earnings' => $this->calculateAverageEarnings($games),
        ];
    }

    private function calculateCooperationRate($games): float
    {
        $totalRounds = Round::whereIn('game_id', $games->pluck('id'))->count();
        if ($totalRounds === 0) return 0.0;

        $cooperations = Round::whereIn('game_id', $games->pluck('id'))
            ->where('both_invested', true)
            ->count();

        return (float) round(
            ($cooperations / $totalRounds) * 100,
            2,
            PHP_ROUND_HALF_UP
        );
    }

    private function calculateBetrayalRate($games): float
    {
        $totalRounds = Round::whereIn('game_id', $games->pluck('id'))->count();
        if ($totalRounds === 0) return 0.0;

        $betrayals = Round::whereIn('game_id', $games->pluck('id'))
            ->where('someone_cashed_out', true)
            ->count();

        return (float) round(
            ($betrayals / $totalRounds) * 100,
            2,
            PHP_ROUND_HALF_UP
            );
    }

    private function calculateAverageEarnings($games): float
    {
        $gamePlayers = GamePlayer::whereIn('game_id', $games->pluck('id'))->get();
        if ($gamePlayers->isEmpty()) return 0.0;

        $avgResult = $gamePlayers->avg('net_result');
        return (float) round($avgResult ?? 0, 2, PHP_ROUND_HALF_UP);
    }
}

// sources
// created using claude Code (Sonnet 4.5)
// https://claude.ai/share/02e1bcfb-441b-4a92-b92e-565cd2c0d21f
