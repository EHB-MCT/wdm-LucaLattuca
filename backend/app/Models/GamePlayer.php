<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GamePlayer extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'game_players';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'game_id',
        'user_id',
        'player_number',
        'is_bot',
        'bot_personality',
        'total_invested',
        'final_earnings',
        'net_result',
        'was_betrayed',
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
            'user_id' => 'integer',
            'player_number' => 'integer',
            'is_bot' => 'boolean',
            'bot_personality' => 'array', // Store OCEAN traits as JSON
            'total_invested' => 'decimal:2',
            'final_earnings' => 'decimal:2',
            'net_result' => 'decimal:2',
            'was_betrayed' => 'boolean',
        ];
    }

    /**
     * Get the game this player belongs to.
     */
    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    /**
     * Get the user (if not a bot).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if this is player 1.
     */
    public function isPlayerOne(): bool
    {
        return $this->player_number === 1;
    }

    /**
     * Check if this is player 2.
     */
    public function isPlayerTwo(): bool
    {
        return $this->player_number === 2;
    }

    /**
     * Check if this player is a bot.
     */
    public function isBot(): bool
    {
        return $this->is_bot;
    }

    /**
     * Check if player was betrayed (opponent cashed out while they invested).
     */
    public function wasBetrayedByOpponent(): bool
    {
        return $this->was_betrayed;
    }

    /**
     * Check if player made profit.
     */
    public function madeProfit(): bool
    {
        return $this->net_result > 0;
    }

    /**
     * Check if player lost money.
     */
    public function lostMoney(): bool
    {
        return $this->net_result < 0;
    }

    /**
     * Check if player broke even.
     */
    public function brokeEven(): bool
    {
        return $this->net_result == 0;
    }

    /**
     * Get the opponent in this game.
     */
    public function opponent()
    {
        return GamePlayer::where('game_id', $this->game_id)
            ->where('id', '!=', $this->id)
            ->first();
    }
}
