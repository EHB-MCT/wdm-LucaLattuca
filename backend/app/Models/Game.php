<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Game extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'status',
        'total_rounds',
        'started_at',
        'ended_at',
        'has_bot',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'has_bot' => 'boolean',
            'total_rounds' => 'integer',
        ];
    }

    /**
     * Get the users participating in this game.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'game_players')
            ->withPivot('player_number', 'final_earnings', 'total_invested')
            ->withTimestamps();
    }

    /**
     * Get all game players (includes pivot data).
     */
    public function gamePlayers(): HasMany
    {
        return $this->hasMany(GamePlayer::class);
    }

    /**
     * Get all rounds for this game.
     */
    public function rounds(): HasMany
    {
        return $this->hasMany(Round::class);
    }

    /**
     * Scope to get active games.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope to get completed games.
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Check if game is finished.
     */
    public function isFinished(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Check if game has bots.
     */
    public function hasBots(): bool
    {
        return $this->has_bot;
    }
}

// sources
// created using claude Code (Sonnet 4.5)
// https://claude.ai/share/02e1bcfb-441b-4a92-b92e-565cd2c0d21f
