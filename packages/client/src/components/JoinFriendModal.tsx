import React, { useState } from 'react';
import { X, Users, PlusCircle, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';

interface JoinFriendModalProps {
  onClose: () => void;
  onJoinCode: (code: string) => void;
  onCreateRoom: () => void;
}

export const JoinFriendModal: React.FC<JoinFriendModalProps> = ({
  onClose,
  onJoinCode,
  onCreateRoom,
}) => {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toLowerCase();
    if (clean) {
      // If user pasted a full URL like https://play.edunow.today/room/abcd1234
      const match = clean.match(/room\/([a-zA-Z0-9_-]+)/);
      if (match) {
        onJoinCode(match[1]);
      } else {
        onJoinCode(clean);
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md w-full p-6 text-slate-100 border-2 border-blue-500/40 shadow-2xl relative overflow-hidden bg-gradient-to-b from-[#131b2e] via-[#0d1322] to-[#070b14]">
        {/* Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-500"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-blue-500/20 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 flex items-center justify-center shadow-md">
              <Users size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-cyan-100 to-white tracking-wide">
                CHƠI VỚI BẠN BÈ
              </h2>
              <p className="text-[11px] text-blue-200/60 font-medium">Tạo phòng riêng hoặc nhập mã để vào bàn bạn bè</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/40 border border-blue-500/20 text-blue-200 hover:text-white hover:bg-black/70 flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Option 1: Create Custom Private Room */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-500/30 shadow-md">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-blue-400" /> Tạo bàn riêng mời bạn bè
                </h3>
                <p className="text-xs text-blue-200/70 mt-0.5">
                  Tùy chỉnh 2 - 4 người, đặt mật khẩu và gửi link mời trực tiếp.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onCreateRoom();
              }}
              className="w-full btn-game-gold py-2.5 text-xs font-black shadow flex items-center justify-center gap-2"
            >
              <PlusCircle size={16} /> TẠO BÀN RIÊNG MỚI
            </button>
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-blue-500/20"></div>
            <span className="flex-shrink mx-4 text-[11px] text-blue-300/60 uppercase tracking-widest font-bold">
              HOẶC VÀO BÀN BẠN BÈ
            </span>
            <div className="flex-grow border-t border-blue-500/20"></div>
          </div>

          {/* Option 2: Join by Room Code / Link */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-blue-200/90 mb-1 flex items-center gap-1.5">
                <KeyRound size={14} className="text-blue-400" /> Nhập mã bàn hoặc dán link mời
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="Ví dụ: d91d188e hoặc link phòng..."
                  className="flex-1 bg-black/50 border border-blue-500/30 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
                <button
                  type="submit"
                  disabled={!code.trim()}
                  className="btn-game-red px-5 py-2.5 text-xs font-black shadow flex items-center gap-1 disabled:opacity-50"
                >
                  VÀO <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
