import React from 'react';
import { Card, Suit } from '@tienlen/shared';

interface CardViewProps {
  card?: Card;
  isBack?: boolean;
  backCount?: number; // Count shown in center of back card (like in Image 2!)
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'xs' | 'mini' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  isBack = false,
  backCount,
  isSelected = false,
  onClick,
  size = 'md',
  className = '',
}) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Dimensions
  let width = 68;
  let height = 98;
  let fontSize = '1.3rem';
  let suitSize = '1.1rem';

  if (size === 'xs' || size === 'mini') {
    width = isMobile ? 24 : 30;
    height = isMobile ? 36 : 45;
    fontSize = isMobile ? '0.62rem' : '0.75rem';
    suitSize = isMobile ? '0.52rem' : '0.62rem';
  } else if (size === 'sm') {
    width = isMobile ? 40 : 46;
    height = isMobile ? 58 : 66;
    fontSize = isMobile ? '0.8rem' : '0.9rem';
    suitSize = isMobile ? '0.7rem' : '0.8rem';
  } else if (size === 'md') {
    if (isMobile) {
      width = 54;
      height = 78;
      fontSize = '1.1rem';
      suitSize = '0.95rem';
    }
  } else if (size === 'lg') {
    width = 82;
    height = 118;
    fontSize = '1.6rem';
    suitSize = '1.4rem';
  }

  // 1. Back Card (Blue patterned card back with circular count badge, matching Image 2!)
  if (isBack) {
    return (
      <div
        onClick={onClick}
        className={`relative inline-flex items-center justify-center select-none rounded-md overflow-hidden shadow-lg border border-blue-300/40 ${className}`}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          background: 'linear-gradient(135deg, #1e3a8a 0%, #172554 100%)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.6)',
        }}
      >
        {/* Blue geometric pattern */}
        <div
          className="absolute inset-1 rounded border border-blue-400/40 opacity-70"
          style={{
            backgroundImage: 'radial-gradient(#60a5fa 1px, transparent 1px)',
            backgroundSize: '6px 6px',
          }}
        />

        {/* Center count badge (matching Image 2 with vibrant contrast) */}
        {backCount !== undefined && (
          <div className="relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500 border-2 border-white text-slate-950 font-black text-xs sm:text-sm shadow-xl flex items-center justify-center font-display drop-shadow">
            {backCount}
          </div>
        )}
      </div>
    );
  }

  if (!card) return null;

  const isRed = card.color === 'red';
  const colorHex = isRed ? '#e53935' : '#1e293b';

  const suitSymbols: Record<Suit, string> = {
    'S': '♠',
    'C': '♣',
    'D': '♦',
    'H': '♥',
  };

  const suitSymbol = suitSymbols[card.suit];

  return (
    <div
      onClick={onClick}
      className={`card-playable relative inline-block select-none rounded-lg overflow-hidden bg-white text-slate-900 border border-slate-300 transition-all duration-150 ${
        isSelected ? 'selected' : ''
      } ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        color: colorHex,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: isSelected
          ? '0 0 15px rgba(245, 176, 65, 0.9), 0 8px 20px rgba(0,0,0,0.6)'
          : '0 3px 8px rgba(0,0,0,0.4)',
        border: isSelected ? '2px solid #f5b041' : '1px solid rgba(0,0,0,0.15)',
      }}
    >
      {/* Top Left Rank & Suit */}
      <div className="absolute top-1 left-1.5 flex flex-col items-center leading-none">
        <span
          className="font-black font-display tracking-tighter"
          style={{ fontSize }}
        >
          {card.rank}
        </span>
        <span style={{ fontSize: suitSize, marginTop: '-2px' }}>
          {suitSymbol}
        </span>
      </div>

      {/* Center Big Suit Symbol (Matching Image 2 style) */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-85 pointer-events-none select-none"
        style={{
          fontSize: size === 'sm' ? '1.8rem' : size === 'lg' ? '3rem' : '2.4rem',
        }}
      >
        {suitSymbol}
      </div>

      {/* Bottom Right Rank & Suit (upside down) */}
      <div className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180">
        <span
          className="font-black font-display tracking-tighter"
          style={{ fontSize }}
        >
          {card.rank}
        </span>
        <span style={{ fontSize: suitSize, marginTop: '-2px' }}>
          {suitSymbol}
        </span>
      </div>
    </div>
  );
};
