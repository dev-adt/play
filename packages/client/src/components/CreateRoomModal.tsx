import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, X, Shield, Users, Layers, AlertCircle, Sparkles, Check } from 'lucide-react';

interface CreateRoomModalProps {
  onClose: () => void;
  onRoomCreated: (roomCode: string) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ onClose, onRoomCreated }) => {
  const { user, token } = useAuth();
  const [name, setName] = useState(user ? `Bàn của ${user.displayName}` : 'Bàn Tiến Lên Miền Bắc');
  const [mode, setMode] = useState<'basic' | 'fund'>('basic');
  const [password, setPassword] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(4);
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
          name: name.trim() || 'Bàn Tiến Lên',
          mode,
          password: password.trim() || undefined,
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
      <div className="modal-content max-w-md w-full p-6 text-slate-100 border-2 border-amber-500/40 shadow-2xl relative overflow-hidden bg-gradient-to-b from-[#241315] via-[#1a0f12] to-[#120a0d]">
        {/* Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
              <PlusCircle size={18} className="text-amber-950 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 tracking-wide">
                TẠO BÀN CHƠI MỚI
              </h2>
              <p className="text-[11px] text-amber-200/60 font-medium">Tùy chỉnh chế độ & số lượng người chơi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/40 border border-amber-500/20 text-amber-200 hover:text-white hover:bg-black/70 flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="bg-red-950/80 border border-red-500/50 text-red-200 text-xs p-3 rounded-xl mb-4 flex items-center gap-2 shadow">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Name */}
          <div>
            <label className="block text-xs font-bold text-amber-200/90 mb-1">
              Tên bàn chơi
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nhập tên bàn..."
              className="w-full bg-black/50 border border-amber-500/30 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-medium shadow-inner"
            />
          </div>

          {/* Mode Selection */}
          <div>
            <label className="block text-xs font-bold text-amber-200/90 mb-1.5 flex items-center gap-1.5">
              <Layers size={14} className="text-amber-400" /> Chọn chế độ tính điểm
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setMode('basic')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition relative ${
                  mode === 'basic'
                    ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                    : 'border-slate-700/60 bg-black/40 text-slate-400 hover:border-slate-500'
                }`}
              >
                {mode === 'basic' && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
                <div className="font-black text-sm text-amber-300 flex items-center gap-1">
                  🃏 Đếm lá (Basic)
                </div>
                <div className="text-[11px] text-amber-100/70 mt-1 leading-snug">
                  Nhất ăn tất. Thua phạt theo số lá và thối 2/tứ quý (+ / -).
                </div>
              </div>

              <div
                onClick={() => setMode('fund')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition relative ${
                  mode === 'fund'
                    ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                    : 'border-slate-700/60 bg-black/40 text-slate-400 hover:border-slate-500'
                }`}
              >
                {mode === 'fund' && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
                <div className="font-black text-sm text-amber-300 flex items-center gap-1">
                  🏆 Góp quỹ (Fund)
                </div>
                <div className="text-[11px] text-amber-100/70 mt-1 leading-snug">
                  Tính phạt cho người thua/thối bài để góp quỹ liên hoan.
                </div>
              </div>
            </div>
          </div>

          {/* Max players selection (2, 3, 4 players) */}
          <div>
            <label className="block text-xs font-bold text-amber-200/90 mb-1.5 flex items-center gap-1.5">
              <Users size={14} className="text-amber-400" /> Chọn số lượng người chơi
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { count: 2 as const, label: '2 Người', desc: '1 vs 1 Đối kháng' },
                { count: 3 as const, label: '3 Người', desc: 'Tam đấu kịch tính' },
                { count: 4 as const, label: '4 Người', desc: 'Đầy bàn tiêu chuẩn' },
              ].map(opt => (
                <button
                  key={opt.count}
                  type="button"
                  onClick={() => setMaxPlayers(opt.count)}
                  className={`p-2.5 rounded-xl border-2 text-center transition flex flex-col items-center justify-center ${
                    maxPlayers === opt.count
                      ? 'border-amber-400 bg-gradient-to-b from-amber-500/30 to-amber-600/10 text-white shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                      : 'border-slate-700/60 bg-black/40 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <span className={`text-sm font-black ${maxPlayers === opt.count ? 'text-amber-300' : 'text-slate-200'}`}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] text-amber-100/60 mt-0.5 font-normal">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Password */}
          <div>
            <label className="block text-xs font-bold text-amber-200/90 mb-1 flex items-center gap-1.5">
              <Shield size={14} className="text-amber-400" /> Mật khẩu bàn (Tùy chọn)
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Để trống nếu muốn bàn mở công khai..."
              className="w-full bg-black/50 border border-amber-500/30 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-medium shadow-inner"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-game-gold py-3 text-base font-black shadow-xl tracking-wider flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition"
            >
              <Sparkles size={18} fill="#3e2723" />
              {loading ? 'ĐANG TẠO BÀN...' : 'TẠO BÀN CHƠI NGAY'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
