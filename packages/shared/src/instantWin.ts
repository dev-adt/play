import { Card, InstantWinType } from './types.js';
import { sortCards, compareCards } from './cards.js';
import { identifyCombination } from './combinations.js';

export interface InstantWinEvaluation {
  hasInstantWin: boolean;
  type?: InstantWinType;
  priority?: number; // 1 (highest) to 6 (lowest)
  description?: string;
  keyCards?: Card[];
}

/**
 * Check if 12+ cards can form 6 valid pairs.
 * Đôi 2 can be any color. Other pairs must be same color.
 * Four of a kind can be split into 2 pairs (red/black).
 */
export function checkSixPairs(cards: Card[]): { valid: boolean; pairs?: Card[][] } {
  if (cards.length < 12) return { valid: false };

  // Group by rank
  const byRank: Record<string, Card[]> = {};
  for (const c of cards) {
    if (!byRank[c.rank]) byRank[c.rank] = [];
    byRank[c.rank].push(c);
  }

  const formedPairs: Card[][] = [];

  for (const rank in byRank) {
    const group = byRank[rank];
    if (rank === '2') {
      // 2s can pair with any suit
      while (group.length >= 2) {
        formedPairs.push([group.pop()!, group.pop()!]);
      }
    } else {
      // Group by color
      const black = group.filter(c => c.color === 'black');
      const red = group.filter(c => c.color === 'red');

      while (black.length >= 2) {
        formedPairs.push([black.pop()!, black.pop()!]);
      }
      while (red.length >= 2) {
        formedPairs.push([red.pop()!, red.pop()!]);
      }
    }
  }

  if (formedPairs.length >= 6) {
    return { valid: true, pairs: formedPairs.slice(0, 6) };
  }
  return { valid: false };
}

/**
 * Check 5 đôi thông đồng màu (5 consecutive pairs of same color: black or red).
 */
export function checkFiveDoubleSequence(cards: Card[]): { valid: boolean; comboCards?: Card[] } {
  if (cards.length < 10) return { valid: false };

  // Check for black and red separately
  for (const color of ['black', 'red'] as const) {
    const colorCards = cards.filter(c => c.color === color && c.rank !== '2');
    // Group pairs by rank
    const pairsByRankValue: Record<number, Card[][]> = {};
    const byRank: Record<string, Card[]> = {};
    for (const c of colorCards) {
      if (!byRank[c.rank]) byRank[c.rank] = [];
      byRank[c.rank].push(c);
    }
    for (const rank in byRank) {
      const g = byRank[rank];
      if (g.length >= 2) {
        const rv = g[0].rankValue;
        pairsByRankValue[rv] = [[g[0], g[1]]];
      }
    }

    const availableRanks = Object.keys(pairsByRankValue).map(Number).sort((a, b) => a - b);
    // Find consecutive 5 ranks
    for (let i = 0; i <= availableRanks.length - 5; i++) {
      let consecutive = true;
      for (let j = 0; j < 4; j++) {
        if (availableRanks[i + j + 1] !== availableRanks[i + j] + 1) {
          consecutive = false;
          break;
        }
      }
      if (consecutive) {
        const comboCards: Card[] = [];
        for (let j = 0; j < 5; j++) {
          const r = availableRanks[i + j];
          comboCards.push(...pairsByRankValue[r][0]);
        }
        return { valid: true, comboCards };
      }
    }
  }

  return { valid: false };
}

/**
 * Check Sảnh 3-A đồng chất (12 cards 3 to A of same suit).
 */
export function checkDragonStraight12(cards: Card[]): { valid: boolean; comboCards?: Card[] } {
  for (const suit of ['S', 'C', 'D', 'H'] as const) {
    const suitCards = cards.filter(c => c.suit === suit && c.rank !== '2');
    const ranks = new Set(suitCards.map(c => c.rankValue));
    // Must contain all 12 ranks from 3 (3) to A (14)
    let hasAll = true;
    for (let r = 3; r <= 14; r++) {
      if (!ranks.has(r)) {
        hasAll = false;
        break;
      }
    }
    if (hasAll) {
      const straightCards = sortCards(suitCards.filter(c => c.rankValue >= 3 && c.rankValue <= 14));
      return { valid: true, comboCards: straightCards };
    }
  }
  return { valid: false };
}

