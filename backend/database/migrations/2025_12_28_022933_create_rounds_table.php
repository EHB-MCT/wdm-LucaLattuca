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
        Schema::create('rounds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_id')->constrained()->onDelete('cascade');
            $table->tinyInteger('round_number'); // 1, 2, or 3

            // Pot tracking
            $table->decimal('pot_before_bonus', 10, 2)->default(0.00);
            $table->tinyInteger('trust_bonus_percentage')->default(0); // 0, 20, 40, or 60
            $table->decimal('pot_after_bonus', 10, 2)->default(0.00);

            // Player investments
            $table->decimal('player1_invested', 10, 2)->default(0.00);
            $table->decimal('player2_invested', 10, 2)->default(0.00);

            // Player choices
            $table->enum('player1_choice', ['invest', 'cash_out'])->nullable();
            $table->enum('player2_choice', ['invest', 'cash_out'])->nullable();

            // Round outcome
            $table->boolean('both_invested')->default(false);
            $table->boolean('someone_cashed_out')->default(false);

            // Timing
            $table->integer('round_duration')->nullable(); // In seconds (max 30)
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();

            $table->timestamps();

            // Indexes
            $table->index(['game_id', 'round_number']);
            $table->unique(['game_id', 'round_number']); // Only one round per number per game
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rounds');
    }
};
