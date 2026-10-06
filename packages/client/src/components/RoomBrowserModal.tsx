import React, { useState, useEffect } from 'react';
import { X, RefreshCw, PlusCircle, Users, Lock, Unlock, Play, Search, Shield } from 'lucide-react';

export interface PublicRoomInfo {
  code: string;
  name: string;
  mode: 'basic' | 'fund';
  maxPlayers: number;
  playerCount: number;
  hasPassword: boolean;
  isGameActive: boolean;
  betAmount?: number;
}

interface RoomBrowserModalProps {
  onClose: () => void;
  onJoinRoom: (code: string) => void;
  onCreateNew: () => void;
}

export const RoomBrowserModal: React.FC<RoomBrowserModalProps> = ({
  onClose,
  onJoinRoom,
  onCreateNew,
}) => {
  const [rooms, setRooms] = useState<PublicRoomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'basic' | 'fund'>('all');
  const [filterPlayers, setFilterPlayers] = useState<'all' | '2' | '4'>('all');
  const [search, setSearch] = useState('');

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
      }
    } catch (e) {
      console.error('Error fetching rooms:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const filteredRooms = rooms.filter(r => {
    if (filterMode !== 'all' && r.mode !== filterMode) return false;
    if (filterPlayers !== 'all' && String(r.maxPlayers) !== filterPlayers) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl w-full p-5 text-slate-100 border-2 border-amber-500/40 shadow-2xl relative overflow-hidden bg-gradient-to-b from-[#241315] via-[#1a0f12] to-[#120a0d] max-h-[85vh] flex flex-col">
        {/* Glow Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-amber-400 to-rose-500"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-b from-rose-500 to-red-700 flex items-center justify-center shadow-md">
              <Users size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-rose-200 tracking-wide">
                CHỌN BÀN CHƠI
              </h2>
              <p className="text-[11px] text-amber-200/60 font-medium">Danh sách các bàn đang mở trên hệ thống</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRooms}
              disabled={loading}
              className="w-8 h-8 rounded-full bg-black/40 border border-amber-500/20 text-amber-300 hover:text-white hover:bg-black/70 flex items-center justify-center transition"
              title="Làm mới danh sách"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/40 border border-amber-500/20 text-amber-200 hover:text-white hover:bg-black/70 flex items-center justify-center transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-3 text-amber-200/50" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên bàn hoặc mã..."
              className="w-full bg-black/50 border border-amber-500/20 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-amber-100/40 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Mode Filter */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-amber-500/20 text-xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                filterMode === 'all' ? 'bg-amber-500 text-amber-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterMode('basic')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                filterMode === 'basic' ? 'bg-amber-500 text-amber-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Đếm lá
            </button>
            <button
              onClick={() => setFilterMode('fund')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                filterMode === 'fund' ? 'bg-amber-500 text-amber-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Góp quỹ
            </button>
          </div>

          {/* Players Filter */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-amber-500/20 text-xs">
            <button
              onClick={() => setFilterPlayers('all')}
              className={`px-2 py-1 rounded-lg font-bold transition ${
                filterPlayers === 'all' ? 'bg-amber-500 text-amber-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              Mọi bàn
            </button>
            <button
              onClick={() => setFilterPlayers('2')}
              className={`px-2 py-1 rounded-lg font-bold transition ${
                filterPlayers === '2' ? 'bg-amber-500 text-amber-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              2 Người
            </button>
            <button
              onClick={() => setFilterPlayers('4')}
              className={`px-2 py-1 rounded-lg font-bold transition ${
                filterPlayers === '4' ? 'bg-amber-500 text-amber-950' : 'text-slate-300 hover:text-white'
              }`}
            >
              4 Người
            </button>
          </div>
        </div>

        {/* Room Table List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[220px]">
          {loading ? (
            <div className="h-44 flex items-center justify-center text-amber-300 text-sm">
              Đang tải danh sách bàn...
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center p-4">
              <p className="text-amber-200/70 text-sm mb-3">Hiện chưa có bàn nào đang mở theo bộ lọc</p>
              <button
                onClick={onCreateNew}
                className="btn-game-gold py-2 px-5 text-xs font-bold flex items-center gap-1.5"
              >
                <PlusCircle size={15} /> Tạo bàn mới ngay
              </button>
            </div>
          ) : (
            filteredRooms.map(r => (
              <div
                key={r.code}
                className="bg-black/40 border border-amber-500/20 hover:border-amber-400/60 rounded-xl p-3 flex items-center justify-between transition group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-amber-500/20 to-amber-900/40 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold font-mono text-sm shrink-0">
                    {r.playerCount}/{r.maxPlayers}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm group-hover:text-amber-300 transition">
                        {r.name}
                      </span>
                      {r.hasPassword && (
                        <span className="text-purple-400 bg-purple-950/60 border border-purple-500/40 p-0.5 rounded text-[10px] flex items-center gap-0.5">
                          <Lock size={10} /> Khóa
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-amber-200/60 mt-0.5">
                      <span>Mã: <strong className="font-mono text-amber-300">{r.code}</strong></span>
                      <span>•</span>
                      <span className="text-amber-200/80">
                        {r.mode === 'fund' ? 'Góp quỹ' : 'Đếm lá'}
                      </span>
                      <span>•</span>
                      <span className="text-yellow-300 font-mono font-bold bg-amber-500/20 px-1 rounded">
                        Cược: {r.betAmount || 10}$
                      </span>
                      <span>•</span>
                      <span className={r.isGameActive ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {r.isGameActive ? 'Đang đấu' : 'Đang đợi'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onJoinRoom(r.code)}
                  className="btn-game-gold py-1.5 px-4 text-xs font-black shadow flex items-center gap-1"
                >
                  <Play size={12} fill="#3e2723" /> VÀO BÀN
                </button>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 mt-3 border-t border-amber-500/20 flex items-center justify-between">
          <span className="text-xs text-amber-200/60">
            Tổng cộng: <strong>{filteredRooms.length}</strong> bàn chơi
          </span>
          <button
            onClick={onCreateNew}
            className="btn-game-red py-2 px-5 text-xs font-black flex items-center gap-1.5 shadow"
          >
            <PlusCircle size={14} /> + TẠO BÀN MỚI
          </button>
        </div>
      </div>
    </div>
  );
};
