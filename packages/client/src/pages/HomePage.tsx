import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen,
  Users,
  MessageSquare,
  Menu,
  Plus,
  ArrowLeft,
  Sparkles,
  Trophy,
  Gift,
  Play,
  UserPlus,
  Coins,
  LogOut,
  LogIn,
} from 'lucide-react';
import { AuthModal } from '../components/AuthModal';
import { CreateRoomModal } from '../components/CreateRoomModal';
import { RoomBrowserModal } from '../components/RoomBrowserModal';
import { JoinFriendModal } from '../components/JoinFriendModal';
import { RulesModal } from '../components/RulesModal';
import { HistoryModal } from '../components/HistoryModal';
import { AdminModal } from '../components/AdminModal';
import { ShieldCheck } from 'lucide-react';

interface HomePageProps {
  onNavigateToRoom: (roomCode: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigateToRoom }) => {
  const { user, stats, token, logout, guestLogin } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [showJoinFriend, setShowJoinFriend] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [quickJoining, setQuickJoining] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isAdmin = !!(user?.isAdmin || user?.username?.toLowerCase() === 'admin');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Quick Join logic
  const handleQuickJoin = async () => {
    setQuickJoining(true);
    try {
      let activeToken = token;
      if (!user || !activeToken) {
        // Auto-create guest session so user can play immediately without typing!
        const guestRes = await guestLogin();
        if (!guestRes.success) {
          setShowAuth(true);
          setQuickJoining(false);
          return;
        }
        activeToken = localStorage.getItem('tienlen_token');
      }

      const res = await fetch('/api/rooms/quick-join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({ mode: 'basic', maxPlayers: 4 }),
      });

      const data = await res.json();
      if (res.ok && data.room) {
        onNavigateToRoom(data.room.code);
      } else {
        showToast(data.error || 'Không thể tìm phòng chơi');
      }
    } catch {
      showToast('Lỗi kết nối khi tìm phòng');
    } finally {
      setQuickJoining(false);
    }
  };

  // Calculated display chips
  const totalScore = stats ? stats.basic.net_score + 100000 : 100000;
  const formattedChips =
    totalScore >= 1000000
      ? `${(totalScore / 1000000).toFixed(2)}M`
      : totalScore >= 1000
      ? `${(totalScore / 1000).toFixed(0)}K`
      : `${totalScore}`;

  const gamesCount = (stats?.basic.games_played || 0) + (stats?.fund.games_played || 0);
  const userLevel = Math.max(1, Math.min(99, Math.floor(gamesCount / 2) + 1));
  const expPercent = Math.min(100, (gamesCount % 2) * 50 + 25);

  return (
    <div className="relative w-full min-h-screen flex flex-col justify-between select-none overflow-hidden font-display bg-gradient-to-b from-[#1b5e20] via-[#004d40] to-[#0d2a23]">
      {/* Tropical Island Game Backdrop */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 bg-cover bg-center"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 50% 20%, rgba(255,255,255,0.18) 0%, rgba(0,0,0,0.65) 100%), linear-gradient(180deg, #38bdf8 0%, #0284c7 40%, #0d9488 75%, #14532d 100%)',
        }}
      />

      {/* Decorative Cloud & Island SVG Elements */}
      <div className="absolute top-0 inset-x-0 h-40 pointer-events-none opacity-30 bg-gradient-to-b from-white/20 to-transparent"></div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-black/85 border border-amber-400 text-amber-200 px-5 py-2.5 rounded-full text-xs font-bold shadow-2xl animate-bounce flex items-center gap-2">
          <Sparkles size={16} className="text-yellow-400" />
          {toastMessage}
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. TOP BAR (Matching Image 3) */}
      {/* ======================================================== */}
      <header className="relative z-30 w-full px-3 md:px-6 py-2.5 flex items-center justify-between">
        {/* Left: Exit/Back + User Profile Widget */}
        <div className="flex items-center gap-2.5">
          {/* Exit/Back button (Purple glossy circle) */}
          <button
            onClick={() => showToast('Bạn đang ở sảnh chính')}
            className="w-9 h-9 rounded-full bg-gradient-to-b from-[#9c27b0] to-[#6a1b9a] border-2 border-[#ce93d8]/80 text-white flex items-center justify-center shadow-lg active:scale-95 transition cursor-pointer"
            title="Thoát"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>

          {/* User Profile Pill */}
          {user ? (
            <div
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="relative flex items-center bg-black/55 backdrop-blur-md border-2 border-amber-400/50 rounded-full pl-1 pr-3 py-1 gap-2 cursor-pointer hover:border-amber-300 transition shadow-lg"
            >
              {/* Avatar with gold ring */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-amber-300 bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-white font-black text-sm shadow">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                {/* Level badge */}
                <div className="absolute -bottom-1 -left-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 font-black text-[9px] px-1.5 py-0.2 rounded-full border border-white shadow">
                  {userLevel}★
                </div>
              </div>

              {/* Name & EXP Bar */}
              <div className="flex flex-col min-w-[70px]">
                <span className="text-xs font-black text-white truncate max-w-[90px] drop-shadow">
                  {user.displayName}
                </span>
                <div className="w-full bg-black/60 rounded-full h-2 overflow-hidden border border-emerald-500/50 mt-0.5">
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-green-300 h-full rounded-full transition-all"
                    style={{ width: `${expPercent}%` }}
                  />
                </div>
              </div>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute top-12 left-0 w-52 bg-[#1f1013] border-2 border-amber-500/50 rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1">
                  <div className="p-2 border-b border-amber-500/20 text-amber-200 font-bold flex items-center justify-between">
                    <span>Tài khoản: {user.username}</span>
                    {isAdmin && (
                      <span className="text-[9px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded">ADMIN</span>
                    )}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setShowUserMenu(false);
                        setShowAdmin(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-bold flex items-center gap-2 transition border border-amber-500/40"
                    >
                      <ShieldCheck size={14} className="text-amber-400 stroke-[2.5]" /> Quản Trị Hệ Thống (Admin)
                    </button>
                  )}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setShowUserMenu(false);
                      setShowHistory(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:bg-amber-500/20 font-bold flex items-center gap-2 transition"
                  >
                    <Trophy size={14} className="text-amber-400" /> Bảng Thành Tích & Lịch Sử
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setShowUserMenu(false);
                      logout();
                      showToast('Đã đăng xuất tài khoản');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-red-300 hover:bg-red-500/20 font-bold flex items-center gap-2"
                  >
                    <LogOut size={14} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-amber-600 text-amber-950 font-black text-xs px-3.5 py-2 rounded-full border-2 border-amber-200 shadow-lg active:scale-95 transition"
            >
              <LogIn size={15} /> Đăng Nhập
            </button>
          )}

          {/* Gold Coin Balance Pill */}
          <div className="flex items-center bg-black/55 backdrop-blur-md border-2 border-amber-400/60 rounded-full pl-2 pr-1 py-1 gap-1.5 shadow-lg">
            <Coins size={18} className="text-yellow-400 fill-yellow-400 drop-shadow" />
            <span className="text-xs font-black text-yellow-300 tracking-wider font-mono">
              {formattedChips}
            </span>
            <button
              onClick={() => showToast('Nhận thưởng hàng ngày: +50,000 Xu thành công!')}
              className="w-6 h-6 rounded-full bg-gradient-to-b from-emerald-400 to-green-600 text-white flex items-center justify-center font-black shadow hover:brightness-110 active:scale-90 transition ml-1"
              title="Nạp / Nhận xu miễn phí"
            >
              <Plus size={14} strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Right: Action Buttons (Glossy Round Buttons) */}
        <div className="flex items-center gap-2">
          {/* Admin Dashboard Button (Only for Admin) */}
          {isAdmin && (
            <button
              onClick={() => setShowAdmin(true)}
              className="h-9 px-3 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-yellow-500 border-2 border-yellow-200 text-slate-950 font-black flex items-center gap-1.5 shadow-xl active:scale-95 transition hover:brightness-110 animate-pulse cursor-pointer"
              title="Bảng Quản Trị Hệ Thống (Admin)"
            >
              <ShieldCheck size={18} className="stroke-[3] text-slate-950" />
              <span className="text-[11px] font-black uppercase tracking-wider hidden sm:inline">Quản Trị</span>
            </button>
          )}

          {/* Achievements / Trophy button */}
          <button
            onClick={() => setShowHistory(true)}
            className="w-9 h-9 rounded-full bg-gradient-to-b from-amber-500 to-yellow-600 border-2 border-yellow-300/80 text-white flex items-center justify-center shadow-lg active:scale-95 transition hover:brightness-110"
            title="Bảng thành tích & Lịch sử đấu"
          >
            <Trophy size={17} className="text-white drop-shadow" />
          </button>

          {/* Rules / Book button */}
          <button
            onClick={() => setShowRules(true)}
            className="w-9 h-9 rounded-full bg-gradient-to-b from-[#9c27b0] to-[#6a1b9a] border-2 border-[#ce93d8]/80 text-white flex items-center justify-center shadow-lg active:scale-95 transition hover:brightness-110"
            title="Luật chơi"
          >
            <BookOpen size={17} />
          </button>

          {/* Friends button */}
          <button
            onClick={() => setShowJoinFriend(true)}
            className="w-9 h-9 rounded-full bg-gradient-to-b from-[#9c27b0] to-[#6a1b9a] border-2 border-[#ce93d8]/80 text-white flex items-center justify-center shadow-lg active:scale-95 transition hover:brightness-110"
            title="Bạn bè / Mời chơi"
          >
            <Users size={17} />
          </button>

          {/* Messages button with badge */}
          <div className="relative">
            <button
              onClick={() => showToast('Hòm thư: Chào mừng bạn đến với Tiến Lên Miền Bắc!')}
              className="w-9 h-9 rounded-full bg-gradient-to-b from-[#9c27b0] to-[#6a1b9a] border-2 border-[#ce93d8]/80 text-white flex items-center justify-center shadow-lg active:scale-95 transition hover:brightness-110"
              title="Tin nhắn"
            >
              <MessageSquare size={17} />
            </button>
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center border border-white shadow">
              1
            </div>
          </div>

          {/* Menu button */}
          <button
            onClick={() => (user ? setShowUserMenu(!showUserMenu) : setShowAuth(true))}
            className="w-9 h-9 rounded-full bg-gradient-to-b from-[#9c27b0] to-[#6a1b9a] border-2 border-[#ce93d8]/80 text-white flex items-center justify-center shadow-lg active:scale-95 transition hover:brightness-110"
            title="Menu"
          >
            <Menu size={17} />
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. CENTER LOBBY CARDS (Matching Image 3) */}
      {/* 3 Large, Glossy, Rich 3D Cards: Chơi nhanh / Chơi với bạn / Chọn bàn */}
      {/* ======================================================== */}
      <main className="relative z-20 w-full max-w-5xl mx-auto px-4 py-4 flex-1 flex flex-col items-center justify-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8 w-full max-w-4xl">
          {/* ---------------- CARD 1: CHƠI NHANH (Amber/Orange) ---------------- */}
          <div
            onClick={handleQuickJoin}
            className="group relative cursor-pointer rounded-3xl p-1 bg-gradient-to-b from-amber-300 via-amber-500 to-yellow-600 shadow-[0_12px_30px_rgba(245,158,11,0.45)] hover:shadow-[0_16px_40px_rgba(245,158,11,0.65)] hover:-translate-y-2 active:scale-95 transition-all duration-300 overflow-hidden"
          >
            <div className="relative rounded-[22px] bg-gradient-to-b from-[#ffb74d] via-[#f57c00] to-[#e65100] h-72 md:h-84 p-5 flex flex-col justify-between items-center text-center overflow-hidden border-2 border-white/40">
              {/* Glossy Reflection overlay */}
              <div className="absolute -top-12 -left-12 w-44 h-44 bg-white/20 rounded-full blur-xl pointer-events-none"></div>

              {/* Graphic Icon / Chips & Cards Illustration */}
              <div className="relative mt-4 flex items-center justify-center scale-110 group-hover:scale-125 transition-transform duration-300">
                {/* Poker chip back */}
                <div className="w-24 h-24 rounded-full border-4 border-dashed border-white/60 bg-gradient-to-br from-red-600 to-red-800 shadow-xl flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-red-900 border border-white/40 flex items-center justify-center text-white font-black text-xs">
                    TLMB
                  </div>
                </div>
                {/* Two Cards angled */}
                <div className="absolute -left-3 bottom-0 w-14 h-20 bg-white rounded-lg shadow-2xl border border-slate-300 -rotate-12 flex flex-col p-1">
                  <span className="text-red-600 font-black text-xs leading-none">2♥</span>
                </div>
                <div className="absolute -right-3 bottom-0 w-14 h-20 bg-white rounded-lg shadow-2xl border border-slate-300 rotate-12 flex flex-col p-1 items-end">
                  <span className="text-black font-black text-xs leading-none">3♠</span>
                </div>
              </div>

              {/* Title & Banner */}
              <div className="w-full mt-auto mb-2">
                <div className="text-2xl md:text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide">
                  Chơi nhanh
                </div>
                <p className="text-xs text-amber-100/90 font-medium mt-1">
                  {quickJoining ? 'Đang ghép phòng...' : 'Ghép bàn & vào chơi tức thì'}
                </p>
              </div>

              {/* Action Button Badge */}
              <div className="w-full bg-gradient-to-r from-yellow-300 to-amber-400 text-amber-950 font-black text-xs py-2 rounded-xl shadow-lg border border-white/50 tracking-wider">
                {quickJoining ? 'ĐANG VÀO...' : 'VÀO CHƠI NGAY'}
              </div>
            </div>
          </div>

          {/* ---------------- CARD 2: CHƠI VỚI BẠN (Royal Blue) ---------------- */}
          <div
            onClick={() => setShowJoinFriend(true)}
            className="group relative cursor-pointer rounded-3xl p-1 bg-gradient-to-b from-blue-300 via-blue-500 to-indigo-700 shadow-[0_12px_30px_rgba(59,130,246,0.45)] hover:shadow-[0_16px_40px_rgba(59,130,246,0.65)] hover:-translate-y-2 active:scale-95 transition-all duration-300 overflow-hidden"
          >
            <div className="relative rounded-[22px] bg-gradient-to-b from-[#42a5f5] via-[#1976d2] to-[#0d47a1] h-72 md:h-84 p-5 flex flex-col justify-between items-center text-center overflow-hidden border-2 border-white/40">
              {/* Glossy Reflection overlay */}
              <div className="absolute -top-12 -left-12 w-44 h-44 bg-white/20 rounded-full blur-xl pointer-events-none"></div>

              {/* Graphic Icon: Gold 3D "VS" + Poker Chips */}
              <div className="relative mt-4 flex items-center justify-center scale-110 group-hover:scale-125 transition-transform duration-300">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-800 to-blue-900 border-4 border-cyan-300/40 shadow-xl flex items-center justify-center">
                  {/* Big Gold 3D VS */}
                  <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-400 to-yellow-600 drop-shadow-[0_3px_5px_rgba(0,0,0,0.9)] italic">
                    VS
                  </span>
                </div>
                {/* Floating Chips & Cards */}
                <div className="absolute -bottom-2 -left-2 w-9 h-9 rounded-full bg-amber-500 border-2 border-white shadow"></div>
                <div className="absolute -top-1 -right-2 w-8 h-8 rounded-full bg-red-600 border-2 border-white shadow"></div>
              </div>

              {/* Title & Banner */}
              <div className="w-full mt-auto mb-2">
                <div className="text-2xl md:text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide">
                  Chơi với bạn
                </div>
                <p className="text-xs text-blue-100/90 font-medium mt-1">
                  Tạo phòng riêng, chia sẻ link mời
                </p>
              </div>

              {/* Action Button Badge */}
              <div className="w-full bg-gradient-to-r from-cyan-300 to-blue-400 text-blue-950 font-black text-xs py-2 rounded-xl shadow-lg border border-white/50 tracking-wider">
                MỜI BẠN BÈ
              </div>
            </div>
          </div>

          {/* ---------------- CARD 3: CHỌN BÀN (Magenta / Crimson) ---------------- */}
          <div
            onClick={() => setShowBrowser(true)}
            className="group relative cursor-pointer rounded-3xl p-1 bg-gradient-to-b from-pink-400 via-rose-500 to-purple-800 shadow-[0_12px_30px_rgba(244,63,94,0.45)] hover:shadow-[0_16px_40px_rgba(244,63,94,0.65)] hover:-translate-y-2 active:scale-95 transition-all duration-300 overflow-hidden"
          >
            <div className="relative rounded-[22px] bg-gradient-to-b from-[#ec407a] via-[#c2185b] to-[#880e4f] h-72 md:h-84 p-5 flex flex-col justify-between items-center text-center overflow-hidden border-2 border-white/40">
              {/* Glossy Reflection overlay */}
              <div className="absolute -top-12 -left-12 w-44 h-44 bg-white/20 rounded-full blur-xl pointer-events-none"></div>

              {/* Graphic Icon: Casino Table + 4 Aces */}
              <div className="relative mt-4 flex items-center justify-center scale-110 group-hover:scale-125 transition-transform duration-300">
                {/* Oval mini table */}
                <div className="w-28 h-18 rounded-[28px] bg-gradient-to-b from-[#7f0000] to-[#400000] border-3 border-amber-400 shadow-2xl flex items-center justify-center relative">
                  <div className="flex -space-x-2">
                    <div className="w-6 h-9 bg-white rounded shadow text-[9px] font-black text-black flex items-center justify-center">
                      A♠
                    </div>
                    <div className="w-6 h-9 bg-white rounded shadow text-[9px] font-black text-red-600 flex items-center justify-center">
                      A♥
                    </div>
                    <div className="w-6 h-9 bg-white rounded shadow text-[9px] font-black text-black flex items-center justify-center">
                      A♣
                    </div>
                    <div className="w-6 h-9 bg-white rounded shadow text-[9px] font-black text-red-600 flex items-center justify-center">
                      A♦
                    </div>
                  </div>
                </div>
              </div>

              {/* Title & Banner */}
              <div className="w-full mt-auto mb-2">
                <div className="text-2xl md:text-3xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide">
                  Chọn bàn
                </div>
                <p className="text-xs text-pink-100/90 font-medium mt-1">
                  Duyệt phòng 2 người, 4 người, tự do chọn
                </p>
              </div>

              {/* Action Button Badge */}
              <div className="w-full bg-gradient-to-r from-pink-300 to-rose-400 text-rose-950 font-black text-xs py-2 rounded-xl shadow-lg border border-white/50 tracking-wider">
                DANH SÁCH BÀN
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* 3. BOTTOM BAR (Matching Image 3) */}
      {/* ======================================================== */}
      <footer className="relative z-30 w-full px-3 md:px-8 py-3 flex items-center justify-between">
        {/* Left: Add Friend + Gift Claim Button */}
        <div className="flex items-center gap-2.5">
          {/* Add Friend (Purple circle) */}
          <button
            onClick={() => setShowJoinFriend(true)}
            className="w-10 h-10 rounded-full bg-gradient-to-b from-[#9c27b0] to-[#6a1b9a] border-2 border-[#ce93d8]/80 text-white flex items-center justify-center shadow-lg active:scale-95 transition hover:brightness-110"
            title="Thêm bạn bè"
          >
            <UserPlus size={18} />
          </button>

          {/* Daily Gift Claim with Timer Pill */}
          <div
            onClick={() => showToast('Quà tặng tiếp theo sẽ mở sau 13h 22m')}
            className="flex items-center bg-black/60 backdrop-blur-md border border-amber-400/50 rounded-full pl-1 pr-3 py-1 gap-2 cursor-pointer shadow-lg hover:border-amber-300 transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#9c27b0] to-[#6a1b9a] border border-[#ce93d8] flex items-center justify-center text-white shadow">
              <Gift size={16} />
            </div>
            <span className="text-xs font-bold text-amber-200">13h 22m</span>
            <Coins size={15} className="text-yellow-400 fill-yellow-400" />
          </div>
        </div>

        {/* Center: Golden Tournament Trophy Button */}
        <div className="flex flex-col items-center">
          <div className="relative group cursor-pointer" onClick={() => showToast('Giải đấu Mùa 1 sắp khởi tranh!')}>
            <div className="w-14 h-14 rounded-full bg-gradient-to-b from-amber-300 via-yellow-500 to-amber-700 border-3 border-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.6)] flex items-center justify-center group-hover:scale-110 active:scale-95 transition-all">
              <Trophy size={28} className="text-amber-950 fill-amber-950" />
            </div>
            {/* Notification Badge */}
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow">
              1
            </div>
          </div>
          <span className="text-[11px] font-black text-yellow-300 drop-shadow mt-1">
            Giải đấu
          </span>
        </div>

        {/* Right: Watch Video Claim + Leaderboard Trophy */}
        <div className="flex items-center gap-2.5">
          {/* Watch Video Claim Pill */}
          <div
            onClick={() => showToast('Nhiệm vụ xem video nhận xu: Sẵn sàng sau 01h 22m')}
            className="flex items-center bg-black/60 backdrop-blur-md border border-amber-400/50 rounded-full pl-3 pr-1 py-1 gap-2 cursor-pointer shadow-lg hover:border-amber-300 transition"
          >
            <Coins size={15} className="text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-bold text-amber-200">01h 22m</span>
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-b from-[#9c27b0] to-[#6a1b9a] border border-[#ce93d8] flex items-center justify-center text-white shadow">
                <Play size={14} fill="white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center border border-white">
                7
              </div>
            </div>
          </div>

          {/* Leaderboard Trophy Button (Purple circle) */}
          <button
            onClick={() => showToast(`Bảng xếp hạng: Bạn đang có ${stats?.basic.wins || 0} trận thắng`)}
            className="w-10 h-10 rounded-full bg-gradient-to-b from-[#9c27b0] to-[#6a1b9a] border-2 border-[#ce93d8]/80 text-white flex items-center justify-center shadow-lg active:scale-95 transition hover:brightness-110"
            title="Bảng xếp hạng"
          >
            <Trophy size={18} />
          </button>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* 4. MODALS */}
      {/* ======================================================== */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {showCreate && (
        <CreateRoomModal
          onClose={() => setShowCreate(false)}
          onRoomCreated={code => onNavigateToRoom(code)}
        />
      )}

      {showBrowser && (
        <RoomBrowserModal
          onClose={() => setShowBrowser(false)}
          onJoinRoom={code => {
            setShowBrowser(false);
            onNavigateToRoom(code);
          }}
          onCreateNew={() => {
            setShowBrowser(false);
            setShowCreate(true);
          }}
        />
      )}

      {showJoinFriend && (
        <JoinFriendModal
          onClose={() => setShowJoinFriend(false)}
          onJoinCode={code => {
            setShowJoinFriend(false);
            onNavigateToRoom(code);
          }}
          onCreateRoom={() => {
            setShowJoinFriend(false);
            setShowCreate(true);
          }}
        />
      )}

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {/* Achievements & Match History Modal */}
      {showHistory && (
        <HistoryModal
          onClose={() => setShowHistory(false)}
          onOpenRegister={() => setShowAuth(true)}
        />
      )}

      {/* Admin Dashboard Modal */}
      {showAdmin && <AdminModal onClose={() => setShowAdmin(false)} />}
    </div>
  );
};
