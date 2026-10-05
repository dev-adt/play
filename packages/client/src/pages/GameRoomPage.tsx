import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Card, Combination, identifyCombination, canBeat, sortCards, compareCards } from '@tienlen/shared';
import { PlayerSeatView } from '../components/PlayerSeatView';
import { TableCenterView } from '../components/TableCenterView';
import { HandView } from '../components/HandView';
import { ActionBar } from '../components/ActionBar';
import { ResultModal } from '../components/ResultModal';
import { LobbyPage } from './LobbyPage';

interface GameRoomPageProps {
  roomCode: string;
}

export const GameRoomPage: React.FC<GameRoomPageProps> = ({ roomCode }) => {
  const { user } = useAuth();
  const { roomState, playCards, passTurn, nextGame } = useSocket();
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [sortBySuit, setSortBySuit] = useState(false);

  if (!roomState) return null;

  // If game is not active, render Lobby
  if (!roomState.isGameActive || !roomState.gameState) {
    return <LobbyPage roomCode={roomCode} />;
  }

  const gameState = roomState.gameState;
  const mySeat = roomState.mySeatIndex;
  const isSpectator = mySeat === -1;

  // Hand cards
  let myHand: Card[] = gameState.myHand || [];
  if (sortBySuit) {
    // Sort by suit then rank
    myHand = [...myHand].sort((a, b) => {
      if (a.suitValue !== b.suitValue) return a.suitValue - b.suitValue;
      return a.rankValue - b.rankValue;
    });
  } else {
    // Default: sort by rank then suit
    myHand = sortCards(myHand);
  }

  // Find opponent seats relative to my seat (bottom)
  const allPlayers = gameState.players;
  const myPlayer = allPlayers.find(p => p.seatIndex === mySeat);
  const isMyTurn = myPlayer ? myPlayer.isCurrentTurn : false;
  const hasPassed = myPlayer ? myPlayer.hasPassed : false;

  // Calculate relative positions for 2, 3, or 4 players:
  // If 4 players: (mySeat + 1) -> right, (mySeat + 2) -> top, (mySeat + 3) -> left
  // If 2 players: opponent -> top
  // If 3 players: (mySeat + 1) -> right, (mySeat + 2) -> left
  const otherPlayers = allPlayers.filter(p => p.seatIndex !== mySeat);

  let topPlayer: any = otherPlayers[0] || null;
  let leftPlayer: any = null;
  let rightPlayer: any = null;

  if (allPlayers.length === 4) {
    rightPlayer = allPlayers.find(p => p.seatIndex === (mySeat + 1) % 4);
    topPlayer = allPlayers.find(p => p.seatIndex === (mySeat + 2) % 4);
    leftPlayer = allPlayers.find(p => p.seatIndex === (mySeat + 3) % 4);
  } else if (allPlayers.length === 3) {
    rightPlayer = allPlayers.find(p => p.seatIndex === (mySeat + 1) % 3);
    leftPlayer = allPlayers.find(p => p.seatIndex === (mySeat + 2) % 3);
    topPlayer = null as any;
  }

  // Card selection toggle
  const handleToggleSelect = (cardId: string) => {
    setSelectedCardIds(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  // Play cards
  const handlePlay = async () => {
    if (selectedCardIds.length === 0) return;
    const res = await playCards(selectedCardIds);
    if (res.success) {
      setSelectedCardIds([]);
    }
  };

  // Pass turn
  const handlePass = async () => {
    const res = await passTurn();
    if (res.success) {
      setSelectedCardIds([]);
    }
  };

  // Suggest move logic
  const handleSuggest = () => {
    const cur = gameState.currentCombo;
    const cards = myHand;

    // 1. Table is empty: pick lowest single card
    if (!cur) {
      if (cards.length > 0) {
        setSelectedCardIds([cards[0].id]);
      }
      return;
    }

    // 2. Cur is single: find lowest beating single card
    if (cur.type === 'single') {
      for (const c of cards) {
        const combo = identifyCombination([c]);
        if (combo && canBeat(cur, combo).valid) {
          setSelectedCardIds([c.id]);
          return;
        }
      }
      // Or hàng chặt 2
      if (cur.cards[0].rank === '2') {
        // Try tứ quý
        for (let i = 0; i <= cards.length - 4; i++) {
          const quad = cards.slice(i, i + 4);
          const combo = identifyCombination(quad);
          if (combo && combo.type === 'four_of_a_kind' && canBeat(cur, combo).valid) {
            setSelectedCardIds(quad.map(q => q.id));
            return;
          }
        }
      }
    }

    // 3. Cur is pair: find lowest beating pair
    if (cur.type === 'pair') {
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          const combo = identifyCombination([cards[i], cards[j]]);
          if (combo && canBeat(cur, combo).valid) {
            setSelectedCardIds([cards[i].id, cards[j].id]);
            return;
          }
        }
      }
    }

    // 4. Cur is triple: find lowest beating triple
    if (cur.type === 'triple') {
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          for (let k = j + 1; k < cards.length; k++) {
            const combo = identifyCombination([cards[i], cards[j], cards[k]]);
            if (combo && canBeat(cur, combo).valid) {
              setSelectedCardIds([cards[i].id, cards[j].id, cards[k].id]);
              return;
            }
          }
        }
      }
    }

    // 5. Cur is straight: search for same length straight
    if (cur.type === 'straight') {
      const len = cur.length;
      if (cards.length >= len) {
        for (let i = 0; i <= cards.length - len; i++) {
          const sub = cards.slice(i, i + len);
          const combo = identifyCombination(sub);
          if (combo && canBeat(cur, combo).valid) {
            setSelectedCardIds(sub.map(s => s.id));
            return;
          }
        }
      }
    }
  };

  const currentComboPlayer = allPlayers.find(p => p.id === gameState.currentComboPlayerId);

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-2 md:p-4 flex flex-col justify-between select-none relative">
      {/* Casino Felt Table */}
      <div className="casino-table flex-1 flex flex-col justify-between p-3 md:p-6 min-h-[540px] relative">
        {/* Top Opponent */}
        <div className="w-full flex justify-center z-10">
          {topPlayer && (
            <PlayerSeatView
              player={topPlayer}
              turnDeadline={gameState.turnDeadline}
              turnTimeoutSeconds={gameState.turnTimeoutSeconds}
              isPendingDut3Bich={gameState.pendingDut3BichPlayerId === topPlayer.id}
              position="top"
            />
          )}
        </div>

        {/* Middle Row: Left Opponent - Table Center - Right Opponent */}
        <div className="flex items-center justify-between w-full my-auto px-1 md:px-4 z-10 gap-2">
          {/* Left Player */}
          <div className="w-36 flex justify-start">
            {leftPlayer && (
              <PlayerSeatView
                player={leftPlayer}
                turnDeadline={gameState.turnDeadline}
                turnTimeoutSeconds={gameState.turnTimeoutSeconds}
                isPendingDut3Bich={gameState.pendingDut3BichPlayerId === leftPlayer.id}
                position="left"
              />
            )}
          </div>

          {/* Center Table */}
          <div className="flex-1 flex justify-center">
            <TableCenterView
              currentCombo={gameState.currentCombo}
              currentComboPlayerName={currentComboPlayer?.displayName}
              chopNotices={gameState.chopNotices}
              isMyTurn={isMyTurn}
            />
          </div>

          {/* Right Player */}
          <div className="w-36 flex justify-end">
            {rightPlayer && (
              <PlayerSeatView
                player={rightPlayer}
                turnDeadline={gameState.turnDeadline}
                turnTimeoutSeconds={gameState.turnTimeoutSeconds}
                isPendingDut3Bich={gameState.pendingDut3BichPlayerId === rightPlayer.id}
                position="right"
              />
            )}
          </div>
        </div>

        {/* Bottom Area: Self Seat + Hand */}
        <div className="w-full flex flex-col items-center justify-end z-20 mt-auto">
          {/* My Player Seat Status Bar */}
          {myPlayer && (
            <div className="mb-1">
              <PlayerSeatView
                player={myPlayer}
                turnDeadline={gameState.turnDeadline}
                turnTimeoutSeconds={gameState.turnTimeoutSeconds}
                isPendingDut3Bich={gameState.pendingDut3BichPlayerId === myPlayer.id}
                position="bottom"
              />
            </div>
          )}

          {/* Action Bar */}
          {!isSpectator && (
            <ActionBar
              hand={myHand}
              selectedCardIds={selectedCardIds}
              currentCombo={gameState.currentCombo}
              isMyTurn={isMyTurn}
              hasPassed={hasPassed}
              onPlay={handlePlay}
              onPass={handlePass}
              onSortToggle={() => setSortBySuit(!sortBySuit)}
              onSuggest={handleSuggest}
              onClearSelection={() => setSelectedCardIds([])}
            />
          )}

          {/* Hand Cards */}
          <HandView
            hand={myHand}
            selectedCardIds={selectedCardIds}
            onToggleSelect={handleToggleSelect}
          />
        </div>
      </div>

      {/* Result Modal when game ends */}
      {gameState.phase === 'ended' && gameState.result && user && (
        <ResultModal
          result={gameState.result}
          players={gameState.players}
          mode={gameState.mode}
          myUserId={user.userId}
          onNextGame={nextGame}
        />
      )}
    </div>
  );
};
