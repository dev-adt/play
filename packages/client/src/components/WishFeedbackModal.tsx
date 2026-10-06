import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../audio';
import {
  HeartHandshake,
  X,
  Sparkles,
  Send,
  Coins,
  MessageSquareHeart,
  Lightbulb,
  Bug,
  Clock,
  CheckCircle2,
  Gift,
  Flame,
  Award,
} from 'lucide-react';

interface WishRecord {
  id: string;
  type: 'wish' | 'feedback' | 'bug';
  title?: string;
  content: string;
  reward_amount: number;
  status: 'pending' | 'rewarded' | 'rejected';
  admin_note?: string;
  created_at: string;
  rewarded_at?: string;
}

interface WishFeedbackModalProps {
  onClose: () => void;
  onRewardReceived?: (amount: number) => void;
}

const FUNNY_SUGGESTIONS = [
  'Admin đẹp trai phong độ ngời ngời, phát cho em ít lộc chơi suốt đời! 💖',
  'Tiến Lên Miền Bắc quá phê, Admin thưởng nóng cho em về bờ nhanh! 🚀',
  'Chúc game ngày càng đông vui, Admin phát thưởng túi tiền rủng rỉnh! 💰',
  'Góp ý: Game mượt mà lắm rồi, chỉ thiếu mỗi Admin tặng em 50.000$ thôi ạ! 😂',
  'Em phát hiện ra lỗi: Game cuốn quá làm em quên cả ăn cơm, Admin đền em ít vốn đi! 🍲',
];

