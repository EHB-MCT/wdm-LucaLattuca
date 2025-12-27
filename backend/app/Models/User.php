<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens; // For API authentication

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

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
        'openness',
        'conscientiousness',
        'extraversion',
        'agreeableness',
        'neuroticism',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'age' => 'integer',
        'balance' => 'integer',
        'trust_score' => 'integer',
        'openness' => 'integer',
        'conscientiousness' => 'integer',
        'extraversion' => 'integer',
        'agreeableness' => 'integer',
        'neuroticism' => 'integer',
        'total_matches_played' => 'integer',
        'total_rounds_played' => 'integer',
        'times_cooperated' => 'integer',
        'times_defected' => 'integer',
        'times_betrayed' => 'integer',
        'total_earnings' => 'integer',
    ];

    /**
     * Relationships
     */
    public function matchPlayers()
    {
        return $this->hasMany(MatchPlayer::class);
    }

    public function matches()
    {
        return $this->hasManyThrough(GameMatch::class, GameMatchPlayer::class, 'user_id', 'id', 'id', 'match_id');
    }

    /**
     * Accessor for OCEAN personality profile
     */
    public function getOceanProfileAttribute(): array
    {
        return [
            'openness' => $this->openness,
            'conscientiousness' => $this->conscientiousness,
            'extraversion' => $this->extraversion,
            'agreeableness' => $this->agreeableness,
            'neuroticism' => $this->neuroticism,
        ];
    }

    /**
     * Accessor for trust profile (including OCEAN)
     */
    public function getTrustProfileAttribute(): array
    {
        return [
            'trust_score' => $this->trust_score,
            'ocean_model' => $this->ocean_profile,
        ];
    }

    /**
     * Calculate cooperation rate (%)
     */
    public function getCooperationRateAttribute(): float
    {
        $totalDecisions = $this->times_cooperated + $this->times_defected;
        if ($totalDecisions === 0) return 0;

        return ($this->times_cooperated / $totalDecisions) * 100;
    }

    /**
     * Calculate betrayal rate (%) - times betrayed / times cooperated
     */
    public function getBetrayalRateAttribute(): float
    {
        if ($this->times_cooperated === 0) return 0;

        return ($this->times_betrayed / $this->times_cooperated) * 100;
    }

    /**
     * Update OCEAN personality based on game behavior
     * Called after each match to adjust personality scores
     */
    public function updatePersonalityFromBehavior(array $behaviorData): void
    {
        // Example: If user cooperated a lot, increase agreeableness slightly
        if ($behaviorData['cooperation_rate'] > 70) {
            $this->agreeableness = min(100, $this->agreeableness + 1);
        }

        // If user showed hesitation, increase neuroticism
        if ($behaviorData['hesitation_count'] > 5) {
            $this->neuroticism = min(100, $this->neuroticism + 1);
        }

        // If user made quick, consistent decisions, increase conscientiousness
        if ($behaviorData['avg_decision_time'] < 5000 && $behaviorData['hesitation_count'] < 2) {
            $this->conscientiousness = min(100, $this->conscientiousness + 1);
        }

        $this->save();
    }

    /**
     * Update trust score based on game outcomes
     */
    public function updateTrustScore(): void
    {
        // Simple algorithm: cooperation rate influences trust score
        $cooperationRate = $this->cooperation_rate;
        $betrayalRate = $this->betrayal_rate;

        // High cooperation + low betrayal = high trust
        $newScore = ($cooperationRate * 0.7) + ((100 - $betrayalRate) * 0.3);

        $this->trust_score = (int) max(0, min(100, $newScore));
        $this->save();
    }

    /**
     * Get user statistics for profile display
     */
    public function getStatistics(): array
    {
        return [
            'total_matches' => $this->total_matches_played,
            'total_rounds' => $this->total_rounds_played,
            'cooperation_rate' => round($this->cooperation_rate, 1),
            'times_cooperated' => $this->times_cooperated,
            'times_defected' => $this->times_defected,
            'times_betrayed' => $this->times_betrayed,
            'betrayal_rate' => round($this->betrayal_rate, 1),
            'total_earnings' => $this->total_earnings,
            'avg_earnings_per_match' => $this->total_matches_played > 0
                ? round($this->total_earnings / $this->total_matches_played, 2)
                : 0,
        ];
    }
}

//sources
// model generated using claude (sonnet 4.5)
// https://claude.ai/share/fdba5ca3-50f7-42ba-a0ab-98387b5a4fcc

