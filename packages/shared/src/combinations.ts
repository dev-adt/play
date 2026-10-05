import { Card, Color, ComboType, HangType, Combination, Rank, Suit } from './types.js';
import { compareCards, sortCards } from './cards.js';

/**
 * Returns whether all cards have the same suit.
 */
export function isSameSuit(cards: Card[]): boolean {
  if (cards.length === 0) return true;
  const suit = cards[0].suit;
  return cards.every(c => c.suit === suit);
}

/**
 * Returns whether all cards have the same color.
 */
export function isSameColor(cards: Card[]): boolean {
  if (cards.length === 0) return true;
  const color = cards[0].color;
  return cards.every(c => c.color === color);
}

/**
 * Checks if cards form a valid combination.
 * If valid, returns the Combination object; otherwise null.
 */
export function identifyCombination(cards: Card[]): Combination | null {
  if (!cards || cards.length === 0) return null;
  const sorted = sortCards(cards);
  const n = sorted.length;

  // 1. Single card
  if (n === 1) {
    const card = sorted[0];
    return {
      type: 'single',
      cards: sorted,
      isHang: false,
      highestCard: card,
      highestRankValue: card.rankValue,
      highestSuitValue: card.suitValue,
      length: 1,
    };
  }

  // 2. Pair
  if (n === 2) {
    if (sorted[0].rank === sorted[1].rank) {
      const isTwo = sorted[0].rank === '2';
      // Normal pair: must be same color (♠♣ or ♦♥)
      // Pair of 2s: any two suits valid
      if (isTwo || sorted[0].color === sorted[1].color) {
        const highestCard = sorted[1]; // sorted by rank then suit, so [1] has higher suit
        return {
          type: 'pair',
          cards: sorted,
          isHang: false,
          highestCard,
          highestRankValue: sorted[0].rankValue,
          highestSuitValue: highestCard.suitValue,
          color: isTwo ? undefined : sorted[0].color,
          length: 2,
        };
      }
    }
    return null;
  }

  // 3. Triple
  if (n === 3) {
    if (sorted[0].rank === sorted[1].rank && sorted[1].rank === sorted[2].rank) {
      const isTwo = sorted[0].rank === '2';
      const suitSet = sorted.map(c => c.suit).sort().join(',');
      const highestCard = sorted[2];
      return {
        type: 'triple',
        cards: sorted,
        isHang: false,
        highestCard,
        highestRankValue: sorted[0].rankValue,
        highestSuitValue: highestCard.suitValue,
        suitSet: isTwo ? undefined : suitSet,
        length: 3,
      };
    }
    // Could also be a straight of 3 cards!
  }

  // 4. Four of a kind (Tứ quý)
  if (n === 4) {
    if (
      sorted[0].rank === sorted[1].rank &&
      sorted[1].rank === sorted[2].rank &&
      sorted[2].rank === sorted[3].rank
    ) {
      const highestCard = sorted[3];
      return {
        type: 'four_of_a_kind',
        cards: sorted,
        isHang: true,
        hangType: 'four_of_a_kind',
        highestCard,
        highestRankValue: sorted[0].rankValue,
        highestSuitValue: highestCard.suitValue,
        length: 4,
      };
    }
  }

  // 5. Straight (Sảnh): At least 3 cards, consecutive ranks, same suit, NO 2.
  if (n >= 3) {
    let isStraight = true;
    const suit = sorted[0].suit;

    // Check no 2 and same suit
    for (let i = 0; i < n; i++) {
      if (sorted[i].rank === '2' || sorted[i].suit !== suit) {
        isStraight = false;
        break;
      }
      if (i > 0 && sorted[i].rankValue !== sorted[i - 1].rankValue + 1) {
        isStraight = false;
        break;
      }
    }

    if (isStraight) {
      const highestCard = sorted[n - 1];
      const isHang = n >= 5;
      const hangType: HangType | undefined =
        n === 5 ? 'straight_5' : n >= 6 ? 'straight_6_plus' : undefined;

      return {
        type: 'straight',
        cards: sorted,
        isHang,
        hangType,
        highestCard,
        highestRankValue: highestCard.rankValue,
        highestSuitValue: highestCard.suitValue,
        suit,
        length: n,
      };
    }
  }

  // 6. Double Sequence (Đôi thông): At least 3 pairs, consecutive ranks, no 2s.
  // Each pair must be valid (same rank and same color).
  // All pairs in the sequence must be of the same color.
  if (n >= 6 && n % 2 === 0) {
    const pairCount = n / 2;
    if (pairCount >= 3) {
      let isDoubleSeq = true;
      const firstColor = sorted[0].color;
      let prevRankVal = -1;

      for (let p = 0; p < pairCount; p++) {
        const c1 = sorted[p * 2];
        const c2 = sorted[p * 2 + 1];

        // Must be same rank, not 2
        if (c1.rank !== c2.rank || c1.rank === '2') {
          isDoubleSeq = false;
          break;
        }

        // Must be same color as the whole sequence
        if (c1.color !== firstColor || c2.color !== firstColor) {
          isDoubleSeq = false;
          break;
        }

        // Rank must be consecutive
        if (p > 0 && c1.rankValue !== prevRankVal + 1) {
          isDoubleSeq = false;
          break;
        }
        prevRankVal = c1.rankValue;
      }

      if (isDoubleSeq) {
        const highestCard = sorted[n - 1];
        let hangType: HangType = 'three_double_sequence';
        if (pairCount === 4) hangType = 'four_double_sequence';
        else if (pairCount >= 5) hangType = 'five_double_sequence';

        return {
          type: 'double_sequence',
          cards: sorted,
          isHang: true,
          hangType,
          highestCard,
          highestRankValue: highestCard.rankValue,
          highestSuitValue: highestCard.suitValue,
          color: firstColor,
          length: n,
          pairCount,
        };
      }
    }
  }

  return null;
}

/**
 * Hàng tier strength for "Hàng chặt Hàng khác loại" (Section 4.1):
 * 5 đôi thông > 4 đôi thông > sảnh đồng chất từ 5 lá > tứ quý > 3 đôi thông
 */
export function getHangStrengthTier(hangType: HangType): number {
  switch (hangType) {
    case 'five_double_sequence':
      return 5;
    case 'four_double_sequence':
      return 4;
    case 'straight_5':
    case 'straight_6_plus':
      return 3;
    case 'four_of_a_kind':
      return 2;
    case 'three_double_sequence':
      return 1;
    default:
      return 0;
  }
}

/**
 * Checks if a Hàng can chop a group of 2s (Section 4.1 table):
 * - 3 đôi thông: 1 two
 * - Tứ quý: 1 two, pair of 2s
 * - Sảnh 5 lá: 1 two, pair of 2s
 * - Sảnh ≥6 lá: 1 two, pair of 2s, triple of 2s
 * - 4 đôi thông: 1 two, pair of 2s
 * - 5 đôi thông: 1 two, pair of 2s, triple of 2s
 */
export function canHangChopTwos(hangType: HangType, twoCount: number): boolean {
  if (twoCount === 1) {
    return true; // All hàng chop 1 two
  }
  if (twoCount === 2) {
    return hangType !== 'three_double_sequence';
  }
  if (twoCount === 3) {
    return hangType === 'straight_6_plus' || hangType === 'five_double_sequence';
  }
  return false;
}
