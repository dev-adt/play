import React, { useEffect, useState } from 'react';
import { CardView } from './CardView';
import { User, ShieldAlert, WifiOff } from 'lucide-react';

interface PlayerSeatViewProps {
  player: {
    id: string;
    displayName: string;
    seatIndex: number;
    cardCount: number;
    hasPassed: boolean;
    isOnline: boolean;
    isCurrentTurn: boolean;
  };
  turnDeadline: number;
  turnTimeoutSeconds: number;
  isPendingDut3Bich?: boolean;
  position: 'top' | 'left' | 'right' | 'bottom';
}

export const PlayerSeatView: React.FC<PlayerSeatViewProps> = ({
  player,
  turnDeadline,
  turnTimeoutSeconds,
  isPendingDut3Bich = false,
  position,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!player.isCurrentTurn) {
      setTimeLeft(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((turnDeadline - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 200);

    return () => clearInterval(interval);
  }, [player.isCurrentTurn, turnDeadline]);

  // Position based orientation
  const isHorizontal = position === 'top' || position === 'bottom';

  return (
    <div
      className={`flex items-center gap-2 relative ${
        position === 'left' ? 'flex-col items-start' : position === 'right' ? 'flex-col items-end' : 'flex-row'
      }`}
    >
      {/* Player Avatar Box */}
      <div
        className={`glass-panel p-2.5 rounded-2xl flex items-center gap-2 relative transition-all duration-300 ${
          player.isCurrentTurn ? 'turn-halo bg-amber-950/40' : 'bg-slate-900/80'
        } ${!player.isOnline ? 'opacity-60' : ''}`}
        style={{ minWidth: '130px' }}
      >
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center font-bold text-slate-900 shadow">
            {player.displayName.charAt(0).toUpperCase()}
          </div>
          {!player.isOnline && (
            <div className="absolute -bottom-1 -right-1 bg-red-600 rounded-full p-0.5 text-white" title="Mất kết nối">
              <WifiOff size={12} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs text-amber-400 font-semibold truncate">Ghế {player.seatIndex + 1}</div>
          <div className="text-sm font-bold text-white truncate">{player.displayName}</div>
          <div className="text-xs text-slate-300 font-medium">Còn {player.cardCount} lá</div>
        </div>

        {/* Turn Countdown Badge */}
        {player.isCurrentTurn && (
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
              timeLeft <= 5
                ? 'border-red-500 bg-red-600/30 text-red-300 animate-ping'
                : 'border-amber-400 bg-amber-500/20 text-amber-300'
            }`}
          >
            {timeLeft}s
          </div>
        )}
      </div>

      {/* Badges: Passed / Pending Dut 3 Bich */}
      <div className="flex flex-col gap-1 items-center">
        {player.hasPassed && (
          <span className="bg-red-950/80 border border-red-500/60 text-red-200 text-xs px-2.5 py-0.5 rounded-full font-bold shadow animate-pulse">
            Đã bỏ lượt
          </span>
        )}
        {isPendingDut3Bich && (
          <span className="bg-purple-900/90 border border-purple-400 text-purple-200 text-xs px-2.5 py-0.5 rounded-full font-bold shadow animate-bounce flex items-center gap-1">
            <ShieldAlert size={12} /> Đang đút 3♠
          </span>
        )}
      </div>

      {/* Mini Card Stack Graphic */}
      {position !== 'bottom' && player.cardCount > 0 && (
        <div className="flex -space-x-4 select-none pointer-events-none opacity-90 scale-75 origin-top-left">
          {Array.from({ length: Math.min(player.cardCount, 5) }).map((_, i) => (
            <CardView key={i} isBack size="sm" />
          ))}
        </div>
      )}
    </div>
  );
};
