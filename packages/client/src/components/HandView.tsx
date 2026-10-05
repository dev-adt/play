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
    <div className="w-full flex justify-center items-end relative select-none pb-1">
      <div
        className="flex items-end justify-center relative overflow-x-auto max-w-full pb-4 pt-6 px-4"
        style={{ minHeight: '110px' }}
      >
        {hand.map((card, idx) => {
          const isSelected = selectedCardIds.includes(card.id);
          // Overlap cards smoothly so every card's rank & suit is readable (matching Image 2)
          const overlap = cardCount > 11 ? -32 : cardCount > 8 ? -26 : -20;

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
