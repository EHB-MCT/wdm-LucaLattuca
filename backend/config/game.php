<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Game Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration values for game mechanics and default behaviors.
    |
    */

    // Round settings
    'round_duration' => env('GAME_ROUND_DURATION', 5), // seconds
    'total_rounds' => 3,

    // Default investment settings
    'default_investment_amount' => env('GAME_DEFAULT_INVESTMENT', 100.00),
    'round_1_initial_investment' => 100.00, // Both players auto-invest $100 in round 1
    
    // Trust bonus percentages by round
    'trust_bonuses' => [
        1 => 20, // 20% bonus in round 1
        2 => 40, // 40% bonus in round 2
        3 => 60, // 60% bonus in round 3
    ],

    // Player settings
    'starting_balance' => env('GAME_STARTING_BALANCE', 1000.00),
    'minimum_investment' => 100.00,
    'maximum_investment' => 10000.00,

    // Trust score settings
    'trust_score_increase_cooperation' => 5.0, // Points gained when both invest
    'trust_score_decrease_defection' => 10.0, // Points lost when cashing out
    'trust_score_min' => 0.0,
    'trust_score_max' => 100.0,

    // Bot settings
    'bot_prefix' => 'Bot_',
    'bot_default_balance' => 10000.00,

];

// sources
// created using claude Code (Sonnet 4.5)
// https://claude.ai/share/02e1bcfb-441b-4a92-b92e-565cd2c0d21f
