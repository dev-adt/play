import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Award, RotateCcw, AlertOctagon, Flame, X, Share2 } from 'lucide-react';
import { sounds } from '../audio';
import { CardView } from './CardView';

interface ResultModalProps {
  result: {
    endReason: string;
    endReasonText: string;
    winners: string[];
    playerResults: any[];
    ledger: any[];
    betAmount?: number;
  };
  players: { id: string; displayName: string; seatIndex: number }[];
  mode: 'basic' | 'fund';
  myUserId: string;
  onNextGame: () => void;
  autoStartTime?: number | null;
  betAmount?: number;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  result,
  players,
  mode,
  myUserId,
  onNextGame,
  autoStartTime,
  betAmount: propBetAmount,
}) => {
  const isWinner = result.winners.includes(myUserId);
  const [secondsLeft, setSecondsLeft] = useState<number>(5);
  const [showLedger, setShowLedger] = useState<boolean>(false);
  const effectiveBet = propBetAmount || result.betAmount || 10;

  // 5 seconds auto start countdown
  useEffect(() => {
    const target = autoStartTime || Date.now() + 5000;
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 200);
    return () => clearInterval(interval);
  }, [autoStartTime]);

  // Grand celebratory fireworks display
  useEffect(() => {
    const isPlayerInGame = players.some(p => p.id === myUserId);
    if (isWinner) {
      sounds.playWin();

      const duration = 4800;
      const animationEnd = Date.now() + duration;

      // Opening dual cannons from bottom corners (zIndex 99999 so it renders on top!)
      confetti({
        particleCount: 75,
        spread: 85,
        angle: 60,
        startVelocity: 52,
        origin: { x: 0.1, y: 0.85 },
        zIndex: 99999,
        colors: ['#ffd700', '#f59e0b', '#ef4444', '#10b981', '#38bdf8', '#ffffff'],
      });
      confetti({
        particleCount: 75,
        spread: 85,
        angle: 120,
        startVelocity: 52,
        origin: { x: 0.9, y: 0.85 },
        zIndex: 99999,
        colors: ['#ffd700', '#f59e0b', '#ef4444', '#10b981', '#38bdf8', '#ffffff'],
      });

      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        // Rocket burst left side
        confetti({
          startVelocity: 42,
          spread: 85,
          angle: 60,
          ticks: 75,
          origin: {
            x: Math.random() * 0.25 + 0.05,
            y: Math.random() * 0.35 + 0.55,
          },
          colors: ['#fbbf24', '#f59e0b', '#ef4444', '#10b981', '#60a5fa', '#ffffff'],
          shapes: ['circle', 'star'],
          scalar: 1.15,
          zIndex: 99999,
          particleCount: 35,
        });

        // Rocket burst right side
        confetti({
          startVelocity: 42,
          spread: 85,
          angle: 120,
          ticks: 75,
          origin: {
            x: Math.random() * 0.25 + 0.7,
            y: Math.random() * 0.35 + 0.55,
          },
          colors: ['#ffd700', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ffffff'],
          shapes: ['circle', 'star'],
          scalar: 1.15,
          zIndex: 99999,
          particleCount: 35,
        });

        // Golden star fountain from top
        if (Math.random() < 0.45) {
          confetti({
            particleCount: 30,
            angle: 270,
            spread: 120,
            startVelocity: 24,
            origin: { x: Math.random() * 0.6 + 0.2, y: 0.05 },
            colors: ['#ffd700', '#fef08a', '#ffffff'],
            shapes: ['star'],
            scalar: 1.25,
            zIndex: 99999,
          });
        }
      }, 350);

      return () => clearInterval(interval);
    } else if (isPlayerInGame) {
      sounds.playLose();
    } else {
      sounds.playWin();
    }
  }, [isWinner, myUserId]);

  // Sort players for podium display: Winner first, then by score delta descending
  const sortedPlayerResults = [...result.playerResults].sort((a, b) => {
    if (a.isWinner && !b.isWinner) return -1;
    if (!a.isWinner && b.isWinner) return 1;
    return b.scoreDelta - a.scoreDelta;
  });

  const getRankTitle = (idx: number, isWon: boolean, totalCount: number) => {
    if (isWon) return 'Nhất';
    if (totalCount === 2) return 'Bét';
    if (totalCount === 3) return idx === 1 ? 'Nhì' : 'Bét';
    if (idx === 1) return 'Nhì';
    if (idx === 2) return 'Ba';
    return 'Bét';
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Tiến Lên Miền Bắc Online',
        text: `Tôi vừa kết thúc ván Tiến Lên Miền Bắc! ${result.endReasonText}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Đã sao chép liên kết phòng vào clipboard!');
    }
  };

  return (
    <div className="modal-overlay flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="modal-content max-w-2xl w-full text-slate-900 rounded-3xl border-2 border-amber-300/80 shadow-[0_20px_60px_rgba(0,0,0,0.85)] bg-gradient-to-b from-[#fdfbf7] via-[#f7f2e7] to-[#ede4d1] overflow-hidden relative">
        {/* Header Bar (Matching Image 2: "KẾT QUẢ" with Red Close Button) */}
        <div className="relative py-3.5 px-4 text-center border-b border-amber-900/15 bg-gradient-to-r from-amber-200/50 via-amber-100/70 to-amber-200/50 flex items-center justify-center shadow-sm">
          <h2 className="text-xl sm:text-2xl font-black text-amber-900 font-display tracking-wider drop-shadow-sm flex items-center gap-2">
            <span>🏆</span>
            <span>KẾT QUẢ</span>
          </h2>

          {/* Red Circle Close Button (Matching Image 2!) */}
          <button
            onClick={onNextGame}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-red-700 text-white flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer border border-white/60"
            title="Đóng kết quả"
          >
            <X size={18} strokeWidth={3} />
          </button>
        </div>

        {/* Subheader: End Reason Text & Room Bet */}
        <div className="text-center pt-2.5 pb-1 px-4">
          <div className="text-xs sm:text-sm font-extrabold text-amber-800 font-display">
            {result.endReasonText}
          </div>
          <div className="text-[11px] text-stone-600 font-medium mt-0.5 flex items-center justify-center gap-2">
            <span>{mode === 'basic' ? 'Chế độ: Basic' : 'Chế độ: Góp quỹ'}</span>
            <span>•</span>
            <span className="font-bold text-amber-900">Mức cược: {effectiveBet}$/điểm</span>
          </div>
        </div>

        {/* Player Result Cards Grid (Matching Image 2 layout!) */}
        <div className="p-3 sm:p-5">
          <div className={`grid gap-2.5 sm:gap-3 ${
            sortedPlayerResults.length === 2
              ? 'grid-cols-2 max-w-md mx-auto'
              : sortedPlayerResults.length === 3
              ? 'grid-cols-3'
              : 'grid-cols-2 sm:grid-cols-4'
          }`}>
            {sortedPlayerResults.map((pr, idx) => {
              const player = players.find(p => p.id === pr.playerId);
              const isMe = pr.playerId === myUserId;
              const won = pr.isWinner;
              const moneyDelta = pr.moneyDelta !== undefined ? pr.moneyDelta : pr.scoreDelta * effectiveBet;
              const rankTitle = getRankTitle(idx, won, sortedPlayerResults.length);
              const remainingHand = pr.remainingHand || [];

              return (
                <div
                  key={pr.playerId}
                  className={`flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all ${
                    won
                      ? 'bg-gradient-to-b from-amber-50 to-amber-100/90 border-amber-400 shadow-[0_4px_18px_rgba(251,191,36,0.35)] ring-2 ring-amber-400/50'
                      : isMe
                      ? 'bg-gradient-to-b from-white to-amber-50/70 border-amber-300 shadow-md ring-1 ring-amber-400/30'
                      : 'bg-white/85 border-stone-200/90 shadow'
                  }`}
                >
                  {/* Rank Header Pill (Nhất, Nhì, Ba, Bét - Matching Image 2!) */}
                  <div
                    className={`font-black text-xs sm:text-sm px-3 py-0.5 rounded-full mb-1.5 shadow-sm ${
                      won
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 font-display'
                        : rankTitle === 'Bét'
                        ? 'bg-stone-200 text-stone-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {rankTitle}
                  </div>

                  {/* Player Avatar Box */}
                  <div className="relative my-1">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl p-0.5 overflow-hidden shadow-md flex items-center justify-center font-black text-lg ${
                      won
                        ? 'bg-gradient-to-tr from-amber-600 to-yellow-400 text-slate-950 ring-2 ring-amber-400'
                        : 'bg-gradient-to-tr from-stone-400 to-stone-200 text-stone-800'
                    }`}>
                      {player?.displayName ? player.displayName.charAt(0).toUpperCase() : '?'}
                    </div>
                    {won && (
                      <span className="absolute -top-2 -right-1 text-sm filter drop-shadow">👑</span>
                    )}
                  </div>

                  {/* Player Display Name */}
                  <div className="text-center w-full px-1">
                    <div className="text-xs sm:text-sm font-black text-stone-900 truncate font-display">
                      {player?.displayName || 'Người chơi'}
                    </div>
                    {isMe && (
                      <span className="text-[10px] text-amber-700 font-bold">(Bạn)</span>
                    )}
                  </div>

                  {/* Score & Money Delta (Matching Image 2: +1447 🪙 / -400 🪙) */}
                  <div className="my-1.5 text-center">
                    <div className={`text-sm sm:text-base font-black font-mono flex items-center justify-center gap-1 drop-shadow-sm ${
                      moneyDelta > 0
                        ? 'text-emerald-600'
                        : moneyDelta < 0
                        ? 'text-red-600'
                        : 'text-stone-600'
                    }`}>
                      <span>{moneyDelta > 0 ? `+${moneyDelta.toLocaleString()}` : `${moneyDelta.toLocaleString()}`}</span>
                      <span className="text-xs">💰</span>
                    </div>
                    <div className="text-[10px] font-bold text-stone-500">
                      ({pr.scoreDelta > 0 ? `+${pr.scoreDelta}` : pr.scoreDelta} điểm)
                    </div>
                  </div>

                  {/* REMAINING HAND CARDS (Matching Image 2: Displays all remaining cards face-up!) */}
                  <div className="w-full mt-1 flex flex-col items-center">
                    {won || remainingHand.length === 0 ? (
                      <div className="text-[10px] sm:text-[11px] font-black text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full border border-amber-400/60 shadow-sm flex items-center gap-1">
                        <span>✨</span> Hết bài
                      </div>
                    ) : (
                      <div className="w-full flex items-center justify-center -space-x-3 sm:-space-x-4 py-1 px-0.5 overflow-x-auto max-w-[140px] sm:max-w-[180px]">
                        {remainingHand.map((card: any, cardIdx: number) => (
                          <div
                            key={card.id || cardIdx}
                            className="shrink-0 hover:-translate-y-1 transition-transform drop-shadow"
                          >
                            <CardView card={card} size="xs" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Penalty / Ledger Dropdown Toggle (Các khoản phạt nếu có) */}
          {result.ledger && result.ledger.length > 0 && (
            <div className="mt-3 text-center">
              <button
                onClick={() => setShowLedger(!showLedger)}
                className="text-[11px] font-bold text-stone-600 hover:text-amber-800 underline transition cursor-pointer"
              >
                {showLedger ? '▲ Thu gọn chi tiết phạt' : '▼ Xem chi tiết các khoản phạt & chặt trong ván'}
              </button>
              {showLedger && (
                <div className="mt-2 bg-stone-100 rounded-xl p-2.5 border border-stone-300 text-xs text-left max-h-28 overflow-y-auto space-y-1">
                  {result.ledger.map((l, i) => (
                    <div key={l.id || i} className="flex justify-between text-stone-700">
                      <span>{l.reason}</span>
                      <span className="font-bold text-amber-800">
                        {l.toPlayerId ? `±${l.amount}` : `-${l.amount}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Action Buttons (Matching Image 2: Green "CHIA SẺ", Red "TIẾP TỤC"!) */}
        <div className="p-3 sm:p-4 bg-stone-100/90 border-t border-amber-900/10 flex items-center justify-center gap-3">
          {/* "CHIA SẺ" Pill Button (Matching Image 2!) */}
          <button
            onClick={handleShare}
            className="py-2.5 px-6 rounded-full font-black text-xs sm:text-sm text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-110 active:scale-95 shadow-md flex items-center gap-1.5 transition cursor-pointer border border-emerald-300"
          >
            <Share2 size={16} />
            <span>CHIA SẺ</span>
          </button>

          {/* "TIẾP TỤC" Pill Button (Matching Image 2!) with 5s countdown */}
          <button
            onClick={onNextGame}
            className="py-2.5 px-8 rounded-full font-black text-xs sm:text-sm text-white bg-gradient-to-r from-rose-600 via-red-600 to-red-700 hover:brightness-110 active:scale-95 shadow-lg flex items-center gap-1.5 transition cursor-pointer border border-red-300"
          >
            <RotateCcw size={16} className={secondsLeft > 0 ? 'animate-spin' : ''} />
            <span>TIẾP TỤC {secondsLeft > 0 ? `(${secondsLeft}s)` : ''}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
