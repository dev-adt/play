import React from 'react';
import { Card, Combination, identifyCombination, canBeat } from '@tienlen/shared';
import { Play, SkipForward, Wand2, AlertTriangle, XCircle, Shuffle } from 'lucide-react';

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
    <div className="flex flex-col items-center gap-1.5 w-full max-w-xl mx-auto px-2 select-none z-30">
      {/* Warnings & validation messages */}
      {isAboutToFinishWithTwos && (
        <div className="bg-red-950 border border-red-500 text-red-200 text-xs px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 animate-bounce">
          <AlertTriangle size={14} className="text-amber-400 shrink-0" />
          <span>
            <strong>Cảnh báo:</strong> Đánh hết bằng 2 sẽ bị xử phạt về 2 cuối!
          </span>
        </div>
      )}

      {validationMessage && selectedCards.length > 0 && (
        <div className="bg-black/80 border border-amber-500/50 text-amber-300 text-xs px-3 py-0.5 rounded-full flex items-center gap-1.5">
          <AlertTriangle size={13} className="text-amber-400 shrink-0" />
          <span>{validationMessage}</span>
        </div>
      )}

      {/* Buttons (Style matching Image 2 with "XẾP BÀI" red pill) */}
      <div className="flex items-center justify-center gap-2.5 flex-wrap w-full">
        {/* Pass Button */}
        <button
          onClick={onPass}
          disabled={!isMyTurn || hasPassed || !currentCombo}
          className="btn-game-red text-xs md:text-sm py-2 px-5"
        >
          <SkipForward size={16} />
          BỎ LƯỢT
        </button>

        {/* Suggest Button */}
        <button
          onClick={onSuggest}
          disabled={!isMyTurn || hasPassed}
          className="btn-game-red text-xs md:text-sm py-2 px-5 opacity-90"
        >
          <Wand2 size={16} />
          GỢI Ý
        </button>

        {/* Play Button */}
        <button
          onClick={onPlay}
          disabled={!canPlay}
          className="btn-game-gold text-xs md:text-sm py-2.5 px-7 scale-105"
        >
          <Play size={17} fill="#3e2723" />
          ĐÁNH
        </button>

        {/* XẾP BÀI Button (Exact match from Image 2!) */}
        <button
          onClick={onSortToggle}
          className="btn-game-red text-xs md:text-sm py-2 px-5 font-black"
        >
          <Shuffle size={15} />
          XẾP BÀI
        </button>

        {/* Clear selection */}
        {selectedCardIds.length > 0 && (
          <button
            onClick={onClearSelection}
            className="p-2 rounded-full bg-black/60 text-slate-400 hover:text-white border border-slate-700"
            title="Bỏ chọn"
          >
            <XCircle size={18} />
          </button>
        )}
      </div>
    </div>
  );
};
