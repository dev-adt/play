import {
  Card,
  Combination,
  EndReason,
  GameMode,
  PenaltyGroup,
  PlayerGameResult,
  PlayerHandEvaluation,
  ScoreLedgerEntry,
} from './types.js';
import { RulesConfig, defaultRulesConfig } from './rulesConfig.js';
import { identifyCombination } from './combinations.js';
import { sortCards } from './cards.js';

/**
 * Calculates the chop penalty value of a chopped combination (Section 6.2).
 * Phạt theo bộ BỊ CHẶT, không theo hàng dùng để chặt.
 */
export function getChopPenalty(
  chopped: Combination,
  config: RulesConfig = defaultRulesConfig
): number {
  // 1. Single 2
  if (chopped.type === 'single' && chopped.cards[0].rank === '2') {
    const card = chopped.cards[0];
    return card.color === 'black' ? 2 : 4;
  }

  // 2. Pair of 2s
  if (chopped.type === 'pair' && chopped.cards[0].rank === '2') {
    return chopped.cards.reduce((sum, c) => sum + (c.color === 'black' ? 2 : 4), 0);
  }

  // 3. Triple of 2s
  if (chopped.type === 'triple' && chopped.cards[0].rank === '2') {
    return chopped.cards.reduce((sum, c) => sum + (c.color === 'black' ? 2 : 4), 0);
  }

  // 4. Double sequence (Đôi thông)
  if (chopped.type === 'double_sequence') {
    if (chopped.pairCount === 3) return 6;
    if (chopped.pairCount === 4) return 8;
    if (chopped.pairCount! >= 5) return 8;
  }

  // 5. Four of a kind (Tứ quý)
  if (chopped.type === 'four_of_a_kind') {
    // If it's tứ quý 2, sum of four 2s is 12
    if (chopped.cards[0].rank === '2') {
      return 12;
    }
    return 8;
  }

  // 6. Long straight (Sảnh >= 5 lá)
  if (chopped.type === 'straight' && chopped.isHang) {
    return config.longStraightCutPenalty;
  }

  return 0;
}

interface CandidateGroup {
  mask: number;
  group: PenaltyGroup;
}

/**
 * Finds all candidate penalty groups in a player's hand.
 */
function findCandidatePenaltyGroups(cards: Card[]): CandidateGroup[] {
  const n = cards.length;
  const candidates: CandidateGroup[] = [];

  // Helper to make mask from indices
  const makeMask = (indices: number[]) => indices.reduce((m, idx) => m | (1 << idx), 0);

  // 1. Individual 2s and single cards
  for (let i = 0; i < n; i++) {
    const c = cards[i];
    if (c.rank === '2') {
      const isBlack = c.color === 'black';
      candidates.push({
        mask: 1 << i,
        group: {
          name: isBlack ? '2 đen' : '2 đỏ',
          type: isBlack ? 'single_two_black' : 'single_two_red',
          cards: [c],
          score: isBlack ? 2 : 4,
        },
      });
    } else {
      candidates.push({
        mask: 1 << i,
        group: {
          name: 'Lá lẻ',
          type: 'single_card',
          cards: [c],
          score: 1,
        },
      });
    }
  }

  // 2. Tứ quý (4 cards of same rank)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        for (let l = k + 1; l < n; l++) {
          const combo = [cards[i], cards[j], cards[k], cards[l]];
          if (
            combo[0].rank === combo[1].rank &&
            combo[1].rank === combo[2].rank &&
            combo[2].rank === combo[3].rank
          ) {
            const isTwo = combo[0].rank === '2';
            // Tứ quý thường = 8 điểm. Tứ quý 2 = 8 điểm (nhưng DP sẽ chọn 4 lá 2 lẻ = 12 nếu tốt hơn)
            candidates.push({
              mask: makeMask([i, j, k, l]),
              group: {
                name: isTwo ? 'Tứ quý 2' : `Tứ quý ${combo[0].rank}`,
                type: 'four_of_a_kind',
                cards: combo,
                score: 8,
              },
            });
          }
        }
      }
    }
  }

  // 3. 3 đôi thông (6 cards) and 4 đôi thông (8 cards)
  // Let's generate all combinations of 6 cards and 8 cards that form double sequence
  // Since n <= 13, combinations of 6 cards from at most 13 is at most C(13, 6) = 1716.
  // We can search systematically:
  function searchDoubleSequences(pairCount: number) {
    const kCards = pairCount * 2;
    if (n < kCards) return;

    function recurse(startIdx: number, selected: number[]) {
      if (selected.length === kCards) {
        const subCards = selected.map(idx => cards[idx]);
        const idCombo = identifyCombination(subCards);
        if (idCombo && idCombo.type === 'double_sequence' && idCombo.pairCount === pairCount) {
          const score = pairCount === 3 ? 6 : 8;
          candidates.push({
            mask: makeMask(selected),
            group: {
              name: `${pairCount} đôi thông`,
              type: pairCount === 3 ? 'three_double_sequence' : 'four_double_sequence',
              cards: subCards,
              score,
            },
          });
        }
        return;
      }
      for (let i = startIdx; i < n; i++) {
        selected.push(i);
        recurse(i + 1, selected);
        selected.pop();
      }
    }
    recurse(0, []);
  }

  searchDoubleSequences(3);
  searchDoubleSequences(4);

  return candidates;
}

