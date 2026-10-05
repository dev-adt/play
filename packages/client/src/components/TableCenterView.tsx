import React from 'react';
import { CardView } from './CardView';
import { Combination } from '@tienlen/shared';
import { Sparkles, Zap } from 'lucide-react';

interface TableCenterViewProps {
  currentCombo: Combination | null;
  currentComboPlayerName?: string;
  chopNotices: { text: string; createdAt: number }[];
  isMyTurn: boolean;
}

export const TableCenterView: React.FC<TableCenterViewProps> = ({
  currentCombo,
  currentComboPlayerName,
  chopNotices,
  isMyTurn,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-3 text-center relative select-none">
      {/* Toast chop notices */}
      {chopNotices.length > 0 && (
        <div className="absolute -top-10 z-30 flex flex-col gap-1 items-center">
          {chopNotices.slice(-2).map((notice, i) => (
            <div
              key={notice.createdAt + i}
              className="bg-amber-500/90 text-slate-950 font-black text-xs md:text-sm px-4 py-1.5 rounded-full shadow-lg border border-amber-300 flex items-center gap-1.5 animate-bounce"
            >
              <Zap size={14} className="text-red-700" />
              {notice.text}
            </div>
          ))}
        </div>
      )}

      {/* Table Cards Area */}
      <div className="min-h-[110px] flex flex-col items-center justify-center">
        {currentCombo && currentCombo.cards.length > 0 ? (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {currentCombo.cards.map(card => (
                <CardView key={card.id} card={card} size="md" />
              ))}
            </div>
            {currentComboPlayerName && (
              <div className="text-xs text-amber-300 font-semibold bg-black/40 px-3 py-1 rounded-full mt-1 border border-amber-500/20">
                {currentComboPlayerName} đã đánh
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 py-4 px-6 rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-950/20">
            <Sparkles className="text-amber-400 mb-1 opacity-70" size={24} />
            <span className="text-xs md:text-sm font-semibold text-emerald-200">Bàn trống — Vòng mới</span>
            <span className="text-[11px] text-slate-400">
              {isMyTurn ? 'Đến lượt bạn đánh tổ hợp hợp lệ bất kỳ' : 'Đang chờ người mở vòng đánh bài'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
