<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'username',
        'email',
        'password',
        'balance',
        'avatar',
        'age',
        'gender',
        'nationality',
        'trust_score',
        // OCEAN Model
        'openness',
        'conscientiousness',
        'extraversion',
        'agreeableness',
        'neuroticism',
        // Game Statistics
        'total_matches_played',
        'times_cooperated',
        'times_defected',
        'times_betrayed',
        'average_earnings',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'balance' => 'decimal:2',
            'age' => 'integer',
            'trust_score' => 'decimal:2',
            // OCEAN Model casts
            'openness' => 'decimal:2',
            'conscientiousness' => 'decimal:2',
            'extraversion' => 'decimal:2',
            'agreeableness' => 'decimal:2',
            'neuroticism' => 'decimal:2',
            // Game Statistics casts
            'total_matches_played' => 'integer',
            'times_cooperated' => 'integer',
            'times_defected' => 'integer',
            'times_betrayed' => 'integer',
            'average_earnings' => 'decimal:2',
        ];
    }
}
