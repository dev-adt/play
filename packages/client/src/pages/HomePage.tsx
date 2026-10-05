import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, LogIn, ArrowRight, ShieldCheck, Flame, Trophy } from 'lucide-react';
import { AuthModal } from '../components/AuthModal';
import { CreateRoomModal } from '../components/CreateRoomModal';

interface HomePageProps {
  onNavigateToRoom: (roomCode: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigateToRoom }) => {
  const { user, stats } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCode.trim().toLowerCase();
    if (clean) {
      onNavigateToRoom(clean);
    }
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8 flex flex-col justify-center items-center select-none">
      {/* Hero Brand Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-400 mb-3 shadow">
          <ShieldCheck size={14} /> Tiến Lên Miền Bắc Chuẩn Luật Riêng
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white font-display tracking-tight">
          Chơi Cùng Bạn Bè <span className="text-amber-400">Thời Gian Thực</span>
        </h1>
        <p className="text-slate-400 text-sm md:text-base mt-2 max-w-md mx-auto">
          Tạo phòng mời bằng link, giao diện mượt mà trên điện thoại và máy tính. Đầy đủ sảnh dài, đôi thông, đút 3 bích và hai chế độ điểm.
        </p>
      </div>

      {/* Two Stats Panels (Section 6.1) */}
      {user && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl mb-8">
          {/* Basic Card */}
          <div className="glass-panel p-4 rounded-2xl border-emerald-500/30 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Chế độ Basic
              </span>
              <Trophy size={16} className="text-emerald-400" />
            </div>
            <div className="text-2xl md:text-3xl font-black font-display text-white">
              {stats.basic.net_score >= 0 ? `+${stats.basic.net_score}` : stats.basic.net_score}
              <span className="text-xs font-normal text-slate-400 ml-1.5">điểm ròng</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Thắng <strong>{stats.basic.wins}</strong> / {stats.basic.games_played} ván
            </div>
          </div>

          {/* Fund Card */}
          <div className="glass-panel p-4 rounded-2xl border-red-500/30 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                Chế độ Góp Quỹ
              </span>
              <Flame size={16} className="text-red-400" />
            </div>
            <div className="text-2xl md:text-3xl font-black font-display text-white">
              <span className="text-red-400">
                {stats.fund.total_negative < 0 ? stats.fund.total_negative : 0}
              </span>
              <span className="text-xs font-normal text-slate-400 ml-1.5">điểm phạt</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Thắng <strong>{stats.fund.wins}</strong> / {stats.fund.games_played} ván
            </div>
          </div>
        </div>
      )}

      {/* Main Action Buttons & Input */}
      <div className="w-full max-w-md space-y-4">
        {user ? (
          <>
            <button
              onClick={() => setShowCreate(true)}
              className="w-full btn-gold py-3.5 text-base shadow-lg"
            >
              <PlusCircle size={20} />
              Tạo Bàn Chơi Mới
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-xs text-slate-500 uppercase tracking-wider">
                Hoặc vào bàn có sẵn
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <form onSubmit={handleJoin} className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                placeholder="Nhập mã bàn (ví dụ: a1b2c3d4)..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 font-mono tracking-wider"
              />
              <button
                type="submit"
                disabled={!joinCode.trim()}
                className="btn-secondary px-5"
              >
                <ArrowRight size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className="glass-panel p-6 rounded-2xl text-center space-y-4">
            <h3 className="text-base font-bold text-white">
              Đăng nhập để tạo bàn và lưu thống kê điểm
            </h3>
            <p className="text-xs text-slate-400">
              Đăng ký tài khoản nhanh chóng chỉ với tên đăng nhập và mật khẩu.
            </p>
            <button
              onClick={() => setShowAuth(true)}
              className="w-full btn-gold py-3 text-sm"
            >
              <LogIn size={18} />
              Đăng Nhập / Đăng Ký
            </button>
          </div>
        )}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onRoomCreated={code => onNavigateToRoom(code)}
        />
      )}
    </div>
  );
};
