<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Round extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'game_id',
        'round_number',
        'pot_before_bonus',
        'trust_bonus_percentage',
        'pot_after_bonus',
        'player1_invested',
        'player2_invested',
        'player1_choice',
        'player2_choice',
        'both_invested',
        'someone_cashed_out',
        'round_duration',
        'started_at',
        'ended_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'game_id' => 'integer',
            'round_number' => 'integer',
            'pot_before_bonus' => 'decimal:2',
            'trust_bonus_percentage' => 'integer',
            'pot_after_bonus' => 'decimal:2',
            'player1_invested' => 'decimal:2',
            'player2_invested' => 'decimal:2',
            'both_invested' => 'boolean',
            'someone_cashed_out' => 'boolean',
            'round_duration' => 'integer', // seconds
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    /**
     * Get the game this round belongs to.
     */
    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    /**
     * Get the round statistics for this round.
     */
    public function roundStats(): HasMany
    {
        return $this->hasMany(RoundStat::class);
    }

    /**
     * Get the round result for this round.
     */
    public function roundResults(): HasMany
    {
        return $this->hasMany(RoundResult::class);
    }

    /**
     * Check if both players invested.
     */
    public function bothPlayersInvested(): bool
    {
        return $this->both_invested;
    }

    /**
     * Check if someone cashed out.
     */
    public function someoneDefected(): bool
    {
        return $this->someone_cashed_out;
    }

    /**
     * Get the trust bonus percentage based on round number.
     */
    public static function getTrustBonusForRound(int $roundNumber): int
    {
        return match($roundNumber) {
            1 => 20,
            2 => 40,
            3 => 60,
            default => 0,
        };
    }

    /**
     * Calculate pot after applying trust bonus.
     */
    public function calculatePotAfterBonus(): float
    {
        if ($this->both_invested) {
            return $this->pot_before_bonus * (1 + ($this->trust_bonus_percentage / 100));
        }
        return $this->pot_before_bonus;
    }

    /**
     * Check if this is the final round.
     */
    public function isFinalRound(): bool
    {
        return $this->round_number === 3;
    }

    /**
     * Get round status description.
     */
    public function getStatusDescription(): string
    {
        if ($this->both_invested) {
            return "Both players invested. Trust bonus applied: {$this->trust_bonus_percentage}%";
        }

        if ($this->someone_cashed_out) {
            return "Someone cashed out. No trust bonus.";
        }

        return "Round in progress";
    }
}

// sources
// created using claude Code (Sonnet 4.5)
// https://claude.ai/share/02e1bcfb-441b-4a92-b92e-565cd2c0d21f
