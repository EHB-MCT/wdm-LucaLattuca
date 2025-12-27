<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoundResult extends Model
{
    use HasFactory;

    protected $fillable = [
        'round_id',
        'game_player_id',
        'final_choice',
        'earnings',
        'losses',
        'was_betrayed',
        'disconnected',
        'choice_submitted_at',
        'decision_time_ms',
    ];

    protected $casts = [
        'earnings' => 'integer',
        'losses' => 'integer',
        'was_betrayed' => 'boolean',
        'disconnected' => 'boolean',
        'choice_submitted_at' => 'datetime',
        'decision_time_ms' => 'integer',
    ];

    public function round()
    {
        return $this->belongsTo(Round::class);
    }

    public function gamePlayer()
    {
        return $this->belongsTo(GamePlayer::class);
    }
}

//sources
// model generated using claude (sonnet 4.5)
// https://claude.ai/share/fdba5ca3-50f7-42ba-a0ab-98387b5a4fcc
