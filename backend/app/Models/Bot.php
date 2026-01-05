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

        // Strategic adjustments based on round number
        if ($round->round_number === 1) {
            // Round 1: Most bots cooperate to build the pot (unless very selfish)
            $cooperationProb += 30; // Strong incentive to cooperate early

        } elseif ($round->round_number === 2) {
            // Round 2: Moderate cooperation, some defection starts
            $cooperationProb += 10; // Small incentive to keep building pot

            // Selfish bots with low cooperation might defect here for medium pot
            if ($this->cooperation_tendency < 30 && rand(0, 100) < 40) {
                $cooperationProb -= 50; // 40% chance to defect in round 2 if selfish
            }

        } else { // Round 3
            // Round 3: High stakes, more likely to defect
            $cooperationProb -= 15; // Less likely to cooperate in final round

            // Very selfish bots are much more likely to cash out in final round
            if ($this->cooperation_tendency < 40) {
                $cooperationProb -= 25; // Strong defection incentive for selfish bots
            }
        }

        // Adjust based on agreeableness (nice bots cooperate more)
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
        $hesitationData = $this->simulateHesitation($willCooperate, $round->round_number);

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

        // Investment strategy based on round number
        if ($round->round_number === 1) {
            // Round 1: Start conservative (20-40% of max investment range)
            $riskFactor *= rand(20, 40) / 100;
        } elseif ($round->round_number === 2) {
            // Round 2: Increase investment (40-70% of max investment range)
            $riskFactor *= rand(40, 70) / 100;
        } else {
            // Round 3: Highest stakes (60-100% based on risk tolerance)
            $riskFactor *= rand(60, 100) / 100;
        }

        // Calculate investment
        $range = $maxInvestment - $minInvestment;
        $investment = $minInvestment + ($range * $riskFactor);

        // Round to nearest 100
        $investment = (float) round($investment / 100,0, PHP_ROUND_HALF_UP) * 100;

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

        return (float) round($decisionTime, 2, PHP_ROUND_HALF_DOWN);
    }

    /**
     * Simulate hesitation behavior.
     */
    private function simulateHesitation(bool $willCooperate, int $roundNumber): array
    {
        // Neurotic bots hesitate more
        $hesitationScore = $this->neuroticism;

        // Add more hesitation if making risky choice (cashing out)
        if (!$willCooperate) {
            $hesitationScore += 20;
        }

        // More hesitation in final round (high stakes)
        if ($roundNumber === 3) {
            $hesitationScore += 15;
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

// sources
// created using claude Code (Sonnet 4.5)
// https://claude.ai/share/02e1bcfb-441b-4a92-b92e-565cd2c0d21f
