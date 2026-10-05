import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  X,
  Search,
  Users,
  Trophy,
  Flame,
  Award,
  RefreshCw,
  Filter,
  ArrowUpDown,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
  isGuest: boolean;
  isAdmin: boolean;
  basic: {
    gamesPlayed: number;
    wins: number;
    winRate: number;
    netScore: number;
  };
  fund: {
    gamesPlayed: number;
    wins: number;
    winRate: number;
    totalNegative: number;
  };
  totalGames: number;
  totalWins: number;
  overallWinRate: number;
}

interface AdminModalProps {
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ onClose }) => {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'registered' | 'guest'>('all');
  const [sortBy, setSortBy] = useState<
    'createdAtDesc' | 'createdAtAsc' | 'totalGames' | 'totalWins' | 'winRate' | 'netScore' | 'fundPenalty'
  >('totalGames');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token || localStorage.getItem('tienlen_token')}`,
        },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Không thể tải danh sách tài khoản');
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải dữ liệu từ máy chủ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered & Sorted accounts
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Filter by type
    if (filterType === 'registered') {
      result = result.filter(u => !u.isGuest);
    } else if (filterType === 'guest') {
      result = result.filter(u => u.isGuest);
    }

    // Filter by search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        u => u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'createdAtAsc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'createdAtDesc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'totalGames':
          return b.totalGames - a.totalGames;
        case 'totalWins':
          return b.totalWins - a.totalWins;
        case 'winRate':
          return b.overallWinRate - a.overallWinRate;
        case 'netScore':
          return b.basic.netScore - a.basic.netScore;
        case 'fundPenalty':
          return a.fund.totalNegative - b.fund.totalNegative; // most negative first
        default:
          return 0;
      }
    });

    return result;
  }, [users, filterType, search, sortBy]);

  // Overall KPIs
  const statsSummary = useMemo(() => {
    const totalUsersCount = users.length;
    const registeredCount = users.filter(u => !u.isGuest).length;
    const guestCount = users.filter(u => u.isGuest).length;
    const totalGamesSum = users.reduce((acc, u) => acc + u.totalGames, 0);
    const totalWinsSum = users.reduce((acc, u) => acc + u.totalWins, 0);

    // Most active player
    const topPlayer = [...users].sort((a, b) => b.totalGames - a.totalGames)[0];

    return {
      totalUsersCount,
      registeredCount,
      guestCount,
      totalGamesSum,
      totalWinsSum,
      topPlayerName: topPlayer ? topPlayer.displayName : '—',
    };
  }, [users]);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div className="modal-overlay z-50 p-2 sm:p-4">
      <div className="modal-content max-w-5xl w-full max-h-[92vh] flex flex-col p-4 sm:p-6 text-slate-100 bg-slate-950/95 border border-amber-500/30 rounded-2xl shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
              <ShieldCheck size={24} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-amber-400 font-display">
                  Quản Trị Hệ Thống Tài Khoản
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Theo dõi toàn bộ danh sách tài khoản, số ván đấu và thành tích 2 chế độ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 transition"
              title="Tải lại danh sách"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin text-amber-400' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
              title="Đóng"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 my-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Tổng tài khoản</span>
              <Users size={14} className="text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-display">
              {statsSummary.totalUsersCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {statsSummary.registeredCount} Đăng ký · {statsSummary.guestCount} Khách
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Tổng lượt chơi</span>
              <Layers size={14} className="text-blue-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-display">
              {statsSummary.totalGamesSum}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Toàn bộ các ván đấu
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Tổng số ván thắng</span>
              <Trophy size={14} className="text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-display">
              {statsSummary.totalWinsSum}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Chiến thắng hợp lệ
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Tài khoản tích cực</span>
              <Sparkles size={14} className="text-purple-400" />
            </div>
            <div className="text-sm sm:text-base font-bold text-amber-300 truncate">
              {statsSummary.topPlayerName}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Tham gia nhiều ván nhất
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm tài khoản, tên hiển thị..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition ${
                filterType === 'all'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tất cả ({users.length})
            </button>
            <button
              onClick={() => setFilterType('registered')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition ${
                filterType === 'registered'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Đăng ký ({statsSummary.registeredCount})
            </button>
            <button
              onClick={() => setFilterType('guest')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition ${
                filterType === 'guest'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Khách ({statsSummary.guestCount})
            </button>
          </div>

          {/* Sort Selection */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">
            <ArrowUpDown size={14} className="text-amber-400" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="totalGames" className="bg-slate-900 text-white">Ván chơi (Nhiều nhất)</option>
              <option value="totalWins" className="bg-slate-900 text-white">Số ván thắng (Nhiều nhất)</option>
              <option value="winRate" className="bg-slate-900 text-white">Tỷ lệ thắng (%)</option>
              <option value="netScore" className="bg-slate-900 text-white">Điểm Basic (+)</option>
              <option value="fundPenalty" className="bg-slate-900 text-white">Phạt Quỹ (-)</option>
              <option value="createdAtDesc" className="bg-slate-900 text-white">Mới đăng ký</option>
              <option value="createdAtAsc" className="bg-slate-900 text-white">Cũ nhất</option>
            </select>
          </div>
        </div>

        {/* Main Users Table / List */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60 min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400">
              <RefreshCw size={28} className="animate-spin text-amber-400" />
              <p className="text-xs">Đang tải dữ liệu tài khoản...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-red-400">
              <p className="text-sm font-semibold">{error}</p>
              <button
                onClick={fetchUsers}
                className="px-3 py-1.5 bg-red-950/60 border border-red-500/40 rounded-lg text-xs text-red-300 hover:bg-red-900/50"
              >
                Thử lại
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400">
              <Users size={32} className="text-slate-600" />
              <p className="text-xs">Không tìm thấy tài khoản phù hợp với điều kiện tìm kiếm.</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-850 bg-slate-900 sticky top-0 z-10 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Tài khoản</th>
                    <th className="py-2.5 px-3">Loại</th>
                    <th className="py-2.5 px-3 text-center">Tổng ván</th>
                    <th className="py-2.5 px-3 text-center">Tỷ lệ thắng</th>
                    <th className="py-2.5 px-3 text-right">Chế độ Basic</th>
                    <th className="py-2.5 px-3 text-right">Chế độ Góp Quỹ</th>
                    <th className="py-2.5 px-3 text-right">Thời gian tạo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredUsers.map(userItem => {
                    return (
                      <tr
                        key={userItem.id}
                        className={`hover:bg-slate-800/50 transition ${
                          userItem.isAdmin ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        {/* Account Name */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {userItem.displayName}
                            {userItem.isAdmin && (
                              <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            @{userItem.username}
                          </div>
                        </td>

                        {/* Type Badge */}
                        <td className="py-3 px-3">
                          {userItem.isAdmin ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              Quản trị
                            </span>
                          ) : userItem.isGuest ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                              Khách
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              Thành viên
                            </span>
                          )}
                        </td>

                        {/* Total Games */}
                        <td className="py-3 px-3 text-center font-display font-bold text-slate-200">
                          {userItem.totalGames}
                          <div className="text-[10px] text-slate-500 font-normal">
                            Thắng: {userItem.totalWins}
                          </div>
                        </td>

                        {/* Win Rate */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`font-display font-bold ${
                              userItem.overallWinRate >= 50
                                ? 'text-emerald-400'
                                : userItem.overallWinRate > 0
                                ? 'text-amber-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {userItem.overallWinRate}%
                          </span>
                        </td>

                        {/* Basic Mode */}
                        <td className="py-3 px-3 text-right">
                          <div
                            className={`font-display font-bold ${
                              userItem.basic.netScore > 0
                                ? 'text-emerald-400'
                                : userItem.basic.netScore < 0
                                ? 'text-red-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {userItem.basic.netScore > 0
                              ? `+${userItem.basic.netScore}`
                              : userItem.basic.netScore}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {userItem.basic.wins}/{userItem.basic.gamesPlayed} ván ({userItem.basic.winRate}%)
                          </div>
                        </td>

                        {/* Fund Mode */}
                        <td className="py-3 px-3 text-right">
                          <div
                            className={`font-display font-bold ${
                              userItem.fund.totalNegative < 0 ? 'text-red-400' : 'text-slate-400'
                            }`}
                          >
                            {userItem.fund.totalNegative}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {userItem.fund.wins}/{userItem.fund.gamesPlayed} ván ({userItem.fund.winRate}%)
                          </div>
                        </td>

                        {/* Created At */}
                        <td className="py-3 px-3 text-right text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {formatDate(userItem.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div>
            Hiển thị <strong>{filteredUsers.length}</strong> / <strong>{users.length}</strong> tài khoản
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
