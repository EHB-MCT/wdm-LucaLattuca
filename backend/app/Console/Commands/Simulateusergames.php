<?php

namespace App\Console\Commands;

use App\Services\UserSimulator;
use App\Models\User;
use Illuminate\Console\Command;

class SimulateUserGames extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'game:simulate-users 
                            {--users= : Number of users to simulate (default: all)}
                            {--games=20 : Number of games per user}
                            {--detailed-logs : Show detailed logs}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Simulate game history for users';

    private UserSimulator $userSimulator;

    public function __construct(UserSimulator $userSimulator)
    {
        parent::__construct();
        $this->userSimulator = $userSimulator;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $gamesPerUser = (int) $this->option('games');
        $showDetailedLogs = $this->option('detailed-logs');
        $userCount = $this->option('users');

        $this->info('Starting user game simulations...');
        $this->newLine();

        if ($userCount) {
            // Simulate for specific number of users
            $users = User::where('onboarding_completed', true)
                ->limit((int) $userCount)
                ->get();

            if ($users->isEmpty()) {
                $this->error('No users found. Run php artisan db:seed first.');
                return 1;
            }

            $this->info("Simulating {$gamesPerUser} games for {$users->count()} users...");
            
            $progressBar = $this->output->createProgressBar($users->count());
            $progressBar->start();

            foreach ($users as $user) {
                $this->userSimulator->simulateUserGames($user, $gamesPerUser, $showDetailedLogs);
                $progressBar->advance();
            }

            $progressBar->finish();
            $this->newLine(2);

        } else {
            // Simulate for all users
            $totalUsers = User::where('onboarding_completed', true)->count();

            if ($totalUsers === 0) {
                $this->error('No users found. Run php artisan db:seed first.');
                return 1;
            }

            $this->info("Simulating {$gamesPerUser} games for all {$totalUsers} users...");
            
            $this->userSimulator->simulateAllUsers($gamesPerUser, $showDetailedLogs);
        }

        $this->newLine();
        $this->info('✓ User game simulations completed successfully!');
        
        // Display statistics
        $this->displayStatistics();

        return 0;
    }

    /**
     * Display simulation statistics.
     */
    private function displayStatistics()
    {
        $this->newLine();
        $this->info('=== Simulation Statistics ===');

        $totalUsers = User::where('total_matches_played', '>', 0)->count();
        $totalGames = User::sum('total_matches_played');
        $avgCooperations = User::where('total_matches_played', '>', 0)->avg('times_cooperated');
        $avgDefections = User::where('total_matches_played', '>', 0)->avg('times_defected');
        $avgEarnings = User::where('total_matches_played', '>', 0)->avg('average_earnings');
        $avgTrustScore = User::where('total_matches_played', '>', 0)->avg('trust_score');

        $this->table(
            ['Metric', 'Value'],
            [
                ['Users with games', $totalUsers],
                ['Total games played', $totalGames],
                ['Avg cooperations per user', round($avgCooperations, 2)],
                ['Avg defections per user', round($avgDefections, 2)],
                ['Avg earnings per user', '$' . round($avgEarnings, 2)],
                ['Avg trust score', round($avgTrustScore, 2)],
            ]
        );
    }
}

// Sources
// Created using Claude (Sonnet 4.5)