/**
 * Evaluates remaining cards in a hand (Section 6.2).
 * Non-overlapping partition maximizing total score.
 */
export function evaluateHandPenalty(
  hand: Card[],
  isCong: boolean,
  config: RulesConfig = defaultRulesConfig
): PlayerHandEvaluation {
  if (hand.length === 0) {
    return { totalScore: 0, isCong: false, cardCount: 0, groups: [] };
  }

  const sortedCards = sortCards(hand);
  const n = sortedCards.length;
  const targetMask = (1 << n) - 1;

  const candidates = findCandidatePenaltyGroups(sortedCards);

  // DP memo: mask -> { score: number, groups: PenaltyGroup[] }
  const memo = new Map<number, { score: number; groups: PenaltyGroup[] }>();

  function solve(mask: number): { score: number; groups: PenaltyGroup[] } {
    if (mask === targetMask) {
      return { score: 0, groups: [] };
    }
    if (memo.has(mask)) {
      return memo.get(mask)!;
    }

    let bestScore = -1;
    let bestGroups: PenaltyGroup[] = [];

    // Find first available card index
    let firstFree = 0;
    while ((mask & (1 << firstFree)) !== 0) {
      firstFree++;
    }

    // Try all candidate groups that contain firstFree and don't overlap with mask
    for (const cand of candidates) {
      if ((cand.mask & (1 << firstFree)) !== 0 && (mask & cand.mask) === (1 << firstFree)) {
        // Wait, cand.mask must only overlap with mask on nothing!
        // i.e. (mask & cand.mask) === 0
      }
      if ((cand.mask & (1 << firstFree)) !== 0 && (mask & cand.mask) === 0) {
        const next = solve(mask | cand.mask);
        const total = cand.group.score + next.score;
        if (total > bestScore) {
          bestScore = total;
          bestGroups = [cand.group, ...next.groups];
        } else if (total === bestScore) {
          // Tie-break: prefer structured groups over individual single cards
          const isSingle = cand.group.type === 'single_card';
          const curFirstIsSingle = bestGroups.length > 0 && bestGroups[0].type === 'single_card';
          if (!isSingle && curFirstIsSingle) {
            bestScore = total;
            bestGroups = [cand.group, ...next.groups];
          }
        }
      }
    }

    // If no candidate, fallback to 1 point single card
    if (bestScore === -1) {
      const card = sortedCards[firstFree];
      const singleGroup: PenaltyGroup = {
        name: 'Lá lẻ',
        type: 'single_card',
        cards: [card],
        score: 1,
      };
      const next = solve(mask | (1 << firstFree));
      bestScore = 1 + next.score;
      bestGroups = [singleGroup, ...next.groups];
    }

    const result = { score: bestScore, groups: bestGroups };
    memo.set(mask, result);
    return result;
  }

  const optimal = solve(0);
  const rotScore = optimal.score;

  let totalScore = rotScore;
  if (isCong) {
    // Section 12 rule 2: congScore = rotScore + config.congBaseExtra (default 13)
    totalScore = rotScore + config.congBaseExtra;
  }

  return {
    totalScore,
    isCong,
    cardCount: n,
    groups: optimal.groups,
  };
}

