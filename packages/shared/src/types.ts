export type Suit = 'S' | 'C' | 'D' | 'H'; // Spades (Bích), Clubs (Tép), Diamonds (Rô), Hearts (Cơ)
export type Color = 'black' | 'red';
export type Rank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2';

export interface Card {
  id: string; // e.g. "3S", "10H", "2D"
  rank: Rank;
  suit: Suit;
  rankValue: number; // 3=3, ..., A=14, 2=15
  suitValue: number; // S=1, C=2, D=3, H=4
  color: Color; // S,C=black; D,H=red
}

export type ComboType =
  | 'single'
  | 'pair'
  | 'triple'
  | 'straight'
  | 'double_sequence' // Đôi thông (3+ pairs)
  | 'four_of_a_kind'; // Tứ quý

export type HangType =
  | 'three_double_sequence' // 3 đôi thông
  | 'four_of_a_kind'        // Tứ quý
  | 'straight_5'            // Sảnh 5 lá đồng chất
  | 'straight_6_plus'       // Sảnh ≥ 6 lá đồng chất
  | 'four_double_sequence'  // 4 đôi thông
  | 'five_double_sequence'; // 5 đôi thông

export interface Combination {
  type: ComboType;
  cards: Card[];
  isHang: boolean;
  hangType?: HangType;
  // Metadata for comparison
  highestCard?: Card;
  highestRankValue?: number;
  highestSuitValue?: number;
  suit?: Suit; // For straights
  color?: Color; // For pairs / đôi thông
  length: number; // Card count
  pairCount?: number; // For double sequences
  suitSet?: string; // For triples of 3-A: sorted suits string e.g. "C,D,H"
}

export type GameMode = 'basic' | 'fund'; // 'basic' | 'Góp quỹ'

export type EndReason =
  | 'normal'
  | 'dut3BichSuccess'
  | 'dut3BichCaught'
  | 'finishWithTwosPenalty'
  | 'instantWin';

export type InstantWinType =
  | 'four_twos'                // 1. Tứ quý 2
  | 'dragon_straight_12'       // 2. Sảnh 3-A đồng chất (12 lá)
  | 'six_pairs'                // 3. 6 đôi hợp lệ
  | 'five_double_sequence'     // 4. 5 đôi thông đồng màu
  | 'thirteen_same_color'      // 5. 13 lá cùng màu
  | 'four_threes_first_game';  // 6. Tứ quý 3 ở ván đầu

export interface PenaltyGroup {
  name: string;
  type: 'single_two_black' | 'single_two_red' | 'three_double_sequence' | 'four_of_a_kind' | 'four_double_sequence' | 'single_card' | 'long_straight';
  cards: Card[];
  score: number;
}

export interface PlayerHandEvaluation {
  totalScore: number;
  isCong: boolean;
  cardCount: number;
  groups: PenaltyGroup[];
}

export interface ScoreLedgerEntry {
  id: string;
  gameId: string;
  type: 'chop' | 'settlement';
  reason: string;
  fromPlayerId: string; // Victim
  toPlayerId?: string; // Beneficiary (if basic mode)
  amount: number; // Always positive magnitude
  cardIds?: string[];
  createdAt: number;
}

export interface PlayerGameResult {
  playerId: string;
  seatIndex: number;
  isWinner: boolean;
  scoreDelta: number; // For Basic: signed int. For Góp quỹ: negative int (0 or negative)
  winDelta: number; // 1 if win, 0 otherwise
  handEvaluation?: PlayerHandEvaluation;
  chopScoreDelta: number;
  settlementScoreDelta: number;
}
