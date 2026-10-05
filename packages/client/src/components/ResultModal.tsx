import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Award, RotateCcw, AlertOctagon, Flame } from 'lucide-react';
import { sounds } from '../audio';

interface ResultModalProps {
  result: {
    endReason: string;
    endReasonText: string;
    winners: string[];
    playerResults: any[];
    ledger: any[];
  };
  players: { id: string; displayName: string; seatIndex: number }[];
  mode: 'basic' | 'fund';
  myUserId: string;
  onNextGame: () => void;
  autoStartTime?: number | null;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  result,
  players,
  mode,
  myUserId,
  onNextGame,
  autoStartTime,
}) => {
  const isWinner = result.winners.includes(myUserId);
  const [secondsLeft, setSecondsLeft] = useState<number>(3);

  useEffect(() => {
    const target = autoStartTime || Date.now() + 3000;
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 200);
    return () => clearInterval(interval);
  }, [autoStartTime]);

  useEffect(() => {
    const isPlayerInGame = players.some(p => p.id === myUserId);
    if (isWinner) {
      sounds.playWin();

      // Launch grand celebratory fireworks display
      const duration = 4000;
      const animationEnd = Date.now() + duration;

      // Opening salvo burst
      confetti({
        particleCount: 90,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#ffd700', '#f59e0b', '#ef4444', '#10b981', '#38bdf8', '#ffffff'],
      });

      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        // Rocket burst left side
        confetti({
          startVelocity: 32,
          spread: 360,
          ticks: 70,
          origin: {
            x: Math.random() * 0.35 + 0.1,
            y: Math.random() * 0.35 + 0.1,
          },
          colors: ['#fbbf24', '#f59e0b', '#ef4444', '#10b981', '#60a5fa', '#f472b6', '#ffffff'],
          shapes: ['circle', 'star'],
          scalar: 1.15,
          particleCount: 40,
        });

        // Rocket burst right side
        confetti({
          startVelocity: 32,
          spread: 360,
          ticks: 70,
          origin: {
            x: Math.random() * 0.35 + 0.55,
            y: Math.random() * 0.35 + 0.1,
          },
          colors: ['#ffd700', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ffffff'],
          shapes: ['circle', 'star'],
          scalar: 1.15,
          particleCount: 40,
        });

        // High golden star fountain burst
        if (Math.random() < 0.45) {
          confetti({
            particleCount: 35,
            angle: 90,
            spread: 120,
            startVelocity: 42,
            origin: { x: 0.5, y: 0.75 },
            colors: ['#ffd700', '#fef08a', '#ffffff'],
            shapes: ['star'],
            scalar: 1.3,
          });
        }
      }, 320);

      return () => clearInterval(interval);
    } else if (isPlayerInGame) {
      sounds.playLose();
    } else {
      // Spectator
      sounds.playWin();
    }
  }, [isWinner, myUserId]);

  return (
    <div className="modal-overlay">
      <div className="modal-content p-6 max-w-lg w-full text-slate-100">
        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mb-5">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 shadow-lg ${
              isWinner
                ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {isWinner ? <Trophy size={36} /> : <Award size={36} />}
          </div>
          <h2 className="text-xl md:text-2xl font-black text-amber-400 font-display">
            {result.endReasonText}
          </h2>
          <div className="text-xs text-slate-400 mt-1">
            Chế độ chơi: <strong className="text-amber-300">{mode === 'basic' ? 'Basic (Điểm ròng)' : 'Góp quỹ (Điểm phạt)'}</strong>
          </div>
        </div>

        {/* Players Results Breakdown Table */}
        <div className="bg-slate-900/90 rounded-xl overflow-hidden border border-slate-700 mb-6">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-800 text-amber-300 text-xs uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Người chơi</th>
                <th className="py-2.5 px-3 text-center">Kết quả</th>
                <th className="py-2.5 px-3 text-right">Biến động điểm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {result.playerResults.map(pr => {
                const player = players.find(p => p.id === pr.playerId);
                const isMe = pr.playerId === myUserId;
                const won = pr.isWinner;

                return (
                  <tr
                    key={pr.playerId}
                    className={`${isMe ? 'bg-amber-950/20 font-bold' : ''} hover:bg-slate-800/40`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white">
                          {player?.displayName || 'Người chơi'} {isMe && '(Bạn)'}
                        </span>
                      </div>
                      {pr.handEvaluation && pr.handEvaluation.groups?.length > 0 && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {pr.handEvaluation.isCong ? 'Cóng! ' : ''}
                          Thối: {pr.handEvaluation.groups.map((g: any) => `${g.name} (${g.score})`).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {won ? (
                        <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-xs font-bold">
                          Thắng
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Thua</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-display text-sm md:text-base font-black">
                      {mode === 'basic' ? (
                        pr.scoreDelta > 0 ? (
                          <span className="text-emerald-400">+{pr.scoreDelta}</span>
                        ) : pr.scoreDelta < 0 ? (
                          <span className="text-red-400">{pr.scoreDelta}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )
                      ) : (
                        // Góp quỹ: accumulated negative score
                        pr.scoreDelta < 0 ? (
                          <span className="text-red-400">{pr.scoreDelta}</span>
                        ) : (
                          <span className="text-emerald-400">0</span>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Ledger Entries Summary */}
        {result.ledger && result.ledger.length > 0 && (
          <div className="mb-6">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Flame size={14} className="text-amber-400" /> Các khoản phạt trong ván
            </div>
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 text-xs space-y-1.5 max-h-36 overflow-y-auto">
              {result.ledger.map((l, i) => (
                <div key={l.id || i} className="flex justify-between text-slate-300">
                  <span>{l.reason}</span>
                  <span className="font-bold text-amber-300">
                    {l.toPlayerId ? `±${l.amount}` : `-${l.amount}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auto start notification */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 text-xs text-amber-300 font-bold flex items-center justify-center gap-2 mb-4 animate-pulse">
          <RotateCcw size={14} className="animate-spin text-amber-400" />
          <span>Ván mới sẽ tự động bắt đầu sau {secondsLeft}s...</span>
        </div>

        {/* Action Button: Chơi ngay */}
        <div className="flex justify-center">
          <button onClick={onNextGame} className="btn-gold py-2.5 px-8 text-base shadow-xl flex items-center gap-2">
            <RotateCcw size={18} />
            <span>Chơi ngay {secondsLeft > 0 ? `(${secondsLeft}s)` : ''}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
