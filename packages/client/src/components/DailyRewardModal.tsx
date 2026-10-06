import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../audio';
import {
  Gift,
  X,
  Sparkles,
  CheckCircle2,
  Calendar,
  Lock,
  Flame,
  Award,
  Clock,
  Coins
} from 'lucide-react';

interface DailyRewardStatus {
  canClaim: boolean;
  currentStreak: number;
  nextRewardDay: number;
  nextRewardAmount: number;
  lastRewardAt: string | null;
  rewardsList: number[];
}

interface DailyRewardModalProps {
  onClose: () => void;
  onClaimSuccess?: (amount: number, newBalance: number) => void;
}

export const DailyRewardModal: React.FC<DailyRewardModalProps> = ({
  onClose,
  onClaimSuccess,
}) => {
  const { token, updateBalance } = useAuth();
  const [status, setStatus] = useState<DailyRewardStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justClaimedAmount, setJustClaimedAmount] = useState<number | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const activeToken = token || localStorage.getItem('tienlen_token');
      const res = await fetch('/api/daily-reward/status', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status);
      } else {
        setError('Không thể tải thông tin điểm danh');
      }
    } catch {
      setError('Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleClaim = async () => {
    if (!status?.canClaim || claiming) return;
    setClaiming(true);
    setError(null);

    try {
      const activeToken = token || localStorage.getItem('tienlen_token');
      const res = await fetch('/api/daily-reward/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Nhận thưởng thất bại');
      } else {
        setJustClaimedAmount(data.claimedAmount);
        updateBalance(data.newBalance);
        sounds.playWin();

        // Confetti explosion
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#ffd700', '#f59e0b', '#10b981', '#3b82f6', '#ec4899'],
        });

        if (onClaimSuccess) {
          onClaimSuccess(data.claimedAmount, data.newBalance);
        }

        // Re-fetch status to show updated view
        fetchStatus();
      }
    } catch {
      setError('Lỗi mạng khi nhận thưởng');
    } finally {
      setClaiming(false);
    }
  };

  const defaultRewards = [1000, 2000, 3000, 4000, 5000, 6000, 7000];
  const rewards = status?.rewardsList || defaultRewards;
  const targetDay = status?.nextRewardDay || 1;
  const canClaim = !!status?.canClaim;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-xl w-full p-5 sm:p-6 text-slate-100 border-2 border-amber-500/50 shadow-2xl relative overflow-hidden bg-gradient-to-b from-[#241315] via-[#1a0f12] to-[#120a0d] rounded-3xl">
        {/* Glow Accent Top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg border border-yellow-200">
              <Gift size={22} className="text-amber-950 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 tracking-wide flex items-center gap-2">
                <span>QUÀ ĐĂNG NHẬP MỖI NGÀY</span>
                <Sparkles size={18} className="text-yellow-400" />
              </h2>
              <p className="text-[11px] sm:text-xs text-amber-200/70 font-medium">
                Đăng nhập liên tiếp để nhận từ <strong>1.000$</strong> đến <strong>7.000$</strong> mỗi ngày!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/40 border border-amber-500/30 text-amber-200 hover:text-white hover:bg-black/70 flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success Banner if just claimed */}
        {justClaimedAmount !== null && (
          <div className="bg-gradient-to-r from-emerald-950/90 to-green-900/90 border-2 border-emerald-400/80 rounded-2xl p-3 mb-4 text-center shadow-lg animate-bounce">
            <div className="text-sm font-black text-emerald-300 flex items-center justify-center gap-2">
              <Sparkles size={18} className="text-yellow-300" />
              <span>Chúc mừng bạn đã nhận thành công +{justClaimedAmount.toLocaleString()}$!</span>
            </div>
          </div>
        )}

        {/* Error notice */}
        {error && (
          <div className="bg-red-950/80 border border-red-500/50 text-red-200 text-xs p-3 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        {/* Streak summary pill */}
        <div className="bg-black/50 border border-amber-500/30 rounded-2xl p-3 mb-4 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2">
            <Flame size={20} className="text-amber-400 fill-amber-400 animate-pulse" />
            <div>
              <span className="text-xs text-amber-100/80">Chuỗi đăng nhập:</span>
              <div className="text-sm font-black text-amber-300">
                {status ? `${status.currentStreak} ngày liên tiếp` : 'Đang tải...'}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-amber-200/60 block">Quy tắc chuỗi:</span>
            <span className="text-[11px] text-amber-300/90 font-medium">
              Mất chuỗi sẽ quay lại mốc Ngày 1 (1.000$)
            </span>
          </div>
        </div>

        {/* 7 Days Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-5">
          {rewards.map((amount, idx) => {
            const dayNum = idx + 1;
            const isTodayTarget = dayNum === targetDay;
            const isPastClaimed = canClaim ? dayNum < targetDay : dayNum <= targetDay;
            const isFuture = canClaim ? dayNum > targetDay : dayNum > targetDay;

            return (
              <div
                key={dayNum}
                className={`relative rounded-2xl p-2.5 text-center flex flex-col items-center justify-between border-2 transition-all ${
                  isTodayTarget && canClaim
                    ? 'border-amber-300 bg-gradient-to-b from-amber-500/30 via-yellow-500/20 to-amber-900/40 shadow-[0_0_15px_rgba(251,191,36,0.4)] scale-105 z-10'
                    : isPastClaimed
                    ? 'border-emerald-500/50 bg-emerald-950/30 text-emerald-200'
                    : 'border-slate-800 bg-black/40 text-slate-400 opacity-70'
                }`}
                style={{ minHeight: '94px' }}
              >
                {/* Day Label */}
                <div className={`text-[10px] font-black uppercase tracking-wider ${
                  isTodayTarget && canClaim ? 'text-amber-300 font-extrabold' : isPastClaimed ? 'text-emerald-400' : 'text-slate-400'
                }`}>
                  Ngày {dayNum}
                </div>

                {/* Coin Icon / Chest */}
                <div className="my-1">
                  {isPastClaimed ? (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300 shadow">
                      <CheckCircle2 size={18} />
                    </div>
                  ) : isTodayTarget && canClaim ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center text-amber-950 font-black shadow-lg animate-pulse">
                      <Coins size={18} className="fill-amber-950" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                      <Lock size={15} />
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div className={`text-[11px] font-black ${
                  isTodayTarget && canClaim ? 'text-yellow-300 text-xs' : isPastClaimed ? 'text-emerald-300' : 'text-slate-300'
                }`}>
                  {amount.toLocaleString()}$
                </div>

                {/* Badge if today target and can claim */}
                {isTodayTarget && canClaim && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-tighter whitespace-nowrap shadow border border-white">
                    Hôm nay
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Claim Action Button */}
        <div className="pt-1">
          {canClaim ? (
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="w-full btn-game-gold py-3 text-base sm:text-lg font-black shadow-2xl tracking-wider flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition"
            >
              <Gift size={20} fill="#3e2723" />
              <span>
                {claiming
                  ? 'ĐANG NHẬN THƯỞNG...'
                  : `NHẬN NGAY ${(status?.nextRewardAmount || 1000).toLocaleString()}$`}
              </span>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <button
                disabled
                className="w-full py-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-400 font-bold text-sm sm:text-base flex items-center justify-center gap-2 cursor-not-allowed shadow-inner"
              >
                <CheckCircle2 size={18} className="text-emerald-400" />
                <span>BẠN ĐÃ NHẬN QUÀ HÔM NAY RỒI</span>
              </button>
              <span className="text-[11px] text-amber-200/70 flex items-center gap-1">
                <Clock size={12} />
                Quay lại vào ngày mai để nhận mốc tiếp theo (+{((status?.nextRewardDay || 1) * 1000).toLocaleString()}$)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
