<?php

namespace App\Services;

use App\Models\Bot;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Round;
use App\Models\RoundStat;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UserSimulator
{
    private GameService $gameService;

    public function __construct(GameService $gameService)
    {
        $this->gameService = $gameService;
    }

    /**
     * Simulate a game between a user and a bot.
     */
    public function simulateUserGame(User $user, ?Bot $bot = null, bool $verbose = false): Game
    {
        // Get random bot if not specified
        $bot = $bot ?? Bot::where('is_active', true)->inRandomOrder()->first();

        if (!$bot) {
            throw new \Exception('No active bots available. Run BotSeeder first.');
        }

        if ($verbose) {
            Log::info("=== Starting User Simulation: {$user->username} vs {$bot->name} ===");
        }

        return DB::transaction(function () use ($user, $bot, $verbose) {
            // Create game
            $game = Game::create([
                'status' => 'active',
                'started_at' => now()->subMinutes(rand(1, 10080)), // Random time in past week
                'has_bot' => true,
            ]);

            // Randomly assign player numbers
            $userPlayerNumber = rand(1, 2);
            $botPlayerNumber = $userPlayerNumber === 1 ? 2 : 1;

            // Create game players
            $userGamePlayer = GamePlayer::create([
                'game_id' => $game->id,
                'user_id' => $user->id,
                'player_number' => $userPlayerNumber,
                'is_bot' => false,
            ]);

            $botGamePlayer = GamePlayer::create([
                'game_id' => $game->id,
                'user_id' => null,
                'player_number' => $botPlayerNumber,
                'is_bot' => true,
                'bot_id' => $bot->id,
                'bot_personality' => $bot->getOceanTraits(),
            ]);

            // Simulate 3 rounds (or until someone cashes out)
            for ($roundNum = 1; $roundNum <= 3; $roundNum++) {
                if ($verbose) {
                    Log::info("--- Round {$roundNum} ---");
                }

                $this->simulateRound($game, $userGamePlayer, $botGamePlayer, $user, $bot, $roundNum, $verbose);

                // Check if someone cashed out
                $game->refresh();
                $lastRound = $game->rounds()->latest('round_number')->first();

                if ($lastRound && $lastRound->someone_cashed_out) {
                    if ($verbose) {
                        Log::info("Game ended early - someone cashed out!");
                    }
                    break;
                }
            }

            // Finalize game and update user stats
            $game->refresh();
            $this->updateUserStats($user, $game, $userGamePlayer);

            if ($verbose) {
                $this->logGameSummary($game, $user, $bot);
            }

            return $game;
        });
    }

    /**
     * Simulate a single round with user behavior based on OCEAN traits.
     */
    private function simulateRound(
        Game $game,
        GamePlayer $userGamePlayer,
        GamePlayer $botGamePlayer,
        User $user,
        Bot $bot,
        int $roundNumber,
        bool $verbose
    ): void {
        // Create round
        $round = Round::create([
            'game_id' => $game->id,
            'round_number' => $roundNumber,
            'started_at' => now(),
        ]);

        // Get previous round's pot
        $previousRound = Round::where('game_id', $game->id)
            ->where('round_number', '<', $roundNumber)
            ->orderBy('round_number', 'desc')
            ->first();

        $cumulativePot = $previousRound ? $previousRound->pot_after_bonus : 0;

        // User makes decision based on personality
        $userDecision = $this->makeUserDecision($round, $userGamePlayer, $user);
        $this->processDecision($round, $userGamePlayer, $userDecision, $verbose ? $user->username : null);

        // Bot makes decision
        $botDecision = $bot->makeDecision($round, $botGamePlayer);
        $this->processDecision($round, $botGamePlayer, $botDecision, $verbose ? $bot->name : null);

        // Add investments to cumulative pot
        $round->pot_before_bonus = $cumulativePot + $round->player1_invested + $round->player2_invested;

        // Simulate round duration
        $round->round_duration = 30;
        $round->save();

        // Finalize the round
        $this->gameService->finalizeRound($round);

        if ($verbose) {
            $round->refresh();
            $this->logRoundSummary($round, $user, $bot);
        }
    }

    /**
     * Make user decision based on OCEAN personality traits.
     */
    private function makeUserDecision(Round $round, GamePlayer $gamePlayer, User $user): array
    {
        // Base cooperation probability on agreeableness and conscientiousness
        $cooperationProb = ($user->agreeableness * 0.6) + ($user->conscientiousness * 0.4);

        // Strategic adjustments based on round number
        if ($round->round_number === 1) {
            // Round 1: Most people cooperate to build the pot
            $cooperationProb += 25;

        } elseif ($round->round_number === 2) {
            // Round 2: Moderate cooperation
            $cooperationProb += 5;

            // Less agreeable users might defect for medium pot
            if ($user->agreeableness < 40 && rand(0, 100) < 30) {
                $cooperationProb -= 40;
            }

        } else { // Round 3
            // Round 3: Final round, higher defection rate
            $cooperationProb -= 10;

            // Low agreeableness users more likely to cash out
            if ($user->agreeableness < 50) {
                $cooperationProb -= 20;
            }
        }

        // Neuroticism decreases trust (anxious people cooperate less)
        $cooperationProb -= ($user->neuroticism - 50) * 0.3;

        // Openness slightly increases willingness to take cooperative risks
        $cooperationProb += ($user->openness - 50) * 0.1;

        // Clamp between 0-100
        $cooperationProb = max(0, min(100, $cooperationProb));

        // Make decision
        $willCooperate = (rand(0, 100) <= $cooperationProb);
        $choice = $willCooperate ? 'invest' : 'cash_out';

        // Determine investment amount
        $investmentAmount = $this->determineUserInvestment($round, $user);

        // Simulate decision timing
        $decisionTime = $this->simulateUserDecisionTiming($user);

        // Simulate hesitation
        $hesitationData = $this->simulateUserHesitation($willCooperate, $round->round_number, $user);

        return [
            'choice' => $choice,
            'investment_amount' => $investmentAmount,
            'decision_time' => $decisionTime,
            'hesitation_data' => $hesitationData,
        ];
    }

    /**
     * Determine user investment based on personality.
     */
    private function determineUserInvestment(Round $round, User $user): float
    {
        $minInvestment = config('game.minimum_investment', 100);
        $maxInvestment = config('game.maximum_investment', 5000);

        // Risk tolerance based on openness and (inverse) neuroticism
        $riskFactor = (($user->openness / 100) * 0.6) + ((100 - $user->neuroticism) / 100 * 0.4);

        // Investment strategy based on round
        if ($round->round_number === 1) {
            $riskFactor *= rand(25, 45) / 100;
        } elseif ($round->round_number === 2) {
            $riskFactor *= rand(45, 75) / 100;
        } else {
            $riskFactor *= rand(65, 100) / 100;
        }

        // Calculate investment
        $range = $maxInvestment - $minInvestment;
        $investment = $minInvestment + ($range * $riskFactor);

        // Round to nearest 100
        $investment = round($investment / 100) * 100;

        return max($minInvestment, min($maxInvestment, $investment));
    }

    /**
     * Simulate user decision timing based on conscientiousness and neuroticism.
     */
    private function simulateUserDecisionTiming(User $user): float
    {
        // Conscientious users think longer
        $baseTime = 5 + (($user->conscientiousness / 100) * 8);

        // Neurotic users are more hesitant
        $baseTime += (($user->neuroticism / 100) * 6);

        // Extraverts decide faster
        $baseTime -= (($user->extraversion / 100) * 3);

        // Add randomness
        $randomFactor = rand(75, 125) / 100;
        $decisionTime = $baseTime * $randomFactor;

        return round($decisionTime, 2);
    }

    /**
     * Simulate user hesitation behavior.
     */
    private function simulateUserHesitation(bool $willCooperate, int $roundNumber, User $user): array
    {
        // Hesitation based on neuroticism
        $hesitationScore = $user->neuroticism;

        // More hesitation if defecting (moral conflict)
        if (!$willCooperate) {
            $hesitationScore += 15;
        }

        // More hesitation in final round
        if ($roundNumber === 3) {
            $hesitationScore += 10;
        }

        // Low conscientiousness increases indecision
        if ($user->conscientiousness < 50) {
            $hesitationScore += (50 - $user->conscientiousness) * 0.3;
        }

        // Clamp
        $hesitationScore = min(100, $hesitationScore);

        // Determine toggles
        $numToggles = 0;
        if ($hesitationScore > 70) {
            $numToggles = rand(2, 6);
        } elseif ($hesitationScore > 40) {
            $numToggles = rand(0, 3);
        }

        return [
            'hesitation_detected' => $hesitationScore > 30,
            'hesitation_score' => $hesitationScore,
            'number_of_toggles' => $numToggles,
            'changed_choice' => $numToggles > 0,
        ];
    }

    /**
     * Process decision and create round stats (same as GameSimulator).
     */
    private function processDecision(Round $round, GamePlayer $gamePlayer, array $decision, ?string $playerName): void
    {
        // Process investment
        if ($decision['choice'] === 'invest') {
            $this->gameService->processPlayerInvestment(
                $round,
                $gamePlayer,
                $decision['investment_amount']
            );
        } else {
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
                    'type' => $gamePlayer->is_bot ? 'bot_simulation' : 'user_simulation',
                    'player_name' => $playerName ?? 'unknown',
                ],
            ]
        );
    }

    /**
     * Update user statistics after game completion.
     */
    private function updateUserStats(User $user, Game $game, GamePlayer $userGamePlayer): void
    {
        // Get all rounds for this game
        $rounds = $game->rounds;

        // Count cooperation and defection
        $cooperations = 0;
        $defections = 0;

        foreach ($rounds as $round) {
            $userChoice = $userGamePlayer->player_number === 1 
                ? $round->player1_choice 
                : $round->player2_choice;

            if ($userChoice === 'invest') {
                $cooperations++;
            } elseif ($userChoice === 'cash_out') {
                $defections++;
            }
        }

        // Update user stats
        $user->increment('total_matches_played');
        $user->increment('times_cooperated', $cooperations);
        $user->increment('times_defected', $defections);

        if ($userGamePlayer->was_betrayed) {
            $user->increment('times_betrayed');
        }

        // Update average earnings (running average)
        $totalGames = $user->total_matches_played;
        $oldAverage = $user->average_earnings ?? 0;
        $newAverage = (($oldAverage * ($totalGames - 1)) + $userGamePlayer->net_result) / $totalGames;
        $user->average_earnings = round($newAverage, 2);

        // Update trust score based on game outcome
        $this->updateTrustScore($user, $userGamePlayer);

        $user->save();
    }

    /**
     * Update user trust score based on game behavior.
     */
    private function updateTrustScore(User $user, GamePlayer $gamePlayer): void
    {
        $currentTrust = $user->trust_score ?? 50;

        // Increase trust if cooperated and wasn't betrayed
        if (!$gamePlayer->was_betrayed && $gamePlayer->times_cooperated > 0) {
            $currentTrust += rand(1, 3);
        }

        // Decrease trust if defected
        if ($gamePlayer->times_defected > 0) {
            $currentTrust -= rand(2, 4);
        }

        // Decrease trust significantly if was betrayed
        if ($gamePlayer->was_betrayed) {
            $currentTrust -= rand(3, 6);
        }

        // Clamp between 0-100
        $user->trust_score = max(0, min(100, $currentTrust));
    }

    /**
     * Simulate multiple games for a user.
     */
    public function simulateUserGames(User $user, int $gameCount = 20, bool $verbose = false): array
    {
        $results = [];

        if ($verbose) {
            Log::info("Starting simulation of {$gameCount} games for user: {$user->username}");
        }

        for ($i = 1; $i <= $gameCount; $i++) {
            try {
                $game = $this->simulateUserGame($user, null, $verbose);
                $results[] = [
                    'game_id' => $game->id,
                    'status' => 'completed',
                ];

                if ($verbose && $i % 5 === 0) {
                    Log::info("Completed {$i}/{$gameCount} games for {$user->username}");
                }
            } catch (\Exception $e) {
                $results[] = [
                    'game_id' => null,
                    'status' => 'failed',
                    'error' => $e->getMessage(),
                ];
                Log::error("Game simulation failed for {$user->username}: " . $e->getMessage());
            }
        }

        if ($verbose) {
            Log::info("Simulation complete for {$user->username}. {$gameCount} games simulated.");
        }

        return $results;
    }

    /**
     * Simulate games for all users in the database.
     */
    public function simulateAllUsers(int $gamesPerUser = 20, bool $verbose = false): array
    {
        $users = User::where('onboarding_completed', true)->get();
        $totalResults = [];

        Log::info("Starting simulation for {$users->count()} users with {$gamesPerUser} games each...");

        foreach ($users as $index => $user) {
            $results = $this->simulateUserGames($user, $gamesPerUser, $verbose);
            $totalResults[$user->id] = $results;

            if (($index + 1) % 10 === 0) {
                Log::info("Completed simulations for " . ($index + 1) . "/{$users->count()} users");
            }
        }

        Log::info("All user simulations complete!");

        return $totalResults;
    }

    /**
     * Log round summary.
     */
    private function logRoundSummary(Round $round, User $user, Bot $bot): void
    {
        $userChoice = $round->player1_choice;
        $botChoice = $round->player2_choice;

        Log::info(
            "{$user->username}: {$userChoice} (\${$round->player1_invested})\n" .
            "{$bot->name}: {$botChoice} (\${$round->player2_invested})\n" .
            "Pot before bonus: \${$round->pot_before_bonus}\n" .
            "Trust bonus: {$round->trust_bonus_percentage}%\n" .
            "Pot after bonus: \${$round->pot_after_bonus}"
        );
    }

    /**
     * Log game summary.
     */
    private function logGameSummary(Game $game, User $user, Bot $bot): void
    {
        $userPlayer = $game->gamePlayers->where('user_id', $user->id)->first();
        $botPlayer = $game->gamePlayers->where('is_bot', true)->first();

        $endedEarly = $game->total_rounds < 3 ? " (ended after round {$game->total_rounds})" : "";

        Log::info(
            "=== Game Complete{$endedEarly} ===\n" .
            "{$user->username}: Invested \${$userPlayer->total_invested}, Earned \${$userPlayer->final_earnings}, Net: \${$userPlayer->net_result}" .
            ($userPlayer->was_betrayed ? " (BETRAYED)" : "") . "\n" .
            "{$bot->name}: Invested \${$botPlayer->total_invested}, Earned \${$botPlayer->final_earnings}, Net: \${$botPlayer->net_result}" .
            ($botPlayer->was_betrayed ? " (BETRAYED)" : "") . "\n" .
            "===================="
        );
    }
}

// Sources
// Created using Claude (Sonnet 4.5)
// Based on GameSimulator pattern with user OCEAN personality integration