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
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('username')->unique();
            $table->string('email')->unique();
            $table->string('password');
            $table->decimal('balance', 10, 2)->default(1000.00); // Starting balance
            $table->string('avatar')->nullable();
            $table->integer('age')->nullable();
            $table->string('gender')->nullable();
            $table->string('nationality')->nullable();
            $table->decimal('trust_score', 5, 2)->default(50.00); // 0-100 scale

            // OCEAN Model (0-100 scale for each)
            $table->decimal('openness', 5, 2)->default(50.00);
            $table->decimal('conscientiousness', 5, 2)->default(50.00);
            $table->decimal('extraversion', 5, 2)->default(50.00);
            $table->decimal('agreeableness', 5, 2)->default(50.00);
            $table->decimal('neuroticism', 5, 2)->default(50.00);

            // Game Statistics
            $table->integer('total_matches_played')->default(0);
            $table->integer('times_cooperated')->default(0);
            $table->integer('times_defected')->default(0);
            $table->integer('times_betrayed')->default(0);
            $table->decimal('average_earnings', 10, 2)->default(0.00);

            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
