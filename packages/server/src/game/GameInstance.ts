import {
  Card,
  Combination,
  ComboType,
  EndReason,
  GameMode,
  PlayerGameResult,
  PlayerHandEvaluation,
  ScoreLedgerEntry,
  compareCards,
  dealCards,
  defaultRulesConfig,
  evaluateHandPenalty,
  evaluateInstantWin,
  findLowestCardPlayerIndex,
  getCardById,
  getChopPenalty,
  identifyCombination,
  canBeat,
  settleGame,
  sortCards,
  RulesConfig,
} from '@tienlen/shared';
import { db } from '../db/database.js';

export interface GamePlayer {
  id: string;
  username: string;
  displayName: string;
  seatIndex: number;
  hand: Card[];
  hasPlayedCard: boolean;
  hasPassed: boolean;
  isOnline: boolean;
  offlineSince?: number | null;
  offlineAutoTurns?: number;
}

export interface PublicTablePlay {
  playerId: string;
  displayName: string;
  combination: Combination;
  playedAt: number;
  isChop: boolean;
}

export interface GameStateClientView {
  gameId: string;
  roomId: string;
  mode: GameMode;
  phase: 'dealing' | 'playing' | 'ended';
  stateVersion: number;
  mySeatIndex: number;
  myHand: Card[];
  currentTurnSeat: number;
  turnDeadline: number;
  turnTimeoutSeconds: number;
  currentCombo: Combination | null;
  currentComboPlayerId: string | null;
  pendingDut3BichPlayerId: string | null;
  players: {
    id: string;
    displayName: string;
    seatIndex: number;
    cardCount: number;
    hasPassed: boolean;
    isOnline: boolean;
    isCurrentTurn: boolean;
  }[];
  recentPlays: PublicTablePlay[];
  chopNotices: { text: string; createdAt: number }[];
  result?: {
    endReason: EndReason;
    endReasonText: string;
    winners: string[];
    playerResults: PlayerGameResult[];
    ledger: ScoreLedgerEntry[];
  };
}

export class GameInstance {
  public id: string;
  public roomId: string;
  public mode: GameMode;
  public phase: 'dealing' | 'playing' | 'ended' = 'dealing';
  public stateVersion: number = 1;
  public players: GamePlayer[] = [];
  public currentTurnIndex: number = 0; // Index in this.players
  public turnDeadline: number = 0;
  public currentCombo: Combination | null = null;
  public currentComboPlayerId: string | null = null;
  public lastPlaySeat: number = 0;
  public pendingDut3BichPlayerId: string | null = null;
  public firstGame: boolean = false;
  public previousWinnerId: string | null = null;
  public lowestCardDealt: Card | null = null;
  public priorChopEntries: ScoreLedgerEntry[] = [];
  public recentPlays: PublicTablePlay[] = [];
  public chopNotices: { text: string; createdAt: number }[] = [];
  public finalResult?: {
    endReason: EndReason;
    endReasonText: string;
    winners: string[];
    playerResults: PlayerGameResult[];
    ledger: ScoreLedgerEntry[];
  };

  private timerHandle: NodeJS.Timeout | null = null;
  private config: RulesConfig = defaultRulesConfig;
  private onStateChange: () => void;
  public onAutoKickOfflinePlayer?: (playerId: string, reason: string) => void;

  constructor(options: {
    id: string;
    roomId: string;
    mode: GameMode;
    players: { id: string; username: string; displayName: string; seatIndex: number }[];
    firstGame?: boolean;
    previousWinnerId?: string | null;
    onStateChange: () => void;
    onAutoKickOfflinePlayer?: (playerId: string, reason: string) => void;
  }) {
    this.id = options.id;
    this.roomId = options.roomId;
    this.mode = options.mode;
    this.firstGame = options.firstGame || false;
    this.previousWinnerId = options.previousWinnerId || null;
    this.onStateChange = options.onStateChange;
    this.onAutoKickOfflinePlayer = options.onAutoKickOfflinePlayer;

    this.players = options.players.map(p => ({
      ...p,
      hand: [],
      hasPlayedCard: false,
      hasPassed: false,
      isOnline: true,
      offlineSince: null,
      offlineAutoTurns: 0,
    }));
  }

