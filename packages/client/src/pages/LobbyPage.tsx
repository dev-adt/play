import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Share2, Check, Copy, Crown, Play, UserX, CheckCircle, Clock, Shield } from 'lucide-react';

interface LobbyPageProps {
  roomCode: string;
}

export const LobbyPage: React.FC<LobbyPageProps> = ({ roomCode }) => {
  const { user } = useAuth();
  const { roomState, takeSeat, leaveSeat, toggleReady, startGame } = useSocket();
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!roomState) return null;

  const mySeat = roomState.mySeatIndex;
  const isOwner = user && roomState.ownerId === user.userId;
  const seatedPlayers = roomState.seats.filter(s => s !== null);
  const allReady = seatedPlayers.length >= 2 && seatedPlayers.every(s => s.isReady || s.userId === roomState.ownerId);

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}/room/${roomCode}`;
    if (navigator.share) {
      navigator.share({
        title: `Vào chơi Tiến lên miền Bắc: ${roomState.name}`,
        url: fullUrl,
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTakeSeat = async (seatIdx: number) => {
    setActionError(null);
    const res = await takeSeat(seatIdx);
    if (!res.success) {
      setActionError(res.error || 'Không thể ngồi vào ghế');
    }
  };

  const handleLeaveSeat = async () => {
    setActionError(null);
    const res = await leaveSeat();
    if (!res.success) {
      setActionError(res.error || 'Không thể rời ghế');
    }
  };

  const handleToggleReady = async () => {
    setActionError(null);
    const res = await toggleReady();
    if (!res.success) {
      setActionError(res.error || 'Lỗi trạng thái sẵn sàng');
    }
  };

  const handleStartGame = async () => {
    setActionError(null);
    const res = await startGame();
    if (!res.success) {
      setActionError(res.error || 'Chưa thể bắt đầu ván');
    }
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8 flex flex-col items-center justify-center select-none">
      {/* Header Info */}
      <div className="text-center mb-6 w-full">
        <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
          <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 px-3 py-1 rounded-full text-xs font-bold">
            Mã phòng: {roomState.code}
          </span>
          <span className="bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1 rounded-full text-xs font-semibold">
            {roomState.mode === 'fund' ? 'Chế độ: Góp quỹ' : 'Chế độ: Basic'}
          </span>
          {roomState.hasPassword && (
            <span className="bg-purple-950/80 border border-purple-500/40 text-purple-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <Shield size={12} /> Có mật khẩu
            </span>
          )}
        </div>

        <h2 className="text-2xl md:text-3xl font-black text-white font-display">
          {roomState.name}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Cần từ 2 đến 4 người chơi sẵn sàng để chủ phòng bắt đầu
        </p>

        {/* Copy Link button */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleCopyLink}
            className="btn-secondary text-xs py-2 px-4 text-amber-300 border-amber-500/40 hover:border-amber-400"
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            {copied ? 'Đã sao chép link mời!' : 'Sao chép link mời bạn bè'}
          </button>
        </div>
      </div>

      {actionError && (
        <div className="bg-red-950/80 border border-red-500/50 text-red-200 text-xs px-4 py-2 rounded-xl mb-4 text-center">
          {actionError}
        </div>
      )}

      {/* Seats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-8">
        {[0, 1, 2, 3].map(seatIdx => {
          const member = roomState.seats[seatIdx];
          const isMe = member && user && member.userId === user.userId;
          const isSeatOwner = member && member.userId === roomState.ownerId;

          return (
            <div
              key={seatIdx}
              className={`glass-panel p-5 rounded-2xl flex flex-col items-center justify-between min-h-[190px] border transition relative ${
                isMe ? 'border-amber-400 bg-amber-950/15' : 'border-slate-800'
              }`}
            >
              {/* Seat number */}
              <div className="w-full flex justify-between items-center text-xs text-slate-400 mb-2">
                <span className="font-semibold text-amber-400">Ghế {seatIdx + 1}</span>
                {isSeatOwner && (
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Crown size={14} /> Chủ phòng
                  </span>
                )}
              </div>

              {/* Occupant content */}
              {member ? (
                <div className="flex flex-col items-center text-center my-auto">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center font-bold text-slate-950 text-lg shadow-lg mb-2">
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="font-bold text-sm text-white truncate max-w-[140px]">
                    {member.displayName}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    @{member.username}
                  </div>

                  {/* Ready badge */}
                  <div className="mt-2.5">
                    {member.isReady || isSeatOwner ? (
                      <span className="bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <CheckCircle size={12} /> Sẵn sàng
                      </span>
                    ) : (
                      <span className="bg-slate-800 text-slate-400 text-[11px] px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <Clock size={12} /> Đang chuẩn bị
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center my-auto text-center py-4">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-600 mb-2">
                    ?
                  </div>
                  <div className="text-xs text-slate-500">Ghế trống</div>
                </div>
              )}

              {/* Seat action button */}
              <div className="w-full pt-3 mt-auto">
                {member ? (
                  isMe && (
                    <div className="flex gap-1.5 w-full">
                      {!isSeatOwner && (
                        <button
                          onClick={handleToggleReady}
                          className={`flex-1 py-1.5 text-xs rounded-xl font-bold transition ${
                            member.isReady
                              ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              : 'bg-emerald-600 text-white hover:bg-emerald-500'
                          }`}
                        >
                          {member.isReady ? 'Hủy sẵn sàng' : 'Sẵn sàng'}
                        </button>
                      )}
                      <button
                        onClick={handleLeaveSeat}
                        className="btn-secondary py-1.5 px-3 text-xs text-red-400 border-red-500/30 hover:border-red-400"
                        title="Rời ghế"
                      >
                        <UserX size={14} />
                      </button>
                    </div>
                  )
                ) : (
                  <button
                    onClick={() => handleTakeSeat(seatIdx)}
                    className="w-full btn-secondary text-xs py-2 hover:border-amber-400 text-amber-300"
                  >
                    Ngồi ghế này
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Start Game Button (Host only) */}
      {isOwner ? (
        <div className="w-full max-w-sm flex flex-col items-center">
          <button
            onClick={handleStartGame}
            disabled={!allReady}
            className="w-full btn-gold py-3.5 text-base shadow-xl"
          >
            <Play size={20} />
            Bắt Đầu Ván Chơi ({seatedPlayers.length}/4)
          </button>
          {!allReady && (
            <div className="text-xs text-slate-400 mt-2 text-center">
              {seatedPlayers.length < 2
                ? 'Cần ít nhất 2 người ngồi ghế để bắt đầu'
                : 'Chờ tất cả người chơi bấm Sẵn sàng...'}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-xs text-slate-400 flex items-center gap-1.5 bg-slate-900/60 px-4 py-2 rounded-full border border-slate-800">
          <Clock size={14} className="text-amber-400" />
          Đang chờ chủ phòng bắt đầu ván đấu...
        </div>
      )}
    </div>
  );
};
