import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  X,
  Trophy,
  Coins,
  History,
  TrendingUp,
  TrendingDown,
  Layers,
  Award,
  Sparkles,
  ShieldCheck,
  Calendar
} from 'lucide-react';

interface PlayerInfoModalProps {
  userId: string;
  displayName: string;
  seatIndex?: number;
  onClose: () => void;
}

export const PlayerInfoModal: React.FC<PlayerInfoModalProps> = ({
  userId,
  displayName,
  seatIndex,
  onClose,
}) => {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const activeToken = token || localStorage.getItem('tienlen_token');
        const res = await fetch(`/api/users/${userId}/summary`, {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          setError('Không thể tải thông tin người chơi');
        }
      } catch {
        setError('Lỗi kết nối máy chủ');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [userId, token]);

  const basicStats = data?.stats?.basic;
  const fundStats = data?.stats?.fund;
  const balance = data?.user?.balance !== undefined ? data.user.balance : 1000;
  const history = data?.history || [];

  const basicGames = basicStats?.games_played || 0;
  const basicWins = basicStats?.wins || 0;
  const basicWinRate = basicGames > 0 ? Math.round((basicWins / basicGames) * 100) : 0;

  const fundGames = fundStats?.games_played || 0;
  const fundWins = fundStats?.wins || 0;
  const fundWinRate = fundGames > 0 ? Math.round((fundWins / fundGames) * 100) : 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-lg w-full p-5 sm:p-6 text-slate-100 border-2 border-amber-500/50 shadow-2xl relative overflow-hidden bg-gradient-to-b from-[#241315] via-[#1a0f12] to-[#120a0d] rounded-3xl">
        {/* Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400 bg-gradient-to-tr from-amber-700 via-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black font-display text-white tracking-wide truncate max-w-[200px]">
                  {displayName}
                </h2>
                {seatIndex !== undefined && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Ghế {seatIndex + 1}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-amber-200/60 font-medium">
                {data?.user?.username ? `@${data.user.username}` : 'Đang tải...'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/40 border border-amber-500/30 text-amber-200 hover:text-white hover:bg-black/70 flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Balance Banner */}
        <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border-2 border-amber-400/60 rounded-2xl p-3 mb-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-amber-950 font-black shadow">
              <Coins size={22} className="fill-amber-950" />
            </div>
            <div>
              <span className="text-[11px] text-amber-200/80 font-bold block">Số Tiền Hiện Có</span>
              <span className="text-xl sm:text-2xl font-black text-yellow-300 font-mono tracking-wider drop-shadow">
                {balance.toLocaleString()}$
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-amber-200/60 uppercase tracking-wider block font-bold">Tổng ván chơi</span>
            <span className="text-base font-black text-white font-mono">
              {basicGames + fundGames} ván
            </span>
          </div>
        </div>

        {/* Mode Stats Comparison (2 boxes) */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Basic mode stats */}
          <div className="bg-black/40 border border-amber-500/30 rounded-2xl p-3 shadow-inner">
            <div className="text-xs font-black text-amber-300 flex items-center gap-1.5 mb-2">
              <Layers size={14} className="text-amber-400" />
              <span>Chế độ Đếm lá (Basic)</span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-300">
                <span>Điểm ròng:</span>
                <strong className={`font-mono ${basicStats?.net_score >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {basicStats?.net_score >= 0 ? `+${basicStats.net_score}` : basicStats?.net_score || 0}
                </strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Thắng / Đã chơi:</span>
                <span className="text-amber-200 font-mono font-bold">
                  {basicWins}/{basicGames}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Tỷ lệ thắng:</span>
                <span className="text-yellow-300 font-bold font-mono">
                  {basicWinRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Fund mode stats */}
          <div className="bg-black/40 border border-amber-500/30 rounded-2xl p-3 shadow-inner">
            <div className="text-xs font-black text-amber-300 flex items-center gap-1.5 mb-2">
              <Award size={14} className="text-amber-400" />
              <span>Chế độ Góp quỹ (Fund)</span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-300">
                <span>Điểm phạt quỹ:</span>
                <strong className="text-red-400 font-mono">
                  {fundStats?.total_negative || 0}
                </strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Thắng / Đã chơi:</span>
                <span className="text-amber-200 font-mono font-bold">
                  {fundWins}/{fundGames}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Tỷ lệ về nhất:</span>
                <span className="text-yellow-300 font-bold font-mono">
                  {fundWinRate}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Game History Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-amber-200/90 flex items-center gap-1.5">
              <History size={14} className="text-amber-400" />
              <span>Lịch sử ván đấu gần đây</span>
            </div>
            <span className="text-[10px] text-amber-200/60 font-medium">10-15 ván mới nhất</span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-amber-300/70">
              Đang tải lịch sử ván đấu...
            </div>
          ) : history.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 bg-black/30 rounded-2xl border border-slate-800">
              Chưa có lịch sử ván đấu nào được ghi nhận
            </div>
          ) : (
            <div className="bg-black/40 border border-amber-500/20 rounded-2xl overflow-hidden max-h-44 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-amber-950/40 text-amber-300/80 text-[10px] uppercase border-b border-amber-500/20 sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Thời gian</th>
                    <th className="py-2 px-2 text-center">Chế độ</th>
                    <th className="py-2 px-2 text-center">Kết quả</th>
                    <th className="py-2 px-3 text-right">Điểm biến động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-500/10">
                  {history.map((h: any, idx: number) => {
                    const isWin = h.win_delta > 0;
                    const date = new Date(h.created_at);
                    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} ${date.getDate()}/${date.getMonth() + 1}`;

                    return (
                      <tr key={h.id || idx} className="hover:bg-amber-500/5">
                        <td className="py-2 px-3 text-[11px] text-slate-400 font-mono">
                          {timeStr}
                        </td>
                        <td className="py-2 px-2 text-center text-[11px]">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            h.mode === 'basic' ? 'bg-amber-500/20 text-amber-300' : 'bg-purple-500/20 text-purple-300'
                          }`}>
                            {h.mode === 'basic' ? 'Đếm lá' : 'Góp quỹ'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center text-[11px]">
                          {isWin ? (
                            <span className="text-emerald-400 font-bold">Thắng</span>
                          ) : (
                            <span className="text-slate-400">Thua</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-xs">
                          {h.score_delta > 0 ? (
                            <span className="text-emerald-400">+{h.score_delta}</span>
                          ) : h.score_delta < 0 ? (
                            <span className="text-red-400">{h.score_delta}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
