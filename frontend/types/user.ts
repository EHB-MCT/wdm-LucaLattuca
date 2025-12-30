export interface User {
  id: number;
  username: string;
  email: string;
  balance: number;
  age: number;
  gender: string;
  nationality: string;
  trust_score: number;
  avatar?: string;
  onboarding_completed: boolean;
  openness?: number;
  conscientiousness?: number;
  extraversion?: number;
  agreeableness?: number;
  neuroticism?: number;
  total_matches_played?: number;
  times_cooperated?: number;
  times_defected?: number;
  times_betrayed?: number;
  average_earnings?: number;
}

// Sources
// User interface generated using Claude Code
// https://claude.ai/share/a86909b9-6271-4878-afd6-981beba52b92