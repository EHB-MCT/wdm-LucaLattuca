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
        Schema::create('round_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('round_id')->constrained()->onDelete('cascade');
            $table->foreignId('game_player_id')->constrained()->onDelete('cascade');

            // Choice tracking
            $table->enum('initial_choice', ['invest', 'cash_out'])->nullable();
            $table->enum('final_choice', ['invest', 'cash_out'])->nullable();
            $table->boolean('choice_changed')->default(false);
            $table->boolean('made_decision')->default(true); // False if player didn't interact
            $table->boolean('defaulted_to_invest')->default(false); // True if auto-invested due to timeout

            // Timing data (in seconds)
            $table->decimal('time_to_first_choice', 8, 2)->nullable(); // How long until first button press
            $table->decimal('time_on_invest', 8, 2)->default(0.00); // Total time spent with "invest" selected
            $table->decimal('time_on_cash_out', 8, 2)->default(0.00); // Total time spent with "cash out" selected

            // Behavioral data
            $table->integer('number_of_toggles')->default(0); // How many times they switched choices
            $table->boolean('hesitation_detected')->default(false);
            $table->decimal('hesitation_score', 5, 2)->default(0.00); // 0-100 scale

            // Lock timestamp
            $table->timestamp('choice_locked_at')->nullable(); // When they made final decision

            // Device information
            $table->json('device_info')->nullable(); // Store device type, OS, screen size, etc.

            $table->timestamps();

            // Indexes
            $table->index(['round_id', 'game_player_id']);
            $table->index('hesitation_detected');
            $table->index('choice_changed');
            $table->index('made_decision');
            $table->index('defaulted_to_invest');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('round_stats');
    }
};
