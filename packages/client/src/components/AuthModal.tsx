import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, X, AlertCircle, Zap, ShieldCheck } from 'lucide-react';

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await register(username, password, displayName || username);
        if (!res.success) {
          setError(res.error || 'Đăng ký không thành công');
        } else {
          if (onClose) onClose();
        }
      } else {
        const res = await login(username, password);
        if (!res.success) {
          setError(res.error || 'Đăng nhập không thành công');
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
    <div className="modal-overlay">
      <div className="modal-content max-w-sm w-full p-6 text-slate-100 border-2 border-amber-500/40 shadow-2xl relative overflow-hidden bg-gradient-to-b from-[#241315] via-[#1a0f12] to-[#120a0d]">
        {/* Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-amber-400" />
            <h2 className="text-lg font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-100 tracking-wide">
              {isRegister ? 'ĐĂNG KÝ TÀI KHOẢN' : 'ĐĂNG NHẬP GAME'}
            </h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-black/40 border border-amber-500/20 text-amber-200 hover:text-white hover:bg-black/70 flex items-center justify-center transition"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 rounded-xl border border-amber-500/20 mb-4">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
            className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              !isRegister
                ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-amber-950 shadow'
                : 'text-amber-200/70 hover:text-white'
            }`}
          >
            <LogIn size={14} /> Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError(null);
            }}
            className={`py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              isRegister
                ? 'bg-gradient-to-b from-amber-400 to-amber-600 text-amber-950 shadow'
                : 'text-amber-200/70 hover:text-white'
            }`}
          >
            <UserPlus size={14} /> Đăng Ký
          </button>
        </div>

        {/* Quick Play Button (Guest) */}
        <button
          type="button"
          onClick={handleQuickPlay}
          disabled={loading}
          className="w-full mb-4 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 border border-emerald-400/40 active:scale-95 transition"
        >
          <Zap size={16} className="text-yellow-300 fill-yellow-300" />
          CHƠI NGAY (VÀO NHANH KHÔNG CẦN TÀI KHOẢN)
        </button>

        <div className="relative flex py-1.5 items-center mb-3">
          <div className="flex-grow border-t border-amber-500/20"></div>
          <span className="flex-shrink mx-3 text-[10px] text-amber-200/50 uppercase tracking-wider font-bold">
            Hoặc dùng tài khoản
          </span>
          <div className="flex-grow border-t border-amber-500/20"></div>
        </div>

        {error && (
          <div className="bg-red-950/80 border border-red-500/50 text-red-200 text-xs p-2.5 rounded-xl mb-3 flex items-center gap-2">
            <AlertCircle size={15} className="text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-amber-200/90 mb-1">
              Tên đăng nhập
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập..."
              className="w-full bg-black/50 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-[11px] font-bold text-amber-200/90 mb-1">
                Tên hiển thị trong game
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Ví dụ: Anh Ba, Hùng Bá..."
                className="w-full bg-black/50 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-amber-200/90 mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-black/50 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-game-gold py-2.5 mt-2 text-xs font-black shadow flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isRegister ? <UserPlus size={15} /> : <LogIn size={15} />}
            {loading ? 'Đang xử lý...' : isRegister ? 'ĐĂNG KÝ NGAY' : 'ĐĂNG NHẬP'}
          </button>
        </form>
      </div>
    </div>
  );
};
