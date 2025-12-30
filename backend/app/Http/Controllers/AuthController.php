<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new user
     */
    public function register(Request $request)
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user = User::create([
            'username' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'onboarding_completed' => false,
        ]);

        $token = $user->createToken('mobile-app')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
            'message' => 'Registration successful',
        ], 201);
    }

    /**
     * Login user
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Delete old tokens (optional - keeps only one active session)
        $user->tokens()->delete();

        $token = $user->createToken('mobile-app')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
            'message' => 'Login successful',
        ], 200);
    }

    /**
     * Get authenticated user
     */
    public function user(Request $request)
    {
        return response()->json([
            'user' => $request->user(),
        ], 200);
    }

    /**
     * Complete onboarding process
     */
    public function completeOnboarding(Request $request)
    {
        $request->validate([
            'age' => ['required', 'integer', 'min:13', 'max:120'],
            'nationality' => ['required', 'string', 'max:100'],
            'gender' => ['required', 'string', 'in:male,female,non-binary,prefer-not-to-say,other'],
        ]);

        $user = $request->user();

        $user->update([
            'age' => $request->age,
            'nationality' => $request->nationality,
            'gender' => $request->gender,
            'onboarding_completed' => true,
        ]);

        return response()->json([
            'user' => $user->fresh(),
            'message' => 'Onboarding completed successfully',
        ], 200);
    }

    /**
     * Logout user (revoke token)
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout successful',
        ], 200);
    }
}
// Sources
// Controller generated using Claude (Sonnet 4.5)
// https://claude.ai/share/e78dc531-7d4d-45f5-8a4b-7eba06775ded
