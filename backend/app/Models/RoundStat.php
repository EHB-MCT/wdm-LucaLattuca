<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;


class RoundStat extends Model
{
    use HasFactory;

    protected $fillable = [
        'round_id',
        'game_player_id',
        'interactions',
        'clicked_on_flag',
        'clicked_on_info',
        'amount_changes_count',
        'total_amount_changed',
        'showed_hesitation',
        'hesitation_count',
        'time_to_first_action_ms',
        'time_to_final_decision_ms',
        'total_interaction_time_ms',
        'screen_taps_count',
        'info_views_count',
        'opponent_profile_views',
    ];

    protected $casts = [
        'interactions' => 'array',
        'clicked_on_flag' => 'boolean',
        'clicked_on_info' => 'boolean',
        'amount_changes_count' => 'integer',
        'total_amount_changed' => 'integer',
        'showed_hesitation' => 'boolean',
        'hesitation_count' => 'integer',
        'time_to_first_action_ms' => 'integer',
        'time_to_final_decision_ms' => 'integer',
        'total_interaction_time_ms' => 'integer',
        'screen_taps_count' => 'integer',
        'info_views_count' => 'integer',
        'opponent_profile_views' => 'integer',
    ];

    public function round()
    {
        return $this->belongsTo(Round::class);
    }

    public function gamePlayer()
    {
        return $this->belongsTo(GamePlayer::class);
    }

    /**
     * Add an interaction event
     */
    public function addInteraction(array $interaction): void
    {
        $interactions = $this->interactions ?? [];
        $interactions[] = $interaction;
        $this->update(['interactions' => $interactions]);
    }

    /**
     * Calculate behavioral metrics from interactions
     */
    public function calculateMetrics(): void
    {
        if (empty($this->interactions)) {
            return;
        }

        $interactions = $this->interactions;

        // Find first and last action times
        $firstAction = $interactions[0]['started_at_ms'] ?? 0;
        $lastAction = end($interactions)['ended_at_ms'] ?? 0;

        // Count hesitations (switches between cooperate/defect)
        $hesitationCount = 0;
        $cooperateDefectSwitches = array_filter($interactions, function($i) {
            return in_array($i['action'] ?? '', ['INVEST', 'CASH_OUT']);
        });

        if (count($cooperateDefectSwitches) > 1) {
            $hesitationCount = count($cooperateDefectSwitches) - 1;
        }

        // Count amount changes
        $amountChanges = array_filter($interactions, function($i) {
            return ($i['action'] ?? '') === 'CHANGE_AMOUNT';
        });

        $this->update([
            'time_to_first_action_ms' => $firstAction,
            'time_to_final_decision_ms' => $lastAction,
            'total_interaction_time_ms' => $lastAction - $firstAction,
            'hesitation_count' => $hesitationCount,
            'showed_hesitation' => $hesitationCount > 0,
            'amount_changes_count' => count($amountChanges),
        ]);
    }

    /**
     * Analyze behavior patterns
     */
    public function getBehaviorPattern(): string
    {
        if ($this->time_to_final_decision_ms < 3000) {
            return 'impulsive';
        } elseif ($this->hesitation_count > 3) {
            return 'indecisive';
        } elseif ($this->opponent_profile_views > 2) {
            return 'analytical';
        } elseif ($this->time_to_final_decision_ms > 20000) {
            return 'cautious';
        }

        return 'balanced';
    }
}

//sources
// user model generated using claude (sonnet 4.5)
// https://claude.ai/share/fdba5ca3-50f7-42ba-a0ab-98387b5a4fcc
