<?php

namespace Tests\Feature;

use App\Models\Bot;
use App\Models\Game;
use App\Models\GamePlayer;
use App\Models\Round;
use App\Models\RoundResult;
use App\Models\RoundStat;
use App\Services\GameSimulator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GameSimulationTest extends TestCase
{
    use RefreshDatabase;

    private GameSimulator $simulator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->simulator = app(GameSimulator::class);
        $this->seed(\Database\Seeders\BotSeeder::class);
    }

    /** @test */
    public function it_can_seed_bot_personalities()
    {
        $bots = Bot::all();

        $this->assertGreaterThanOrEqual(5, $bots->count());
        $this->assertTrue($bots->contains('name', 'Cooperative_Carl'));
        $this->assertTrue($bots->contains('name', 'Selfish_Steve'));
    }

    /** @test */
    public function it_can_simulate_a_complete_game()
    {
        $game = $this->simulator->simulateGame();

        $this->assertNotNull($game);
        $this->assertEquals('completed', $game->status);
        $this->assertEquals(3, $game->total_rounds);
        $this->assertTrue($game->has_bot);
    }

    /** @test */
    public function it_creates_game_players_correctly()
    {
        $game = $this->simulator->simulateGame();

        $gamePlayers = $game->gamePlayers;

        $this->assertCount(2, $gamePlayers);
        $this->assertTrue($gamePlayers[0]->is_bot);
        $this->assertTrue($gamePlayers[1]->is_bot);
        $this->assertNotNull($gamePlayers[0]->bot_personality);
        $this->assertNotNull($gamePlayers[1]->bot_personality);
    }

    /** @test */
    public function it_creates_three_rounds_per_game()
    {
        $game = $this->simulator->simulateGame();

        $rounds = $game->rounds;

        $this->assertCount(3, $rounds);
        $this->assertEquals(1, $rounds[0]->round_number);
        $this->assertEquals(2, $rounds[1]->round_number);
        $this->assertEquals(3, $rounds[2]->round_number);
    }

    /** @test */
    public function it_tracks_player_investments_in_each_round()
    {
        $game = $this->simulator->simulateGame();

        foreach ($game->rounds as $round) {
            $this->assertGreaterThan(0, $round->player1_invested);
            $this->assertGreaterThan(0, $round->player2_invested);
            $this->assertNotNull($round->player1_choice);
            $this->assertNotNull($round->player2_choice);
        }
    }

    /** @test */
    public function it_creates_round_stats_for_each_player()
    {
        $game = $this->simulator->simulateGame();

        $roundStats = RoundStat::whereIn('round_id', $game->rounds->pluck('id'))->get();

        // Should be 2 stats per round (one for each player)
        $this->assertCount(6, $roundStats);

        foreach ($roundStats as $stat) {
            $this->assertNotNull($stat->final_choice);
            $this->assertNotNull($stat->time_to_first_choice);
            $this->assertGreaterThanOrEqual(0, $stat->number_of_toggles);
        }
    }

    /** @test */
    public function it_creates_round_results_for_each_player()
    {
        $game = $this->simulator->simulateGame();

        $roundResults = RoundResult::whereIn('round_id', $game->rounds->pluck('id'))->get();

        // Should be 2 results per round
        $this->assertCount(6, $roundResults);

        foreach ($roundResults as $result) {
            $this->assertNotNull($result->invested_amount);
            $this->assertNotNull($result->payout_amount);
            $this->assertNotNull($result->net_gain_loss);
        }
    }

    /** @test */
    public function it_applies_trust_bonus_when_both_invest()
    {
        // Run multiple simulations to find a cooperative round
        $cooperativeRound = null;

        for ($i = 0; $i < 10; $i++) {
            $game = $this->simulator->simulateGame();
            $round = $game->rounds->where('both_invested', true)->first();

            if ($round) {
                $cooperativeRound = $round;
                break;
            }
        }

        if ($cooperativeRound) {
            $this->assertTrue($cooperativeRound->both_invested);
            $this->assertGreaterThan(0, $cooperativeRound->trust_bonus_percentage);
            $this->assertGreaterThan($cooperativeRound->pot_before_bonus, $cooperativeRound->pot_after_bonus);
        } else {
            $this->markTestSkipped('No cooperative rounds found in 10 simulations');
        }
    }

    /** @test */
    public function it_handles_betrayal_scenario_correctly()
    {
        // Run multiple simulations to find a betrayal
        $betrayalRound = null;

        for ($i = 0; $i < 10; $i++) {
            $game = $this->simulator->simulateGame();
            $round = $game->rounds->where('someone_cashed_out', true)->first();

            if ($round) {
                $betrayalRound = $round;
                break;
            }
        }

        if ($betrayalRound) {
            $this->assertTrue($betrayalRound->someone_cashed_out);
            $this->assertEquals(0, $betrayalRound->trust_bonus_percentage);

            // Find the betrayed player
            $roundResults = RoundResult::where('round_id', $betrayalRound->id)->get();
            $betrayedPlayer = $roundResults->where('was_betrayed', true)->first();
            $defector = $roundResults->where('defected', true)->first();

            if ($betrayedPlayer && $defector) {
                $this->assertEquals(0, $betrayedPlayer->payout_amount);
                $this->assertLessThan(0, $betrayedPlayer->net_gain_loss);
                $this->assertGreaterThan(0, $defector->payout_amount);
            }
        } else {
            $this->markTestSkipped('No betrayal rounds found in 10 simulations');
        }
    }

    /** @test */
    public function it_can_simulate_multiple_games()
    {
        $results = $this->simulator->simulateMultipleGames(5, false);

        $this->assertCount(5, $results);

        foreach ($results as $result) {
            $this->assertEquals('completed', $result['status']);
            $this->assertNotNull($result['game_id']);
        }
    }

    /** @test */
    public function it_generates_simulation_statistics()
    {
        $this->simulator->simulateMultipleGames(10, false);

        $stats = $this->simulator->getSimulationStats();

        $this->assertArrayHasKey('total_games', $stats);
        $this->assertArrayHasKey('completed_games', $stats);
        $this->assertArrayHasKey('cooperation_rate', $stats);
        $this->assertArrayHasKey('betrayal_rate', $stats);
        $this->assertArrayHasKey('average_earnings', $stats);

        $this->assertEquals(10, $stats['total_games']);
    }

    /** @test */
    public function cooperative_bot_cooperates_more_often()
    {
        $cooperativeBot = Bot::where('name', 'Cooperative_Carl')->first();
        $selfishBot = Bot::where('name', 'Selfish_Steve')->first();

        // Simulate 5 games with cooperative bot
        $cooperations = 0;
        for ($i = 0; $i < 5; $i++) {
            $game = $this->simulator->simulateGame($cooperativeBot, $selfishBot, false);
            $player = $game->gamePlayers->where('player_number', 1)->first();
            $results = RoundResult::where('game_player_id', $player->id)->get();
            $cooperations += $results->where('cooperated', true)->count();
        }

        // Cooperative Carl should cooperate in majority of rounds
        $this->assertGreaterThan(7, $cooperations); // More than half of 15 rounds
    }
}

// sources
// created using claude Code (Sonnet 4.5)
// https://claude.ai/share/02e1bcfb-441b-4a92-b92e-565cd2c0d21f
