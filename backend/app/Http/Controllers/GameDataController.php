<?php

namespace App\Http\Controllers;

use App\Services\GameDataService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class GameDataController extends Controller
{
    private GameDataService $gameDataService;

    public function __construct(GameDataService $gameDataService)
    {
        $this->gameDataService = $gameDataService;
    }

    /**
     * Get OCEAN model radar chart data
     * GET /api/game-data/ocean-model
     */
    public function getOceanModel(Request $request)
    {
        $user = Auth::user();
        $data = $this->gameDataService->getOceanModelData($user);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Get leaderboard data for grouped bar chart
     * GET /api/game-data/leaderboard
     */
    public function getLeaderboard()
    {
        $data = $this->gameDataService->getLeaderboardData();

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Get trust vs investment scatter plot data
     * GET /api/game-data/trust-vs-investment
     */
    public function getTrustVsInvestment()
    {
        $data = $this->gameDataService->getTrustVsInvestmentData();

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Get choice distribution by round (line chart)
     * GET /api/game-data/choice-distribution
     */
    public function getChoiceDistribution()
    {
        $data = $this->gameDataService->getChoiceDistributionByRound();

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Get average investment by round (line chart)
     * GET /api/game-data/average-investment
     */
    public function getAverageInvestment()
    {
        $data = $this->gameDataService->getAverageInvestmentByRound();

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Get comprehensive stats summary
     * GET /api/game-data/summary
     */
    public function getSummary(Request $request)
    {
        $user = Auth::user();
        $data = $this->gameDataService->getStatsSummary($user);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Get all chart data in one call
     * GET /api/game-data/all
     */
    public function getAllData(Request $request)
    {
        $user = Auth::user();
        $data = $this->gameDataService->getAllChartData($user);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }
}

// Sources
// Created using Claude (Sonnet 4.5)