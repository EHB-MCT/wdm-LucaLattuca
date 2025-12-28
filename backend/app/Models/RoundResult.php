<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoundResult extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'round_results';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'round_id',
        'game_player_id',
        'invested_amount',
        'payout_amount',
        'net_gain_loss',
        'cooperated',
        'defected',
        'was_betrayed',
        'contribution_percentage',
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
            'invested_amount' => 'decimal:2',
            'payout_amount' => 'decimal:2',
            'net_gain_loss' => 'decimal:2',
            'cooperated' => 'boolean',
            'defected' => 'boolean',
            'was_betrayed' => 'boolean',
            'contribution_percentage' => 'decimal:2',
        ];
    }

    /**
     * Get the round this result belongs to.
     */
    public function round(): BelongsTo
    {
        return $this->belongsTo(Round::class);
    }

    /**
     * Get the game player this result belongs to.
     */
    public function gamePlayer(): BelongsTo
    {
        return $this->belongsTo(GamePlayer::class);
    }

    /**
     * Check if player cooperated (chose invest).
     */
    public function didCooperate(): bool
    {
        return $this->cooperated;
    }

    /**
     * Check if player defected (chose cash out).
     */
    public function didDefect(): bool
    {
        return $this->defected;
    }

    /**
     * Check if player was betrayed this round.
     */
    public function wasBetrayedThisRound(): bool
    {
        return $this->was_betrayed;
    }

    /**
     * Check if player made profit this round.
     */
    public function madeProfit(): bool
    {
        return $this->net_gain_loss > 0;
    }

    /**
     * Check if player lost money this round.
     */
    public function lostMoney(): bool
    {
        return $this->net_gain_loss < 0;
    }

    /**
     * Check if player broke even this round.
     */
    public function brokeEven(): bool
    {
        return $this->net_gain_loss == 0;
    }

    /**
     * Get the return on investment percentage.
     */
    public function getROI(): float
    {
        if ($this->invested_amount == 0) {
            return 0;
        }
        return ($this->net_gain_loss / $this->invested_amount) * 100;
    }

    /**
     * Get result description.
     */
    public function getResultDescription(): string
    {
        if ($this->defected) {
            return "Cashed out and took the pot";
        }

        if ($this->was_betrayed) {
            return "Invested but was betrayed";
        }

        if ($this->cooperated && $this->madeProfit()) {
            return "Invested and earned from cooperation";
        }

        if ($this->cooperated) {
            return "Invested (round ongoing or neutral)";
        }

        return "Unknown result";
    }
}

// sources
// created using claude Code (Sonnet 4.5)
// https://claude.ai/share/02e1bcfb-441b-4a92-b92e-565cd2c0d21f
