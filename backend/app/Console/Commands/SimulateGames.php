<?php

namespace App\Console\Commands;

use App\Services\GameSimulator;
use Illuminate\Console\Command;

class SimulateGames extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'game:simulate
                            {--count=1 : Number of games to simulate}
                            {--detailed : Show detailed game output}
                            {--seed-bots : Seed bot personalities first}
                            {--stats : Show statistics after simulation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Simulate bot vs bot games for testing';

    /**
     * Execute the console command.
     */
    public function handle(GameSimulator $simulator): int
    {
        $this->info('🤖 Game Simulation Tool');
        $this->newLine();

        // Seed bots if requested
        if ($this->option('seed-bots')) {
            $this->info('Seeding bot personalities...');
            $this->call('db:seed', ['--class' => 'BotSeeder']);
            $this->info('✓ Bots seeded successfully');
            $this->newLine();
        }

        // Get simulation parameters
        $count = (int) $this->option('count');
        $detailed = $this->option('detailed');

        // Confirm simulation
        if ($count > 20 && !$this->confirm("You're about to simulate {$count} games. Continue?")) {
            $this->info('Simulation cancelled.');
            return 0;
        }

        // Run simulation
        $this->info("Simulating {$count} game(s)...");
        $this->newLine();

        $progressBar = $this->output->createProgressBar($count);
        $progressBar->start();

        $results = [];
        for ($i = 0; $i < $count; $i++) {
            try {
                $game = $simulator->simulateGame(null, null, $detailed);
                $results[] = ['status' => 'success', 'game_id' => $game->id];
            } catch (\Exception $e) {
                $results[] = ['status' => 'failed', 'error' => $e->getMessage()];
            }
            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);

        // Summary
        $successful = collect($results)->where('status', 'success')->count();
        $failed = collect($results)->where('status', 'failed')->count();

        $this->info("✓ Simulation complete!");
        $this->table(
            ['Metric', 'Value'],
            [
                ['Total Games', $count],
                ['Successful', $successful],
                ['Failed', $failed],
            ]
        );

        // Show statistics if requested
        if ($this->option('stats')) {
            $this->newLine();
            $this->info('📊 Simulation Statistics:');
            $stats = $simulator->getSimulationStats();

            $this->table(
                ['Metric', 'Value'],
                [
                    ['Total Games', $stats['total_games']],
                    ['Completed Games', $stats['completed_games']],
                    ['Total Rounds', $stats['total_rounds']],
                    ['Cooperation Rate', $stats['cooperation_rate'] . '%'],
                    ['Betrayal Rate', $stats['betrayal_rate'] . '%'],
                    ['Avg Earnings', '$' . number_format($stats['average_earnings'], 2)],
                ]
            );
        }

        $this->newLine();
        $this->info('💡 Tip: Use --detailed to see detailed game flow');
        $this->info('💡 Tip: Use --stats to see statistics after simulation');

        return 0;
    }
}

// sources
// created using claude Code (Sonnet 4.5)
// https://claude.ai/share/02e1bcfb-441b-4a92-b92e-565cd2c0d21f
