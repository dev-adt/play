import React from 'react';
import { Card, getCardAssetFileName } from '@tienlen/shared';

interface CardViewProps {
  card?: Card;
  isBack?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  isBack = false,
  isSelected = false,
  onClick,
  size = 'md',
  className = '',
}) => {
  let widthClass = 'w-16 md:w-20';
  let heightClass = 'h-24 md:h-28';

  if (size === 'sm') {
    widthClass = 'w-10 md:w-12';
    heightClass = 'h-14 md:h-18';
  } else if (size === 'lg') {
    widthClass = 'w-20 md:w-24';
    heightClass = 'h-28 md:h-36';
  }

  const assetName = isBack
    ? 'back.png'
    : card
    ? getCardAssetFileName(card)
    : 'back.png';

  const imageSrc = `/cards/${assetName}`;

  return (
    <div
      onClick={onClick}
      className={`card-item relative inline-block select-none rounded-lg overflow-hidden cursor-pointer transition-all duration-150 ${
        isSelected ? 'selected' : ''
      } ${className}`}
      style={{
        width: size === 'sm' ? '46px' : size === 'lg' ? '82px' : '64px',
        height: size === 'sm' ? '66px' : size === 'lg' ? '118px' : '92px',
        boxShadow: isSelected
          ? '0 0 15px rgba(245, 176, 65, 0.9), 0 10px 20px rgba(0,0,0,0.5)'
          : '0 4px 10px rgba(0,0,0,0.4)',
        border: isSelected ? '2px solid #f5b041' : '1px solid rgba(255,255,255,0.2)',
      }}
    >
      <img
        src={imageSrc}
        alt={card ? `${card.rank}${card.suit}` : 'Lá bài'}
        className="w-full h-full object-cover pointer-events-none"
        loading="eager"
      />
    </div>
  );
};
