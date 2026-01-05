<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $nationalities = [
            'American', 'British', 'Canadian', 'Australian', 'German',
            'French', 'Spanish', 'Italian', 'Japanese', 'Chinese',
            'Korean', 'Indian', 'Brazilian', 'Mexican', 'Dutch',
            'Swedish', 'Norwegian', 'Danish', 'Belgian', 'Swiss',
        ];

        $genders = ['male', 'female', 'non-binary', 'prefer-not-to-say'];

        // Common password for all users
        $password = Hash::make('password123');

        $users = [];

        for ($i = 1; $i <= 200; $i++) {
            $gender = $genders[array_rand($genders)];
            $firstName = $this->generateFirstName($gender);
            $lastName = $this->generateLastName();
            
            $users[] = [
                'username' => strtolower($firstName . $lastName . rand(10, 99)),
                'email' => strtolower($firstName . '.' . $lastName . $i . '@example.com'),
                'password' => $password,
                'balance' => rand(0, 1000) / 10, // $0.00 to $10000.00
                'age' => rand(18, 65),
                'gender' => $gender,
                'nationality' => $nationalities[array_rand($nationalities)],
                'trust_score' => $this->generateTrustScore(),
                
                // OCEAN Model - Based on population distributions
                // These follow normal distributions centered around 50
                'openness' => $this->generateOceanTrait(50, 15), // Mean ~50, SD ~15
                'conscientiousness' => $this->generateOceanTrait(55, 15), // Slightly higher mean
                'extraversion' => $this->generateOceanTrait(50, 18), // Higher variance
                'agreeableness' => $this->generateOceanTrait(55, 14), // Slightly higher mean, lower variance
                'neuroticism' => $this->generateOceanTrait(45, 16), // Slightly lower mean
                
                // Game Statistics - Start at 0
                'total_matches_played' => 0,
                'times_cooperated' => 0,
                'times_defected' => 0,
                'times_betrayed' => 0,
                'average_earnings' => 0,
                'onboarding_completed' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // Batch insert for performance
        foreach (array_chunk($users, 50) as $chunk) {
            User::insert($chunk);
        }

        $this->command->info('Seeded 200 users with realistic OCEAN personality distributions');
    }

    /**
     * Generate an OCEAN trait value using normal distribution.
     * 
     * @param float $mean Mean value (typically around 50)
     * @param float $stdDev Standard deviation (typically 14-18)
     * @return float Value clamped between 0 and 100
     */
    private function generateOceanTrait(float $mean, float $stdDev): float
    {
        // Box-Muller transform for normal distribution
        $u1 = mt_rand() / mt_getrandmax();
        $u2 = mt_rand() / mt_getrandmax();
        
        $z0 = sqrt(-2 * log($u1)) * cos(2 * pi() * $u2);
        $value = $mean + ($stdDev * $z0);
        
        // Clamp between 0 and 100
        $value = max(0, min(100, $value));
        
        return round($value, 2);
    }

    /**
     * Generate a trust score (0-100).
     * Starts neutral-positive for new users.
     */
    private function generateTrustScore(): float
    {
        return round(rand(1000, 9000) / 100, 2); // 10.00 to 90.00
    }

    /**
     * Generate a first name based on gender.
     */
    private function generateFirstName(string $gender): string
    {
        $maleNames = [
            'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
            'Thomas', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven',
            'Andrew', 'Paul', 'Joshua', 'Kenneth', 'Kevin', 'Brian', 'George', 'Timothy',
            'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Ryan', 'Jacob', 'Gary', 'Nicholas',
        ];

        $femaleNames = [
            'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica',
            'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra', 'Ashley',
            'Kimberly', 'Emily', 'Donna', 'Michelle', 'Carol', 'Amanda', 'Dorothy', 'Melissa',
            'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia', 'Kathleen', 'Amy',
        ];

        $neutralNames = [
            'Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Avery', 'Quinn',
            'Sage', 'River', 'Rowan', 'Phoenix', 'Skyler', 'Cameron', 'Charlie', 'Dakota',
        ];

        if ($gender === 'male') {
            return $maleNames[array_rand($maleNames)];
        } elseif ($gender === 'female') {
            return $femaleNames[array_rand($femaleNames)];
        } else {
            // For non-binary and prefer-not-to-say, mix all names
            $allNames = array_merge($maleNames, $femaleNames, $neutralNames);
            return $allNames[array_rand($allNames)];
        }
    }

    /**
     * Generate a last name.
     */
    private function generateLastName(): string
    {
        $lastNames = [
            'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
            'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
            'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
            'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
            'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
            'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
        ];

        return $lastNames[array_rand($lastNames)];
    }
}

// Sources
// Created using Claude (Sonnet 4.5)
// Based on population OCEAN trait distributions from psychological research
// Normal distribution parameters based on Costa & McCrae's NEO-PI-R standardization