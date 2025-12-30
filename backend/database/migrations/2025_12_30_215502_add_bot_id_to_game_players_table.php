<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('game_players', function (Blueprint $table) {
            $table->unsignedBigInteger('bot_id')->nullable()->after('user_id');
            $table->foreign('bot_id')->references('id')->on('bots')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('game_players', function (Blueprint $table) {
            $table->dropForeign(['bot_id']);
            $table->dropColumn('bot_id');
        });
    }
};

