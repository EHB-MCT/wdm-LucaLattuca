<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\GameController;
use App\Http\Controllers\GameHistoryController;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

Route::middleware('auth:sanctum')->group(function () {
    
    Route::get('/user', function (Request $request) {
        return response()->json([
            'user' => $request->user()
        ]);
    });

    Route::put('/onboarding', [AuthController::class, 'completeOnboarding']);

    // Game routes
    Route::post('/queue/join', [GameController::class, 'joinQueue']);
    Route::post('/queue/leave', [GameController::class, 'leaveQueue']);
    Route::get('/game/{gameId}', [GameController::class, 'getGameState']);
    Route::get('/bot/{botId}', [GameController::class, 'getBotInfo']);
    Route::post('/game/{gameId}/round/{roundId}/start', [GameController::class, 'startRound']);
    Route::post('/game/{gameId}/round/{roundId}/choice', [GameController::class, 'submitChoice']);
    Route::get('/game-history', [GameHistoryController::class, 'index']);

    Route::post('/logout', function (Request $request) {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    });

});

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