export interface PlayerSettlementInput {
  id: string;
  seatIndex: number;
  hand: Card[];
  hasPlayedCard: boolean;
}

export interface SettlementOptions {
  mode: GameMode;
  endReason: EndReason;
  players: PlayerSettlementInput[];
  winnerIds: string[];
  violatorId?: string; // For finishWithTwosPenalty
  caughtPlayerId?: string; // For dut3BichCaught
  kTwos?: number; // Number of 2s in finishWithTwosPenalty (1, 2, or 3)
  priorChopEntries: ScoreLedgerEntry[];
  config?: RulesConfig;
  gameId: string;
}

export interface SettlementOutput {
  results: PlayerGameResult[];
  ledger: ScoreLedgerEntry[];
}

/**
 * Settles end-of-game scores and produces ledger entries and player results.
 */
export function settleGame(options: SettlementOptions): SettlementOutput {
  const {
    mode,
    endReason,
    players,
    winnerIds,
    violatorId,
    caughtPlayerId,
    kTwos = 1,
    priorChopEntries,
    config = defaultRulesConfig,
    gameId,
  } = options;

  const n = players.length;
  const ledger: ScoreLedgerEntry[] = [];
  const handEvaluations: Record<string, PlayerHandEvaluation> = {};

  // Track chop score deltas from prior chops
  const chopScoreDeltas: Record<string, number> = {};
  for (const p of players) {
    chopScoreDeltas[p.id] = 0;
  }
  for (const entry of priorChopEntries) {
    chopScoreDeltas[entry.fromPlayerId] = (chopScoreDeltas[entry.fromPlayerId] || 0) - entry.amount;
    if (mode === 'basic' && entry.toPlayerId) {
      chopScoreDeltas[entry.toPlayerId] = (chopScoreDeltas[entry.toPlayerId] || 0) + entry.amount;
    }
  }

  // Settlement score deltas
  const settlementDeltas: Record<string, number> = {};
  const winDeltas: Record<string, number> = {};
  for (const p of players) {
    settlementDeltas[p.id] = 0;
    winDeltas[p.id] = 0;
  }

  let ledgerSeq = 1;
  const makeLedgerId = () => `${gameId}-settle-${ledgerSeq++}`;

  // 1. NORMAL ENDING
  if (endReason === 'normal') {
    const winnerId = winnerIds[0];
    winDeltas[winnerId] = 1;

    let totalWinnerGain = 0;
    for (const p of players) {
      if (p.id === winnerId) continue;
      const isCong = !p.hasPlayedCard;
      const evalHand = evaluateHandPenalty(p.hand, isCong, config);
      handEvaluations[p.id] = evalHand;
      const penalty = evalHand.totalScore;

      settlementDeltas[p.id] -= penalty;
      totalWinnerGain += penalty;

      const reasonDesc = isCong
        ? `Cóng (${evalHand.cardCount} lá thối & cóng: -${penalty})`
        : `Thối / đếm bài (${evalHand.cardCount} lá: -${penalty})`;

      ledger.push({
        id: makeLedgerId(),
        gameId,
        type: 'settlement',
        reason: reasonDesc,
        fromPlayerId: p.id,
        toPlayerId: mode === 'basic' ? winnerId : undefined,
        amount: penalty,
        createdAt: Date.now(),
      });
    }

    if (mode === 'basic') {
      settlementDeltas[winnerId] += totalWinnerGain;
    }
  }

  // 2. FINISH WITH TWOS PENALTY (Về 2 cuối)
  else if (endReason === 'finishWithTwosPenalty') {
    const violator = violatorId!;
    const totalPenalty = 13 * kTwos * (n - 1);
    const opponentGain = 13 * kTwos;

    settlementDeltas[violator] -= totalPenalty;
    winDeltas[violator] = 0;

    for (const p of players) {
      if (p.id !== violator) {
        winDeltas[p.id] = 1; // All opponents get +1 win (Section 6.4 & 12.7)
        if (mode === 'basic') {
          settlementDeltas[p.id] += opponentGain;
        }

        ledger.push({
          id: makeLedgerId(),
          gameId,
          type: 'settlement',
          reason: `Phạt về ${kTwos} lá 2 cuối ván`,
          fromPlayerId: violator,
          toPlayerId: mode === 'basic' ? p.id : undefined,
          amount: opponentGain,
          createdAt: Date.now(),
        });
      }
    }
  }

  // 3. ĐÚT 3 BÍCH THÀNH CÔNG
  else if (endReason === 'dut3BichSuccess') {
    const winnerId = winnerIds[0];
    winDeltas[winnerId] = 1;
    let totalGain = 0;

    for (const p of players) {
      if (p.id !== winnerId) {
        settlementDeltas[p.id] -= 26;
        totalGain += 26;

        ledger.push({
          id: makeLedgerId(),
          gameId,
          type: 'settlement',
          reason: 'Bị đút 3 bích thành công (-26)',
          fromPlayerId: p.id,
          toPlayerId: mode === 'basic' ? winnerId : undefined,
          amount: 26,
          createdAt: Date.now(),
        });
      }
    }

    if (mode === 'basic') {
      settlementDeltas[winnerId] += totalGain;
    }
  }

  // 4. BẮT ĐÚT 3 BÍCH (DUT 3 BICH CAUGHT)
  else if (endReason === 'dut3BichCaught') {
    const blockerId = winnerIds[0];
    const caught = caughtPlayerId!;

    winDeltas[blockerId] = 1;
    settlementDeltas[caught] -= 26;

    if (mode === 'basic') {
      settlementDeltas[blockerId] += 26;
    }

    ledger.push({
      id: makeLedgerId(),
      gameId,
      type: 'settlement',
      reason: 'Bị bắt đút 3 bích (-26)',
      fromPlayerId: caught,
      toPlayerId: mode === 'basic' ? blockerId : undefined,
      amount: 26,
      createdAt: Date.now(),
    });
  }

  // 5. ĂN TRẮNG (INSTANT WIN)
  else if (endReason === 'instantWin') {
    const winnerId = winnerIds[0];
    winDeltas[winnerId] = 1;
    let totalGain = 0;

    for (const p of players) {
      if (p.id !== winnerId) {
        settlementDeltas[p.id] -= 13;
        totalGain += 13;

        ledger.push({
          id: makeLedgerId(),
          gameId,
          type: 'settlement',
          reason: 'Bị ăn trắng (-13)',
          fromPlayerId: p.id,
          toPlayerId: mode === 'basic' ? winnerId : undefined,
          amount: 13,
          createdAt: Date.now(),
        });
      }
    }

    if (mode === 'basic') {
      settlementDeltas[winnerId] += totalGain;
    }
  }

  // Format final player results
  const results: PlayerGameResult[] = players.map(p => {
    const chopDelta = chopScoreDeltas[p.id] || 0;
    const settleDelta = settlementDeltas[p.id] || 0;
    const isWinner = (winDeltas[p.id] || 0) > 0;

    let scoreDelta: number;
    if (mode === 'basic') {
      scoreDelta = chopDelta + settleDelta;
    } else {
      // Góp quỹ: total accumulated negative points (negative number or 0)
      scoreDelta = chopDelta + settleDelta;
    }

    return {
      playerId: p.id,
      seatIndex: p.seatIndex,
      isWinner,
      scoreDelta,
      winDelta: winDeltas[p.id] || 0,
      handEvaluation: handEvaluations[p.id],
      chopScoreDelta: chopDelta,
      settlementScoreDelta: settleDelta,
    };
  });

  return { results, ledger };
}
