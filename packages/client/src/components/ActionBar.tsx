import React from 'react';
import { Card, Combination, identifyCombination, canBeat } from '@tienlen/shared';
import { Play, SkipForward, ArrowUpDown, Wand2, AlertTriangle, XCircle } from 'lucide-react';

interface ActionBarProps {
  hand: Card[];
  selectedCardIds: string[];
  currentCombo: Combination | null;
  isMyTurn: boolean;
  hasPassed: boolean;
  onPlay: () => void;
  onPass: () => void;
  onSortToggle: () => void;
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
  onSortToggle,
  onSuggest,
  onClearSelection,
}) => {
  const selectedCards = hand.filter(c => selectedCardIds.includes(c.id));
  const identified = identifyCombination(selectedCards);

  // Check beating validity
  let canPlay = false;
  let validationMessage: string | null = null;
  let isAboutToFinishWithTwos = false;

  if (isMyTurn && !hasPassed && selectedCards.length > 0) {
    if (!identified) {
      validationMessage = 'Tổ hợp các lá bài được chọn không hợp lệ';
    } else {
      if (!currentCombo) {
        canPlay = true;
      } else {
        const beatCheck = canBeat(currentCombo, identified);
        if (beatCheck.valid) {
          canPlay = true;
        } else {
          validationMessage = beatCheck.reason || 'Không chặn được bài trên bàn';
        }
      }

      // Check finish with 2s warning
      if (canPlay && selectedCards.length === hand.length) {
        if (identified.cards.every(c => c.rank === '2')) {
          isAboutToFinishWithTwos = true;
        }
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-xl mx-auto px-2">
      {/* Warnings & validation messages */}
      {isAboutToFinishWithTwos && (
        <div className="bg-red-900/90 border border-red-500 text-red-200 text-xs px-3 py-1.5 rounded-xl shadow flex items-center gap-1.5 animate-pulse">
          <AlertTriangle size={16} className="text-amber-400 shrink-0" />
          <span>
            <strong>Cảnh báo:</strong> Đánh hết bài bằng 2 sẽ bị xử thua và phạt điểm về 2 cuối!
          </span>
        </div>
      )}

      {validationMessage && selectedCards.length > 0 && (
        <div className="bg-amber-950/80 border border-amber-500/40 text-amber-200 text-xs px-3 py-1 rounded-full flex items-center gap-1.5">
          <AlertTriangle size={14} className="text-amber-400 shrink-0" />
          <span>{validationMessage}</span>
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center justify-center gap-2 flex-wrap w-full">
        {/* Sort Button */}
        <button
          onClick={onSortToggle}
          className="btn-secondary text-xs md:text-sm py-2 px-3"
          title="Đổi kiểu xếp bài"
        >
          <ArrowUpDown size={16} />
          Xếp bài
        </button>

        {/* Suggest Button */}
        <button
          onClick={onSuggest}
          disabled={!isMyTurn || hasPassed}
          className="btn-secondary text-xs md:text-sm py-2 px-3 text-amber-300"
          title="Gợi ý nước đánh hợp lệ"
        >
          <Wand2 size={16} />
          Gợi ý
        </button>

        {/* Clear Selection */}
        {selectedCardIds.length > 0 && (
          <button
            onClick={onClearSelection}
            className="btn-secondary text-xs md:text-sm py-2 px-2.5 text-slate-400 hover:text-white"
            title="Bỏ chọn tất cả"
          >
            <XCircle size={16} />
          </button>
        )}

        {/* Pass Button */}
        <button
          onClick={onPass}
          disabled={!isMyTurn || hasPassed || !currentCombo}
          className="btn-danger text-xs md:text-sm py-2 px-4"
        >
          <SkipForward size={16} />
          Bỏ lượt
        </button>

        {/* Play Button */}
        <button
          onClick={onPlay}
          disabled={!canPlay}
          className="btn-gold text-xs md:text-base py-2.5 px-6"
        >
          <Play size={18} />
          Đánh bài
        </button>
      </div>
    </div>
  );
};
