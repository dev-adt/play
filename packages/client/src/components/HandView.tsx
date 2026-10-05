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

  // Calculate dynamic overlap in pixels so all 13 cards fit horizontally on screen
  // Card width is 64px on desktop, 48px on mobile
  const overlapPx =
    cardCount > 11 ? -36 : cardCount > 9 ? -30 : cardCount > 6 ? -24 : -16;

  return (
    <div className="w-full flex items-end justify-center select-none overflow-x-auto overflow-y-visible px-2 pt-8 pb-1 scrollbar-none">
      <div
        className="flex flex-row flex-nowrap items-end justify-center relative"
        style={{
          minHeight: '115px',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        {hand.map((card, idx) => {
          const isSelected = selectedCardIds.includes(card.id);

          return (
            <div
              key={card.id}
              style={{
                marginLeft: idx === 0 ? '0px' : `${overlapPx}px`,
                zIndex: idx,
                transform: isSelected ? 'translateY(-24px)' : undefined,
                transition: 'transform 0.16s cubic-bezier(0.2, 0.8, 0.4, 1)',
              }}
              className={`relative shrink-0 cursor-pointer ${
                !isSelected ? 'hover:-translate-y-2' : ''
              }`}
              onClick={() => onToggleSelect(card.id)}
            >
              <CardView
                card={card}
                isSelected={isSelected}
                size="md"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