  public async start(): Promise<void> {
    const { hands } = dealCards(this.players.length);
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].hand = hands[i];
    }

    // 1. Find lowest card dealt
    const { playerIndex: lowestPlayerIdx, lowestCard } = findLowestCardPlayerIndex(
      this.players.map(p => p.hand)
    );
    this.lowestCardDealt = lowestCard;

    // 2. Check Instant Win (Ăn trắng)
    let bestInstantWinPlayerIdx = -1;
    let bestInstantWinEval: any = null;

    for (let i = 0; i < this.players.length; i++) {
      const iw = evaluateInstantWin(this.players[i].hand, this.firstGame);
      if (iw.hasInstantWin) {
        if (bestInstantWinPlayerIdx === -1) {
          bestInstantWinPlayerIdx = i;
          bestInstantWinEval = iw;
        } else {
          // Break tie (Rule 12.3)
          if (iw.priority! < bestInstantWinEval.priority!) {
            bestInstantWinPlayerIdx = i;
            bestInstantWinEval = iw;
          }
        }
      }
    }

    if (bestInstantWinPlayerIdx !== -1) {
      // Instant win happened!
      const winner = this.players[bestInstantWinPlayerIdx];
      await this.endGame({
        endReason: 'instantWin',
        endReasonText: `Ăn trắng: ${bestInstantWinEval.description} (${winner.displayName})`,
        winnerIds: [winner.id],
      });
      return;
    }

    // 3. Opening turn:
    // If not first game and previous winner is still in the room, previous winner opens!
    const prevWinnerIdx = this.previousWinnerId
      ? this.players.findIndex(p => p.id === this.previousWinnerId)
      : -1;

    if (!this.firstGame && prevWinnerIdx !== -1) {
      this.currentTurnIndex = prevWinnerIdx;
    } else {
      // First game or winner not found: player with lowest card opens
      this.currentTurnIndex = lowestPlayerIdx;
    }

    this.phase = 'playing';
    this.stateVersion++;
    this.resetTurnTimer();
    this.onStateChange();
  }

  private resetTurnTimer(): void {
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }

    if (this.phase !== 'playing') return;

    const timeoutMs = this.config.turnTimeoutSeconds * 1000;
    this.turnDeadline = Date.now() + timeoutMs;

    this.timerHandle = setTimeout(async () => {
      await this.handleTurnTimeout();
    }, timeoutMs);
  }

  private async handleTurnTimeout(): Promise<void> {
    if (this.phase !== 'playing') return;
    const currentP = this.players[this.currentTurnIndex];

    // If player is offline, count auto turn and check auto-kick condition
    if (!currentP.isOnline) {
      currentP.offlineAutoTurns = (currentP.offlineAutoTurns || 0) + 1;
      const isOver3Mins = currentP.offlineSince && Date.now() - currentP.offlineSince >= 3 * 60 * 1000;
      const isOver2AutoTurns = currentP.offlineAutoTurns >= 2;

      if (isOver2AutoTurns || isOver3Mins) {
        const reason = isOver2AutoTurns
          ? `${currentP.displayName} bị out quá 2 lượt tự động và bị kick khỏi phòng`
          : `${currentP.displayName} bị out quá 3 phút và bị kick khỏi phòng`;

        if (this.onAutoKickOfflinePlayer) {
          this.onAutoKickOfflinePlayer(currentP.id, reason);
          return;
        }
      }
    }

    // If table is empty (opening new round), auto-play lowest valid single card
    if (!this.currentCombo) {
      const sortedHand = sortCards(currentP.hand);
      let cardToPlay: Card = sortedHand[0];

      // If first game and first turn of game, must play lowest card dealt
      if (this.firstGame && !currentP.hasPlayedCard && this.lowestCardDealt) {
        const found = currentP.hand.find(c => c.id === this.lowestCardDealt!.id);
        if (found) {
          cardToPlay = found;
        }
      }

      await this.playCards(currentP.id, [cardToPlay.id]);
    } else {
      // Table has cards: auto PASS
      await this.passTurn(currentP.id);
    }
  }

  public async playCards(playerId: string, cardIds: string[]): Promise<{ success: boolean; error?: string }> {
    if (this.phase !== 'playing') {
      return { success: false, error: 'Ván bài đã kết thúc' };
    }

    const currentP = this.players[this.currentTurnIndex];
    if (currentP.id !== playerId) {
      return { success: false, error: 'Chưa đến lượt của bạn' };
    }

    if (currentP.hasPassed) {
      return { success: false, error: 'Bạn đã bỏ lượt trong vòng này' };
    }

    // Verify cards are in player's hand
    const cardsToPlay: Card[] = [];
    for (const cid of cardIds) {
      const c = currentP.hand.find(card => card.id === cid);
      if (!c) {
        return { success: false, error: 'Bạn không sở hữu lá bài này' };
      }
      cardsToPlay.push(c);
    }

    // Identify combination
    const playedCombo = identifyCombination(cardsToPlay);
    if (!playedCombo) {
      return { success: false, error: 'Các lá bài được chọn không tạo thành tổ hợp hợp lệ' };
    }

    // First game opening restriction: must include lowest dealt card (Rule 5.1)
    if (this.firstGame && !currentP.hasPlayedCard && this.lowestCardDealt) {
      const hasLowest = cardsToPlay.some(c => c.id === this.lowestCardDealt!.id);
      if (!hasLowest) {
        return {
          success: false,
          error: `Ván đầu tiên phải đánh nước có chứa lá nhỏ nhất (${this.lowestCardDealt.rank}${this.lowestCardDealt.suit})`,
        };
      }
    }

    let isChop = false;
    let chopAmount = 0;

    // If table has cards, check beating
    if (this.currentCombo) {
      const beatRes = canBeat(this.currentCombo, playedCombo, this.config);
      if (!beatRes.valid) {
        return { success: false, error: beatRes.reason || 'Nước đánh không chặn được bài trên bàn' };
      }

      // Check if this was a HÀNG CHẶT
      if (beatRes.isChop) {
        isChop = true;
        chopAmount = getChopPenalty(this.currentCombo, this.config);
        const victimPlayer = this.players.find(p => p.id === this.currentComboPlayerId);

        if (chopAmount > 0 && victimPlayer) {
          const chopEntry: ScoreLedgerEntry = {
            id: `${this.id}-chop-${Date.now()}-${this.priorChopEntries.length + 1}`,
            gameId: this.id,
            type: 'chop',
            reason: `${currentP.displayName} chặt ${this.currentCombo.cards.map(c => c.id).join(' ')} của ${victimPlayer.displayName} (+/- ${chopAmount})`,
            fromPlayerId: victimPlayer.id,
            toPlayerId: this.mode === 'basic' ? currentP.id : undefined,
            amount: chopAmount,
            cardIds: this.currentCombo.cards.map(c => c.id),
            createdAt: Date.now(),
          };
          this.priorChopEntries.push(chopEntry);
          this.chopNotices.push({
            text: `${currentP.displayName} chặt ${victimPlayer.displayName}! (${chopAmount} điểm)`,
            createdAt: Date.now(),
          });
        }
      }
    }

    // Check if this play blocks a pending đút 3♠ of an opponent (DUT 3 BICH CAUGHT!)
    if (this.pendingDut3BichPlayerId && this.pendingDut3BichPlayerId !== playerId) {
      const caughtPlayer = this.players.find(p => p.id === this.pendingDut3BichPlayerId)!;
      // Ends immediately as dut3BichCaught (Rule 5.2.4 & 5.2.5)
      await this.endGame({
        endReason: 'dut3BichCaught',
        endReasonText: `Bắt đút 3 bích! ${currentP.displayName} chặn thành công ${caughtPlayer.displayName}`,
        winnerIds: [currentP.id],
        caughtPlayerId: caughtPlayer.id,
      });
      return { success: true };
    }

    // Remove played cards from hand
    currentP.hand = currentP.hand.filter(c => !cardIds.includes(c.id));
    currentP.hasPlayedCard = true;

    // Record table play
    this.currentCombo = playedCombo;
    this.currentComboPlayerId = currentP.id;
    this.lastPlaySeat = currentP.seatIndex;
    this.recentPlays.push({
      playerId: currentP.id,
      displayName: currentP.displayName,
      combination: playedCombo,
      playedAt: Date.now(),
      isChop,
    });

    // Check if player has exactly 3♠ left (ĐÚT 3 BÍCH TRIGGER!)
    if (currentP.hand.length === 1 && currentP.hand[0].id === '3S') {
      this.pendingDut3BichPlayerId = currentP.id;
      this.chopNotices.push({
        text: `⚡ ${currentP.displayName} đang chờ đút 3 bích!`,
        createdAt: Date.now(),
      });
    } else {
      if (this.pendingDut3BichPlayerId === currentP.id) {
        // Player no longer qualifies
        this.pendingDut3BichPlayerId = null;
      }
    }

    // Check if player emptied their hand!
    if (currentP.hand.length === 0) {
      // Check if finished with 2(s) (Về 2 cuối - Section 6.4)
      const isTwosFinish =
        playedCombo.cards.every(c => c.rank === '2') &&
        (playedCombo.type === 'single' || playedCombo.type === 'pair' || playedCombo.type === 'triple');

      if (isTwosFinish) {
        const kTwos = playedCombo.cards.length;
        await this.endGame({
          endReason: 'finishWithTwosPenalty',
          endReasonText: `${currentP.displayName} về bằng ${kTwos} lá 2 cuối và chịu phạt!`,
          winnerIds: this.players.filter(p => p.id !== currentP.id).map(p => p.id),
          violatorId: currentP.id,
          kTwos,
        });
        return { success: true };
      } else {
        // Normal win! First to empty hand wins
        await this.endGame({
          endReason: 'normal',
          endReasonText: `${currentP.displayName} đã hết bài và về nhất!`,
          winnerIds: [currentP.id],
        });
        return { success: true };
      }
    }

    // Game continues: advance turn
    this.advanceTurn();
    this.stateVersion++;
    this.resetTurnTimer();
    this.onStateChange();

    return { success: true };
  }

  public async passTurn(playerId: string): Promise<{ success: boolean; error?: string }> {
    if (this.phase !== 'playing') {
      return { success: false, error: 'Ván bài đã kết thúc' };
    }

    const currentP = this.players[this.currentTurnIndex];
    if (currentP.id !== playerId) {
      return { success: false, error: 'Chưa đến lượt của bạn' };
    }

    if (!this.currentCombo) {
      return { success: false, error: 'Không thể bỏ lượt khi mở vòng mới' };
    }

    currentP.hasPassed = true;

    // Advance turn to next available player who hasn't passed
    const nextIdx = this.findNextActivePlayerIndex();

    // If nextIdx is the player who played the current combo on the board,
    // all opponents have passed!
    if (this.players[nextIdx].id === this.currentComboPlayerId) {
      // Check if that player was pending đút 3♠!
      if (this.pendingDut3BichPlayerId === this.currentComboPlayerId) {
        // Đút 3♠ thành công!
        const winner = this.players.find(p => p.id === this.pendingDut3BichPlayerId)!;
        await this.endGame({
          endReason: 'dut3BichSuccess',
          endReasonText: `🎉 ${winner.displayName} đút 3 bích thành công!`,
          winnerIds: [winner.id],
        });
        return { success: true };
      }

      // Open new round!
      this.currentCombo = null;
      this.currentComboPlayerId = null;
      for (const p of this.players) {
        p.hasPassed = false;
      }
      this.currentTurnIndex = nextIdx;
    } else {
      this.currentTurnIndex = nextIdx;
    }

    this.stateVersion++;
    this.resetTurnTimer();
    this.onStateChange();

    return { success: true };
  }

  private advanceTurn(): void {
    const nextIdx = this.findNextActivePlayerIndex();

    // If all other players passed, last player opens new round
    if (this.players[nextIdx].id === this.currentComboPlayerId) {
      if (this.pendingDut3BichPlayerId === this.currentComboPlayerId) {
        // Handled in caller or check here
      }
      this.currentCombo = null;
      this.currentComboPlayerId = null;
      for (const p of this.players) {
        p.hasPassed = false;
      }
    }

    this.currentTurnIndex = nextIdx;
  }

  private findNextActivePlayerIndex(): number {
    const n = this.players.length;
    let idx = (this.currentTurnIndex + 1) % n;

    // Search clockwise for a player who hasn't passed and has cards
    for (let step = 0; step < n; step++) {
      const candidate = this.players[idx];
      if (!candidate.hasPassed && candidate.hand.length > 0) {
        return idx;
      }
      idx = (idx + 1) % n;
    }

    // Fallback to last player who played
    const lastPlayerIdx = this.players.findIndex(p => p.id === this.currentComboPlayerId);
    return lastPlayerIdx !== -1 ? lastPlayerIdx : 0;
  }

  private async endGame(options: {
    endReason: EndReason;
    endReasonText: string;
    winnerIds: string[];
    violatorId?: string;
    caughtPlayerId?: string;
    kTwos?: number;
  }): Promise<void> {
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }

    this.phase = 'ended';

    // Run shared settlement
    const settlement = settleGame({
      mode: this.mode,
      endReason: options.endReason,
      players: this.players.map(p => ({
        id: p.id,
        seatIndex: p.seatIndex,
        hand: p.hand,
        hasPlayedCard: p.hasPlayedCard,
      })),
      winnerIds: options.winnerIds,
      violatorId: options.violatorId,
      caughtPlayerId: options.caughtPlayerId,
      kTwos: options.kTwos,
      priorChopEntries: this.priorChopEntries,
      config: this.config,
      gameId: this.id,
    });

    this.finalResult = {
      endReason: options.endReason,
      endReasonText: options.endReasonText,
      winners: options.winnerIds,
      playerResults: settlement.results,
      ledger: [...this.priorChopEntries, ...settlement.ledger],
    };

    // Save to Database asynchronously
    try {
      await db.saveGameSettlement({
        gameId: this.id,
        roomId: this.roomId,
        mode: this.mode,
        participants: this.players.map(p => ({ id: p.id, seat: p.seatIndex, name: p.displayName })),
        endReason: options.endReason,
        winners: options.winnerIds,
        ledger: this.finalResult.ledger.map(l => ({
          id: l.id,
          game_id: this.id,
          mode: this.mode,
          from_player_id: l.fromPlayerId,
          to_player_id: l.toPlayerId,
          reason: l.reason,
          amount: l.amount,
          card_ids: l.cardIds,
          created_at: new Date(l.createdAt),
        })),
        results: settlement.results.map(r => ({
          id: `${this.id}-res-${r.playerId}`,
          game_id: this.id,
          player_id: r.playerId,
          score_delta: r.scoreDelta,
          win_delta: r.winDelta,
          breakdown: r,
          created_at: new Date(),
        })),
      });
    } catch (e) {
      console.error('Error saving game settlement to database:', e);
    }

    this.stateVersion++;
    this.onStateChange();
  }

  public getClientView(playerId: string): GameStateClientView {
    const me = this.players.find(p => p.id === playerId);
    const mySeat = me ? me.seatIndex : -1;
    const currentP = this.players[this.currentTurnIndex];

    return {
      gameId: this.id,
      roomId: this.roomId,
      mode: this.mode,
      phase: this.phase,
      stateVersion: this.stateVersion,
      mySeatIndex: mySeat,
      myHand: me ? sortCards(me.hand) : [],
      currentTurnSeat: currentP ? currentP.seatIndex : 0,
      turnDeadline: this.turnDeadline,
      turnTimeoutSeconds: this.config.turnTimeoutSeconds,
      currentCombo: this.currentCombo,
      currentComboPlayerId: this.currentComboPlayerId,
      pendingDut3BichPlayerId: this.pendingDut3BichPlayerId,
      players: this.players.map(p => ({
        id: p.id,
        displayName: p.displayName,
        seatIndex: p.seatIndex,
        cardCount: p.hand.length,
        hasPassed: p.hasPassed,
        isOnline: p.isOnline,
        isCurrentTurn: p.id === (currentP ? currentP.id : null),
      })),
      recentPlays: this.recentPlays.slice(-6),
      chopNotices: this.chopNotices.slice(-5),
      result: this.finalResult,
    };
  }

  public setPlayerOnline(playerId: string, isOnline: boolean): void {
    const p = this.players.find(player => player.id === playerId);
    if (p) {
      p.isOnline = isOnline;
      if (isOnline) {
        p.offlineSince = null;
        p.offlineAutoTurns = 0;
      } else {
        p.offlineSince = p.offlineSince || Date.now();
      }
      this.stateVersion++;
      this.onStateChange();
    }
  }

  public async removePlayer(playerId: string, reason?: string): Promise<void> {
    const pIdx = this.players.findIndex(p => p.id === playerId);
    if (pIdx === -1) return;

    const removedPlayer = this.players[pIdx];

    // If game ended, just remove from players array
    if (this.phase !== 'playing') {
      this.players.splice(pIdx, 1);
      return;
    }

    const remaining = this.players.filter(p => p.id !== playerId);

    if (remaining.length <= 1) {
      // Only 1 player left: they win immediately!
      const winner = remaining[0];
      await this.endGame({
        endReason: 'normal',
        endReasonText: `${removedPlayer.displayName} đã bị kick khỏi phòng. ${winner ? winner.displayName : ''} giành chiến thắng!`,
        winnerIds: winner ? [winner.id] : [],
      });
      return;
    }

    const wasTurn = this.currentTurnIndex === pIdx;
    const wasComboPlayer = this.currentComboPlayerId === playerId;

    this.players.splice(pIdx, 1);

    if (wasComboPlayer) {
      this.currentCombo = null;
      this.currentComboPlayerId = null;
      for (const p of this.players) {
        p.hasPassed = false;
      }
    }

    if (this.currentTurnIndex >= this.players.length) {
      this.currentTurnIndex = 0;
    }

    if (wasTurn) {
      this.resetTurnTimer();
    }

    this.stateVersion++;
    this.onStateChange();
  }
}
