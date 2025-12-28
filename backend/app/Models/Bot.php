<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use PHPUnit\Event\Runtime\PHP;

class Bot extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'personality_type',
        'openness',
        'conscientiousness',
        'extraversion',
        'agreeableness',
        'neuroticism',
        'cooperation_tendency',
        'risk_tolerance',
        'is_active',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'openness' => 'decimal:2',
            'conscientiousness' => 'decimal:2',
            'extraversion' => 'decimal:2',
            'agreeableness' => 'decimal:2',
            'neuroticism' => 'decimal:2',
            'cooperation_tendency' => 'decimal:2', // 0-100: likelihood to cooperate
            'risk_tolerance' => 'decimal:2', // 0-100: willingness to take risks
            'is_active' => 'boolean',
        ];
    }

    /**
     * Get OCEAN traits as array.
     */
    public function getOceanTraits(): array
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
     * Determine bot's decision based on personality and game state.
     */
    public function makeDecision(Round $round, GamePlayer $gamePlayer): array
    {
        // Base cooperation probability on personality
        $cooperationProb = $this->cooperation_tendency;

        // Adjust based on round number (higher stakes = more cautious)
        if ($round->round_number === 3) {
            $cooperationProb -= 15; // Less likely to cooperate in final round
        }

        // Adjust based on agreeableness
        $cooperationProb += ($this->agreeableness - 50) * 0.3;

        // Adjust based on neuroticism (anxious bots are less trusting)
        $cooperationProb -= ($this->neuroticism - 50) * 0.2;

        // Clamp between 0-100
        $cooperationProb = max(0, min(100, $cooperationProb));

        // Make decision
        $willCooperate = (rand(0, 100) <= $cooperationProb);
        $choice = $willCooperate ? 'invest' : 'cash_out';

        // Determine investment amount if cooperating
        $investmentAmount = $this->determineInvestmentAmount($round, $gamePlayer);

        // Simulate decision timing based on personality
        $decisionTime = $this->simulateDecisionTiming();

        // Simulate hesitation
        $hesitationData = $this->simulateHesitation($willCooperate);

        return [
            'choice' => $choice,
            'investment_amount' => $investmentAmount,
            'decision_time' => $decisionTime,
            'hesitation_data' => $hesitationData,
        ];
    }

    /**
     * Determine investment amount based on risk tolerance and round.
     */
    private function determineInvestmentAmount(Round $round, GamePlayer $gamePlayer): float
    {
        $minInvestment = config('game.minimum_investment', 100);
        $maxInvestment = config('game.maximum_investment', 5000);

        // Base investment on risk tolerance
        $riskFactor = $this->risk_tolerance / 100;

        // Conservative bots invest less in early rounds
        if ($round->round_number === 1) {
            $riskFactor *= 0.5;
        } elseif ($round->round_number === 2) {
            $riskFactor *= 0.75;
        }

        // Calculate investment
        $range = $maxInvestment - $minInvestment;
        $investment = $minInvestment + ($range * $riskFactor);

        // Add some randomness (±20%)
        $randomFactor = rand(80, 120) / 100;
        $investment *= $randomFactor;

        // Round to nearest 100
        $investment = round($investment / 100, 0 , PHP_ROUND_HALF_UP) * 100;

        return max($minInvestment, min($maxInvestment, $investment));
    }

    /**
     * Simulate decision timing based on conscientiousness and neuroticism.
     */
    private function simulateDecisionTiming(): float
    {
        // Conscientious bots think longer
        $baseTime = 5 + (($this->conscientiousness / 100) * 10);

        // Neurotic bots are more hesitant
        $baseTime += (($this->neuroticism / 100) * 5);

        // Add randomness
        $randomFactor = rand(70, 130) / 100;
        $decisionTime = $baseTime * $randomFactor;

        return round($decisionTime, 2, PHP_ROUND_HALF_DOWN);
    }

    /**
     * Simulate hesitation behavior.
     */
    private function simulateHesitation(bool $willCooperate): array
    {
        // Neurotic bots hesitate more
        $hesitationScore = $this->neuroticism;

        // Add more hesitation if making risky choice
        if (!$willCooperate) {
            $hesitationScore += 20;
        }

        // Clamp
        $hesitationScore = min(100, $hesitationScore);

        // Determine number of toggles based on hesitation
        $numToggles = 0;
        if ($hesitationScore > 70) {
            $numToggles = rand(3, 7);
        } elseif ($hesitationScore > 40) {
            $numToggles = rand(1, 3);
        }

        return [
            'hesitation_detected' => $hesitationScore > 30,
            'hesitation_score' => $hesitationScore,
            'number_of_toggles' => $numToggles,
            'changed_choice' => $numToggles > 0,
        ];
    }
}
