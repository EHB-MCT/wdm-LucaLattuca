<?php

namespace Database\Seeders;

use App\Models\Bot;
use Illuminate\Database\Seeder;

class BotSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $botPersonalities = [
            [
                'name' => 'Cooperative_Carl',
                'personality_type' => 'cooperative',
                'openness' => 70,
                'conscientiousness' => 80,
                'extraversion' => 60,
                'agreeableness' => 90,
                'neuroticism' => 30,
                'cooperation_tendency' => 85,
                'risk_tolerance' => 40,
            ],
            [
                'name' => 'Selfish_Steve',
                'personality_type' => 'selfish',
                'openness' => 50,
                'conscientiousness' => 40,
                'extraversion' => 70,
                'agreeableness' => 20,
                'neuroticism' => 50,
                'cooperation_tendency' => 15,
                'risk_tolerance' => 80,
            ],
            [
                'name' => 'Cautious_Cathy',
                'personality_type' => 'cautious',
                'openness' => 40,
                'conscientiousness' => 90,
                'extraversion' => 30,
                'agreeableness' => 70,
                'neuroticism' => 75,
                'cooperation_tendency' => 60,
                'risk_tolerance' => 25,
            ],
            [
                'name' => 'Random_Randy',
                'personality_type' => 'unpredictable',
                'openness' => 80,
                'conscientiousness' => 50,
                'extraversion' => 85,
                'agreeableness' => 50,
                'neuroticism' => 60,
                'cooperation_tendency' => 50,
                'risk_tolerance' => 70,
            ],
            [
                'name' => 'Trustworthy_Tina',
                'personality_type' => 'trustworthy',
                'openness' => 75,
                'conscientiousness' => 95,
                'extraversion' => 55,
                'agreeableness' => 95,
                'neuroticism' => 20,
                'cooperation_tendency' => 95,
                'risk_tolerance' => 50,
            ],
        ];

        foreach ($botPersonalities as $personality) {
            Bot::updateOrCreate(
                ['name' => $personality['name']],
                $personality
            );
        }

        $this->command->info('Seeded ' . count($botPersonalities) . ' bot personalities');
    }
}

// sources
// created using claude Code (Sonnet 4.5)
// https://claude.ai/share/02e1bcfb-441b-4a92-b92e-565cd2c0d21f
