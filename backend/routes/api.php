<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\GameController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/onboarding', [AuthController::class, 'completeOnboarding']);

    // Game routes
    Route::post('/queue/join', [GameController::class, 'joinQueue']);
    Route::post('/queue/leave', [GameController::class, 'leaveQueue']);
    Route::get('/game/{gameId}', [GameController::class, 'getGameState']);
    Route::get('/bot/{botId}', [GameController::class, 'getBotInfo']);
});

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
