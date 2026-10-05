import React, { useState } from 'react';
import { Card, Combination, identifyCombination, canBeat } from '@tienlen/shared';
import { Play, SkipForward, Wand2, AlertTriangle, AlertCircle } from 'lucide-react';

interface ActionBarProps {
  hand: Card[];
  selectedCardIds: string[];
  currentCombo: Combination | null;
  isMyTurn: boolean;
  hasPassed: boolean;
  onPlay: () => void;
  onPass: () => void;
  onSuggest: () => void;
  onClearSelection: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({
  hand,
  selectedCardIds,
  currentCombo,
  isMyTurn,
  hasPassed,
  onPlay,
  onPass,
  onSuggest,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const selectedCards = hand.filter(c => selectedCardIds.includes(c.id));

  const handlePlayClick = () => {
    setErrorMessage(null);

    if (!isMyTurn) {
      setErrorMessage('Chưa đến lượt đi của bạn!');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    if (hasPassed) {
      setErrorMessage('Bạn đã bỏ lượt trong vòng này!');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    if (selectedCards.length === 0) {
      setErrorMessage('Vui lòng chạm vào các quân bài trên tay để chọn bài đánh!');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    // 1. Check if selected cards form a valid combination
    const identified = identifyCombination(selectedCards);
    if (!identified) {
      setErrorMessage('Các quân bài bạn chọn không tạo thành bộ hợp lệ (đôi, sảnh đồng chất/màu, tứ quý...)!');
      setTimeout(() => setErrorMessage(null), 3500);
      return;
    }

    // 2. If table already has cards, check if can beat
    if (currentCombo) {
      const beatCheck = canBeat(currentCombo, identified);
      if (!beatCheck.valid) {
        setErrorMessage(
          beatCheck.reason || 'Bài của bạn không chặn được bài trên bàn (phải cùng loại, đồng chất/màu và lớn hơn)!'
        );
        setTimeout(() => setErrorMessage(null), 4000);
        return;
      }
    }

    // 3. Check finish with 2s penalty warning (Rule: cannot finish with 2)
    if (selectedCards.length === hand.length && identified.cards.every(c => c.rank === '2')) {
      const confirmFinish = window.confirm(
        'CẢNH BÁO: Đánh hết bằng lá 2 cuối cùng sẽ bị phạt thối 2 và xử thua đền làng! Bạn có chắc muốn đánh?'
      );
      if (!confirmFinish) return;
    }

    // All valid! Execute play
    setErrorMessage(null);
    onPlay();
  };

  return (
    <div className="w-full max-w-3xl flex flex-col items-center gap-1.5 select-none z-40 mb-1 px-3 md:px-6">
      {/* Dynamic Error / Validation Alert Banner */}
      {errorMessage && (
        <div className="bg-red-950/95 border-2 border-red-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
          <AlertCircle size={16} className="text-yellow-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action Buttons Row: GỢI Ý (Trái) / ĐÁNH (Giữa màn hình) / BỎ LƯỢT (Góc phải) */}
      <div className="w-full flex items-center justify-between gap-2">
        {/* Left Side: Gợi Ý */}
        <div className="flex-1 flex justify-start">
          <button
            type="button"
            onClick={onSuggest}
            disabled={!isMyTurn || hasPassed}
            className="btn-game-red text-xs md:text-sm py-2 px-4 md:px-6 shadow-xl flex items-center gap-1.5 opacity-90 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition"
            title="Tự động chọn quân bài hợp lệ để chặn"
          >
            <Wand2 size={16} />
            <span>GỢI Ý</span>
          </button>
        </div>

        {/* Exact Center: ĐÁNH (Ra giữa màn hình) */}
        <div className="shrink-0 flex justify-center">
          <button
            type="button"
            onClick={handlePlayClick}
            className={`py-2.5 px-8 md:px-12 rounded-full text-xs md:text-sm font-black tracking-wider flex items-center gap-2 shadow-2xl transition active:scale-95 cursor-pointer ${
              isMyTurn && !hasPassed && selectedCards.length > 0
                ? 'btn-game-gold text-amber-950 scale-105 ring-2 ring-amber-300/70 shadow-amber-500/20'
                : 'bg-gradient-to-b from-amber-600 to-amber-800 text-amber-200 border border-amber-400/40 opacity-75'
            }`}
            title="Đánh bài ra giữa bàn"
          >
            <Play size={17} fill={isMyTurn && !hasPassed && selectedCards.length > 0 ? '#3e2723' : '#fef08a'} />
            <span>ĐÁNH</span>
          </button>
        </div>

        {/* Right Side: BỎ LƯỢT (Qua bên góc phải) */}
        <div className="flex-1 flex justify-end">
          <button
            type="button"
            onClick={onPass}
            disabled={!isMyTurn || hasPassed || !currentCombo}
            className="btn-game-red text-xs md:text-sm py-2 px-4 md:px-6 shadow-xl flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition"
            title="Bỏ qua lượt này"
          >
            <SkipForward size={16} />
            <span>BỎ LƯỢT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
