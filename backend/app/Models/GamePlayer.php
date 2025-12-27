<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GamePlayer extends Model
{
    use HasFactory;

    protected $fillable = [
        'game_id',
        'user_id',
        'is_bot',
        'bot_name',
        'bot_personality',
        'bot_strategy',
        'total_earnings',
        'total_losses',
        'cooperations_count',
        'defections_count',
        'disconnected',
        'disconnected_at',
    ];

    protected $casts = [
        'is_bot' => 'boolean',
        'bot_personality' => 'array',
        'total_earnings' => 'integer',
        'total_losses' => 'integer',
        'cooperations_count' => 'integer',
        'defections_count' => 'integer',
        'disconnected' => 'boolean',
        'disconnected_at' => 'datetime',
    ];

    /**
     * Relationships
     */
    public function game()
    {
        return $this->belongsTo(Game::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function roundResults()
    {
        return $this->hasMany(RoundResult::class);
    }

    public function roundStats()
    {
        return $this->hasMany(RoundStat::class);
    }

    /**
     * Get opponent in this game
     */
    public function getOpponentAttribute(): ?GamePlayer
    {
        return $this->game->players()
            ->where('id', '!=', $this->id)
            ->first();
    }

    /**
     * Get display name (username or bot name)
     */
    public function getDisplayNameAttribute(): string
    {
        return $this->is_bot ? $this->bot_name : $this->user->username;
    }

    /**
     * Record a choice for this player
     */
    public function recordChoice(Round $round, string $choice, int $earnings, int $losses): RoundResult
    {
        // Update counters
        if ($choice === 'cooperate') {
            $this->increment('cooperations_count');
        } elseif ($choice === 'defect') {
            $this->increment('defections_count');
        }

        $this->increment('total_earnings', $earnings);
        $this->increment('total_losses', abs($losses));

        // Create round result
        return RoundResult::create([
            'round_id' => $round->id,
            'game_player_id' => $this->id,
            'final_choice' => $choice,
            'earnings' => $earnings,
            'losses' => $losses,
            'choice_submitted_at' => now(),
        ]);
    }

    /**
     * Get cooperation rate for this game
     */
    public function getCooperationRateAttribute(): float
    {
        $totalChoices = $this->cooperations_count + $this->defections_count;
        if ($totalChoices === 0) return 0;

        return ($this->cooperations_count / $totalChoices) * 100;
    }
}

//sources
// model generated using claude (sonnet 4.5)
// https://claude.ai/share/fdba5ca3-50f7-42ba-a0ab-98387b5a4fcc
