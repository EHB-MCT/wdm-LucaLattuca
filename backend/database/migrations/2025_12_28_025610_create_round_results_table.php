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
        Schema::create('round_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('round_id')->constrained()->onDelete('cascade');
            $table->foreignId('game_player_id')->constrained()->onDelete('cascade');

            // Financial data for this specific round
            $table->decimal('invested_amount', 10, 2)->default(0.00); // What player invested this round
            $table->decimal('payout_amount', 10, 2)->default(0.00); // What player received this round
            $table->decimal('net_gain_loss', 10, 2)->default(0.00); // payout - invested for this round

            // Player actions
            $table->boolean('cooperated')->default(false); // True if chose "invest"
            $table->boolean('defected')->default(false); // True if chose "cash out"
            $table->boolean('was_betrayed')->default(false); // True if opponent defected while player cooperated

            // Contribution tracking (for fair split calculation)
            $table->decimal('contribution_percentage', 5, 2)->default(0.00); // Player's % contribution to total pot

            $table->timestamps();

            // Indexes
            $table->index(['round_id', 'game_player_id']);
            $table->index('cooperated');
            $table->index('defected');
            $table->index('was_betrayed');

            // Ensure one result per player per round
            $table->unique(['round_id', 'game_player_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('round_results');
    }
};

// sources
// created using claude Code (Sonnet 4.5)
// https://claude.ai/share/02e1bcfb-441b-4a92-b92e-565cd2c0d21f
