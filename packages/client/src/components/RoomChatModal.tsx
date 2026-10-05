import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Smile, Zap, Sparkles } from 'lucide-react';
import { useSocket, RoomChatMessage } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

interface RoomChatModalProps {
  onClose: () => void;
}

const QUICK_PRESETS = [
  'Chào cả nhà! 👋',
  'Đánh nhanh lên bạn ơi! ⏳',
  'Bài đẹp quá! 🔥',
  'May mắn thế! 🍀',
  'Cố lên nào! 💪',
  'Xin lỗi nha! 🙏',
  'Chơi tiếp ván nữa nhé! 🔄',
  'Ảo thật đấy! 🤯',
];

const QUICK_EMOJIS = ['😂', '😎', '😡', '😭', '🃏', '🔥', '💰', '👍', '👏', '🎉'];

export const RoomChatModal: React.FC<RoomChatModalProps> = ({ onClose }) => {
  const { roomChats, sendRoomChat, roomState } = useSocket();
  const { user } = useAuth();
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever a new chat message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomChats]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || sending) return;

    setSending(true);
    try {
      await sendRoomChat(text);
      if (!textToSend) {
        setInputText('');
      }
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-2 sm:p-4 bg-black/40 backdrop-blur-sm select-none"
      onClick={onClose}
    >
      <div
        className="w-full sm:w-[380px] h-[520px] max-h-[85vh] flex flex-col bg-gradient-to-b from-[#201215] via-[#160c0e] to-[#0c0608] border-2 border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:slide-in-from-right-6 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow Top Accent */}
        <div className="h-1 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 w-full shrink-0" />

        {/* Header */}
        <div className="p-3.5 border-b border-amber-500/20 flex items-center justify-between bg-black/30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shadow">
              <MessageSquare size={16} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-100">
                TRÒ CHUYỆN BÀN CHƠI
              </h3>
              <div className="text-[10px] text-amber-200/60">
                Bàn: {roomState?.code} ({roomChats.length} tin nhắn)
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/40 border border-amber-500/20 text-amber-200 hover:text-white hover:bg-black/70 flex items-center justify-center transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message List */}
        <div className="flex-1 p-3 space-y-2.5 overflow-y-auto scrollbar-thin scrollbar-thumb-amber-500/30 scrollbar-track-black/20">
          {roomChats.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
              <Sparkles size={28} className="text-amber-500/40 mb-2 animate-pulse" />
              <div className="text-xs font-bold text-slate-400 mb-1">Chưa có tin nhắn nào</div>
              <div className="text-[11px] text-slate-500 max-w-[220px]">
                Hãy chọn câu chat nhanh hoặc gửi tin nhắn giao lưu với mọi người trong bàn!
              </div>
            </div>
          ) : (
            roomChats.map((msg, idx) => {
              const isMe = user && msg.senderId === user.userId;
              const timeStr = new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id || idx}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  {/* Sender Name & Time */}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5 px-1">
                    <span className={`font-bold ${isMe ? 'text-amber-300' : 'text-slate-300'}`}>
                      {isMe ? 'Bạn' : msg.senderName}
                    </span>
                    {msg.senderSeatIndex !== -1 && (
                      <span className="text-[9px] bg-black/40 border border-amber-500/20 px-1 rounded text-amber-200/70">
                        Ghế {msg.senderSeatIndex + 1}
                      </span>
                    )}
                    <span>·</span>
                    <span className="font-mono text-[9px]">{timeStr}</span>
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-xs font-medium shadow-md break-words ${
                      isMe
                        ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-amber-50 rounded-tr-none border border-amber-400/40'
                        : 'bg-slate-800/90 text-slate-100 rounded-tl-none border border-slate-700/60'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Presets / Shortcuts */}
        <div className="p-2 border-t border-amber-500/15 bg-black/40 space-y-1.5 shrink-0">
          {/* Quick Emojis */}
          <div className="flex items-center justify-between px-1">
            {QUICK_EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSend(emoji)}
                className="text-base hover:scale-125 active:scale-95 transition-transform"
                title={`Gửi ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Quick Presets Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_PRESETS.map((phrase, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(phrase)}
                className="shrink-0 bg-black/60 hover:bg-amber-500/20 border border-amber-500/25 hover:border-amber-400/60 rounded-full px-2.5 py-1 text-[11px] font-bold text-amber-200/80 hover:text-white transition whitespace-nowrap active:scale-95 shadow"
              >
                {phrase}
              </button>
            ))}
          </div>

          {/* Chat Input Box */}
          <form onSubmit={handleSubmit} className="flex items-center gap-1.5 pt-0.5">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Nhập tin nhắn..."
              maxLength={150}
              className="flex-1 bg-black/70 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 disabled:opacity-40 text-amber-950 font-black flex items-center justify-center shadow hover:brightness-110 active:scale-95 transition shrink-0"
              title="Gửi tin nhắn"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
