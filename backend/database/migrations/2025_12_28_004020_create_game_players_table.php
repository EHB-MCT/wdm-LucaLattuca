<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('game_players', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->tinyInteger('player_number'); // 1 or 2
            $table->boolean('is_bot')->default(false);
            $table->json('bot_personality')->nullable(); // OCEAN traits if bot
            $table->decimal('total_invested', 10, 2)->default(0.00); // Total $ invested across all rounds
            $table->decimal('final_earnings', 10, 2)->default(0.00); // Final payout received
            $table->decimal('net_result', 10, 2)->default(0.00); // final_earnings - total_invested
            $table->boolean('was_betrayed')->default(false); // True if opponent cashed out while this player invested
            $table->timestamps();

            // Indexes
            $table->index(['game_id', 'player_number']);
            $table->index('user_id');
            $table->index('was_betrayed');

            // Ensure only 2 players per game
            $table->unique(['game_id', 'player_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('game_players');
    }
};
