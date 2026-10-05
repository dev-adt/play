import { Card, Color, Rank, Suit } from './types.js';

export const RANKS: Rank[] = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
export const SUITS: Suit[] = ['S', 'C', 'D', 'H'];

export const RANK_VALUES: Record<Rank, number> = {
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
  '2': 15,
};

export const SUIT_VALUES: Record<Suit, number> = {
  'S': 1, // Bích ♠
  'C': 2, // Chuồn / Tép ♣
  'D': 3, // Rô ♦
  'H': 4, // Cơ ♥
};

export function getSuitColor(suit: Suit): Color {
  return (suit === 'S' || suit === 'C') ? 'black' : 'red';
}

export function createCard(rank: Rank, suit: Suit): Card {
  return {
    id: `${rank}${suit}`,
    rank,
    suit,
    rankValue: RANK_VALUES[rank],
    suitValue: SUIT_VALUES[suit],
    color: getSuitColor(suit),
  };
}

export const ALL_CARDS: Card[] = [];
for (const r of RANKS) {
  for (const s of SUITS) {
    ALL_CARDS.push(createCard(r, s));
  }
}

export const CARDS_BY_ID: Record<string, Card> = Object.fromEntries(
  ALL_CARDS.map(c => [c.id, c])
);

export function getCardById(id: string): Card {
  const card = CARDS_BY_ID[id];
  if (!card) {
    throw new Error(`Invalid card ID: ${id}`);
  }
  return card;
}

/**
 * Compare two cards: first by rank value, then by suit value.
 */
export function compareCards(a: Card, b: Card): number {
  if (a.rankValue !== b.rankValue) {
    return a.rankValue - b.rankValue;
  }
  return a.suitValue - b.suitValue;
}

/**
 * Sort cards in ascending order (3S is lowest, 2H is highest).
 */
export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort(compareCards);
}

/**
 * Maps a card to asset file name in playing-cards-assets-master/png/
 * e.g. 10_of_diamonds.png, ace_of_spades.png, 2_of_hearts.png, king_of_clubs.png
 */
export function getCardAssetFileName(card: Card): string {
  const rankNames: Record<Rank, string> = {
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',
    '10': '10',
    'J': 'jack',
    'Q': 'queen',
    'K': 'king',
    'A': 'ace',
    '2': '2',
  };

  const suitNames: Record<Suit, string> = {
    'S': 'spades',
    'C': 'clubs',
    'D': 'diamonds',
    'H': 'hearts',
  };

  return `${rankNames[card.rank]}_of_${suitNames[card.suit]}.png`;
}

/**
 * Fisher-Yates shuffle with cryptographic random values.
 */
export function shuffleDeck(cards: Card[] = ALL_CARDS): Card[] {
  const deck = [...cards];
  for (let i = deck.length - 1; i > 0; i--) {
    let randIndex: number;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const buffer = new Uint32Array(1);
      crypto.getRandomValues(buffer);
      randIndex = buffer[0] % (i + 1);
    } else {
      randIndex = Math.floor(Math.random() * (i + 1));
    }
    const temp = deck[i];
    deck[i] = deck[randIndex];
    deck[randIndex] = temp;
  }
  return deck;
}

/**
 * Deal 13 cards each for 2 to 4 players.
 * Remaining cards are kept face down and not in game.
 */
export function dealCards(playerCount: number): { hands: Card[][]; leftover: Card[] } {
  if (playerCount < 2 || playerCount > 4) {
    throw new Error('Số người chơi phải từ 2 đến 4');
  }
  const deck = shuffleDeck();
  const hands: Card[][] = [];
  for (let i = 0; i < playerCount; i++) {
    const hand = deck.slice(i * 13, (i + 1) * 13);
    hands.push(sortCards(hand));
  }
  const leftover = deck.slice(playerCount * 13);
  return { hands, leftover };
}

/**
 * Finds the player with the lowest card dealt.
 */
export function findLowestCardPlayerIndex(hands: Card[][]): { playerIndex: number; lowestCard: Card } {
  let lowestPlayer = 0;
  let lowestCard = hands[0][0]; // Assuming hands are sorted

  for (let i = 0; i < hands.length; i++) {
    const playerLowest = hands[i][0];
    if (compareCards(playerLowest, lowestCard) < 0) {
      lowestCard = playerLowest;
      lowestPlayer = i;
    }
  }

  return { playerIndex: lowestPlayer, lowestCard };
}
