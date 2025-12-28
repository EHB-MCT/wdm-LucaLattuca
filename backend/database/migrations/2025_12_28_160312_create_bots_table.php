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
        Schema::create('bots', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('personality_type')->nullable(); // e.g., 'cooperative', 'selfish', 'cautious'

            // OCEAN Model
            $table->decimal('openness', 5, 2)->default(50.00);
            $table->decimal('conscientiousness', 5, 2)->default(50.00);
            $table->decimal('extraversion', 5, 2)->default(50.00);
            $table->decimal('agreeableness', 5, 2)->default(50.00);
            $table->decimal('neuroticism', 5, 2)->default(50.00);

            // Behavioral tendencies
            $table->decimal('cooperation_tendency', 5, 2)->default(50.00); // 0-100
            $table->decimal('risk_tolerance', 5, 2)->default(50.00); // 0-100

            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bots');
    }
};
