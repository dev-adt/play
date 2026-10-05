import React from 'react';
import { Card } from '@tienlen/shared';
import { CardView } from './CardView';

interface HandViewProps {
  hand: Card[];
  selectedCardIds: string[];
  onToggleSelect: (cardId: string) => void;
  isThrowing?: boolean;
}

export const HandView: React.FC<HandViewProps> = ({
  hand,
  selectedCardIds,
  onToggleSelect,
  isThrowing = false,
}) => {
  const cardCount = hand.length;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Calculate dynamic overlap in pixels so all 13 cards fit horizontally on screen
  const overlapPx = isMobile
    ? (cardCount > 11 ? -33 : cardCount > 9 ? -27 : cardCount > 6 ? -20 : -14)
    : (cardCount > 11 ? -36 : cardCount > 9 ? -30 : cardCount > 6 ? -24 : -16);

  const raiseY = isMobile ? -16 : -24;

  return (
    <div className="w-full flex items-end justify-center select-none overflow-x-auto overflow-y-visible px-1 sm:px-2 pt-4 sm:pt-7 pb-1 scrollbar-none">
      <div
        className="flex flex-row flex-nowrap items-end justify-center relative"
        style={{
          minHeight: isMobile ? '82px' : '115px',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        {hand.map((card, idx) => {
          const isSelected = selectedCardIds.includes(card.id);
          const isBeingThrown = isThrowing && isSelected;

          return (
            <div
              key={card.id}
              style={{
                marginLeft: idx === 0 ? '0px' : `${overlapPx}px`,
                zIndex: isBeingThrown ? 100 + idx : idx,
                transform: !isBeingThrown && isSelected ? `translateY(${raiseY}px)` : undefined,
                transition: 'transform 0.16s cubic-bezier(0.2, 0.8, 0.4, 1)',
              }}
              className={`relative shrink-0 cursor-pointer ${
                isBeingThrown
                  ? 'animate-card-throw'
                  : !isSelected
                  ? 'hover:-translate-y-2'
                  : ''
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
