import React from 'react';
import { CardView } from './CardView';
import { Combination } from '@tienlen/shared';
import { Crown, Sparkles, Zap } from 'lucide-react';

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
  // Determine combo title (like "TỨ QUÝ" in Image 2)
  let comboTitle: string | null = null;
  if (currentCombo) {
    if (currentCombo.type === 'four_of_a_kind') comboTitle = 'TỨ QUÝ';
    else if (currentCombo.type === 'double_sequence') {
      if (currentCombo.pairCount === 3) comboTitle = '3 ĐÔI THÔNG';
      else if (currentCombo.pairCount === 4) comboTitle = '4 ĐÔI THÔNG';
      else comboTitle = '5 ĐÔI THÔNG';
    } else if (currentCombo.type === 'straight' && currentCombo.isHang) {
      comboTitle = `SẢNH ${currentCombo.length} LÁ`;
    } else if (currentCombo.type === 'triple') {
      comboTitle = currentCombo.cards[0].rank === '2' ? 'BỘ BA 2' : 'BỘ BA';
    } else if (currentCombo.type === 'pair') {
      comboTitle = currentCombo.cards[0].rank === '2' ? 'ĐÔI 2' : 'ĐÔI';
    } else if (currentCombo.type === 'single' && currentCombo.cards[0].rank === '2') {
      comboTitle = currentCombo.cards[0].color === 'red' ? '2 ĐỎ' : '2 ĐEN';
    }
  }

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      {/* Toast chop notices */}
      {chopNotices.length > 0 && (
        <div className="absolute -top-12 z-30 flex flex-col gap-1 items-center">
          {chopNotices.slice(-2).map((notice, i) => (
            <div
              key={notice.createdAt + i}
              className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs md:text-sm px-4 py-1 rounded-full shadow-2xl border border-white flex items-center gap-1.5 animate-bounce"
            >
              <Zap size={15} className="text-red-600 fill-red-600" />
              {notice.text}
            </div>
          ))}
        </div>
      )}

      {/* Table Cards Center */}
      <div className="min-h-[120px] flex flex-col items-center justify-center">
        {currentCombo && currentCombo.cards.length > 0 ? (
          <div className="flex flex-col items-center gap-1.5">
            {/* Combo Title with Crown & Stars (Matching Image 2!) */}
            {comboTitle && (
              <div className="flex flex-col items-center animate-fade-in">
                <div className="flex items-center gap-1 text-amber-400">
                  <span className="text-xs">★</span>
                  <Crown size={20} fill="#f5b041" className="text-amber-400" />
                  <span className="text-xs">★</span>
                </div>
                <div className="text-sm md:text-base font-black font-display text-amber-300 tracking-wider text-shadow-gold">
                  {comboTitle}
                </div>
              </div>
            )}

            {/* Fanned / Overlapping Cards on Table */}
            <div className="flex items-center justify-center -space-x-4 md:-space-x-5 px-2 py-1">
              {currentCombo.cards.map((card, idx) => (
                <div
                  key={card.id}
                  style={{
                    zIndex: idx,
                    transform: `rotate(${(idx - (currentCombo.cards.length - 1) / 2) * 3}deg)`,
                  }}
                  className="transition-transform"
                >
                  <CardView card={card} size="md" />
                </div>
              ))}
            </div>

            {currentComboPlayerName && (
              <div className="text-[11px] text-amber-200/90 font-bold bg-black/60 px-3 py-0.5 rounded-full border border-amber-500/20 shadow">
                {currentComboPlayerName} đã đánh
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-amber-200/50 py-3 px-6 rounded-full border border-dashed border-amber-400/30 bg-black/20">
            <Sparkles size={18} className="text-amber-400/70 mb-0.5" />
            <span className="text-xs font-bold text-amber-300/80">Vòng mới</span>
          </div>
        )}
      </div>
    </div>
  );
};
