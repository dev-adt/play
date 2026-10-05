import React, { useEffect, useState } from 'react';
import { CardView } from './CardView';
import { ShieldAlert, WifiOff, Crown, UserX } from 'lucide-react';

interface PlayerSeatViewProps {
  player?: {
    id: string;
    displayName: string;
    seatIndex: number;
    cardCount: number;
    hasPassed: boolean;
    isOnline: boolean;
    isCurrentTurn: boolean;
    isReady?: boolean;
    isOwner?: boolean | null;
    scoreText?: string;
  } | null;
  seatIndex: number;
  turnDeadline?: number;
  turnTimeoutSeconds?: number;
  isPendingDut3Bich?: boolean;
  position: 'top' | 'left' | 'right' | 'bottom';
  isLobby?: boolean;
  onTakeSeat?: (seatIndex: number) => void;
  canKick?: boolean;
  onKick?: (userId: string) => void;
}

export const PlayerSeatView: React.FC<PlayerSeatViewProps> = ({
  player,
  seatIndex,
  turnDeadline = 0,
  turnTimeoutSeconds = 30,
  isPendingDut3Bich = false,
  position,
  isLobby = false,
  onTakeSeat,
  canKick = false,
  onKick,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!player || !player.isCurrentTurn || turnDeadline <= 0) {
      setTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((turnDeadline - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 200);

    return () => clearInterval(interval);
  }, [player?.isCurrentTurn, turnDeadline]);

  // If seat is empty in lobby: show attractive "Ngồi ghế" button
  if (!player) {
    if (isLobby && onTakeSeat) {
      return (
        <button
          onClick={() => onTakeSeat(seatIndex)}
          className="flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed border-amber-400/40 bg-black/30 hover:bg-black/50 hover:border-amber-400 transition cursor-pointer select-none group"
          style={{ minWidth: '100px' }}
        >
          <div className="w-12 h-12 rounded-full border-2 border-amber-400/60 flex items-center justify-center text-amber-400 font-bold text-xl group-hover:scale-110 transition shadow">
            +
          </div>
          <span className="text-xs text-amber-300 font-bold mt-1.5">Ngồi ghế {seatIndex + 1}</span>
        </button>
      );
    }
    return null;
  }

  // Formatting score/chips (e.g. 250K, 4.35M)
  const scoreDisplay = player.scoreText || `${player.cardCount} lá`;

  return (
    <div
      className={`flex items-center gap-2.5 select-none relative ${
        position === 'left'
          ? 'flex-row'
          : position === 'right'
          ? 'flex-row-reverse'
          : position === 'top'
          ? 'flex-row items-center'
          : 'flex-col'
      }`}
    >
      {/* Player Avatar Box (ZingPlay style) */}
      <div className="flex flex-col items-center relative shrink-0">
        {/* Crown if owner */}
        {player.isOwner && (
          <div className="absolute -top-3.5 z-20 text-amber-400 filter drop-shadow">
            <Crown size={18} fill="#f5b041" />
          </div>
        )}

        {/* Circular Avatar */}
        <div className="relative">
          <div
            className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-2 p-0.5 overflow-hidden shadow-lg transition-all ${
              player.isCurrentTurn
                ? 'border-amber-400 ring-4 ring-amber-400/50 scale-105'
                : 'border-amber-500/60 bg-slate-900'
            }`}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-700 via-amber-500 to-amber-300 flex items-center justify-center font-black text-slate-950 text-xl font-display shadow-inner">
              {player.displayName.charAt(0).toUpperCase()}
            </div>
          </div>

          {!player.isOnline && (
            <div className="absolute -bottom-1 -right-1 bg-red-600 rounded-full p-1 text-white shadow" title="Mất kết nối">
              <WifiOff size={11} />
            </div>
          )}

          {/* Turn timer circular badge (Matching Image 2 with "20") */}
          {player.isCurrentTurn && (
            <div className="absolute -top-1 -right-2 turn-timer-ring w-7 h-7 flex items-center justify-center z-20">
              {timeLeft}
            </div>
          )}
        </div>

        {/* Name pill */}
        <div className="bg-black/80 border border-amber-500/40 rounded-full px-2.5 py-0.5 mt-1 max-w-[110px] text-center shadow">
          <div className="text-[11px] md:text-xs font-bold text-white truncate font-display">
            {player.displayName}
          </div>
        </div>

        {/* Score / Chips under name */}
        <div className="text-[11px] font-extrabold text-amber-400 mt-0.5 tracking-tight font-display drop-shadow">
          {scoreDisplay}
        </div>

        {/* Host Kick Button */}
        {canKick && onKick && player && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Bạn có chắc muốn kick "${player.displayName}" ra khỏi bàn?`)) {
                onKick(player.id);
              }
            }}
            className="mt-1 bg-red-700/80 hover:bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-red-400 shadow-md flex items-center gap-1 transition active:scale-95 cursor-pointer"
            title={`Kick ${player.displayName} ra khỏi phòng`}
          >
            <UserX size={10} /> Kick
          </button>
        )}
      </div>

      {/* Blue Card Back with count badge (Matching Image 2!) */}
      {position !== 'bottom' && player.cardCount > 0 && !isLobby && (
        <div className="relative shrink-0">
          <CardView isBack backCount={player.cardCount} size="sm" />
        </div>
      )}

      {/* Badges: BỎ LƯỢT / ĐÚT 3♠ / SẴN SÀNG */}
      <div className="flex flex-col items-center gap-1 z-20 shrink-0">
        {player.hasPassed && (
          <div className="badge-bo-luot animate-pulse">
            BỎ LƯỢT
          </div>
        )}

        {isPendingDut3Bich && (
          <div className="bg-purple-950 border-2 border-purple-400 text-purple-200 text-xs px-2.5 py-0.5 rounded-full font-black animate-bounce flex items-center gap-1 shadow-lg">
            <ShieldAlert size={12} /> ĐÚT 3♠
          </div>
        )}

        {isLobby && (
          <div className="mt-1">
            {player.isReady || player.isOwner ? (
              <span className="bg-emerald-600/90 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300">
                SẴN SÀNG
              </span>
            ) : (
              <span className="bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                CHỜ
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
