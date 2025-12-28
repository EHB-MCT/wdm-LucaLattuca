<?php

namespace App\Services;

use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Round;
use App\Models\RoundResult;
use App\Models\RoundStat;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class GameService
{
    /**
     * Process player investment during a round.
     * This is called when a player selects an investment amount.
     */
    public function processPlayerInvestment(Round $round, GamePlayer $gamePlayer, float $investmentAmount): bool
    {
        // Validate investment amount
        $minInvestment = config('game.minimum_investment', 100);
        $maxInvestment = config('game.maximum_investment', 5000);

        if ($investmentAmount < $minInvestment || $investmentAmount > $maxInvestment) {
            return false;
        }

        // Check player balance
        if (!$gamePlayer->is_bot) {
            $user = $gamePlayer->user;
            if ($user->balance < $investmentAmount) {
                return false; // Insufficient funds
            }
        }

        // Update the round with player's investment
        if ($gamePlayer->player_number === 1) {
            $round->player1_invested = $investmentAmount;
        } else {
            $round->player2_invested = $investmentAmount;
        }

        $round->save();

        return true;
    }

    /**
     * Process player choice (invest or cash out).
     * This is called when a player toggles between invest/cash out.
     */
    public function processPlayerChoice(Round $round, GamePlayer $gamePlayer, string $choice, float $timestamp): void
    {
        // Get or create round stat for tracking behavior
        $roundStat = RoundStat::firstOrCreate([
            'round_id' => $round->id,
            'game_player_id' => $gamePlayer->id,
        ]);

        // Track initial choice
        if ($roundStat->initial_choice === null) {
            $roundStat->initial_choice = $choice;
            $roundStat->time_to_first_choice = $timestamp;
        }

        // Track choice changes and toggles
        if ($roundStat->final_choice !== null && $roundStat->final_choice !== $choice) {
            $roundStat->choice_changed = true;
            $roundStat->number_of_toggles++;
        }

        // Update final choice
        $roundStat->final_choice = $choice;
        $roundStat->made_decision = true;
        $roundStat->choice_locked_at = now();

        // Update time spent on each choice (you'd calculate this from frontend timestamps)
        // This is a simplified example
        if ($choice === 'invest') {
            $roundStat->time_on_invest += $timestamp;
        } else {
            $roundStat->time_on_cash_out += $timestamp;
        }

        $roundStat->save();

        // Update the round with player's choice
        if ($gamePlayer->player_number === 1) {
            $round->player1_choice = $choice;
        } else {
            $round->player2_choice = $choice;
        }

        $round->save();
    }

    /**
     * Finalize round when time expires.
     * This calculates payouts and updates all relevant models.
     */
    public function finalizeRound(Round $round): void
    {
        DB::transaction(function () use ($round) {
            $game = $round->game;
            $gamePlayers = $game->gamePlayers;

            $player1 = $gamePlayers->where('player_number', 1)->first();
            $player2 = $gamePlayers->where('player_number', 2)->first();

            // Handle players who didn't make a decision (auto-invest default amount)
            $this->handleDefaultInvestments($round, $player1, $player2);

            // Calculate pot before bonus
            $round->pot_before_bonus = $round->player1_invested + $round->player2_invested;

            // Check if both players invested
            $bothInvested = ($round->player1_choice === 'invest' && $round->player2_choice === 'invest');
            $someoneCashedOut = ($round->player1_choice === 'cash_out' || $round->player2_choice === 'cash_out');

            $round->both_invested = $bothInvested;
            $round->someone_cashed_out = $someoneCashedOut;

            // Apply trust bonus if both invested
            if ($bothInvested) {
                $round->trust_bonus_percentage = Round::getTrustBonusForRound($round->round_number);
                $round->pot_after_bonus = $round->pot_before_bonus * (1 + ($round->trust_bonus_percentage / 100));
            } else {
                $round->pot_after_bonus = $round->pot_before_bonus;
            }

            $round->ended_at = now();
            $round->save();

            // Calculate and distribute payouts
            if ($someoneCashedOut) {
                $this->handleCashOutScenario($round, $player1, $player2);
            } else if ($bothInvested) {
                $this->handleMutualCooperationScenario($round, $player1, $player2);
            }

            // Update game round counter
            $game->increment('total_rounds');

            // Check if game should end (someone cashed out OR all 3 rounds complete)
            if ($someoneCashedOut || $game->total_rounds >= 3) {
                $this->finalizeGame($game);
            }
        });
    }

    /**
     * Handle players who didn't make a decision (default to invest).
     */
    private function handleDefaultInvestments(Round $round, GamePlayer $player1, GamePlayer $player2): void
    {
        $defaultAmount = config('game.default_investment_amount', 100);

        if ($round->player1_choice === null) {
            $round->player1_choice = 'invest';
            $round->player1_invested = $defaultAmount;

            $roundStat = RoundStat::where('round_id', $round->id)
                ->where('game_player_id', $player1->id)
                ->first();
            if ($roundStat) {
                $roundStat->made_decision = false;
                $roundStat->defaulted_to_invest = true;
                $roundStat->final_choice = 'invest';
                $roundStat->save();
            }
        }

        if ($round->player2_choice === null) {
            $round->player2_choice = 'invest';
            $round->player2_invested = $defaultAmount;

            $roundStat = RoundStat::where('round_id', $round->id)
                ->where('game_player_id', $player2->id)
                ->first();
            if ($roundStat) {
                $roundStat->made_decision = false;
                $roundStat->defaulted_to_invest = true;
                $roundStat->final_choice = 'invest';
                $roundStat->save();
            }
        }
    }

    /**
     * Handle scenario where someone cashed out.
     */
    private function handleCashOutScenario(Round $round, GamePlayer $player1, GamePlayer $player2): void
    {
        $defector = null;
        $cooperator = null;

        if ($round->player1_choice === 'cash_out') {
            $defector = $player1;
            $cooperator = $player2;
        } else {
            $defector = $player2;
            $cooperator = $player1;
        }

        // Defector takes entire pot
        $this->createRoundResult($round, $defector, [
            'invested_amount' => $defector->player_number === 1 ? $round->player1_invested : $round->player2_invested,
            'payout_amount' => $round->pot_after_bonus,
            'cooperated' => false,
            'defected' => true,
            'was_betrayed' => false,
        ]);

        // Cooperator gets nothing
        $this->createRoundResult($round, $cooperator, [
            'invested_amount' => $cooperator->player_number === 1 ? $round->player1_invested : $round->player2_invested,
            'payout_amount' => 0,
            'cooperated' => true,
            'defected' => false,
            'was_betrayed' => true,
        ]);
    }

    /**
     * Handle scenario where both invested (mutual cooperation).
     */
    private function handleMutualCooperationScenario(Round $round, GamePlayer $player1, GamePlayer $player2): void
    {
        $totalInvested = $round->player1_invested + $round->player2_invested;

        // Return investments first
        $player1Investment = $round->player1_invested;
        $player2Investment = $round->player2_invested;

        // Calculate remaining pot to split fairly
        $remainingPot = $round->pot_after_bonus - $totalInvested;

        // Calculate contribution percentages
        $player1Contribution = $totalInvested > 0 ? ($player1Investment / $totalInvested) : 0.5;
        $player2Contribution = $totalInvested > 0 ? ($player2Investment / $totalInvested) : 0.5;

        // Distribute remaining pot based on contribution
        $player1Share = $remainingPot * $player1Contribution;
        $player2Share = $remainingPot * $player2Contribution;

        // Final payouts
        $player1Payout = $player1Investment + $player1Share;
        $player2Payout = $player2Investment + $player2Share;

        $this->createRoundResult($round, $player1, [
            'invested_amount' => $player1Investment,
            'payout_amount' => $player1Payout,
            'cooperated' => true,
            'defected' => false,
            'was_betrayed' => false,
            'contribution_percentage' => $player1Contribution * 100,
        ]);

        $this->createRoundResult($round, $player2, [
            'invested_amount' => $player2Investment,
            'payout_amount' => $player2Payout,
            'cooperated' => true,
            'defected' => false,
            'was_betrayed' => false,
            'contribution_percentage' => $player2Contribution * 100,
        ]);
    }

    /**
     * Create round result record.
     */
    private function createRoundResult(Round $round, GamePlayer $gamePlayer, array $data): void
    {
        $netGainLoss = $data['payout_amount'] - $data['invested_amount'];

        RoundResult::create([
            'round_id' => $round->id,
            'game_player_id' => $gamePlayer->id,
            'invested_amount' => $data['invested_amount'],
            'payout_amount' => $data['payout_amount'],
            'net_gain_loss' => $netGainLoss,
            'cooperated' => $data['cooperated'],
            'defected' => $data['defected'],
            'was_betrayed' => $data['was_betrayed'],
            'contribution_percentage' => $data['contribution_percentage'] ?? 0,
        ]);

        // Update GamePlayer totals
        $gamePlayer->total_invested += $data['invested_amount'];
        $gamePlayer->final_earnings += $data['payout_amount'];
        $gamePlayer->net_result = $gamePlayer->final_earnings - $gamePlayer->total_invested;

        if ($data['was_betrayed']) {
            $gamePlayer->was_betrayed = true;
        }

        $gamePlayer->save();
    }

    /**
     * Finalize the game and update user profiles.
     */
    private function finalizeGame(Game $game): void
    {
        $game->status = 'completed';
        $game->ended_at = now();
        $game->save();

        // Update user profiles
        foreach ($game->gamePlayers as $gamePlayer) {
            if (!$gamePlayer->is_bot) {
                $this->updateUserProfile($gamePlayer);
            }
        }
    }

    /**
     * Update user profile with game statistics.
     */
    private function updateUserProfile(GamePlayer $gamePlayer): void
    {
        $user = $gamePlayer->user;

        // Update balance
        $user->balance += $gamePlayer->net_result;

        // Update match count
        $user->total_matches_played++;

        // Count cooperation and defection from round results
        $roundResults = RoundResult::where('game_player_id', $gamePlayer->id)->get();
        $user->times_cooperated += $roundResults->where('cooperated', true)->count();
        $user->times_defected += $roundResults->where('defected', true)->count();
        $user->times_betrayed += $roundResults->where('was_betrayed', true)->count();

        // Update average earnings
        $totalEarnings = ($user->average_earnings * ($user->total_matches_played - 1)) + $gamePlayer->net_result;
        $user->average_earnings = $totalEarnings / $user->total_matches_played;

        // Update trust score
        if ($gamePlayer->was_betrayed) {
            // Player was betrayed, slight trust score increase for being cooperative
            $user->trust_score = min(100, $user->trust_score + config('game.trust_score_increase_cooperation', 5));
        } else if ($roundResults->where('defected', true)->count() > 0) {
            // Player defected at least once
            $user->trust_score = max(0, $user->trust_score - config('game.trust_score_decrease_defection', 10));
        } else {
            // Player cooperated all rounds
            $user->trust_score = min(100, $user->trust_score + config('game.trust_score_increase_cooperation', 5));
        }

        $user->save();
    }
}
// sources
// created using claude Code (Sonnet 4.5)
// https://claude.ai/share/02e1bcfb-441b-4a92-b92e-565cd2c0d21f
