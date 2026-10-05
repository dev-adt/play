import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Card, Combination, identifyCombination, canBeat, sortCards } from '@tienlen/shared';
import { PlayerSeatView } from '../components/PlayerSeatView';
import { TableCenterView } from '../components/TableCenterView';
import { HandView } from '../components/HandView';
import { ActionBar } from '../components/ActionBar';
import { ResultModal } from '../components/ResultModal';
import { sounds } from '../audio';
import {
  X,
  Menu,
  Volume2,
  VolumeX,
  Share2,
  Copy,
  Check,
  Play,
  UserX,
  BookOpen,
  Wifi,
  Sparkles,
  Trophy,
  MessageSquare,
} from 'lucide-react';
import { RulesModal } from '../components/RulesModal';
import { HistoryModal } from '../components/HistoryModal';
import { RoomChatModal } from '../components/RoomChatModal';

interface GameRoomPageProps {
  roomCode: string;
}

export const GameRoomPage: React.FC<GameRoomPageProps> = ({ roomCode }) => {
  const { user } = useAuth();
  const {
    roomState,
    roomChats,
    takeSeat,
    leaveSeat,
    toggleReady,
    startGame,
    playCards,
    passTurn,
    nextGame,
    kickPlayer,
  } = useSocket();

  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [sortBySuit, setSortBySuit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [lastReadChatCount, setLastReadChatCount] = useState(0);
  const [chatBubbles, setChatBubbles] = useState<Record<string, { text: string; expiresAt: number }>>({});
  const [isMuted, setIsMuted] = useState(sounds.isMuted);
  const [isThrowingCards, setIsThrowingCards] = useState(false);

  const unreadChatCount = showChat ? 0 : Math.max(0, roomChats.length - lastReadChatCount);

  const handleOpenChat = () => {
    setShowChat(true);
    setLastReadChatCount(roomChats.length);
  };

  // Sync floating chat bubbles when new messages arrive
  useEffect(() => {
    if (roomChats.length === 0) return;
    const lastMsg = roomChats[roomChats.length - 1];
    if (Date.now() - lastMsg.createdAt < 6000) {
      setChatBubbles(prev => ({
        ...prev,
        [lastMsg.senderId]: { text: lastMsg.text, expiresAt: Date.now() + 5000 },
      }));
    }
    if (showChat) {
      setLastReadChatCount(roomChats.length);
    }
  }, [roomChats, showChat]);

  // Periodically clear expired chat speech bubbles
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setChatBubbles(prev => {
        let changed = false;
        const updated = { ...prev };
        for (const [uid, b] of Object.entries(updated)) {
          if (b.expiresAt <= now) {
            delete updated[uid];
            changed = true;
          }
        }
        return changed ? updated : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleSound = () => {
    setIsMuted(sounds.toggleMute());
  };

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}/room/${roomCode}`;
    if (navigator.share) {
      navigator.share({
        title: `Vào chơi Tiến lên miền Bắc: ${roomState?.name || 'Bàn chơi'}`,
        url: fullUrl,
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // If roomState is still loading from socket, show elegant table with loading
  if (!roomState) {
    return (
      <div className="w-full h-full flex-1 flex items-center justify-center bg-[#0b0708] p-4">
        <div className="stadium-table w-full max-w-4xl h-[520px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-4 border-amber-400 border-t-transparent animate-spin mx-auto mb-3" />
            <div className="text-amber-400 font-bold font-display text-base">
              Đang vào bàn {roomCode}...
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isGameActive = roomState.isGameActive && !!roomState.gameState;
  const gameState = roomState.gameState;
  const mySeat = roomState.mySeatIndex;
  const isSpectator = mySeat === -1;
  const isOwner = user && roomState.ownerId === user.userId;

  // Hand cards
  let myHand: Card[] = (gameState && gameState.myHand) || [];
  if (sortBySuit) {
    myHand = [...myHand].sort((a, b) => {
      if (a.suitValue !== b.suitValue) return a.suitValue - b.suitValue;
      return a.rankValue - b.rankValue;
    });
  } else {
    myHand = sortCards(myHand);
  }

  // Seated players in lobby
  const seatedMembers = roomState.seats;
  const myMember = mySeat !== -1 ? seatedMembers[mySeat] : null;

  // Active game players mapping
  const allGamePlayers = gameState?.players || [];
  const myGamePlayer = allGamePlayers.find(p => p.seatIndex === mySeat);
  const isMyTurn = myGamePlayer ? myGamePlayer.isCurrentTurn : false;
  const hasPassed = myGamePlayer ? myGamePlayer.hasPassed : false;

  const maxPlayers = roomState.maxPlayers || 4;

  // Positions relative to my seat (or seat 0 if spectator)
  const baseSeat = mySeat !== -1 ? mySeat : 0;

  // Derive seat positions according to maxPlayers (2, 3, or 4)
  let topSeatIdx = -1;
  let leftSeatIdx = -1;
  let rightSeatIdx = -1;
  let bottomSeatIdx = baseSeat;

  if (maxPlayers === 2) {
    // 2 players: 1vs1 facing each other across the oval table!
    bottomSeatIdx = baseSeat;
    topSeatIdx = (baseSeat + 1) % 2;
    leftSeatIdx = -1;
    rightSeatIdx = -1;
  } else if (maxPlayers === 3) {
    // 3 players: triangular (bottom, right, left)
    bottomSeatIdx = baseSeat;
    rightSeatIdx = (baseSeat + 1) % 3;
    leftSeatIdx = (baseSeat + 2) % 3;
    topSeatIdx = -1;
  } else {
    // 4 players: standard 4 directions
    bottomSeatIdx = baseSeat;
    rightSeatIdx = (baseSeat + 1) % 4;
    topSeatIdx = (baseSeat + 2) % 4;
    leftSeatIdx = (baseSeat + 3) % 4;
  }

  const getPlayerAtSeat = (seatIdx: number) => {
    if (seatIdx < 0 || seatIdx >= maxPlayers) return null;
    if (isGameActive) {
      const gp = allGamePlayers.find(p => p.seatIndex === seatIdx);
      if (gp) {
        return {
          ...gp,
          isOwner: gp.id === roomState.ownerId,
        };
      }
      const mem = seatedMembers[seatIdx];
      if (mem) {
        return {
          id: mem.userId,
          displayName: mem.displayName,
          seatIndex: mem.seatIndex,
          cardCount: 0,
          hasPassed: false,
          isOnline: mem.isOnline,
          isCurrentTurn: false,
          isReady: true,
          isOwner: mem.userId === roomState.ownerId,
          scoreText: 'Chờ ván sau',
        };
      }
      return null;
    }
    const mem = seatedMembers[seatIdx];
    if (!mem) return null;
    return {
      id: mem.userId,
      displayName: mem.displayName,
      seatIndex: mem.seatIndex,
      cardCount: 13,
      hasPassed: false,
      isOnline: mem.isOnline,
      isCurrentTurn: false,
      isReady: mem.isReady,
      isOwner: mem.userId === roomState.ownerId,
    };
  };

  const topPlayer = topSeatIdx !== -1 ? getPlayerAtSeat(topSeatIdx) : null;
  const leftPlayer = leftSeatIdx !== -1 ? getPlayerAtSeat(leftSeatIdx) : null;
  const rightPlayer = rightSeatIdx !== -1 ? getPlayerAtSeat(rightSeatIdx) : null;
  const bottomPlayer = isGameActive
    ? (myGamePlayer ? { ...myGamePlayer, isOwner: !!isOwner } : (myMember ? {
        id: myMember.userId,
        displayName: myMember.displayName,
        seatIndex: myMember.seatIndex,
        cardCount: 0,
        hasPassed: false,
        isOnline: myMember.isOnline,
        isCurrentTurn: false,
        isReady: true,
        isOwner: !!isOwner,
        scoreText: 'Ghế chờ ván sau',
      } : null))
    : myMember
    ? {
        id: myMember.userId,
        displayName: myMember.displayName,
        seatIndex: myMember.seatIndex,
        cardCount: 13,
        hasPassed: false,
        isOnline: true,
        isCurrentTurn: false,
        isReady: myMember.isReady,
        isOwner: !!isOwner,
      }
    : null;

  // Card select
  const handleToggleSelect = (cardId: string) => {
    setSelectedCardIds(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  // Play
  const handlePlay = async () => {
    if (selectedCardIds.length === 0) return;
    const orderedIds = myHand
      .filter(c => selectedCardIds.includes(c.id))
      .map(c => c.id);
    setIsThrowingCards(true);
    const res = await playCards(orderedIds.length > 0 ? orderedIds : selectedCardIds);
    if (res.success) {
      setTimeout(() => {
        setSelectedCardIds([]);
        setIsThrowingCards(false);
      }, 160);
    } else {
      setIsThrowingCards(false);
      if (res.error) {
        alert(res.error);
      }
    }
  };

  // Pass
  const handlePass = async () => {
    const res = await passTurn();
    if (res.success) {
      setSelectedCardIds([]);
    }
  };

  // Suggest move logic
  const handleSuggest = () => {
    if (!gameState) return;
    const cur = gameState.currentCombo;
    const cards = myHand;

    if (!cur) {
      if (cards.length > 0) setSelectedCardIds([cards[0].id]);
      return;
    }

    if (cur.type === 'single') {
      for (const c of cards) {
        const combo = identifyCombination([c]);
        if (combo && canBeat(cur, combo).valid) {
          setSelectedCardIds([c.id]);
          return;
        }
      }
      if (cur.cards[0].rank === '2') {
        for (let i = 0; i <= cards.length - 4; i++) {
          const quad = cards.slice(i, i + 4);
          const combo = identifyCombination(quad);
          if (combo && combo.type === 'four_of_a_kind' && canBeat(cur, combo).valid) {
            setSelectedCardIds(quad.map(q => q.id));
            return;
          }
        }
      }
    } else if (cur.type === 'pair') {
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          const combo = identifyCombination([cards[i], cards[j]]);
          if (combo && canBeat(cur, combo).valid) {
            setSelectedCardIds([cards[i].id, cards[j].id]);
            return;
          }
        }
      }
    } else if (cur.type === 'triple') {
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
    } else if (cur.type === 'straight') {
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

  const currentComboPlayer = allGamePlayers.find(p => p.id === gameState?.currentComboPlayerId);

  // Check lobby ready state
  const seatedCount = seatedMembers.filter(s => s !== null).length;
  const allReady =
    seatedCount >= 2 &&
    seatedMembers.filter((s): s is NonNullable<typeof s> => s !== null).every(s => s.isReady || s.userId === roomState.ownerId);

  return (
    <div className="w-full h-full max-h-[100dvh] flex-1 flex flex-col justify-between bg-[#0b0708] relative overflow-hidden select-none p-1 sm:p-2 md:p-4">
      {/* 1. TOP BAR (Matching Image 2 Reference Layout) */}
      <div className="w-full flex items-center justify-between z-40 mb-1 md:mb-2 px-1 sm:px-2 py-0.5 sm:py-1">
        {/* Top Left: Exit, Menu & Table info pill */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Close/Back button */}
          <button
            onClick={() => (window.location.href = '/')}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 border border-slate-700 hover:border-amber-400 text-white flex items-center justify-center transition"
            title="Rời phòng về trang chủ"
          >
            <X size={16} />
          </button>

          {/* Menu / Rules icon */}
          <button
            onClick={() => setShowRules(true)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 border border-slate-700 hover:border-amber-400 text-white flex items-center justify-center transition"
            title="Luật chơi"
          >
            <Menu size={16} />
          </button>

          {/* Trophy / Stats icon */}
          <button
            onClick={() => setShowHistory(true)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 border border-slate-700 hover:border-amber-400 text-amber-400 flex items-center justify-center transition"
            title="Bảng thành tích & Lịch sử đấu"
          >
            <Trophy size={15} />
          </button>

          {/* Table info pill */}
          <div className="bg-black/75 border border-amber-500/30 rounded-xl px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs shadow">
            <div className="font-extrabold text-amber-300 font-display flex items-center gap-1 text-[11px] sm:text-xs">
              <span>{roomState.mode === 'fund' ? 'Góp quỹ' : 'Basic'}</span>
              <span>·</span>
              <span>Bàn: {roomState.code}</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-300 flex items-center gap-2">
              <span className="truncate max-w-[90px] sm:max-w-none">{roomState.name}</span>
              <span className="text-emerald-400 font-mono flex items-center gap-0.5">
                <Wifi size={10} /> 45ms
              </span>
            </div>
          </div>
        </div>

        {/* Top Right: Chat, Sound & Share Invite */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Chat button with unread badge */}
          <button
            onClick={handleOpenChat}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 border border-slate-700 hover:border-amber-400 text-amber-300 flex items-center justify-center transition relative"
            title="Khung chat bàn chơi"
          >
            <MessageSquare size={15} />
            {unreadChatCount > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center border border-white shadow animate-pulse">
                {unreadChatCount > 9 ? '9+' : unreadChatCount}
              </div>
            )}
          </button>

          {/* Copy link button */}
          <button
            onClick={handleCopyLink}
            className="btn-game-red py-1 sm:py-1.5 px-2.5 sm:px-3 text-[11px] sm:text-xs flex items-center gap-1"
            title="Sao chép link mời bạn bè"
          >
            {copied ? <Check size={13} className="text-emerald-300" /> : <Copy size={13} />}
            <span className="hidden sm:inline">{copied ? 'Đã chép!' : 'Mời bạn'}</span>
          </button>

          {/* Sound mute button */}
          <button
            onClick={handleToggleSound}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 border border-slate-700 hover:border-amber-400 text-white flex items-center justify-center transition"
          >
            {isMuted ? <VolumeX size={15} className="text-red-400" /> : <Volume2 size={15} />}
          </button>
        </div>
      </div>

      {/* 2. THE STADIUM / OVAL CASINO TABLE (Holds Top, Left, Right Opponents & Center Table) */}
      <div className="flex-1 min-h-0 w-full max-w-5xl mx-auto flex items-center justify-center relative p-0.5 sm:p-1 md:p-3 my-auto">
        <div className="stadium-table w-full h-full min-h-[190px] max-h-[46vh] md:max-h-[55vh] relative flex items-center justify-center">
          {/* Top Seat (Opponent) */}
          {topSeatIdx !== -1 && (
            <div className="absolute -top-3 md:-top-8 left-1/2 -translate-x-1/2 z-20">
              <PlayerSeatView
                player={topPlayer}
                seatIndex={topSeatIdx}
                turnDeadline={gameState?.turnDeadline}
                turnTimeoutSeconds={gameState?.turnTimeoutSeconds}
                isPendingDut3Bich={gameState?.pendingDut3BichPlayerId === topPlayer?.id}
                position="top"
                isLobby={!isGameActive}
                onTakeSeat={takeSeat}
                canKick={!!isOwner && topPlayer !== null && topPlayer.id !== user?.userId}
                onKick={kickPlayer}
                chatBubbleText={topPlayer ? chatBubbles[topPlayer.id]?.text : null}
              />
            </div>
          )}

          {/* Left Seat (Opponent) */}
          {leftSeatIdx !== -1 && (
            <div className="absolute left-1 sm:left-2 md:left-6 top-1/2 -translate-y-1/2 z-20">
              <PlayerSeatView
                player={leftPlayer}
                seatIndex={leftSeatIdx}
                turnDeadline={gameState?.turnDeadline}
                turnTimeoutSeconds={gameState?.turnTimeoutSeconds}
                isPendingDut3Bich={gameState?.pendingDut3BichPlayerId === leftPlayer?.id}
                position="left"
                isLobby={!isGameActive}
                onTakeSeat={takeSeat}
                canKick={!!isOwner && leftPlayer !== null && leftPlayer.id !== user?.userId}
                onKick={kickPlayer}
                chatBubbleText={leftPlayer ? chatBubbles[leftPlayer.id]?.text : null}
              />
            </div>
          )}

          {/* Center Table: Combo Cards or Lobby Host Controls */}
          <div className="z-10 flex flex-col items-center justify-center px-1 sm:px-4">
            {isGameActive && gameState ? (
              <TableCenterView
                currentCombo={gameState.currentCombo}
                currentComboPlayerName={currentComboPlayer?.displayName}
                chopNotices={gameState.chopNotices}
                isMyTurn={isMyTurn}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-2 sm:p-4 text-center z-30">
                {isOwner ? (
                  <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                    <button
                      onClick={startGame}
                      disabled={!allReady}
                      className="btn-game-gold py-2.5 sm:py-3 px-6 sm:px-8 text-sm sm:text-base md:text-lg shadow-2xl scale-105 sm:scale-110 flex items-center gap-2"
                    >
                      <Play size={18} fill="#3e2723" />
                      BẮT ĐẦU VÁN ({seatedCount}/{maxPlayers})
                    </button>
                    {!allReady && (
                      <span className="text-[11px] sm:text-xs text-amber-200/80 bg-black/60 px-3 py-1 rounded-full mt-0.5 border border-amber-500/20">
                        {seatedCount < 2
                          ? 'Cần ít nhất 2 người ngồi để bắt đầu'
                          : 'Chờ tất cả người chơi bấm SẴN SÀNG'}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="bg-black/60 border border-amber-500/30 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold text-amber-300 shadow flex items-center gap-2">
                    <Sparkles size={16} /> Đang chờ chủ bàn bắt đầu ván đấu...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Seat (Opponent) */}
          {rightSeatIdx !== -1 && (
            <div className="absolute right-1 sm:right-2 md:right-6 top-1/2 -translate-y-1/2 z-20">
              <PlayerSeatView
                player={rightPlayer}
                seatIndex={rightSeatIdx}
                turnDeadline={gameState?.turnDeadline}
                turnTimeoutSeconds={gameState?.turnTimeoutSeconds}
                isPendingDut3Bich={gameState?.pendingDut3BichPlayerId === rightPlayer?.id}
                position="right"
                isLobby={!isGameActive}
                onTakeSeat={takeSeat}
                canKick={!!isOwner && rightPlayer !== null && rightPlayer.id !== user?.userId}
                onKick={kickPlayer}
                chatBubbleText={rightPlayer ? chatBubbles[rightPlayer.id]?.text : null}
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. BOTTOM AREA: SELF AVATAR (LEFT), ACTION BAR (CENTER), HAND CARDS (CENTER), "XẾP BÀI" BUTTON (RIGHT) */}
      <div className="w-full relative z-30 flex flex-col items-center pb-1 sm:pb-2 select-none">
        {/* Bottom Left: Self Avatar & Score */}
        <div className="absolute left-2 md:left-6 bottom-1 sm:bottom-2 z-30 hidden sm:flex items-center">
          <PlayerSeatView
            player={bottomPlayer}
            seatIndex={bottomSeatIdx}
            turnDeadline={gameState?.turnDeadline}
            turnTimeoutSeconds={gameState?.turnTimeoutSeconds}
            isPendingDut3Bich={gameState?.pendingDut3BichPlayerId === bottomPlayer?.id}
            position="bottom"
            isLobby={!isGameActive}
            onTakeSeat={takeSeat}
            chatBubbleText={bottomPlayer ? chatBubbles[bottomPlayer.id]?.text : null}
          />
        </div>

        {/* Lobby Controls for Seated Player */}
        {!isGameActive && myMember && (
          <div className="mb-2 flex items-center gap-2">
            {!isOwner && (
              <button
                onClick={toggleReady}
                className={`btn-game-gold py-1.5 px-6 text-xs md:text-sm ${
                  myMember.isReady ? 'bg-slate-700' : ''
                }`}
              >
                {myMember.isReady ? 'HỦY SẴN SÀNG' : 'SẴN SÀNG'}
              </button>
            )}
            <button
              onClick={leaveSeat}
              className="btn-game-red py-1.5 px-4 text-xs flex items-center gap-1"
            >
              <UserX size={14} /> Rời ghế
            </button>
          </div>
        )}

        {/* Waiting Seat Controls when game is active */}
        {isGameActive && myMember && !myGamePlayer && (
          <div className="mb-2 flex items-center gap-2 z-40 bg-black/80 border border-amber-500/50 px-3.5 py-1.5 rounded-full shadow-2xl">
            <span className="text-[11px] sm:text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <span>⏳ Đang ngồi ghế {myMember.seatIndex + 1} chờ</span>
              <span className="text-slate-300 hidden sm:inline">· Bạn sẽ tham gia thi đấu ở ván kế tiếp</span>
            </span>
            <button
              onClick={leaveSeat}
              className="btn-game-red py-1 px-3 text-[11px] flex items-center gap-1 ml-1"
              title="Rời khỏi ghế chờ"
            >
              <UserX size={12} /> Hủy chờ
            </button>
          </div>
        )}

        {/* Spectator Button to Take Empty Seat (both in lobby and during active game) */}
        {isSpectator && seatedCount < maxPlayers && (
          <div className="mb-2 z-40">
            <button
              onClick={() => {
                const emptyIdx = seatedMembers.findIndex(s => s === null);
                if (emptyIdx !== -1) takeSeat(emptyIdx);
              }}
              className="btn-game-gold py-2 px-6 text-xs sm:text-sm shadow-2xl flex items-center gap-1.5 animate-pulse"
            >
              <span>{isGameActive ? '+ Ngồi Vào Ghế Chờ (Vào ván sau)' : '+ Ngồi Vào Ghế Chơi'}</span>
            </button>
          </div>
        )}

        {/* In-Game Action Bar: only show if user is actively playing cards in this round */}
        {isGameActive && gameState && myGamePlayer && (
          <ActionBar
            hand={myHand}
            selectedCardIds={selectedCardIds}
            currentCombo={gameState.currentCombo}
            isMyTurn={isMyTurn}
            hasPassed={hasPassed}
            onPlay={handlePlay}
            onPass={handlePass}
            onSuggest={handleSuggest}
            onClearSelection={() => setSelectedCardIds([])}
          />
        )}

        {/* In-Game Hand Cards Horizontal Row + "XẾP BÀI" Pill Button: only if actively playing in this round */}
        {isGameActive && myGamePlayer && (
          <div className="w-full max-w-4xl flex items-center justify-center relative px-1 sm:px-2">
            <HandView
              hand={myHand}
              selectedCardIds={selectedCardIds}
              onToggleSelect={handleToggleSelect}
              isThrowing={isThrowingCards}
            />

            {/* "XẾP BÀI" Button on Right Side of Cards */}
            <button
              onClick={() => setSortBySuit(!sortBySuit)}
              className="btn-game-red py-1.5 sm:py-2 px-3 sm:px-5 rounded-full font-black text-[11px] sm:text-sm shadow-2xl ml-1.5 sm:ml-2 shrink-0 self-center tracking-wider active:scale-95 transition"
              title={sortBySuit ? 'Đang xếp theo chất (bấm để xếp theo giá trị)' : 'Đang xếp theo giá trị (bấm để xếp theo chất)'}
            >
              XẾP BÀI
            </button>
          </div>
        )}
      </div>

      {/* Rules Modal */}
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      {/* Achievements & History Modal */}
      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}

      {/* Room Chat Drawer / Modal */}
      {showChat && <RoomChatModal onClose={() => setShowChat(false)} />}

      {/* Result Modal when game ends */}
      {gameState?.phase === 'ended' && gameState.result && user && (
        <ResultModal
          result={gameState.result}
          players={gameState.players}
          mode={gameState.mode}
          myUserId={user.userId}
          onNextGame={nextGame}
          autoStartTime={roomState.nextGameAutoStartTime}
        />
      )}
    </div>
  );
};
