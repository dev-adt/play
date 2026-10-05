import { Card, Combination, ComboType, HangType } from './types.js';
import { RulesConfig, defaultRulesConfig } from './rulesConfig.js';
import {
  canHangChopTwos,
  getHangStrengthTier,
  identifyCombination,
} from './combinations.js';
import { compareCards } from './cards.js';

export interface BeatResult {
  valid: boolean;
  isChop: boolean;
  reason?: string;
}

/**
 * Validates whether `played` can beat `current` on the board according to the game rules.
 */
export function canBeat(
  current: Combination,
  played: Combination,
  config: RulesConfig = defaultRulesConfig
): BeatResult {
  // 1. Current is SINGLE
  if (current.type === 'single') {
    const currentCard = current.cards[0];
    const isCurrentTwo = currentCard.rank === '2';

    // Played is also a SINGLE
    if (played.type === 'single') {
      const playedCard = played.cards[0];
      const isPlayedTwo = playedCard.rank === '2';

      if (!isCurrentTwo) {
        // Current is 3-A
        if (isPlayedTwo) {
          // 2 beats any 3-A regardless of suit
          return { valid: true, isChop: false };
        }
        // Must be same suit
        if (playedCard.suit !== currentCard.suit) {
          return { valid: false, isChop: false, reason: 'Phải đánh cùng chất với lá trước' };
        }
        // Must have higher rank
        if (playedCard.rankValue <= currentCard.rankValue) {
          return { valid: false, isChop: false, reason: 'Lá bài phải có giá trị lớn hơn lá trước' };
        }
        return { valid: true, isChop: false };
      } else {
        // Current is 2
        if (isPlayedTwo) {
          // Compare suit of 2s: S < C < D < H
          if (playedCard.suitValue > currentCard.suitValue) {
            return { valid: true, isChop: false };
          }
          return { valid: false, isChop: false, reason: '2 sau phải có chất lớn hơn 2 trước' };
        }
        // Regular 3-A cannot beat a 2
        return { valid: false, isChop: false, reason: 'Lá thường không chặn được 2' };
      }
    }

    // Current is a 2 and played is HÀNG (Chặt 1 lá 2)
    if (isCurrentTwo && played.isHang && played.hangType) {
      if (canHangChopTwos(played.hangType, 1)) {
        return { valid: true, isChop: true };
      }
    }

    return { valid: false, isChop: false, reason: 'Không thể chặn lá bài này' };
  }

  // 2. Current is PAIR
  if (current.type === 'pair') {
    const isCurrentPairTwos = current.cards[0].rank === '2';

    // Played is also a PAIR
    if (played.type === 'pair') {
      const isPlayedPairTwos = played.cards[0].rank === '2';

      if (!isCurrentPairTwos) {
        // Current is normal pair (3-A)
        if (isPlayedPairTwos) {
          // Pair of 2s beats any normal pair without needing same color
          return { valid: true, isChop: false };
        }
        // Must be same color
        if (played.color !== current.color) {
          return { valid: false, isChop: false, reason: 'Đôi chặn phải cùng màu với đôi trước' };
        }
        // Must have higher rank
        if (played.highestRankValue! <= current.highestRankValue!) {
          return { valid: false, isChop: false, reason: 'Đôi sau phải có rank lớn hơn đôi trước' };
        }
        return { valid: true, isChop: false };
      } else {
        // Current is pair of 2s
        if (isPlayedPairTwos) {
          // Compare highest suit of each pair of 2s
          if (played.highestSuitValue! > current.highestSuitValue!) {
            return { valid: true, isChop: false };
          }
          return { valid: false, isChop: false, reason: 'Đôi 2 sau phải có chất cao nhất lớn hơn đôi 2 trước' };
        }
        return { valid: false, isChop: false, reason: 'Đôi thường không chặn được đôi 2' };
      }
    }

    // Current is Pair of 2s and played is HÀNG (Chặt đôi 2)
    if (isCurrentPairTwos && played.isHang && played.hangType) {
      if (canHangChopTwos(played.hangType, 2)) {
        return { valid: true, isChop: true };
      }
      return { valid: false, isChop: false, reason: 'Hàng này không được chặt đôi 2' };
    }

    return { valid: false, isChop: false, reason: 'Không thể chặn đôi này' };
  }

  // 3. Current is TRIPLE
  if (current.type === 'triple') {
    const isCurrentTripleTwos = current.cards[0].rank === '2';

    // Played is also a TRIPLE
    if (played.type === 'triple') {
      const isPlayedTripleTwos = played.cards[0].rank === '2';

      if (!isCurrentTripleTwos) {
        // Current is normal triple (3-A)
        if (isPlayedTripleTwos) {
          // Triple of 2s beats any normal triple without keeping suit set
          return { valid: true, isChop: false };
        }
        // Must be same set of 3 suits!
        if (played.suitSet !== current.suitSet) {
          return { valid: false, isChop: false, reason: 'Bộ ba chặn phải cùng đúng tập hợp ba chất' };
        }
        // Must have higher rank
        if (played.highestRankValue! <= current.highestRankValue!) {
          return { valid: false, isChop: false, reason: 'Bộ ba sau phải có rank lớn hơn bộ ba trước' };
        }
        return { valid: true, isChop: false };
      } else {
        // Current is triple of 2s
        if (isPlayedTripleTwos) {
          if (played.highestSuitValue! > current.highestSuitValue!) {
            return { valid: true, isChop: false };
          }
          return { valid: false, isChop: false, reason: 'Bộ ba 2 sau phải có chất cao nhất lớn hơn' };
        }
        return { valid: false, isChop: false, reason: 'Bộ ba thường không chặn được bộ ba 2' };
      }
    }

    // Current is Triple of 2s and played is HÀNG (Chặt bộ ba 2)
    if (isCurrentTripleTwos && played.isHang && played.hangType) {
      if (canHangChopTwos(played.hangType, 3)) {
        return { valid: true, isChop: true };
      }
      return { valid: false, isChop: false, reason: 'Hàng này không được chặt bộ ba 2' };
    }

    return { valid: false, isChop: false, reason: 'Không thể chặn bộ ba này' };
  }

  // 4. Current is STRAIGHT (Sảnh)
  if (current.type === 'straight') {
    // Check if normal straight block applies:
    // Same length, same suit, higher highestRankValue
    if (
      played.type === 'straight' &&
      played.length === current.length &&
      played.suit === current.suit &&
      played.highestRankValue! > current.highestRankValue!
    ) {
      // If current is hàng (length >= 5), check preference from config
      if (current.isHang && config.preferNormalBlockOverChop) {
        return { valid: true, isChop: false };
      }
      return { valid: true, isChop: current.isHang };
    }

    // If current is Sảnh 3 or 4 lá, it is NOT hàng, only beaten by normal straight (already checked above)
    if (!current.isHang) {
      return {
        valid: false,
        isChop: false,
        reason: 'Sảnh 3-4 lá phải chặn bằng sảnh cùng số lá, cùng chất và rank cao hơn',
      };
    }

    // Current IS HÀNG (Sảnh >= 5 lá). Check HÀNG CHẶT HÀNG!
    if (played.isHang && played.hangType) {
      // Case A: Played is different type of hàng
      if (played.type !== 'straight') {
        const currentTier = getHangStrengthTier(current.hangType!);
        const playedTier = getHangStrengthTier(played.hangType);
        if (playedTier > currentTier) {
          return { valid: true, isChop: true };
        }
        return { valid: false, isChop: false, reason: 'Hàng chặn không đủ mạnh để chặt sảnh này' };
      }

      // Case B: Played is also a straight hàng (cùng loại hàng sảnh)
      // Section 4.2: Sảnh dài so theo thứ tự ưu tiên: số lá → rank lá cao nhất → chất
      // e.g. 4–9♠ (6 lá) > 4–8♥ (5 lá) > 4–8♣ (5 lá)
      if (played.length > current.length) {
        return { valid: true, isChop: true };
      }
      if (played.length === current.length) {
        if (played.highestRankValue! > current.highestRankValue!) {
          return { valid: true, isChop: true };
        }
        if (
          played.highestRankValue! === current.highestRankValue! &&
          played.highestSuitValue! > current.highestSuitValue!
        ) {
          return { valid: true, isChop: true };
        }
      }
      return { valid: false, isChop: false, reason: 'Sảnh sau không lớn hơn sảnh trước' };
    }

    return { valid: false, isChop: false, reason: 'Không thể chặn sảnh này' };
  }

  // 5. Current is FOUR OF A KIND (Tứ quý)
  if (current.type === 'four_of_a_kind') {
    if (played.isHang && played.hangType) {
      // Same type: Tứ quý lớn hơn chặt tứ quý nhỏ hơn
      if (played.type === 'four_of_a_kind') {
        if (played.highestRankValue! > current.highestRankValue!) {
          return { valid: true, isChop: true };
        }
        return { valid: false, isChop: false, reason: 'Tứ quý sau phải có rank lớn hơn tứ quý trước' };
      }

      // Different hàng type:
      const currentTier = getHangStrengthTier('four_of_a_kind'); // 2
      const playedTier = getHangStrengthTier(played.hangType);
      // Sảnh >= 5 (tier 3), 4 đôi thông (tier 4), 5 đôi thông (tier 5)
      if (playedTier > currentTier) {
        return { valid: true, isChop: true };
      }
      return { valid: false, isChop: false, reason: 'Hàng chặn không đủ mạnh để chặt tứ quý' };
    }
    return { valid: false, isChop: false, reason: 'Chỉ có hàng mạnh hơn mới chặt được tứ quý' };
  }

  // 6. Current is DOUBLE SEQUENCE (Đôi thông)
  if (current.type === 'double_sequence') {
    if (played.isHang && played.hangType) {
      // Same type: double sequence vs double sequence
      if (played.type === 'double_sequence') {
        if (played.pairCount! > current.pairCount!) {
          // More pairs = higher tier
          return { valid: true, isChop: true };
        }
        if (played.pairCount! === current.pairCount!) {
          // Compare rank of highest pair; if equal rank, compare highest suit
          if (played.highestRankValue! > current.highestRankValue!) {
            return { valid: true, isChop: true };
          }
          if (
            played.highestRankValue! === current.highestRankValue! &&
            played.highestSuitValue! > current.highestSuitValue!
          ) {
            return { valid: true, isChop: true };
          }
          return { valid: false, isChop: false, reason: 'Đôi thông sau phải lớn hơn đôi thông trước' };
        }
        return { valid: false, isChop: false, reason: 'Đôi thông sau ít đôi hơn đôi thông trước' };
      }

      // Different hàng type:
      const currentTier = getHangStrengthTier(current.hangType!);
      const playedTier = getHangStrengthTier(played.hangType);
      if (playedTier > currentTier) {
        return { valid: true, isChop: true };
      }
      return { valid: false, isChop: false, reason: 'Hàng chặn không đủ mạnh để chặt đôi thông này' };
    }
    return { valid: false, isChop: false, reason: 'Chỉ có hàng mạnh hơn mới chặt được đôi thông' };
  }

  return { valid: false, isChop: false, reason: 'Nước đánh không hợp lệ' };
}
