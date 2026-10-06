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
  onCardReceivedBottom?: (cardIndex: number) => void;
  onComplete: () => void;
}

export const DealingDeckAnimation: React.FC<DealingDeckAnimationProps> = ({
  playerPositions,
  onCardReceivedBottom,
  onComplete,
}) => {
  const [flyingCards, setFlyingCards] = useState<FlyingCard[]>([]);
  const [deckCount, setDeckCount] = useState<number>(52);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);

  useEffect(() => {
    sounds.playDeal();

    // 13 dealing rounds (each active player receives 1 card per round, total 13 cards each)
    const cards: FlyingCard[] = [];
    const totalRounds = 13;
    let cardId = 0;

    // Fast, crisp interval based on player count (total duration ~2.2s - 2.8s)
    const intervalMs = playerPositions.length === 2 ? 75 : playerPositions.length === 3 ? 55 : 44;

    for (let r = 0; r < totalRounds; r++) {
      for (const pos of playerPositions) {
        cards.push({
          id: cardId++,
          targetPosition: pos,
          delayMs: cardId * intervalMs,
          rotation: (Math.random() - 0.5) * 35,
        });
      }
    }

    setFlyingCards(cards);

    // Schedule sound effects and card delivery callbacks
    const timers: NodeJS.Timeout[] = [];
    cards.forEach((c) => {
      // Sound effect when card flies off deck
      const startTimer = setTimeout(() => {
        sounds.playCardSlide();
        setDeckCount((prev) => Math.max(0, prev - 1));
      }, c.delayMs);
      timers.push(startTimer);

      // Card arrival callback for bottom player
      if (c.targetPosition === 'bottom' && onCardReceivedBottom) {
        const arrivalTimer = setTimeout(() => {
          onCardReceivedBottom(c.id);
        }, c.delayMs + 260);
        timers.push(arrivalTimer);
      }
    });

    const totalDuration = cards.length * intervalMs + 380;

    const finishTimer = setTimeout(() => {
      setIsFinishing(true);
    }, totalDuration - 220);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, totalDuration);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finishTimer);
      clearTimeout(completeTimer);
    };
  }, []);

  const getFlyClass = (pos: 'bottom' | 'top' | 'left' | 'right') => {
    switch (pos) {
      case 'bottom':
        return 'deal-fly-bottom';
      case 'top':
        return 'deal-fly-top';
      case 'left':
        return 'deal-fly-left';
      case 'right':
        return 'deal-fly-right';
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
          const flyClass = getFlyClass(c.targetPosition);
          return (
            <div
              key={c.id}
              style={{
                animationDelay: `${c.delayMs}ms`,
                ['--target-rot' as any]: `${c.rotation}deg`,
              }}
              className={`absolute w-12 h-16 sm:w-16 sm:h-22 rounded-xl border border-amber-300/80 bg-gradient-to-br from-[#8b0000] via-[#5a0000] to-[#2a0000] shadow-2xl p-0.5 pointer-events-none opacity-0 ${flyClass}`}
            >
              <div className="w-full h-full rounded-lg border border-dashed border-amber-300/50 bg-black/30 flex items-center justify-center shadow-inner">
                <span className="text-amber-300/90 text-xs font-serif font-black">♠</span>
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
        <span>ĐANG PHÁT BÀI TỪNG LÁ...</span>
      </div>
    </div>
  );
};
