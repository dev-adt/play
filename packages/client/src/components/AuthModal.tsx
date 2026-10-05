import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LogIn,
  UserPlus,
  X,
  AlertCircle,
  Zap,
  ShieldCheck,
  User,
  Lock,
  Smile,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface AuthModalProps {
  onClose?: () => void;
  defaultIsRegister?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, defaultIsRegister = false }) => {
  const { login, register, guestLogin } = useAuth();
  const [isRegister, setIsRegister] = useState(defaultIsRegister);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername || cleanUsername.length < 3) {
      setError('Tên đăng nhập phải có ít nhất 3 ký tự');
      return;
    }
    if (!password || password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const cleanDisplayName = displayName.trim() || cleanUsername;
        const res = await register(cleanUsername, password, cleanDisplayName);
        if (!res.success) {
          setError(res.error || 'Đăng ký không thành công, vui lòng thử lại');
        } else {
          if (onClose) onClose();
        }
      } else {
        const res = await login(cleanUsername, password);
        if (!res.success) {
          setError(res.error || 'Tên đăng nhập hoặc mật khẩu không chính xác');
        } else {
          if (onClose) onClose();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPlay = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await guestLogin();
      if (!res.success) {
        setError(res.error || 'Không thể tạo phiên chơi nhanh');
      } else {
        if (onClose) onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay z-50 p-3 sm:p-4">
      <div className="modal-content max-w-md w-full p-6 sm:p-8 text-slate-100 border border-amber-500/40 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative overflow-hidden bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-[#0b0f14]/98 backdrop-blur-2xl">
        {/* Top Gold Ambient Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 shadow-[0_0_15px_rgba(245,176,65,0.6)]"></div>

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700/80 flex items-center justify-center transition cursor-pointer"
            title="Đóng"
          >
            <X size={18} />
          </button>
        )}

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6 pt-1">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3 border border-yellow-200">
            <span className="font-black text-2xl select-none leading-none">♠</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black font-display text-white tracking-wide">
            Tiến Lên <span className="text-amber-400">Miền Bắc</span>
          </h2>

          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            {isRegister
              ? 'Tạo tài khoản chính thức để lưu thành tích và đua hạng cùng bạn bè'
              : 'Đăng nhập để vào bàn chơi, thi đấu bảng xếp hạng và giao lưu'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 mb-5 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              !isRegister
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn size={16} />
            <span>Đăng Nhập</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError(null);
            }}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              isRegister
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus size={16} />
            <span>Đăng Ký</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-950/80 border border-red-500/50 text-red-200 text-xs p-3 rounded-2xl mb-4 flex items-center gap-2.5 animate-shake">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Username Input */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User size={13} className="text-amber-400" />
              <span>Tên đăng nhập</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập (ít nhất 3 ký tự)..."
                autoComplete="username"
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition"
              />
            </div>
          </div>

          {/* Display Name (Only when Register) */}
          {isRegister && (
            <div className="animate-fade-in">
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Smile size={13} className="text-amber-400" />
                  <span>Tên hiển thị trong game</span>
                </span>
                <span className="text-[10px] text-slate-500 font-normal">Không bắt buộc</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Ví dụ: Anh Ba, Hùng Bá, Tiến Lên..."
                  className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition"
                />
              </div>
            </div>
          )}

          {/* Password Input with Show/Hide toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Lock size={13} className="text-amber-400" />
              <span>Mật khẩu</span>
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu (ít nhất 6 ký tự)..."
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-3.5 pr-10 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-amber-300 transition p-1"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-110 active:scale-[0.98] text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <RefreshCw size={17} className="animate-spin text-slate-950" />
                <span>Đang xử lý...</span>
              </>
            ) : isRegister ? (
              <>
                <UserPlus size={17} className="stroke-[2.5]" />
                <span>ĐĂNG KÝ TÀI KHOẢN</span>
              </>
            ) : (
              <>
                <LogIn size={17} className="stroke-[2.5]" />
                <span>ĐĂNG NHẬP NGAY</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex py-3 items-center my-1">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-3 text-[11px] text-slate-500 uppercase tracking-widest font-bold">
            Hoặc
          </span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Quick Guest Play Button */}
        <button
          type="button"
          onClick={handleQuickPlay}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-emerald-500/40 text-emerald-400 hover:text-emerald-300 font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
        >
          <Zap size={16} className="text-yellow-400 fill-yellow-400" />
          <span>Chơi Nhanh (Vào ngay không cần đăng ký)</span>
        </button>

        {/* Footer Switcher */}
        <div className="text-center mt-5 pt-3 border-t border-slate-800/80 text-xs text-slate-400">
          {isRegister ? (
            <span>
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError(null);
                }}
                className="font-bold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer ml-1"
              >
                Đăng nhập ngay
              </button>
            </span>
          ) : (
            <span>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError(null);
                }}
                className="font-bold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer ml-1"
              >
                Đăng ký tài khoản mới
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
