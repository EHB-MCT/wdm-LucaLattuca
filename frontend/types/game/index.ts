export interface GameState {
  id: number;
  status: string;
  total_rounds: number;
  started_at: string;
}

export interface RoundState {
  id: number;
  round_number: number;
  pot_before_bonus: number;
  pot_after_bonus: number;
  trust_bonus_percentage: number;
  started_at: string;
  time_remaining: number;
}

export interface PlayerState {
  id: number;
  player_number: number;
  total_invested: number;
  final_earnings: number;
  net_result: number;
}

export interface OpponentState {
  name: string;
  is_bot: boolean;
  balance: number;
  trust_score: number;
}

export interface BotInfo {
  id: number;
  name: string;
  personality_type: string;
  balance: number;
  trust_score: number;
  cooperation_tendency: number;
  risk_tolerance: number;
}

export interface GameApiResponse {
  success: boolean;
  game: GameState;
  current_round: RoundState | null;
  player: PlayerState;
  opponent: OpponentState;
  user_balance: number;
}

export interface RoundResultsState {
  userChoice: string;
  userInvestment: number;
  opponentChoice: string;
  opponentInvestment: number;
  userPayout: number;
  opponentPayout: number;
  potBeforeBonus: number;
  potAfterBonus: number;
  bothInvested: boolean;
  trustBonusPercentage: number;
  nextRoundNumber: number | null;
}

// Sources
// generated interface class using Claude (Sonnet 4.5)
// https://claude.ai/share/4570ac86-c7f2-452d-93e4-b72281a330ba