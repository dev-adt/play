import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, X, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  onClose?: () => void;
  defaultIsRegister?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, defaultIsRegister = false }) => {
  const { login, register } = useAuth();
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

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-sm w-full p-6 text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-4">
          <h2 className="text-xl font-bold font-display text-amber-400">
            {isRegister ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập'}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-950/80 border border-red-500/50 text-red-200 text-xs p-3 rounded-xl mb-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tên đăng nhập
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tên hiển thị trong game
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Ví dụ: Anh Ba, Hùng Bá..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-gold py-2.5 mt-2 text-sm"
          >
            {isRegister ? <UserPlus size={16} /> : <LogIn size={16} />}
            {loading ? 'Đang xử lý...' : isRegister ? 'Đăng ký ngay' : 'Đăng nhập'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          {isRegister ? (
            <span>
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError(null);
                }}
                className="text-amber-400 font-bold hover:underline"
              >
                Đăng nhập
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
                className="text-amber-400 font-bold hover:underline"
              >
                Đăng ký ngay
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
