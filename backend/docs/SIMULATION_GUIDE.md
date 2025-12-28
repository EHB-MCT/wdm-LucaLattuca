# Game Simulation Guide

## Overview
The game simulation system allows you to test the entire game flow using bots with different personalities. This helps collect data, test edge cases, and validate game mechanics without requiring real users.

## Setup

### 1. Run Migrations
```bash
php artisan migrate
```

### 2. Seed Bot Personalities
```bash
php artisan db:seed --class=BotSeeder
```

Or seed everything:
```bash
php artisan db:seed
```

This creates 5 bots with distinct personalities:
- **Cooperative_Carl**: High agreeableness, cooperates 85% of the time
- **Selfish_Steve**: Low agreeableness, only cooperates 15% of the time
- **Cautious_Cathy**: High neuroticism, hesitates a lot
- **Random_Randy**: Unpredictable behavior
- **Trustworthy_Tina**: Almost always cooperates (95%)

## Running Simulations

### Simulate a Single Game
```bash
php artisan game:simulate
```

### Simulate Multiple Games
```bash
php artisan game:simulate --count=10
```

### Verbose Mode (See Detailed Output)
```bash
php artisan game:simulate --count=1 --verbose
```

### With Statistics
```bash
php artisan game:simulate --count=50 --stats
```

### All Options Combined
```bash
php artisan game:simulate --count=100 --verbose --stats --seed-bots
```

## Running Tests

```bash
php artisan test tests/Feature/GameSimulationTest.php
```

Or specific tests:
```bash
php artisan test --filter it_can_simulate_a_complete_game
```

## What Gets Simulated

### Game Structure
- ✅ Game creation with status tracking
- ✅ Two bot players with OCEAN personalities
- ✅ Three rounds per game
- ✅ Round timing (30 seconds per round)

### Player Behavior
- ✅ Investment amount decisions (based on risk tolerance)
- ✅ Invest vs cash out choices (based on cooperation tendency)
- ✅ Decision timing (based on conscientiousness)
- ✅ Hesitation patterns (based on neuroticism)
- ✅ Choice toggles (simulated indecision)

### Financial Calculations
- ✅ Pot accumulation across rounds
- ✅ Trust bonus application (20%, 40%, 60%)
- ✅ Fair split calculations for cooperation
- ✅ Betrayal payouts (winner takes all)
- ✅ Net gain/loss tracking

### Data Collection
- ✅ Round statistics (timing, hesitation, toggles)
- ✅ Round results (investments, payouts, outcomes)
- ✅ Game player totals (total invested, earnings, net result)
- ✅ Betrayal tracking

## Example Output

### Verbose Mode
```
=== Starting Simulation: Cooperative_Carl vs Selfish_Steve ===
--- Round 1 ---
Cooperative_Carl: invest ($400)
Selfish_Steve: invest ($200)
Pot before bonus: $600
Trust bonus: 20%
Pot after bonus: $720

--- Round 2 ---
Cooperative_Carl: invest ($500)
Selfish_Steve: invest ($300)
Pot before bonus: $1520
Trust bonus: 40%
Pot after bonus: $2128

--- Round 3 ---
Cooperative_Carl: invest ($600)
Selfish_Steve: cash_out ($100)
Pot before bonus: $2828
Trust bonus: 0%
Pot after bonus: $2828

=== Game Complete ===
Cooperative_Carl: Invested $1500, Earned $0, Net: -$1500
Selfish_Steve: Invested $600, Earned $2828, Net: $2228
====================
```

### Statistics Output
```
📊 Simulation Statistics:
+-------------------+----------+
| Metric            | Value    |
+-------------------+----------+
| Total Games       | 50       |
| Completed Games   | 50       |
| Total Rounds      | 150      |
| Cooperation Rate  | 64.67%   |
| Betrayal Rate     | 35.33%   |
| Avg Earnings      | $234.56  |
+-------------------+----------+
```

## Database Inspection

After running simulations, you can inspect the data:

```bash
# Check games
php artisan tinker
>>> Game::count()
>>> Game::latest()->first()->toArray()

# Check rounds
>>> Round::where('both_invested', true)->count()
>>> Round::where('someone_cashed_out', true)->count()

# Check round stats
>>> RoundStat::where('hesitation_detected', true)->count()
>>> RoundStat::avg('time_to_first_choice')

# Check round results
>>> RoundResult::where('was_betrayed', true)->count()
>>> RoundResult::avg('net_gain_loss')
```

## Analyzing Bot Behavior

```php
// Find all games where Cooperative_Carl played
$carl = Bot::where('name', 'Cooperative_Carl')->first();
$carlGames = GamePlayer::where('bot_personality->agreeableness', $carl->agreeableness)->get();

// Calculate cooperation rate
$cooperations = RoundResult::whereIn('game_player_id', $carlGames->pluck('id'))
    ->where('cooperated', true)
    ->count();
    
$totalRounds = RoundResult::whereIn('game_player_id', $carlGames->pluck('id'))->count();
$cooperationRate = ($cooperations / $totalRounds) * 100;
```

## Testing Specific Scenarios

### Test Mutual Cooperation
```php
use App\Services\GameSimulator;

$simulator = app(GameSimulator::class);
$carl = Bot::where('name', 'Cooperative_Carl')->first();
$tina = Bot::where('name', 'Trustworthy_Tina')->first();

$game = $simulator->simulateGame($carl, $tina, true);
// Both bots cooperate frequently, observe trust bonus effects
```

### Test Betrayal Scenario
```php
$steve = Bot::where('name', 'Selfish_Steve')->first();
$carl = Bot::where('name', 'Cooperative_Carl')->first();

$game = $simulator->simulateGame($steve, $carl, true);
// Steve will likely betray Carl in final round
```

## Next Steps

1. **Collect baseline data**: Run 100+ simulations to establish patterns
2. **Analyze OCEAN correlations**: Study how personality traits affect outcomes
3. **Test edge cases**: Modify bot personalities to test extreme scenarios
4. **Prepare for real users**: Use simulation data to set initial trust scores
5. **Tune game balance**: Adjust trust bonuses or investment limits based on data

## Troubleshooting

**Error: "Not enough bots available"**
- Run: `php artisan db:seed --class=BotSeeder`

**Database errors**
- Run: `php artisan migrate:fresh --seed`

**Performance issues with large simulations**
- Use `--no-verbose` for faster execution
- Run simulations in batches: `--count=100` multiple times

## Configuration

Edit `config/game.php` to adjust:
- Default investment amounts
- Trust bonus percentages
- Round duration
- Trust score adjustments

[//]: # (// sources)
[//]: # (// documentation created using claude Code (Sonnet 4.5)
[//]: # (// https://claude.ai/share/02e1bcfb-441b-4a92-b92e-565cd2c0d21f)
