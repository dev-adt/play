import React, { useEffect, useState } from 'react';
import { X, History, Trophy, TrendingDown, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HistoryModalProps {
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ onClose }) => {
  const { token } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch('/api/history', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.history) setHistory(data.history);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-lg w-full p-6 text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-4">
          <div className="flex items-center gap-2">
            <History className="text-amber-400" size={24} />
            <h2 className="text-xl font-black text-amber-400 font-display">
              Lịch Sử Ván Đấu Gần Đây
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">Đang tải lịch sử...</div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            Bạn chưa tham gia ván đấu nào. Hãy vào phòng và bắt đầu chơi!
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {history.map((item, idx) => {
              const won = item.win_delta > 0;
              const dateStr = item.created_at ? new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '';

              return (
                <div
                  key={item.id || idx}
                  className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                        won
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-red-500/20 text-red-400 border border-red-500/40'
                      }`}
                    >
                      {won ? <Trophy size={16} /> : <TrendingDown size={16} />}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        {won ? 'Thắng ván' : 'Thua ván'}
                        <span className="text-[11px] font-normal text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                          {item.mode === 'fund' ? 'Góp quỹ' : 'Basic'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">{dateStr}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-base font-black font-display ${
                        item.score_delta > 0
                          ? 'text-emerald-400'
                          : item.score_delta < 0
                          ? 'text-red-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.score_delta > 0 ? `+${item.score_delta}` : item.score_delta}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-slate-700 flex justify-end">
          <button onClick={onClose} className="btn-secondary py-2 px-6">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
