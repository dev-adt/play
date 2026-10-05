import { describe, it, expect } from 'vitest';
import {
  getCardById,
  evaluateHandPenalty,
  settleGame,
  ScoreLedgerEntry,
  PlayerSettlementInput,
  identifyCombination,
  getChopPenalty,
  evaluateInstantWin,
} from '../src/index.js';

describe('10.2 Điểm và Kết Thúc (Scoring & Settlements)', () => {
  it('Các ví dụ 3/5/3/9 điểm ở 6.2 phải khớp tuyệt đối', () => {
    // 1. Còn 2♠ và 7 bất kỳ: 2 + 1 = 3
    const hand1 = [getCardById('2S'), getCardById('7D')];
    const eval1 = evaluateHandPenalty(hand1, false);
    expect(eval1.totalScore).toBe(3);

    // 2. Còn 2♥ và K: 4 + 1 = 5
    const hand2 = [getCardById('2H'), getCardById('KC')];
    const eval2 = evaluateHandPenalty(hand2, false);
    expect(eval2.totalScore).toBe(5);

    // 3. Còn 3, 4, 5 thường: 1 + 1 + 1 = 3
    const hand3 = [getCardById('3S'), getCardById('4C'), getCardById('5D')];
    const eval3 = evaluateHandPenalty(hand3, false);
    expect(eval3.totalScore).toBe(3);

    // 4. Còn tứ quý thường và một 9: 8 + 1 = 9
    const hand4 = [
      getCardById('8S'), getCardById('8C'), getCardById('8D'), getCardById('8H'),
      getCardById('9S'),
    ];
    const eval4 = evaluateHandPenalty(hand4, false);
    expect(eval4.totalScore).toBe(9);

    // 5. Còn 3 đôi thông thường: tổng 6, không cộng thêm 6 lá
    const hand5 = [
      getCardById('3S'), getCardById('3C'),
      getCardById('4S'), getCardById('4C'),
      getCardById('5S'), getCardById('5C'),
    ];
    const eval5 = evaluateHandPenalty(hand5, false);
    expect(eval5.totalScore).toBe(6);

    // 6. Còn 4 đôi thông thường: tổng 8, không cộng thêm 8 lá và không cộng thêm 3 đôi thông
    const hand6 = [
      getCardById('3S'), getCardById('3C'),
      getCardById('4S'), getCardById('4C'),
      getCardById('5S'), getCardById('5C'),
      getCardById('6S'), getCardById('6C'),
    ];
    const eval6 = evaluateHandPenalty(hand6, false);
    expect(eval6.totalScore).toBe(8);

    // 7. Tứ quý 2: so với 4 lá 2 riêng (2+2+4+4=12) chọn tối đa là 12
    const hand7 = [
      getCardById('2S'), getCardById('2C'), getCardById('2D'), getCardById('2H'),
    ];
    const eval7 = evaluateHandPenalty(hand7, false);
    expect(eval7.totalScore).toBe(12);
  });

  it('Đôi 2 bị chặt: cộng giá trị từng 2 (2♠2♥ = 6)', () => {
    const pair2 = identifyCombination([getCardById('2S'), getCardById('2H')])!;
    const chopVal = getChopPenalty(pair2);
    expect(chopVal).toBe(6);
  });

  it('Cóng kết hợp thối theo quy ước 12.2', () => {
    // Cóng 13 lá thường: rotScore = 13, congScore = 13 + 13 = 26
    const handNormal13 = [
      getCardById('3S'), getCardById('4S'), getCardById('5S'), getCardById('6S'),
      getCardById('7S'), getCardById('8S'), getCardById('9S'), getCardById('10S'),
      getCardById('JS'), getCardById('QS'), getCardById('KS'), getCardById('AS'),
      getCardById('3C'),
    ];
    const evalNormal13 = evaluateHandPenalty(handNormal13, true);
    expect(evalNormal13.totalScore).toBe(26);

    // Cóng với 1 lá 2♠ và 12 lá thường: rotScore = 2 + 12 = 14; congScore = 14 + 13 = 27
    const hand2S = [
      getCardById('2S'),
      getCardById('3S'), getCardById('4S'), getCardById('5S'), getCardById('6S'),
      getCardById('7S'), getCardById('8S'), getCardById('9S'), getCardById('10S'),
      getCardById('JS'), getCardById('QS'), getCardById('KS'), getCardById('AS'),
    ];
    const eval2S = evaluateHandPenalty(hand2S, true);
    expect(eval2S.totalScore).toBe(27);

    // Cóng với 1 lá 2♥ và 12 lá thường: rotScore = 4 + 12 = 16; congScore = 16 + 13 = 29
    const hand2H = [
      getCardById('2H'),
      getCardById('3S'), getCardById('4S'), getCardById('5S'), getCardById('6S'),
      getCardById('7S'), getCardById('8S'), getCardById('9S'), getCardById('10S'),
      getCardById('JS'), getCardById('QS'), getCardById('KS'), getCardById('AS'),
    ];
    const eval2H = evaluateHandPenalty(hand2H, true);
    expect(eval2H.totalScore).toBe(29);
  });

  it('Basic mode settlement: A thắng, B (3), C (5), D (9) => A +17, B -3, C -5, D -9', () => {
    const players: PlayerSettlementInput[] = [
      { id: 'A', seatIndex: 0, hand: [], hasPlayedCard: true },
      { id: 'B', seatIndex: 1, hand: [getCardById('2S'), getCardById('7D')], hasPlayedCard: true },
      { id: 'C', seatIndex: 2, hand: [getCardById('2H'), getCardById('KC')], hasPlayedCard: true },
      {
        id: 'D',
        seatIndex: 3,
        hand: [
          getCardById('8S'), getCardById('8C'), getCardById('8D'), getCardById('8H'),
          getCardById('9S'),
        ],
        hasPlayedCard: true,
      },
    ];

    const result = settleGame({
      mode: 'basic',
      endReason: 'normal',
      players,
      winnerIds: ['A'],
      priorChopEntries: [],
      gameId: 'g1',
    });

    const resA = result.results.find(r => r.playerId === 'A')!;
    const resB = result.results.find(r => r.playerId === 'B')!;
    const resC = result.results.find(r => r.playerId === 'C')!;
    const resD = result.results.find(r => r.playerId === 'D')!;

    expect(resA.scoreDelta).toBe(17);
    expect(resA.isWinner).toBe(true);
    expect(resB.scoreDelta).toBe(-3);
    expect(resC.scoreDelta).toBe(-5);
    expect(resD.scoreDelta).toBe(-9);

    // Sum of Basic scores must be 0
    const sum = resA.scoreDelta + resB.scoreDelta + resC.scoreDelta + resD.scoreDelta;
    expect(sum).toBe(0);
  });

  it('Góp quỹ mode settlement: cùng bài trên, A +1 thắng; B/C/D tăng điểm trừ 3/5/9, A không nhận +17', () => {
    const players: PlayerSettlementInput[] = [
      { id: 'A', seatIndex: 0, hand: [], hasPlayedCard: true },
      { id: 'B', seatIndex: 1, hand: [getCardById('2S'), getCardById('7D')], hasPlayedCard: true },
      { id: 'C', seatIndex: 2, hand: [getCardById('2H'), getCardById('KC')], hasPlayedCard: true },
      {
        id: 'D',
        seatIndex: 3,
        hand: [
          getCardById('8S'), getCardById('8C'), getCardById('8D'), getCardById('8H'),
          getCardById('9S'),
        ],
        hasPlayedCard: true,
      },
    ];

    const result = settleGame({
      mode: 'fund',
      endReason: 'normal',
      players,
      winnerIds: ['A'],
      priorChopEntries: [],
      gameId: 'g2',
    });

    const resA = result.results.find(r => r.playerId === 'A')!;
    const resB = result.results.find(r => r.playerId === 'B')!;
    const resC = result.results.find(r => r.playerId === 'C')!;
    const resD = result.results.find(r => r.playerId === 'D')!;

    expect(resA.scoreDelta).toBe(0);
    expect(resA.winDelta).toBe(1);
    expect(resA.isWinner).toBe(true);
    expect(resB.scoreDelta).toBe(-3);
    expect(resC.scoreDelta).toBe(-5);
    expect(resD.scoreDelta).toBe(-9);
  });

  it('A bị B chặt 2♥ (-4) rồi A về đầu: A vẫn giữ khoản -4; Basic B giữ +4; Góp quỹ B không có điểm cộng, A vừa thắng vừa tăng điểm trừ 4', () => {
    const chopEntry: ScoreLedgerEntry = {
      id: 'chop1',
      gameId: 'g3',
      type: 'chop',
      reason: 'B chặt 2♥ của A',
      fromPlayerId: 'A',
      toPlayerId: 'B',
      amount: 4,
      createdAt: Date.now(),
    };

    const players: PlayerSettlementInput[] = [
      { id: 'A', seatIndex: 0, hand: [], hasPlayedCard: true },
      { id: 'B', seatIndex: 1, hand: [getCardById('3S')], hasPlayedCard: true },
    ];

    // In Basic:
    const basicRes = settleGame({
      mode: 'basic',
      endReason: 'normal',
      players,
      winnerIds: ['A'],
      priorChopEntries: [chopEntry],
      gameId: 'g3-basic',
    });

    const aBasic = basicRes.results.find(r => r.playerId === 'A')!;
    const bBasic = basicRes.results.find(r => r.playerId === 'B')!;
    // A gained +1 from B's 1 remaining card, but lost 4 in chop: net = 1 - 4 = -3
    expect(aBasic.settlementScoreDelta).toBe(1);
    expect(aBasic.chopScoreDelta).toBe(-4);
    expect(aBasic.scoreDelta).toBe(-3);
    // B lost -1 in settlement, gained +4 in chop: net = -1 + 4 = +3
    expect(bBasic.scoreDelta).toBe(3);

    // In Góp quỹ:
    const fundRes = settleGame({
      mode: 'fund',
      endReason: 'normal',
      players,
      winnerIds: ['A'],
      priorChopEntries: [chopEntry],
      gameId: 'g3-fund',
    });

    const aFund = fundRes.results.find(r => r.playerId === 'A')!;
    const bFund = fundRes.results.find(r => r.playerId === 'B')!;
    // A won, settlement is 0, but chop delta is -4! Total scoreDelta = -4
    expect(aFund.isWinner).toBe(true);
    expect(aFund.winDelta).toBe(1);
    expect(aFund.scoreDelta).toBe(-4);
    // B lost -1 in settlement, chop gave no positive points, so scoreDelta = -1
    expect(bFund.scoreDelta).toBe(-1);
    expect(bFund.winDelta).toBe(0);
  });

  it('Về một 2 cuối ở bàn 4 người: người vi phạm -39; Basic mỗi đối thủ +13; Góp quỹ mỗi đối thủ +1 thắng', () => {
    const players: PlayerSettlementInput[] = [
      { id: 'A', seatIndex: 0, hand: [], hasPlayedCard: true }, // Violator
      { id: 'B', seatIndex: 1, hand: [getCardById('3S')], hasPlayedCard: true },
      { id: 'C', seatIndex: 2, hand: [getCardById('4S')], hasPlayedCard: true },
      { id: 'D', seatIndex: 3, hand: [getCardById('5S')], hasPlayedCard: true },
    ];

    // Basic
    const basicRes = settleGame({
      mode: 'basic',
      endReason: 'finishWithTwosPenalty',
      players,
      winnerIds: [],
      violatorId: 'A',
      kTwos: 1,
      priorChopEntries: [],
      gameId: 'g4-basic',
    });

    const aBasic = basicRes.results.find(r => r.playerId === 'A')!;
    expect(aBasic.scoreDelta).toBe(-39);
    expect(aBasic.isWinner).toBe(false);

    for (const id of ['B', 'C', 'D']) {
      const p = basicRes.results.find(r => r.playerId === id)!;
      expect(p.scoreDelta).toBe(13);
      expect(p.isWinner).toBe(true);
      expect(p.winDelta).toBe(1);
    }

    // Góp quỹ
    const fundRes = settleGame({
      mode: 'fund',
      endReason: 'finishWithTwosPenalty',
      players,
      winnerIds: [],
      violatorId: 'A',
      kTwos: 1,
      priorChopEntries: [],
      gameId: 'g4-fund',
    });

    const aFund = fundRes.results.find(r => r.playerId === 'A')!;
    expect(aFund.scoreDelta).toBe(-39);
    expect(aFund.winDelta).toBe(0);

    for (const id of ['B', 'C', 'D']) {
      const p = fundRes.results.find(r => r.playerId === id)!;
      expect(p.scoreDelta).toBe(0);
      expect(p.isWinner).toBe(true);
      expect(p.winDelta).toBe(1);
    }
  });

  it('Về đôi 2 cuối bàn 3 người: người vi phạm -52; Basic hai đối thủ mỗi người +26', () => {
    const players: PlayerSettlementInput[] = [
      { id: 'A', seatIndex: 0, hand: [], hasPlayedCard: true },
      { id: 'B', seatIndex: 1, hand: [getCardById('3S')], hasPlayedCard: true },
      { id: 'C', seatIndex: 2, hand: [getCardById('4S')], hasPlayedCard: true },
    ];

    const basicRes = settleGame({
      mode: 'basic',
      endReason: 'finishWithTwosPenalty',
      players,
      winnerIds: [],
      violatorId: 'A',
      kTwos: 2,
      priorChopEntries: [],
      gameId: 'g5',
    });

    const a = basicRes.results.find(r => r.playerId === 'A')!;
    const b = basicRes.results.find(r => r.playerId === 'B')!;
    const c = basicRes.results.find(r => r.playerId === 'C')!;

    // 13 * 2 * (3 - 1) = 52
    expect(a.scoreDelta).toBe(-52);
    expect(b.scoreDelta).toBe(26);
    expect(c.scoreDelta).toBe(26);
  });

  it('Về bộ ba 2 cuối bàn 2 người: người vi phạm -39; đối thủ hưởng đúng theo chế độ', () => {
    const players: PlayerSettlementInput[] = [
      { id: 'A', seatIndex: 0, hand: [], hasPlayedCard: true },
      { id: 'B', seatIndex: 1, hand: [getCardById('3S')], hasPlayedCard: true },
    ];

    const basicRes = settleGame({
      mode: 'basic',
      endReason: 'finishWithTwosPenalty',
      players,
      winnerIds: [],
      violatorId: 'A',
      kTwos: 3,
      priorChopEntries: [],
      gameId: 'g6',
    });

    const a = basicRes.results.find(r => r.playerId === 'A')!;
    const b = basicRes.results.find(r => r.playerId === 'B')!;

    // 13 * 3 * (2 - 1) = 39
    expect(a.scoreDelta).toBe(-39);
    expect(b.scoreDelta).toBe(39);
  });

  it('Đút 3♠ thành công bàn 4: ba đối thủ mỗi người -26; Basic người thắng +78; Góp quỹ chỉ +1 thắng', () => {
    const players: PlayerSettlementInput[] = [
      { id: 'A', seatIndex: 0, hand: [getCardById('3S')], hasPlayedCard: true },
      { id: 'B', seatIndex: 1, hand: [getCardById('4S')], hasPlayedCard: true },
      { id: 'C', seatIndex: 2, hand: [getCardById('5S')], hasPlayedCard: true },
      { id: 'D', seatIndex: 3, hand: [getCardById('6S')], hasPlayedCard: true },
    ];

    // Basic
    const basicRes = settleGame({
      mode: 'basic',
      endReason: 'dut3BichSuccess',
      players,
      winnerIds: ['A'],
      priorChopEntries: [],
      gameId: 'g7-basic',
    });

    const aBasic = basicRes.results.find(r => r.playerId === 'A')!;
    expect(aBasic.scoreDelta).toBe(78);
    expect(aBasic.winDelta).toBe(1);
    for (const id of ['B', 'C', 'D']) {
      expect(basicRes.results.find(r => r.playerId === id)!.scoreDelta).toBe(-26);
    }

    // Góp quỹ
    const fundRes = settleGame({
      mode: 'fund',
      endReason: 'dut3BichSuccess',
      players,
      winnerIds: ['A'],
      priorChopEntries: [],
      gameId: 'g7-fund',
    });

    const aFund = fundRes.results.find(r => r.playerId === 'A')!;
    expect(aFund.scoreDelta).toBe(0);
    expect(aFund.winDelta).toBe(1);
    for (const id of ['B', 'C', 'D']) {
      expect(fundRes.results.find(r => r.playerId === id)!.scoreDelta).toBe(-26);
    }
  });

  it('Đút bị bắt: người bị bắt -26, Basic người bắt +26; Góp quỹ người bắt +1 thắng; không phạt người thứ 3/4', () => {
    const players: PlayerSettlementInput[] = [
      { id: 'A', seatIndex: 0, hand: [getCardById('3S')], hasPlayedCard: true }, // Caught
      { id: 'B', seatIndex: 1, hand: [], hasPlayedCard: true }, // Blocker
      { id: 'C', seatIndex: 2, hand: [getCardById('5S')], hasPlayedCard: true },
      { id: 'D', seatIndex: 3, hand: [getCardById('6S')], hasPlayedCard: true },
    ];

    const basicRes = settleGame({
      mode: 'basic',
      endReason: 'dut3BichCaught',
      players,
      winnerIds: ['B'],
      caughtPlayerId: 'A',
      priorChopEntries: [],
      gameId: 'g8',
    });

    const a = basicRes.results.find(r => r.playerId === 'A')!;
    const b = basicRes.results.find(r => r.playerId === 'B')!;
    const c = basicRes.results.find(r => r.playerId === 'C')!;
    const d = basicRes.results.find(r => r.playerId === 'D')!;

    expect(a.scoreDelta).toBe(-26);
    expect(b.scoreDelta).toBe(26);
    expect(b.winDelta).toBe(1);
    expect(c.scoreDelta).toBe(0);
    expect(d.scoreDelta).toBe(0);
  });

  it('Ăn trắng: 6 điều kiện, đúng ưu tiên; mỗi đối thủ -13; không phạt thối/cóng', () => {
    // 1. Tứ quý 2
    const handTwos = [
      getCardById('2S'), getCardById('2C'), getCardById('2D'), getCardById('2H'),
      getCardById('3S'), getCardById('4S'), getCardById('5S'), getCardById('6S'),
      getCardById('7S'), getCardById('8S'), getCardById('9S'), getCardById('10S'),
      getCardById('JS'),
    ];
    const iwTwos = evaluateInstantWin(handTwos, false);
    expect(iwTwos.hasInstantWin).toBe(true);
    expect(iwTwos.type).toBe('four_twos');
    expect(iwTwos.priority).toBe(1);

    // 2. Sảnh 3-A đồng chất 12 lá
    const handDragon = [
      getCardById('3S'), getCardById('4S'), getCardById('5S'), getCardById('6S'),
      getCardById('7S'), getCardById('8S'), getCardById('9S'), getCardById('10S'),
      getCardById('JS'), getCardById('QS'), getCardById('KS'), getCardById('AS'),
      getCardById('2H'),
    ];
    const iwDragon = evaluateInstantWin(handDragon, false);
    expect(iwDragon.hasInstantWin).toBe(true);
    expect(iwDragon.type).toBe('dragon_straight_12');
    expect(iwDragon.priority).toBe(2);

    // 3. 6 đôi hợp lệ
    const handSixPairs = [
      getCardById('3S'), getCardById('3C'),
      getCardById('4D'), getCardById('4H'),
      getCardById('5S'), getCardById('5C'),
      getCardById('6D'), getCardById('6H'),
      getCardById('7S'), getCardById('7C'),
      getCardById('2S'), getCardById('2D'), // đôi 2 khác màu hợp lệ
      getCardById('9S'),
    ];
    const iwSixPairs = evaluateInstantWin(handSixPairs, false);
    expect(iwSixPairs.hasInstantWin).toBe(true);
    expect(iwSixPairs.type).toBe('six_pairs');
    expect(iwSixPairs.priority).toBe(3);

    // 4. 5 đôi thông đồng màu
    const hand5DS = [
      getCardById('3S'), getCardById('3C'),
      getCardById('4S'), getCardById('4C'),
      getCardById('5S'), getCardById('5C'),
      getCardById('6S'), getCardById('6C'),
      getCardById('7S'), getCardById('7C'),
      getCardById('9D'), getCardById('10D'), getCardById('JD'),
    ];
    const iw5DS = evaluateInstantWin(hand5DS, false);
    expect(iw5DS.hasInstantWin).toBe(true);
    expect(iw5DS.type).toBe('five_double_sequence');
    expect(iw5DS.priority).toBe(4);

    // 5. 13 lá cùng màu (không có sảnh rồng 12 lá cùng chất và không đủ 6 đôi)
    const hand13Red = [
      getCardById('3D'), getCardById('3H'),
      getCardById('5D'), getCardById('6D'),
      getCardById('7D'), getCardById('8D'),
      getCardById('9D'), getCardById('10D'),
      getCardById('JD'), getCardById('QD'),
      getCardById('KD'), getCardById('2D'),
      getCardById('2H'),
    ];
    const iw13Red = evaluateInstantWin(hand13Red, false);
    expect(iw13Red.hasInstantWin).toBe(true);
    expect(iw13Red.type).toBe('thirteen_same_color');
    expect(iw13Red.priority).toBe(5);

    // 6. Tứ quý 3 ở ván đầu
    const handThrees = [
      getCardById('3S'), getCardById('3C'), getCardById('3D'), getCardById('3H'),
      getCardById('4S'), getCardById('5S'), getCardById('6S'), getCardById('7S'),
      getCardById('8S'), getCardById('9S'), getCardById('10S'), getCardById('JS'),
      getCardById('QS'),
    ];
    const iwThreesFirst = evaluateInstantWin(handThrees, true);
    expect(iwThreesFirst.hasInstantWin).toBe(true);
    expect(iwThreesFirst.type).toBe('four_threes_first_game');
    expect(iwThreesFirst.priority).toBe(6);

    // Ván sau: Tứ quý 3 KHÔNG được tính ăn trắng
    const iwThreesNext = evaluateInstantWin(handThrees, false);
    expect(iwThreesNext.hasInstantWin).toBe(false);
  });
});
