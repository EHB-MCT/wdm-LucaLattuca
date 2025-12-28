# Quick Setup Guide

## Initial Setup

### 1. Database Configuration
Make sure your `.env` file has PostgreSQL configured:
```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=your_database_name
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

### 2. Run Migrations
```bash
php artisan migrate
```

This creates all the necessary tables:
- users
- bots
- games
- game_players
- rounds
- round_stats
- round_results

### 3. Seed Bot Personalities
```bash
php artisan db:seed --class=BotSeeder
```

Or seed everything at once:
```bash
php artisan migrate:fresh --seed
```

### 4. Verify Setup
```bash
php artisan tinker
>>> \App\Models\Bot::count()
=> 5
>>> \App\Models\Bot::pluck('name')
=> [
     "Cooperative_Carl",
     "Selfish_Steve",
     "Cautious_Cathy",
     "Random_Randy",
     "Trustworthy_Tina",
   ]
```

## Test the Simulator

### Quick Test
```bash
php artisan game:simulate --verbose
```

### Run Multiple Games
```bash
php artisan game:simulate --count=10 --stats
```

### Run Tests
```bash
php artisan test tests/Feature/GameSimulationTest.php
```

## Common Commands

```bash
# Fresh start (WARNING: deletes all data)
php artisan migrate:fresh --seed

# Just seed bots
php artisan db:seed --class=BotSeeder

# Simulate 1 game with details
php artisan game:simulate --verbose

# Simulate 100 games and show stats
php artisan game:simulate --count=100 --stats

# Run tests
php artisan test

# Check database
php artisan tinker
```

## Troubleshooting

### "Class 'BotSeeder' not found"
Make sure the seeder file is at: `database/seeders/BotSeeder.php`

Run:
```bash
composer dump-autoload
```

### Migration errors
```bash
# Drop all tables and start fresh
php artisan migrate:fresh

# Then seed
php artisan db:seed --class=BotSeeder
```

### Type errors with round()
Make sure you're on PHP 8.0+ and all the fixes have been applied. The `round()` function should return float values explicitly cast with `(float)`.

## Next Steps

Once setup is complete, see `SIMULATION_GUIDE.md` for:
- How to run different simulation scenarios
- How to analyze collected data
- How to create custom bot personalities
- Advanced testing strategies


[//]: # (// sources)
[//]: # (// documentation created using claude Code (Sonnet 4.5)
[//]: # (// https://claude.ai/share/02e1bcfb-441b-4a92-b92e-565cd2c0d21f)

