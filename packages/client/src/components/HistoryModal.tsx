import React, { useEffect, useState } from 'react';
import {
  X,
  History,
  Trophy,
  TrendingDown,
  TrendingUp,
  Coins,
  ShieldCheck,
  AlertCircle,
  Award,
  Zap,
  UserCheck,
  UserPlus,
  Flame,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HistoryModalProps {
  onClose: () => void;
  onOpenRegister?: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ onClose, onOpenRegister }) => {
  const { user, token, stats: authStats, refreshStats } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState(authStats);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'basic' | 'fund'>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'win' | 'lose'>('all');

  const isGuest = !user || user.username.startsWith('guest_');

  const fetchHistoryAndStats = async (mode?: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const url = mode && mode !== 'all' ? `/api/history?mode=${mode}` : '/api/history';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.history) setHistory(data.history);
        if (data.stats) setStats(data.stats);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryAndStats(activeTab);
  }, [token, activeTab]);

  // Calculations for stats
  const basicGames = stats?.basic.games_played || 0;
  const basicWins = stats?.basic.wins || 0;
  const basicWinRate = basicGames > 0 ? Math.round((basicWins / basicGames) * 100) : 0;
  const basicNetScore = stats?.basic.net_score || 0;

  const fundGames = stats?.fund.games_played || 0;
  const fundWins = stats?.fund.wins || 0;
  const fundWinRate = fundGames > 0 ? Math.round((fundWins / fundGames) * 100) : 0;
  const fundTotalNeg = stats?.fund.total_negative || 0;
  const fundAvgNeg = fundGames > 0 ? Math.round(fundTotalNeg / fundGames) : 0;

  // Filter history by outcome
  const filteredHistory = history.filter(item => {
    if (activeTab !== 'all' && item.mode !== activeTab) return false;
    if (outcomeFilter === 'win' && item.win_delta <= 0) return false;
    if (outcomeFilter === 'lose' && item.win_delta > 0) return false;
    return true;
  });

  // Calculate Rank Title based on games and win rate
  const getRankTitle = (games: number, winRate: number) => {
    if (games < 3) return 'Tập Sự';
    if (games >= 20 && winRate >= 60) return 'Đại Cao Thủ';
    if (games >= 10 && winRate >= 50) return 'Cao Thủ';
    if (winRate >= 50) return 'Tay Chơi Cứng';
    return 'Kỳ Thủ';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content max-w-2xl w-full text-slate-100 border-2 border-amber-500/40 shadow-2xl relative overflow-hidden bg-gradient-to-b from-[#241315] via-[#1a0f12] to-[#120a0d] p-0"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow Accent Top Bar */}
        <div className="h-1.5 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 w-full" />

        {/* Modal Header */}
        <div className="p-4 md:p-6 pb-3 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow">
              <Trophy size={22} className="text-yellow-400 drop-shadow" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 tracking-wide">
                BẢNG THÀNH TÍCH & LỊCH SỬ ĐẤU
              </h2>
              <div className="text-xs text-amber-200/70 flex items-center gap-2">
                <span>Chi tiết 2 chế độ: Đếm lá & Góp quỹ</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/40 border border-amber-500/20 text-amber-200 hover:text-white hover:bg-black/70 flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Container with scrolling */}
        <div className="p-4 md:p-6 space-y-4 max-h-[78vh] overflow-y-auto scrollbar-thin scrollbar-thumb-amber-500/30">
          {/* User Account Info Pill */}
          <div className="bg-black/50 border border-amber-500/30 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full border-2 border-amber-400 bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-white font-black text-base shadow">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm md:text-base text-white">
                    {user?.displayName || 'Người chơi'}
                  </span>
                  {isGuest ? (
                    <span className="text-[10px] font-bold bg-amber-900/60 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                      Khách
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck size={10} /> Đã Đăng Ký
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Tài khoản: @{user?.username || 'guest'}
                </div>
              </div>
            </div>

            {/* If Guest, show button to register account */}
            {isGuest && onOpenRegister && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRegister();
                }}
                className="btn-game-gold py-1.5 px-3.5 text-xs flex items-center gap-1.5 shadow"
              >
                <UserPlus size={14} /> Đăng ký để lưu vĩnh viễn
              </button>
            )}
          </div>

          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-black/60 p-1 rounded-2xl border border-amber-500/25">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-amber-950 shadow-md font-extrabold'
                  : 'text-amber-200/70 hover:text-white'
              }`}
            >
              <Zap size={14} /> Tổng Quan
            </button>
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'basic'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-amber-950 shadow-md font-extrabold'
                  : 'text-amber-200/70 hover:text-white'
              }`}
            >
              <Flame size={14} /> Chế Độ Đếm Lá
            </button>
            <button
              onClick={() => setActiveTab('fund')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'fund'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-amber-950 shadow-md font-extrabold'
                  : 'text-amber-200/70 hover:text-white'
              }`}
            >
              <Coins size={14} /> Chế Độ Góp Quỹ
            </button>
          </div>

          {/* ======================================================== */}
          {/* STATS OVERVIEW SECTION */}
          {/* ======================================================== */}
          {activeTab === 'all' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Card 1: Basic Mode Summary */}
              <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-sky-500/30 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between pb-2.5 border-b border-sky-500/20 mb-3">
                  <div className="flex items-center gap-2 text-sky-300 font-extrabold text-sm font-display">
                    <Flame size={16} className="text-sky-400" /> CHẾ ĐỘ ĐẾM LÁ
                  </div>
                  <span className="text-[11px] font-bold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-500/30">
                    {getRankTitle(basicGames, basicWinRate)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-black/40 p-2.5 rounded-xl border border-sky-500/10">
                    <div className="text-[10px] text-slate-400 mb-0.5">Số ván chơi</div>
                    <div className="text-base font-black text-white font-mono">{basicGames}</div>
                  </div>
                  <div className="bg-black/40 p-2.5 rounded-xl border border-sky-500/10">
                    <div className="text-[10px] text-slate-400 mb-0.5">Thắng / Tỷ lệ</div>
                    <div className="text-base font-black text-emerald-400 font-mono">
                      {basicWins} <span className="text-[10px] text-slate-400">({basicWinRate}%)</span>
                    </div>
                  </div>
                  <div className="bg-black/40 p-2.5 rounded-xl border border-sky-500/10">
                    <div className="text-[10px] text-slate-400 mb-0.5">Điểm ròng</div>
                    <div
                      className={`text-base font-black font-mono ${
                        basicNetScore > 0
                          ? 'text-emerald-400'
                          : basicNetScore < 0
                          ? 'text-rose-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {basicNetScore > 0 ? `+${basicNetScore}` : basicNetScore}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Fund Mode Summary */}
              <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-purple-500/30 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between pb-2.5 border-b border-purple-500/20 mb-3">
                  <div className="flex items-center gap-2 text-purple-300 font-extrabold text-sm font-display">
                    <Coins size={16} className="text-purple-400" /> CHẾ ĐỘ GÓP QUỸ
                  </div>
                  <span className="text-[11px] font-bold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-500/30">
                    {getRankTitle(fundGames, fundWinRate)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-black/40 p-2.5 rounded-xl border border-purple-500/10">
                    <div className="text-[10px] text-slate-400 mb-0.5">Số ván chơi</div>
                    <div className="text-base font-black text-white font-mono">{fundGames}</div>
                  </div>
                  <div className="bg-black/40 p-2.5 rounded-xl border border-purple-500/10">
                    <div className="text-[10px] text-slate-400 mb-0.5">Ăn quỹ / Tỷ lệ</div>
                    <div className="text-base font-black text-purple-300 font-mono">
                      {fundWins} <span className="text-[10px] text-slate-400">({fundWinRate}%)</span>
                    </div>
                  </div>
                  <div className="bg-black/40 p-2.5 rounded-xl border border-purple-500/10">
                    <div className="text-[10px] text-slate-400 mb-0.5">Tổng điểm góp</div>
                    <div className="text-base font-black text-rose-400 font-mono">
                      {fundTotalNeg}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'basic' && (
            <div className="bg-gradient-to-b from-sky-950/40 via-black/50 to-black/60 border border-sky-500/30 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-sky-500/20 mb-3">
                <div className="flex items-center gap-2 text-sky-300 font-extrabold text-base font-display">
                  <Flame size={18} className="text-sky-400" /> THỐNG KÊ CHI TIẾT: ĐẾM LÁ
                </div>
                <div className="text-xs text-sky-400/80 bg-sky-950/80 px-3 py-1 rounded-full border border-sky-500/30 font-bold">
                  Hạng: {getRankTitle(basicGames, basicWinRate)}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div className="bg-black/50 p-3 rounded-xl border border-sky-500/15 text-center">
                  <div className="text-[11px] text-slate-400 mb-1">Tổng Số Ván</div>
                  <div className="text-xl font-black text-white font-mono">{basicGames}</div>
                </div>
                <div className="bg-black/50 p-3 rounded-xl border border-sky-500/15 text-center">
                  <div className="text-[11px] text-slate-400 mb-1">Số Ván Thắng (Nhất)</div>
                  <div className="text-xl font-black text-emerald-400 font-mono">{basicWins}</div>
                </div>
                <div className="bg-black/50 p-3 rounded-xl border border-sky-500/15 text-center">
                  <div className="text-[11px] text-slate-400 mb-1">Tỷ Lệ Thắng</div>
                  <div className="text-xl font-black text-amber-300 font-mono">{basicWinRate}%</div>
                </div>
                <div className="bg-black/50 p-3 rounded-xl border border-sky-500/15 text-center">
                  <div className="text-[11px] text-slate-400 mb-1">Tổng Điểm Ròng</div>
                  <div
                    className={`text-xl font-black font-mono ${
                      basicNetScore > 0
                        ? 'text-emerald-400'
                        : basicNetScore < 0
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {basicNetScore > 0 ? `+${basicNetScore}` : basicNetScore}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fund' && (
            <div className="bg-gradient-to-b from-purple-950/40 via-black/50 to-black/60 border border-purple-500/30 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-purple-500/20 mb-3">
                <div className="flex items-center gap-2 text-purple-300 font-extrabold text-base font-display">
                  <Coins size={18} className="text-purple-400" /> THỐNG KÊ CHI TIẾT: GÓP QUỸ
                </div>
                <div className="text-xs text-purple-400/80 bg-purple-950/80 px-3 py-1 rounded-full border border-purple-500/30 font-bold">
                  Hạng: {getRankTitle(fundGames, fundWinRate)}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div className="bg-black/50 p-3 rounded-xl border border-purple-500/15 text-center">
                  <div className="text-[11px] text-slate-400 mb-1">Tổng Số Ván</div>
                  <div className="text-xl font-black text-white font-mono">{fundGames}</div>
                </div>
                <div className="bg-black/50 p-3 rounded-xl border border-purple-500/15 text-center">
                  <div className="text-[11px] text-slate-400 mb-1">Ván Ăn Quỹ (Nhất)</div>
                  <div className="text-xl font-black text-purple-300 font-mono">{fundWins}</div>
                </div>
                <div className="bg-black/50 p-3 rounded-xl border border-purple-500/15 text-center">
                  <div className="text-[11px] text-slate-400 mb-1">Tỷ Lệ Ăn Quỹ</div>
                  <div className="text-xl font-black text-amber-300 font-mono">{fundWinRate}%</div>
                </div>
                <div className="bg-black/50 p-3 rounded-xl border border-purple-500/15 text-center">
                  <div className="text-[11px] text-slate-400 mb-1">Tổng Điểm Góp Quỹ</div>
                  <div className="text-xl font-black text-rose-400 font-mono">{fundTotalNeg}</div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MATCH HISTORY LIST */}
          {/* ======================================================== */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History size={16} className="text-amber-400" />
                <h3 className="text-sm font-extrabold text-amber-200 font-display uppercase tracking-wider">
                  Lịch Sử Các Ván Đấu Gần Đây
                </h3>
              </div>

              {/* Sub-filter: Tất cả / Thắng / Thua */}
              <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-amber-500/20 text-[11px]">
                <button
                  onClick={() => setOutcomeFilter('all')}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    outcomeFilter === 'all'
                      ? 'bg-amber-500 text-amber-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setOutcomeFilter('win')}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    outcomeFilter === 'win'
                      ? 'bg-emerald-500 text-emerald-950 shadow'
                      : 'text-slate-400 hover:text-emerald-300'
                  }`}
                >
                  Thắng
                </button>
                <button
                  onClick={() => setOutcomeFilter('lose')}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    outcomeFilter === 'lose'
                      ? 'bg-rose-500 text-rose-950 shadow'
                      : 'text-slate-400 hover:text-rose-300'
                  }`}
                >
                  Thua
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                <span className="text-xs">Đang tải lịch sử đấu...</span>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-10 text-center bg-black/30 rounded-2xl border border-dashed border-amber-500/20 p-6">
                <Trophy size={36} className="mx-auto text-amber-500/40 mb-2" />
                <div className="text-sm font-bold text-slate-300 mb-1">Chưa có ván đấu nào</div>
                <div className="text-xs text-slate-500 max-w-sm mx-auto">
                  Các ván bài bạn tham gia sẽ được tự động lưu lại chi tiết tại đây để theo dõi phong độ và thành tích!
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredHistory.map((item, idx) => {
                  const won = item.win_delta > 0;
                  const isFund = item.mode === 'fund';
                  const dateStr = item.created_at
                    ? new Date(item.created_at).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : 'Gần đây';

                  let breakdownObj: any = null;
                  try {
                    if (typeof item.breakdown === 'string') {
                      breakdownObj = JSON.parse(item.breakdown);
                    } else if (item.breakdown) {
                      breakdownObj = item.breakdown;
                    }
                  } catch {
                    // ignore
                  }

                  return (
                    <div
                      key={item.id || idx}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        won
                          ? 'bg-gradient-to-r from-emerald-950/40 via-black/50 to-black/60 border-emerald-500/30 hover:border-emerald-500/50'
                          : 'bg-gradient-to-r from-rose-950/20 via-black/50 to-black/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Left: Icon & Game Details */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow ${
                            won
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/40'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {won ? <Trophy size={18} /> : <TrendingDown size={18} />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-sm font-extrabold ${
                                won ? 'text-emerald-300' : 'text-slate-200'
                              }`}
                            >
                              {won ? 'Thắng Ván (Về Nhất)' : 'Thua Ván'}
                            </span>

                            {/* Mode Badge */}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isFund
                                  ? 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                                  : 'bg-sky-950/80 text-sky-300 border-sky-500/40'
                              }`}
                            >
                              {isFund ? 'Góp quỹ' : 'Đếm lá'}
                            </span>

                            {/* End Reason Badge */}
                            {item.end_reason === 'instant_win' && (
                              <span className="text-[10px] font-bold bg-amber-950/80 text-yellow-300 border border-yellow-500/40 px-2 py-0.5 rounded-full">
                                Tới trắng
                              </span>
                            )}
                          </div>

                          {/* Time & Breakdown */}
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1 font-mono">
                              <Calendar size={11} /> {dateStr}
                            </span>

                            {breakdownObj && breakdownObj.handCardsCount > 0 && (
                              <span className="text-slate-400">
                                · Còn {breakdownObj.handCardsCount} lá
                              </span>
                            )}

                            {breakdownObj && breakdownObj.penaltyCardsCount > 0 && (
                              <span className="text-rose-400 font-bold">
                                · Phạt {breakdownObj.penaltyCardsCount} lá
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Score Delta */}
                      <div className="text-right shrink-0">
                        <div
                          className={`text-base md:text-lg font-black font-mono tracking-tight ${
                            item.score_delta > 0
                              ? 'text-emerald-400 drop-shadow'
                              : item.score_delta < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.score_delta > 0 ? `+${item.score_delta}` : item.score_delta}{' '}
                          <span className="text-xs font-normal font-sans">điểm</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