export const WishFeedbackModal: React.FC<WishFeedbackModalProps> = ({ onClose }) => {
  const { user, token } = useAuth();
  const [type, setType] = useState<'wish' | 'feedback' | 'bug'>('wish');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // My wishes history
  const [myWishes, setMyWishes] = useState<WishRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchMyWishes = async () => {
    try {
      setLoadingHistory(true);
      const activeToken = token || localStorage.getItem('tienlen_token');
      if (!activeToken) return;

      const res = await fetch('/api/feedback/my', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMyWishes(data.wishes || []);
      }
    } catch {
      // Ignore background fetch error
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchMyWishes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || content.trim().length < 5) {
      setError('Vui lòng nhập lời chúc hoặc góp ý ít nhất 5 ký tự nhé!');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const activeToken = token || localStorage.getItem('tienlen_token');
      const res = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          type,
          content: content.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Không thể gửi lúc này, vui lòng thử lại sau.');
      } else {
        setSuccessMsg(data.message || 'Gửi thành công! Admin sẽ đọc và duyệt thưởng sớm nhé 🎉');
        setContent('');
        sounds.playWin();

        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#ffd700', '#ec4899', '#3b82f6', '#10b981'],
        });

        fetchMyWishes();
      }
    } catch {
      setError('Lỗi kết nối máy chủ, vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-xl w-full p-4 sm:p-6 text-slate-100 border-2 border-amber-500/60 shadow-2xl relative overflow-hidden bg-gradient-to-b from-[#241315] via-[#1a0f12] to-[#120a0d] rounded-3xl">
        {/* Glow Accent Top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pink-500 via-amber-400 to-yellow-300"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/20 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 flex items-center justify-center shadow-lg border border-yellow-200">
              <MessageSquareHeart size={22} className="text-white stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-pink-200 to-amber-300 tracking-wide flex items-center gap-1.5">
                <span>KHEN ADMIN ĐẸP TRAI - NHẬN NGAY TIỀN THƯỞNG</span>
                <Sparkles size={16} className="text-yellow-400" />
              </h2>
              <p className="text-[11px] sm:text-xs text-amber-200/80 font-medium">
                Lời chúc càng bay bổng, góp ý càng sâu sắc thì Admin duyệt thưởng càng đẫm tay (từ <strong>1.000$</strong> đến <strong>50.000$</strong>)!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/40 border border-amber-500/30 text-amber-200 hover:text-white hover:bg-black/70 flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="bg-gradient-to-r from-emerald-950/90 to-green-900/90 border-2 border-emerald-400/80 rounded-2xl p-3 mb-4 text-center shadow-lg animate-bounce">
            <div className="text-xs sm:text-sm font-black text-emerald-300 flex items-center justify-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-950/80 border border-red-500/50 text-red-200 text-xs p-3 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        {/* Type Selector Tabs */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <button
            type="button"
            onClick={() => setType('wish')}
            className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition cursor-pointer ${
              type === 'wish'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-300 shadow-md scale-102'
                : 'bg-black/40 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <HeartHandshake size={15} />
            <span>💌 Bắn Thơ / Chúc Hay</span>
          </button>
          <button
            type="button"
            onClick={() => setType('feedback')}
            className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition cursor-pointer ${
              type === 'feedback'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-amber-950 border-yellow-200 shadow-md scale-102'
                : 'bg-black/40 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Lightbulb size={15} />
            <span>💡 Góp Ý Nâng Cấp</span>
          </button>
          <button
            type="button"
            onClick={() => setType('bug')}
            className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition cursor-pointer ${
              type === 'bug'
                ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white border-red-300 shadow-md scale-102'
                : 'bg-black/40 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Bug size={15} />
            <span>🐛 Báo Lỗi Nhặt Tiền</span>
          </button>
        </div>

        {/* Quick Funny Suggestions */}
        <div className="mb-3">
          <span className="text-[10px] uppercase font-black tracking-wider text-amber-300/80 block mb-1">
            Gợi ý mẫu câu hài hước (bấm để chọn nhanh):
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
            {FUNNY_SUGGESTIONS.map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setContent(sug)}
                className="text-[11px] bg-black/50 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/10 text-amber-200/90 rounded-lg px-2 py-1 text-left transition cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>

        {/* Form Input */}
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                type === 'wish'
                  ? 'Gửi những lời chúc ngọt ngào, thơ văn lai láng đến Admin để nhận thưởng nóng...'
                  : type === 'feedback'
                  ? 'Chia sẻ ý tưởng hoặc tính năng bạn muốn có trong game...'
                  : 'Mô tả lỗi bạn gặp phải để Admin fix và gửi quà tạ lỗi...'
              }
              rows={3}
              maxLength={500}
              className="w-full bg-black/60 border border-amber-500/40 rounded-2xl p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none"
            />
            <span className="absolute bottom-2 right-3 text-[10px] text-slate-500">
              {content.length}/500
            </span>
          </div>

          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-[11px] text-amber-200/70 flex items-center gap-1 font-medium">
              <Gift size={13} className="text-yellow-400" />
              Admin đọc hòm thư mỗi ngày và gửi tiền thưởng trực tiếp vào ví!
            </span>
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="btn-game-gold py-2 px-5 text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-lg active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              <Send size={15} />
              <span>{submitting ? 'ĐANG GỬI...' : 'GỬI LỜI CHÚC'}</span>
            </button>
          </div>
        </form>

        {/* My Past Wishes & Status */}
        <div className="border-t border-amber-500/20 pt-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Flame size={14} className="text-amber-400" />
              <span>Lịch sử lời chúc của bạn ({myWishes.length})</span>
            </h3>
            <span className="text-[10px] text-slate-400">
              {loadingHistory ? 'Đang cập nhật...' : 'Cập nhật tự động'}
            </span>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
            {myWishes.length === 0 ? (
              <div className="bg-black/30 border border-slate-800/80 rounded-xl p-3 text-center text-xs text-slate-400">
                Bạn chưa gửi lời chúc nào. Hãy gửi lời chúc đầu tiên để nhận quà từ Admin nhé!
              </div>
            ) : (
              myWishes.map((w) => (
                <div
                  key={w.id}
                  className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1 transition ${
                    w.status === 'rewarded'
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100'
                      : 'bg-black/40 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                      {w.type === 'wish' ? '💌 Lời chúc' : w.type === 'feedback' ? '💡 Góp ý' : '🐛 Báo lỗi'}
                      <span className="text-slate-500">· {new Date(w.created_at).toLocaleDateString('vi-VN')}</span>
                    </span>

                    {/* Status Badge */}
                    {w.status === 'rewarded' ? (
                      <span className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                        <Coins size={11} className="fill-emerald-400" />
                        Admin đã thưởng: +{w.reward_amount.toLocaleString()}$
                      </span>
                    ) : (
                      <span className="bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock size={11} />
                        Chờ Admin duyệt
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-200 line-clamp-2 italic">
                    "{w.content}"
                  </p>

                  {w.admin_note && (
                    <div className="text-[10px] bg-black/40 p-1.5 rounded-lg border border-emerald-500/30 text-emerald-300 font-medium">
                      <strong>Admin nhắn lại:</strong> {w.admin_note}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
