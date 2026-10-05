import { describe, it, expect } from 'vitest';
import {
  getCardById,
  identifyCombination,
  canBeat,
  defaultRulesConfig,
  evaluateHandPenalty,
  evaluateInstantWin,
  settleGame,
  sortCards,
} from '../src/index.js';

describe('10.1 Engine Luật Tiến lên miền Bắc', () => {
  it('7♠ chặn 6♠: Hợp lệ', () => {
    const c6S = identifyCombination([getCardById('6S')])!;
    const c7S = identifyCombination([getCardById('7S')])!;
    const res = canBeat(c6S, c7S);
    expect(res.valid).toBe(true);
    expect(res.isChop).toBe(false);
  });

  it('7♣ chặn 6♠: Không hợp lệ (khác chất)', () => {
    const c6S = identifyCombination([getCardById('6S')])!;
    const c7C = identifyCombination([getCardById('7C')])!;
    const res = canBeat(c6S, c7C);
    expect(res.valid).toBe(false);
  });

  it('2♣ chặn A♥: Hợp lệ', () => {
    const cAH = identifyCombination([getCardById('AH')])!;
    const c2C = identifyCombination([getCardById('2C')])!;
    const res = canBeat(cAH, c2C);
    expect(res.valid).toBe(true);
    expect(res.isChop).toBe(false);
  });

  it('2♦ chặn 2♣; 2♠ chặn 2♥: Hợp lệ; không hợp lệ', () => {
    const c2C = identifyCombination([getCardById('2C')])!;
    const c2D = identifyCombination([getCardById('2D')])!;
    const c2H = identifyCombination([getCardById('2H')])!;
    const c2S = identifyCombination([getCardById('2S')])!;

    expect(canBeat(c2C, c2D).valid).toBe(true);
    expect(canBeat(c2H, c2S).valid).toBe(false);
  });

  it('Đôi 8 đỏ chặn đôi 7 đỏ/đen: Hợp lệ/không hợp lệ', () => {
    // 7 đỏ: 7D, 7H. 7 đen: 7S, 7C. 8 đỏ: 8D, 8H.
    const pair7Red = identifyCombination([getCardById('7D'), getCardById('7H')])!;
    const pair7Black = identifyCombination([getCardById('7S'), getCardById('7C')])!;
    const pair8Red = identifyCombination([getCardById('8D'), getCardById('8H')])!;

    expect(canBeat(pair7Red, pair8Red).valid).toBe(true);
    expect(canBeat(pair7Black, pair8Red).valid).toBe(false);
  });

  it('Đôi 2 lẫn chất chặn đôi thường bất kỳ: Hợp lệ', () => {
    const pair2Mixed = identifyCombination([getCardById('2S'), getCardById('2D')])!;
    const pairKRed = identifyCombination([getCardById('KD'), getCardById('KH')])!;
    const pairKBlack = identifyCombination([getCardById('KS'), getCardById('KC')])!;

    expect(pair2Mixed).not.toBeNull();
    expect(canBeat(pairKRed, pair2Mixed).valid).toBe(true);
    expect(canBeat(pairKBlack, pair2Mixed).valid).toBe(true);
  });

  it('Bộ ba 8♠♦♥ chặn 5♠♦♥/5♣♦♥: Hợp lệ/không hợp lệ', () => {
    const triple5SDH = identifyCombination([getCardById('5S'), getCardById('5D'), getCardById('5H')])!;
    const triple5CDH = identifyCombination([getCardById('5C'), getCardById('5D'), getCardById('5H')])!;
    const triple8SDH = identifyCombination([getCardById('8S'), getCardById('8D'), getCardById('8H')])!;

    expect(canBeat(triple5SDH, triple8SDH).valid).toBe(true);
    expect(canBeat(triple5CDH, triple8SDH).valid).toBe(false);
  });

  it('Bộ ba 2 chặn bộ ba thường khác tập hợp chất: Hợp lệ', () => {
    const triple2 = identifyCombination([getCardById('2S'), getCardById('2C'), getCardById('2D')])!;
    const tripleQ = identifyCombination([getCardById('QC'), getCardById('QD'), getCardById('QH')])!;

    expect(canBeat(tripleQ, triple2).valid).toBe(true);
  });

  it('6–8♣ chặn 5–7♣; 6–8♥ chặn 5–7♣: Hợp lệ; không hợp lệ', () => {
    const straight57C = identifyCombination([getCardById('5C'), getCardById('6C'), getCardById('7C')])!;
    const straight68C = identifyCombination([getCardById('6C'), getCardById('7C'), getCardById('8C')])!;
    const straight68H = identifyCombination([getCardById('6H'), getCardById('7H'), getCardById('8H')])!;

    expect(canBeat(straight57C, straight68C).valid).toBe(true);
    expect(canBeat(straight57C, straight68H).valid).toBe(false);
  });

  it('Sảnh 4 lá chặn sảnh 3 lá: Không hợp lệ', () => {
    const straight3 = identifyCombination([getCardById('5C'), getCardById('6C'), getCardById('7C')])!;
    const straight4 = identifyCombination([getCardById('6C'), getCardById('7C'), getCardById('8C'), getCardById('9C')])!;

    expect(canBeat(straight3, straight4).valid).toBe(false);
  });

  it('Dãy đôi thông lẫn đỏ và đen: Không hợp lệ', () => {
    // 3S-3C (black), 4D-4H (red), 5S-5C (black)
    const mixed = identifyCombination([
      getCardById('3S'), getCardById('3C'),
      getCardById('4D'), getCardById('4H'),
      getCardById('5S'), getCardById('5C'),
    ]);
    expect(mixed).toBeNull();
  });

  it('3 đôi thông chặt một 2/đôi 2: Có/không', () => {
    const threeDS = identifyCombination([
      getCardById('3S'), getCardById('3C'),
      getCardById('4S'), getCardById('4C'),
      getCardById('5S'), getCardById('5C'),
    ])!;
    const single2 = identifyCombination([getCardById('2S')])!;
    const pair2 = identifyCombination([getCardById('2S'), getCardById('2C')])!;

    const chopSingle = canBeat(single2, threeDS);
    expect(chopSingle.valid).toBe(true);
    expect(chopSingle.isChop).toBe(true);

    const chopPair = canBeat(pair2, threeDS);
    expect(chopPair.valid).toBe(false);
  });

  it('Tứ quý chặt đôi 2/bộ ba 2: Có/không', () => {
    const tuQuy8 = identifyCombination([
      getCardById('8S'), getCardById('8C'), getCardById('8D'), getCardById('8H'),
    ])!;
    const pair2 = identifyCombination([getCardById('2S'), getCardById('2C')])!;
    const triple2 = identifyCombination([getCardById('2S'), getCardById('2C'), getCardById('2D')])!;

    const chopPair = canBeat(pair2, tuQuy8);
    expect(chopPair.valid).toBe(true);
    expect(chopPair.isChop).toBe(true);

    const chopTriple = canBeat(triple2, tuQuy8);
    expect(chopTriple.valid).toBe(false);
  });

  it('Sảnh 5 lá chặt đôi 2/bộ ba 2: Có/không', () => {
    const straight5 = identifyCombination([
      getCardById('5H'), getCardById('6H'), getCardById('7H'), getCardById('8H'), getCardById('9H'),
    ])!;
    const pair2 = identifyCombination([getCardById('2S'), getCardById('2C')])!;
    const triple2 = identifyCombination([getCardById('2S'), getCardById('2C'), getCardById('2D')])!;

    const chopPair = canBeat(pair2, straight5);
    expect(chopPair.valid).toBe(true);
    expect(chopPair.isChop).toBe(true);

    const chopTriple = canBeat(triple2, straight5);
    expect(chopTriple.valid).toBe(false);
  });

  it('Sảnh 6 lá chặt bộ ba 2: Có', () => {
    const straight6 = identifyCombination([
      getCardById('5H'), getCardById('6H'), getCardById('7H'),
      getCardById('8H'), getCardById('9H'), getCardById('10H'),
    ])!;
    const triple2 = identifyCombination([getCardById('2S'), getCardById('2C'), getCardById('2D')])!;

    const chopTriple = canBeat(triple2, straight6);
    expect(chopTriple.valid).toBe(true);
    expect(chopTriple.isChop).toBe(true);
  });

  it('4 đôi thông chặt sảnh 6 lá/bộ ba 2: Có/không', () => {
    const fourDS = identifyCombination([
      getCardById('3S'), getCardById('3C'),
      getCardById('4S'), getCardById('4C'),
      getCardById('5S'), getCardById('5C'),
      getCardById('6S'), getCardById('6C'),
    ])!;
    const straight6 = identifyCombination([
      getCardById('5H'), getCardById('6H'), getCardById('7H'),
      getCardById('8H'), getCardById('9H'), getCardById('10H'),
    ])!;
    const triple2 = identifyCombination([getCardById('2S'), getCardById('2C'), getCardById('2D')])!;

    // 4 đôi thông tier 4 > sảnh tier 3
    const chopStraight = canBeat(straight6, fourDS);
    expect(chopStraight.valid).toBe(true);
    expect(chopStraight.isChop).toBe(true);

    // 4 đôi thông cannot chop triple 2
    const chopTriple = canBeat(triple2, fourDS);
    expect(chopTriple.valid).toBe(false);
  });

  it('Hàng chặt hàng khác màu: Theo sức mạnh, không chặn bởi khác màu', () => {
    const fourDSBlack = identifyCombination([
      getCardById('3S'), getCardById('3C'),
      getCardById('4S'), getCardById('4C'),
      getCardById('5S'), getCardById('5C'),
      getCardById('6S'), getCardById('6C'),
    ])!;
    const tuQuyRed = identifyCombination([
      getCardById('8S'), getCardById('8C'), getCardById('8D'), getCardById('8H'),
    ])!;

    // 4 đôi thông (tier 4) chặt tứ quý (tier 2)
    const chop = canBeat(tuQuyRed, fourDSBlack);
    expect(chop.valid).toBe(true);
    expect(chop.isChop).toBe(true);
  });

  it('4–9♠ so 4–8♥ so 4–8♣: Thứ tự đúng như ví dụ', () => {
    // 4-9S (6 cards), 4-8H (5 cards, Hearts), 4-8C (5 cards, Clubs)
    const s49S = identifyCombination([
      getCardById('4S'), getCardById('5S'), getCardById('6S'),
      getCardById('7S'), getCardById('8S'), getCardById('9S'),
    ])!;
    const s48H = identifyCombination([
      getCardById('4H'), getCardById('5H'), getCardById('6H'),
      getCardById('7H'), getCardById('8H'),
    ])!;
    const s48C = identifyCombination([
      getCardById('4C'), getCardById('5C'), getCardById('6C'),
      getCardById('7C'), getCardById('8C'),
    ])!;

    // 4-8H beats 4-8C (same length 5, same rank 8, Heart > Club)
    expect(canBeat(s48C, s48H).valid).toBe(true);
    expect(canBeat(s48H, s48C).valid).toBe(false);

    // 4-9S (6 cards) beats 4-8H (5 cards)
    expect(canBeat(s48H, s49S).valid).toBe(true);
    expect(canBeat(s49S, s48H).valid).toBe(false);
  });
});
