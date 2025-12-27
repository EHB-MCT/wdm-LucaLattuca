<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Round extends Model
{
    use HasFactory;

    protected $fillable = [
        'game_id',
        'round_number',
        'status',
        'pot_before_round',
        'pot_after_round',
        'started_at',
        'ended_at',
    ];

    protected $casts = [
        'round_number' => 'integer',
        'pot_before_round' => 'integer',
        'pot_after_round' => 'integer',
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    /**
     * Relationships
     */
    public function game()
    {
        return $this->belongsTo(Game::class);
    }

    public function results()
    {
        return $this->hasMany(RoundResult::class);
    }

    public function stats()
    {
        return $this->hasMany(RoundStat::class);
    }

    /**
     * Check if both players have submitted their choices
     */
    public function isComplete(): bool
    {
        return $this->results()->whereNotNull('final_choice')->count() === 2;
    }

    /**
     * Start the round
     */
    public function start(): void
    {
        $this->update([
            'status' => 'in_progress',
            'started_at' => now(),
        ]);
    }

    /**
     * Process round after both players have chosen
     */
    public function processResults(): void
    {
        if (!$this->isComplete()) {
            return;
        }

        $results = $this->results;
        $player1Result = $results[0];
        $player2Result = $results[1];

        $choice1 = $player1Result->final_choice;
        $choice2 = $player2Result->final_choice;

        $game = $this->game;

        // Calculate outcomes based on game theory
        $outcome = $this->calculateOutcome(
            $choice1,
            $choice2,
            $game->investment_amount,
            $game->trust_bonus,
            $game->penalty_amount
        );

        // Update results with earnings/losses
        $player1Result->update([
            'earnings' => $outcome['player1_earnings'],
            'losses' => $outcome['player1_losses'],
            'was_betrayed' => $outcome['player1_betrayed'],
        ]);

        $player2Result->update([
            'earnings' => $outcome['player2_earnings'],
            'losses' => $outcome['player2_losses'],
            'was_betrayed' => $outcome['player2_betrayed'],
        ]);

        // Update game players' totals
        $player1Result->gamePlayer->increment('total_earnings', $outcome['player1_earnings']);
        $player1Result->gamePlayer->increment('total_losses', abs($outcome['player1_losses']));

        $player2Result->gamePlayer->increment('total_earnings', $outcome['player2_earnings']);
        $player2Result->gamePlayer->increment('total_losses', abs($outcome['player2_losses']));

        // Track betrayals for user stats
        if ($outcome['player1_betrayed']) {
            $player1Result->gamePlayer->user?->increment('times_betrayed');
        }
        if ($outcome['player2_betrayed']) {
            $player2Result->gamePlayer->user?->increment('times_betrayed');
        }

        // Update pot and complete round
        $this->update([
            'pot_after_round' => $outcome['pot_after'],
            'status' => 'completed',
            'ended_at' => now(),
        ]);
    }

    /**
     * Calculate game theory outcomes
     */
    private function calculateOutcome(
        string $choice1,
        string $choice2,
        int $investment,
        int $trustBonus,
        int $penalty
    ): array {
        $potAfter = $this->pot_before_round;

        if ($choice1 === 'cooperate' && $choice2 === 'cooperate') {
            // Both cooperate: mutual benefit
            return [
                'player1_earnings' => $investment + $trustBonus,
                'player1_losses' => 0,
                'player1_betrayed' => false,
                'player2_earnings' => $investment + $trustBonus,
                'player2_losses' => 0,
                'player2_betrayed' => false,
                'pot_after' => $potAfter + ($trustBonus * 2),
            ];
        } elseif ($choice1 === 'defect' && $choice2 === 'defect') {
            // Both defect: mutual loss
            return [
                'player1_earnings' => 0,
                'player1_losses' => $penalty,
                'player1_betrayed' => false,
                'player2_earnings' => 0,
                'player2_losses' => $penalty,
                'player2_betrayed' => false,
                'pot_after' => max(0, $potAfter - ($penalty * 2)),
            ];
        } elseif ($choice1 === 'cooperate' && $choice2 === 'defect') {
            // Player 1 cooperates, Player 2 defects (betrayal)
            return [
                'player1_earnings' => 0,
                'player1_losses' => $investment,
                'player1_betrayed' => true,
                'player2_earnings' => ($investment * 2) + $trustBonus,
                'player2_losses' => 0,
                'player2_betrayed' => false,
                'pot_after' => $potAfter,
            ];
        } else {
            // Player 1 defects, Player 2 cooperates (betrayal)
            return [
                'player1_earnings' => ($investment * 2) + $trustBonus,
                'player1_losses' => 0,
                'player1_betrayed' => false,
                'player2_earnings' => 0,
                'player2_losses' => $investment,
                'player2_betrayed' => true,
                'pot_after' => $potAfter,
            ];
        }
    }

    /**
     * Get round duration in milliseconds
     */
    public function getDurationAttribute(): ?int
    {
        if (!$this->started_at || !$this->ended_at) {
            return null;
        }

        return $this->started_at->diffInMilliseconds($this->ended_at);
    }
}


//sources
// model generated using claude (sonnet 4.5)
// https://claude.ai/share/fdba5ca3-50f7-42ba-a0ab-98387b5a4fcc

