import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../audio';
import { BookOpen, History, Volume2, VolumeX, LogOut, User, Flame } from 'lucide-react';
import { RulesModal } from './RulesModal';
import { HistoryModal } from './HistoryModal';

interface NavbarProps {
  roomName?: string;
  roomCode?: string;
  onLeaveRoom?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ roomName, roomCode, onLeaveRoom }) => {
  const { user, stats, logout } = useAuth();
  const [showRules, setShowRules] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isMuted, setIsMuted] = useState(sounds.isMuted);

  const handleToggleSound = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  return (
    <>
      <header className="w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-3 md:px-6 py-2.5 flex items-center justify-between z-30 select-none">
        {/* Left: Brand & Room Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-black text-slate-950 text-base shadow">
              ♠
            </div>
            <div>
              <h1 className="text-base md:text-lg font-black text-white tracking-wide font-display">
                Tiến Lên <span className="text-amber-400">Miền Bắc</span>
              </h1>
              {roomCode && (
                <div className="text-[11px] text-amber-300/80 font-medium">
                  {roomName || 'Bàn chơi'} · Mã: <strong>{roomCode}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center: Two Independent Stat Lines (Section 6.1) */}
        {user && stats && (
          <div className="hidden lg:flex items-center gap-4 bg-slate-900/90 py-1.5 px-4 rounded-xl border border-slate-800 text-xs">
            {/* Basic Stat */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Basic:</span>
              <strong className={stats.basic.net_score >= 0 ? 'text-emerald-400 font-display' : 'text-red-400 font-display'}>
                {stats.basic.net_score >= 0 ? `+${stats.basic.net_score}` : stats.basic.net_score}
              </strong>
              <span className="text-[11px] text-slate-500">({stats.basic.wins}/{stats.basic.games_played} ván)</span>
            </div>
            <div className="w-px h-4 bg-slate-700" />
            {/* Góp quỹ Stat */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Góp quỹ:</span>
              <strong className="text-red-400 font-display">
                {stats.fund.total_negative < 0 ? stats.fund.total_negative : 0}
              </strong>
              <span className="text-[11px] text-slate-500">({stats.fund.wins}/{stats.fund.games_played} ván)</span>
            </div>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Rules button */}
          <button
            onClick={() => setShowRules(true)}
            className="p-2 rounded-xl text-slate-300 hover:text-amber-400 hover:bg-slate-800/80 transition"
            title="Luật chơi"
          >
            <BookOpen size={18} />
          </button>

          {/* History button */}
          {user && (
            <button
              onClick={() => setShowHistory(true)}
              className="p-2 rounded-xl text-slate-300 hover:text-amber-400 hover:bg-slate-800/80 transition"
              title="Lịch sử đấu"
            >
              <History size={18} />
            </button>
          )}

          {/* Sound Mute button */}
          <button
            onClick={handleToggleSound}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition"
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX size={18} className="text-red-400" /> : <Volume2 size={18} />}
          </button>

          {/* Logout / User */}
          {user && (
            <button
              onClick={logout}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800/80 transition"
              title="Đăng xuất"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </header>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
    </>
  );
};
