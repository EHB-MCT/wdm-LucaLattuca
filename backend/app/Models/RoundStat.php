<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoundStat extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'round_stats';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'round_id',
        'game_player_id',
        'initial_choice',
        'final_choice',
        'choice_changed',
        'made_decision',
        'defaulted_to_invest',
        'time_to_first_choice',
        'time_on_invest',
        'time_on_cash_out',
        'number_of_toggles',
        'hesitation_detected',
        'hesitation_score',
        'choice_locked_at',
        'device_info',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'round_id' => 'integer',
            'game_player_id' => 'integer',
            'choice_changed' => 'boolean',
            'time_to_first_choice' => 'decimal:2', // seconds
            'time_on_invest' => 'decimal:2', // seconds
            'time_on_cash_out' => 'decimal:2', // seconds
            'number_of_toggles' => 'integer',
            'hesitation_detected' => 'boolean',
            'hesitation_score' => 'decimal:2', // 0-100 scale
            'choice_locked_at' => 'datetime',
            'device_info' => 'array', // JSON
        ];
    }

    /**
     * Get the round this stat belongs to.
     */
    public function round(): BelongsTo
    {
        return $this->belongsTo(Round::class);
    }

    /**
     * Get the game player this stat belongs to.
     */
    public function gamePlayer(): BelongsTo
    {
        return $this->belongsTo(GamePlayer::class);
    }

    /**
     * Check if player changed their mind.
     */
    public function changedMind(): bool
    {
        return $this->choice_changed;
    }

    /**
     * Check if player showed hesitation.
     */
    public function showedHesitation(): bool
    {
        return $this->hesitation_detected;
    }

    /**
     * Check if player made decision quickly (within 5 seconds).
     */
    public function decidedQuickly(): bool
    {
        return $this->time_to_first_choice < 5.0;
    }

    /**
     * Check if player took long to decide (over 20 seconds).
     */
    public function tookLongTime(): bool
    {
        return $this->time_to_first_choice > 20.0;
    }

    /**
     * Check if player toggled multiple times (3 or more).
     */
    public function toggledMultipleTimes(): bool
    {
        return $this->number_of_toggles >= 3;
    }

    /**
     * Get hesitation level description.
     */
    public function getHesitationLevel(): string
    {
        if ($this->hesitation_score >= 70) {
            return 'High hesitation';
        } elseif ($this->hesitation_score >= 40) {
            return 'Moderate hesitation';
        } elseif ($this->hesitation_score >= 10) {
            return 'Low hesitation';
        }
        return 'No hesitation';
    }

    /**
     * Calculate total interaction time.
     */
    public function getTotalInteractionTime(): float
    {
        return $this->time_on_invest + $this->time_on_cash_out;
    }

    /**
     * Get percentage of time spent on invest option.
     */
    public function getInvestTimePercentage(): float
    {
        $total = $this->getTotalInteractionTime();
        if ($total == 0) return 0;
        return ($this->time_on_invest / $total) * 100;
    }

    /**
     * Get percentage of time spent on cash out option.
     */
    public function getCashOutTimePercentage(): float
    {
        $total = $this->getTotalInteractionTime();
        if ($total == 0) return 0;
        return ($this->time_on_cash_out / $total) * 100;
    }
}

// sources
// created using claude Code (Sonnet 4.5)
// https://claude.ai/share/02e1bcfb-441b-4a92-b92e-565cd2c0d21f
