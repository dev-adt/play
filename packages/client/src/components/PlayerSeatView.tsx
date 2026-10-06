import React, { useEffect, useState } from 'react';
import { CardView } from './CardView';
import { ShieldAlert, WifiOff, Crown, UserX, Mic, MicOff, VolumeX, Volume2 } from 'lucide-react';

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
    balance?: number;
    remainingHand?: any[];
    scoreDeltaBadge?: number;
  } | null;
  seatIndex: number;
  turnDeadline?: number;
  turnTimeoutSeconds?: number;
  serverTime?: number;
  isPendingDut3Bich?: boolean;
  position: 'top' | 'left' | 'right' | 'bottom';
  isLobby?: boolean;
  onTakeSeat?: (seatIndex: number) => void;
  canKick?: boolean;
  onKick?: (userId: string) => void;
  chatBubbleText?: string | null;
  onInspectPlayer?: (playerId: string, displayName: string, seatIndex: number) => void;
  isVoiceActive?: boolean;
  isSpeaking?: boolean;
  isMutedByMe?: boolean;
  onToggleMutePeer?: () => void;
}

export const PlayerSeatView: React.FC<PlayerSeatViewProps> = ({
  player,
  seatIndex,
  turnDeadline = 0,
  turnTimeoutSeconds = 15,
  serverTime,
  isPendingDut3Bich = false,
  position,
  isLobby = false,
  onTakeSeat,
  canKick = false,
  onKick,
  chatBubbleText,
  onInspectPlayer,
  isVoiceActive = false,
  isSpeaking = false,
  isMutedByMe = false,
  onToggleMutePeer,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!player || !player.isCurrentTurn || turnDeadline <= 0) {
      setTimeLeft(0);
      return;
    }

    const maxSec = turnTimeoutSeconds > 0 ? turnTimeoutSeconds : 15;
    let initialRemaining = maxSec;

    if (serverTime && turnDeadline > 0) {
      const serverDiff = Math.ceil((turnDeadline - serverTime) / 1000);
      initialRemaining = Math.min(maxSec, Math.max(0, serverDiff));
    } else {
      const clientDiff = Math.ceil((turnDeadline - Date.now()) / 1000);
      if (clientDiff > maxSec || clientDiff < 0) {
        initialRemaining = maxSec;
      } else {
        initialRemaining = clientDiff;
      }
    }

    setTimeLeft(initialRemaining);
    const startTimestamp = Date.now();

    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
      const remaining = Math.max(0, initialRemaining - elapsedSeconds);
      setTimeLeft(remaining);
    }, 250);

    return () => clearInterval(interval);
  }, [player?.isCurrentTurn, turnDeadline, turnTimeoutSeconds, serverTime]);

  // If seat is empty: show attractive "Ngồi ghế" button
  if (!player) {
    if (onTakeSeat) {
      return (
        <button
          onClick={() => onTakeSeat(seatIndex)}
          className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl border-2 border-dashed border-amber-400/40 bg-black/40 hover:bg-black/60 hover:border-amber-400 transition cursor-pointer select-none group"
          style={{ minWidth: '76px' }}
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-amber-400/60 flex items-center justify-center text-amber-400 font-bold text-base sm:text-lg group-hover:scale-110 transition shadow">
            +
          </div>
          <span className="text-[10px] sm:text-xs text-amber-300 font-bold mt-1">Ngồi ghế {seatIndex + 1}</span>
          {!isLobby && (
            <span className="text-[9px] text-amber-200/70 font-semibold">Chờ ván sau</span>
          )}
        </button>
      );
    }
    return null;
  }

  // Formatting score/chips (e.g. 250K, 4.35M)
  const scoreDisplay = player.scoreText || `${player.cardCount} lá`;

  return (
    <div
      className={`flex items-center gap-1.5 sm:gap-2.5 select-none relative ${
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
        {/* Floating Chat Speech Bubble */}
        {chatBubbleText && (
          <div className="absolute -top-11 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-200 via-white to-amber-100 text-slate-950 font-black text-xs px-3 py-1.5 rounded-2xl shadow-2xl border-2 border-amber-400 whitespace-nowrap animate-bounce max-w-[200px] truncate pointer-events-none drop-shadow-md">
            {chatBubbleText}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-[6px] border-t-amber-200" />
          </div>
        )}

        {/* Crown if owner */}
        {player.isOwner && (
          <div className="absolute -top-3.5 z-20 text-amber-400 filter drop-shadow">
            <Crown size={18} fill="#f5b041" />
          </div>
        )}

        {/* Circular Avatar */}
        <div
          className={`relative ${onInspectPlayer ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
          onClick={() => onInspectPlayer && onInspectPlayer(player.id, player.displayName, player.seatIndex)}
          title="Nhấn để xem số dư & lịch sử điểm"
        >
          <div
            className={`w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full border-2 p-0.5 overflow-hidden shadow-lg transition-all ${
              isSpeaking
                ? 'border-emerald-400 ring-4 ring-emerald-400/80 shadow-[0_0_18px_rgba(52,211,153,0.9)] scale-105 animate-pulse'
                : player.isCurrentTurn
                ? 'border-amber-400 ring-4 ring-amber-400/50 scale-105'
                : 'border-amber-500/60 bg-slate-900'
            }`}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-700 via-amber-500 to-amber-300 flex items-center justify-center font-black text-slate-950 text-base sm:text-xl font-display shadow-inner">
              {player.displayName.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Voice Microphone status badge */}
          <div
            onClick={e => {
              if (onToggleMutePeer) {
                e.stopPropagation();
                onToggleMutePeer();
              }
            }}
            className={`absolute -bottom-1 -left-1 rounded-full p-1 border shadow transition z-20 ${
              isMutedByMe
                ? 'bg-red-800 border-red-400 text-white cursor-pointer'
                : isSpeaking
                ? 'bg-emerald-500 border-emerald-300 text-slate-950 animate-bounce'
                : isVoiceActive
                ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300'
                : 'bg-black/80 border-slate-700 text-slate-500'
            }`}
            title={
              isMutedByMe
                ? 'Bạn đã tắt âm người này (Bấm để bật lại)'
                : isSpeaking
                ? 'Đang nói...'
                : isVoiceActive
                ? 'Micro đang bật'
                : 'Micro đang tắt'
            }
          >
            {isMutedByMe ? (
              <VolumeX size={10} />
            ) : isVoiceActive ? (
              <Mic size={10} className={isSpeaking ? 'stroke-[3]' : ''} />
            ) : (
              <MicOff size={10} />
            )}
          </div>

          {!player.isOnline && (
            <div className="absolute -bottom-1 -right-1 bg-red-600 rounded-full p-1 text-white shadow z-20" title="Mất kết nối">
              <WifiOff size={11} />
            </div>
          )}

          {/* Turn timer circular badge */}
          {player.isCurrentTurn && (
            <div
              className={`absolute -top-1 -right-2 turn-timer-ring w-6 h-6 sm:w-7 sm:h-7 text-xs flex items-center justify-center z-20 ${
                timeLeft <= 5 ? 'warning' : ''
              }`}
            >
              {timeLeft}
            </div>
          )}

          {/* Victory / Defeat Score Delta Bubble (Matching Image 1!) */}
          {player.scoreDeltaBadge !== undefined && (
            <div
              className={`absolute -top-3.5 left-1/2 -translate-x-1/2 z-40 px-2 sm:px-2.5 py-0.5 rounded-full font-black text-[10px] sm:text-xs shadow-2xl border flex items-center gap-0.5 whitespace-nowrap animate-bounce drop-shadow-md ${
                player.scoreDeltaBadge > 0
                  ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white border-green-200 ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(34,197,94,0.8)]'
                  : player.scoreDeltaBadge < 0
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-yellow-200 border-red-300 ring-2 ring-red-400 shadow-[0_0_15px_rgba(239,68,68,0.8)]'
                  : 'bg-slate-800 text-slate-300 border-slate-600'
              }`}
            >
              {player.scoreDeltaBadge > 0 ? `+${player.scoreDeltaBadge.toLocaleString()}$` : `${player.scoreDeltaBadge.toLocaleString()}$`}
            </div>
          )}
        </div>

        {/* Name pill */}
        <div
          onClick={() => onInspectPlayer && onInspectPlayer(player.id, player.displayName, player.seatIndex)}
          className={`bg-black/80 border border-amber-500/40 rounded-full px-2 py-0.5 mt-0.5 max-w-[85px] sm:max-w-[110px] text-center shadow ${
            onInspectPlayer ? 'cursor-pointer hover:border-amber-400' : ''
          }`}
          title="Nhấn để xem thông tin & lịch sử"
        >
          <div className="text-[10px] sm:text-xs font-bold text-white truncate font-display">
            {player.displayName}
          </div>
        </div>

        {/* Money Balance Badge */}
        <div
          onClick={() => onInspectPlayer && onInspectPlayer(player.id, player.displayName, player.seatIndex)}
          className="mt-0.5 bg-gradient-to-r from-amber-950/90 to-yellow-950/90 border border-amber-400/70 rounded-full px-1.5 py-0.5 flex items-center justify-center gap-1 shadow cursor-pointer hover:border-yellow-300"
          title="Số tiền hiện có (Nhấn xem lịch sử điểm)"
        >
          <span className="text-[10px] sm:text-[11px] font-black text-amber-300 font-mono tracking-tight">
            💰 {(player.balance ?? 1000).toLocaleString()}$
          </span>
        </div>

        {/* Score / Chips or Card Count badge under name */}
        {position !== 'bottom' && player.cardCount > 0 && !isLobby && !player.remainingHand ? (
          <div className="mt-0.5 bg-gradient-to-r from-amber-500/30 to-amber-600/30 border border-amber-400/80 rounded-full px-2 py-0.5 flex items-center justify-center shadow-md">
            <span className="text-[11px] sm:text-xs font-black text-amber-300 font-display">
              {player.cardCount} lá
            </span>
          </div>
        ) : (
          <div className="text-[10px] sm:text-[11px] font-extrabold text-amber-400 mt-0.5 tracking-tight font-display drop-shadow">
            {scoreDisplay}
          </div>
        )}

        {/* Host Kick Button */}
        {canKick && onKick && player && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Bạn có chắc muốn kick "${player.displayName}" ra khỏi bàn?`)) {
                onKick(player.id);
              }
            }}
            className="mt-1 bg-red-700/80 hover:bg-red-600 text-white text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full border border-red-400 shadow-md flex items-center gap-1 transition active:scale-95 cursor-pointer"
            title={`Kick ${player.displayName} ra khỏi phòng`}
          >
            <UserX size={9} /> Kick
          </button>
        )}
      </div>

      {/* Face-up Remaining Cards on Game End (Matching Image 1!) */}
      {player.remainingHand && player.remainingHand.length > 0 && !isLobby ? (
        <div className="flex items-center -space-x-3.5 sm:-space-x-4 bg-black/60 p-1 sm:p-1.5 rounded-xl border border-amber-500/40 shadow-2xl shrink-0 z-30 animate-fade-in max-w-[180px] sm:max-w-[260px] overflow-x-auto">
          {player.remainingHand.map((card, idx) => (
            <div key={card.id || idx} className="hover:-translate-y-1.5 transition-transform shrink-0">
              <CardView card={card} size="xs" />
            </div>
          ))}
        </div>
      ) : (
        /* Blue Card Back with count badge (Matching Image 2!) */
        position !== 'bottom' && player.cardCount > 0 && !isLobby && (
          <div className="relative shrink-0">
            <CardView isBack backCount={player.cardCount} size="sm" />
          </div>
        )
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
