import React from 'react';
import { Card } from '@tienlen/shared';
import { CardView } from './CardView';

interface HandViewProps {
  hand: Card[];
  selectedCardIds: string[];
  onToggleSelect: (cardId: string) => void;
}

export const HandView: React.FC<HandViewProps> = ({
  hand,
  selectedCardIds,
  onToggleSelect,
}) => {
  const cardCount = hand.length;

  return (
    <div className="w-full flex justify-center items-end py-2 px-1 relative select-none">
      <div
        className="flex items-end justify-center relative overflow-x-auto max-w-full pb-6 pt-8 px-4"
        style={{
          minHeight: '120px',
        }}
      >
        {hand.map((card, idx) => {
          const isSelected = selectedCardIds.includes(card.id);
          // Overlap cards: negative margin-left on all except the first card
          // Dynamically adjust overlap based on card count
          const overlap = cardCount > 10 ? -28 : cardCount > 6 ? -22 : -14;

          return (
            <div
              key={card.id}
              style={{
                marginLeft: idx === 0 ? '0px' : `${overlap}px`,
                zIndex: isSelected ? 40 + idx : idx,
              }}
              className="relative transition-transform duration-150"
            >
              <CardView
                card={card}
                isSelected={isSelected}
                size="md"
                onClick={() => onToggleSelect(card.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
