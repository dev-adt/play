import React, { useEffect, useState } from 'react';
import { sounds } from '../audio';

interface FlyingCard {
  id: number;
  targetPosition: 'bottom' | 'top' | 'left' | 'right';
  delayMs: number;
  rotation: number;
}

interface DealingDeckAnimationProps {
  playerPositions: ('bottom' | 'top' | 'left' | 'right')[];
  onComplete: () => void;
}

export const DealingDeckAnimation: React.FC<DealingDeckAnimationProps> = ({
  playerPositions,
  onComplete,
}) => {
  const [flyingCards, setFlyingCards] = useState<FlyingCard[]>([]);
  const [deckCount, setDeckCount] = useState<number>(52);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);

  useEffect(() => {
    sounds.playDeal();

    // Generate dealing card sequence: 4 rounds of cards dealt to all active positions
    const cards: FlyingCard[] = [];
    const totalRounds = 4; // 4 visual dealing bursts per active player for fast & punchy excitement
    let cardId = 0;
    const intervalMs = 65; // ms between each dealt card

    for (let r = 0; r < totalRounds; r++) {
      for (const pos of playerPositions) {
        cards.push({
          id: cardId++,
          targetPosition: pos,
          delayMs: cardId * intervalMs,
          rotation: (Math.random() - 0.5) * 40,
        });
      }
    }

    setFlyingCards(cards);

    // Schedule sound clicks during dealing
    const timers: NodeJS.Timeout[] = [];
    cards.forEach((c) => {
      const t = setTimeout(() => {
        sounds.playCardSlide();
        setDeckCount((prev) => Math.max(0, prev - 1));
      }, c.delayMs);
      timers.push(t);
    });

    const totalDuration = cards.length * intervalMs + 450;

    const finishTimer = setTimeout(() => {
      setIsFinishing(true);
    }, totalDuration - 200);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, totalDuration);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finishTimer);
      clearTimeout(completeTimer);
    };
  }, []);

  const getTargetCoordinates = (pos: 'bottom' | 'top' | 'left' | 'right') => {
    switch (pos) {
      case 'bottom':
        return 'translate-y-[180px] sm:translate-y-[220px] md:translate-y-[260px] translate-x-0 scale-95';
      case 'top':
        return '-translate-y-[160px] sm:-translate-y-[190px] md:-translate-y-[220px] translate-x-0 scale-75';
      case 'left':
        return '-translate-x-[150px] sm:-translate-x-[240px] md:-translate-x-[320px] translate-y-0 scale-75';
      case 'right':
        return 'translate-x-[150px] sm:translate-x-[240px] md:translate-x-[320px] translate-y-0 scale-75';
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center overflow-hidden">
      {/* Dim backdrop aura for focused dealing excitement */}
      <div
        className={`absolute inset-0 bg-black/35 backdrop-blur-[1px] transition-opacity duration-300 ${
          isFinishing ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Center Deck (Bộ bài úp 3D ở giữa bàn) */}
      <div
        className={`relative flex items-center justify-center transition-all duration-300 ${
          isFinishing ? 'scale-75 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Glowing Deck Base Aura */}
        <div className="absolute w-28 h-36 rounded-2xl bg-amber-400/25 blur-xl animate-pulse" />

        {/* 3D Stack of Cards */}
        <div className="relative w-16 h-24 sm:w-20 sm:h-28 rounded-xl shadow-[0_15px_35px_rgba(0,0,0,0.8)] border-2 border-amber-400/70 select-none">
          {/* Stack thickness side lines */}
          <div className="absolute -left-1.5 top-1.5 bottom-0 w-1.5 bg-gradient-to-b from-amber-100 via-amber-200 to-amber-300 rounded-l border-y border-amber-400/80 shadow" />
          <div className="absolute -bottom-1.5 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 rounded-b border-x border-amber-500 shadow" />

          {/* Top card face (Red & Gold royal pattern) */}
          <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#800000] via-[#500000] to-[#250000] p-1 flex items-center justify-center border border-amber-300/60 shadow-inner">
            <div className="w-full h-full rounded-lg border border-dashed border-amber-400/60 flex flex-col items-center justify-center bg-black/20">
              <span className="text-amber-300 font-black text-xs sm:text-sm tracking-widest font-serif drop-shadow">
                TLMB
              </span>
              <div className="text-amber-400 text-xs">♠ ♥ ♣ ♦</div>
            </div>
          </div>

          {/* Small remaining badge */}
          <div className="absolute -top-3 -right-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 font-black text-[9px] px-1.5 py-0.5 rounded-full border border-white shadow">
            {deckCount}
          </div>
        </div>

        {/* Flying cards animated out towards players */}
        {flyingCards.map((c) => {
          const targetClass = getTargetCoordinates(c.targetPosition);
          return (
            <div
              key={c.id}
              style={{
                animationDelay: `${c.delayMs}ms`,
                ['--target-rot' as any]: `${c.rotation}deg`,
              }}
              className={`absolute w-14 h-20 sm:w-16 sm:h-24 rounded-xl border border-amber-400/70 bg-gradient-to-br from-[#8b0000] to-[#3a0000] shadow-xl p-0.5 pointer-events-none opacity-0 animate-card-deal-fly ${targetClass}`}
            >
              <div className="w-full h-full rounded-lg border border-dashed border-amber-300/40 bg-black/30 flex items-center justify-center">
                <span className="text-amber-300/80 text-[10px] font-serif">♠</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dealing Status Pill */}
      <div
        className={`absolute bottom-24 sm:bottom-28 bg-black/85 border border-amber-400/70 text-amber-300 text-xs sm:text-sm font-black px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 tracking-wide transition-all duration-300 ${
          isFinishing ? 'scale-90 opacity-0' : 'scale-100 opacity-100 animate-pulse'
        }`}
      >
        <span className="text-yellow-400">🎴</span>
        <span>ĐANG PHÁT BÀI NGẪU NHIÊN...</span>
      </div>
    </div>
  );
};