/**
 * Evaluates a player's hand for Instant Win (Ăn trắng).
 * Strict priority order:
 * 1. Tứ quý 2
 * 2. Sảnh 3–A đồng chất (12 lá)
 * 3. 6 đôi hợp lệ
 * 4. 5 đôi thông đồng màu
 * 5. 13 lá cùng màu
 * 6. Tứ quý 3 ở ván đầu
 */
export function evaluateInstantWin(hand: Card[], isFirstGame: boolean = false): InstantWinEvaluation {
  const sorted = sortCards(hand);

  // 1. Tứ quý 2
  const twos = sorted.filter(c => c.rank === '2');
  if (twos.length === 4) {
    return {
      hasInstantWin: true,
      type: 'four_twos',
      priority: 1,
      description: 'Tứ quý 2',
      keyCards: twos,
    };
  }

  // 2. Sảnh 3-A đồng chất
  const straight12 = checkDragonStraight12(sorted);
  if (straight12.valid) {
    return {
      hasInstantWin: true,
      type: 'dragon_straight_12',
      priority: 2,
      description: 'Sảnh rồng 3–A đồng chất (12 lá)',
      keyCards: straight12.comboCards,
    };
  }

  // 3. 6 đôi hợp lệ
  const sixPairs = checkSixPairs(sorted);
  if (sixPairs.valid) {
    const keyCards = sixPairs.pairs!.flat();
    return {
      hasInstantWin: true,
      type: 'six_pairs',
      priority: 3,
      description: '6 đôi hợp lệ',
      keyCards,
    };
  }

  // 4. 5 đôi thông đồng màu
  const fiveDS = checkFiveDoubleSequence(sorted);
  if (fiveDS.valid) {
    return {
      hasInstantWin: true,
      type: 'five_double_sequence',
      priority: 4,
      description: '5 đôi thông đồng màu',
      keyCards: fiveDS.comboCards,
    };
  }

  // 5. 13 lá cùng màu
  if (sorted.length === 13) {
    const firstColor = sorted[0].color;
    if (sorted.every(c => c.color === firstColor)) {
      return {
        hasInstantWin: true,
        type: 'thirteen_same_color',
        priority: 5,
        description: firstColor === 'red' ? '13 lá toàn đỏ' : '13 lá toàn đen',
        keyCards: sorted,
      };
    }
  }

  // 6. Tứ quý 3 ở ván đầu
  if (isFirstGame) {
    const threes = sorted.filter(c => c.rank === '3');
    if (threes.length === 4) {
      return {
        hasInstantWin: true,
        type: 'four_threes_first_game',
        priority: 6,
        description: 'Tứ quý 3 ở ván đầu',
        keyCards: threes,
      };
    }
  }

  return { hasInstantWin: false };
}

/**
 * Break tie between two instant win candidates (Section 12.3).
 * Returns < 0 if a wins, > 0 if b wins.
 */
export function breakInstantWinTie(
  a: { evaluation: InstantWinEvaluation; openerRank: number },
  b: { evaluation: InstantWinEvaluation; openerRank: number }
): number {
  // Different priority tier
  if (a.evaluation.priority! !== b.evaluation.priority!) {
    return a.evaluation.priority! - b.evaluation.priority!;
  }

  const type = a.evaluation.type!;
  const cardsA = a.evaluation.keyCards || [];
  const cardsB = b.evaluation.keyCards || [];

  if (type === 'dragon_straight_12') {
    // Compare highest card / suit
    const maxA = cardsA[cardsA.length - 1];
    const maxB = cardsB[cardsB.length - 1];
    const cmp = compareCards(maxB, maxA);
    if (cmp !== 0) return cmp;
  } else if (type === 'five_double_sequence') {
    // Compare highest rank / suit
    const maxA = cardsA[cardsA.length - 1];
    const maxB = cardsB[cardsB.length - 1];
    const cmp = compareCards(maxB, maxA);
    if (cmp !== 0) return cmp;
  } else if (type === 'thirteen_same_color') {
    // Red over black, then descending card values
    if (cardsA[0].color === 'red' && cardsB[0].color === 'black') return -1;
    if (cardsA[0].color === 'black' && cardsB[0].color === 'red') return 1;
    for (let i = cardsA.length - 1; i >= 0; i--) {
      const cmp = compareCards(cardsB[i], cardsA[i]);
      if (cmp !== 0) return cmp;
    }
  }

  // Fallback: seat having opening turn priority
  return a.openerRank - b.openerRank;
}
