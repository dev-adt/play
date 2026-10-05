import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, X, Shield, Users, Layers, AlertCircle } from 'lucide-react';

interface CreateRoomModalProps {
  onClose: () => void;
  onRoomCreated: (roomCode: string) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ onClose, onRoomCreated }) => {
  const { user, token } = useAuth();
  const [name, setName] = useState(user ? `Bàn của ${user.displayName}` : 'Bàn chơi Tiến lên');
  const [mode, setMode] = useState<'basic' | 'fund'>('basic');
  const [password, setPassword] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          mode,
          password: password || undefined,
          maxPlayers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Không thể tạo phòng');
      } else {
        onRoomCreated(data.room.code);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi mạng khi tạo phòng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md w-full p-6 text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-700 mb-4">
          <div className="flex items-center gap-2">
            <PlusCircle size={20} className="text-amber-400" />
            <h2 className="text-xl font-bold font-display text-amber-400">
              Tạo Bàn Chơi Mới
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X size={20} />
          </button>
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
              Tên bàn chơi
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nhập tên bàn..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Mode Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Layers size={14} className="text-amber-400" /> Chế độ tính điểm
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <div
                onClick={() => setMode('basic')}
                className={`p-3 rounded-xl border cursor-pointer transition text-center ${
                  mode === 'basic'
                    ? 'border-amber-400 bg-amber-500/15 text-white'
                    : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-500'
                }`}
              >
                <div className="font-bold text-sm text-amber-300">Basic</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Điểm ròng có dấu (+ / -)
                </div>
              </div>

              <div
                onClick={() => setMode('fund')}
                className={`p-3 rounded-xl border cursor-pointer transition text-center ${
                  mode === 'fund'
                    ? 'border-amber-400 bg-amber-500/15 text-white'
                    : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-500'
                }`}
              >
                <div className="font-bold text-sm text-amber-300">Góp quỹ</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Tích lũy điểm phạt (-)
                </div>
              </div>
            </div>
          </div>

          {/* Max players */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Users size={14} className="text-amber-400" /> Số người chơi
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[2, 3, 4].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMaxPlayers(num)}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    maxPlayers === num
                      ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {num} người
                </button>
              ))}
            </div>
          </div>

          {/* Optional Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Shield size={14} className="text-amber-400" /> Mật khẩu bàn (Tùy chọn)
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Để trống nếu không khóa phòng"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-gold py-2.5 text-sm"
            >
              {loading ? 'Đang tạo bàn...' : 'Tạo Bàn Ngay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
