<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Game extends Model
{
    use HasFactory;

    protected $fillable = [
        'status',
        'total_rounds',
        'current_round',
        'starting_pot',
        'investment_amount',
        'trust_bonus',
        'penalty_amount',
        'started_at',
        'ended_at',
        'round_duration_seconds',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'total_rounds' => 'integer',
        'current_round' => 'integer',
        'starting_pot' => 'integer',
        'investment_amount' => 'integer',
        'trust_bonus' => 'integer',
        'penalty_amount' => 'integer',
        'round_duration_seconds' => 'integer',
    ];

    /**
     * Relationships
     */
    public function players()
    {
        return $this->hasMany(GamePlayer::class);
    }

    public function rounds()
    {
        return $this->hasMany(Round::class);
    }

    /**
     * Get human players only
     */
    public function humanPlayers()
    {
        return $this->players()->where('is_bot', false);
    }

    /**
     * Get bot players only
     */
    public function botPlayers()
    {
        return $this->players()->where('is_bot', true);
    }

    /**
     * Check if game is ready to start (has 2 players)
     */
    public function isReady(): bool
    {
        return $this->players()->count() === 2;
    }

    /**
     * Start the game
     */
    public function start(): void
    {
        $this->update([
            'status' => 'in_progress',
            'started_at' => now(),
        ]);

        // Create first round
        $this->createRound(1);
    }

    /**
     * Create a new round
     */
    public function createRound(int $roundNumber): Round
    {
        $previousRound = $this->rounds()->where('round_number', $roundNumber - 1)->first();
        $potBefore = $previousRound ? $previousRound->pot_after_round : $this->starting_pot;

        return $this->rounds()->create([
            'round_number' => $roundNumber,
            'status' => 'pending',
            'pot_before_round' => $potBefore,
            'started_at' => now(),
        ]);
    }

    /**
     * Advance to next round
     */
    public function advanceRound(): ?Round
    {
        $nextRoundNumber = $this->current_round + 1;

        if ($nextRoundNumber > $this->total_rounds) {
            $this->complete();
            return null;
        }

        $this->update(['current_round' => $nextRoundNumber]);
        return $this->createRound($nextRoundNumber);
    }

    /**
     * Complete the game
     */
    public function complete(): void
    {
        $this->update([
            'status' => 'completed',
            'ended_at' => now(),
        ]);

        // Update player statistics
        foreach ($this->players as $player) {
            if (!$player->is_bot && $player->user) {
                $player->user->increment('total_matches_played');
                $player->user->increment('total_rounds_played', $this->total_rounds);
                $player->user->increment('total_earnings', $player->total_earnings);
                $player->user->increment('times_cooperated', $player->cooperations_count);
                $player->user->increment('times_defected', $player->defections_count);

                // Update trust score based on this game
                $player->user->updateTrustScore();
            }
        }
    }

    /**
     * Get game duration in seconds
     */
    public function getDurationAttribute(): ?int
    {
        if (!$this->started_at || !$this->ended_at) {
            return null;
        }

        return $this->started_at->diffInSeconds($this->ended_at);
    }

    /**
     * Get winner (highest earnings)
     */
    public function getWinnerAttribute(): ?GamePlayer
    {
        if ($this->status !== 'completed') {
            return null;
        }

        return $this->players()->orderBy('total_earnings', 'desc')->first();
    }
}


//sources
// model generated using claude (sonnet 4.5)
// https://claude.ai/share/fdba5ca3-50f7-42ba-a0ab-98387b5a4fcc
