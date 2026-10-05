import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  created_at: Date;
}

export interface PlayerStatsRow {
  user_id: string;
  mode: string;
  net_score: number;
  total_negative: number;
  wins: number;
  games_played: number;
  updated_at: Date;
}

export interface RoomRow {
  id: string;
  code: string;
  name: string;
  mode: string;
  password_hash: string | null;
  max_players: number;
  owner_id: string;
  is_active: boolean;
  created_at: Date;
}

export interface ScoreLedgerRow {
  id: string;
  game_id: string;
  event_id?: string;
  mode: string;
  from_player_id: string;
  to_player_id?: string;
  reason: string;
  amount: number;
  card_ids?: string[];
  created_at: Date;
}

export interface GameResultRow {
  id: string;
  game_id: string;
  player_id: string;
  score_delta: number;
  win_delta: number;
  breakdown: any;
  created_at: Date;
}

class DatabaseAdapter {
  private pgPool: pg.Pool | null = null;
  private isPg: boolean = false;
  private localData = {
    users: new Map<string, UserRow>(),
    usersByUsername: new Map<string, UserRow>(),
    rooms: new Map<string, RoomRow>(),
    roomsByCode: new Map<string, RoomRow>(),
    playerStats: new Map<string, PlayerStatsRow>(), // key: `${userId}_${mode}`
    games: new Map<string, any>(),
    gameEvents: [] as any[],
    scoreLedger: [] as ScoreLedgerRow[],
    gameResults: [] as GameResultRow[],
  };
  private localFilePath = path.resolve(process.cwd(), 'data_local.json');

  async init(): Promise<void> {
    if (config.databaseUrl) {
      try {
        console.log('Connecting to PostgreSQL database...');
        this.pgPool = new pg.Pool({
          connectionString: config.databaseUrl,
          connectionTimeoutMillis: 5000,
        });
        const client = await this.pgPool.connect();
        console.log('Connected to PostgreSQL successfully.');
        this.isPg = true;

        // Run migrations
        const schemaPath = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'schema.sql');
        if (fs.existsSync(schemaPath)) {
          const schemaSql = fs.readFileSync(schemaPath, 'utf8');
          await client.query(schemaSql);
          console.log('Database migrations applied successfully.');
        }
        client.release();
        return;
      } catch (err) {
        console.warn('PostgreSQL connection failed or not available. Falling back to local embedded database:', (err as Error).message);
        this.isPg = false;
      }
    } else {
      console.log('No DATABASE_URL provided. Using local embedded database.');
    }

    // Load local file if exists
    if (fs.existsSync(this.localFilePath)) {
      try {
        const raw = fs.readFileSync(this.localFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.users) {
          for (const u of parsed.users) {
            u.created_at = new Date(u.created_at);
            this.localData.users.set(u.id, u);
            this.localData.usersByUsername.set(u.username.toLowerCase(), u);
          }
        }
        if (parsed.playerStats) {
          for (const s of parsed.playerStats) {
            s.updated_at = new Date(s.updated_at);
            this.localData.playerStats.set(`${s.user_id}_${s.mode}`, s);
          }
        }
        if (parsed.rooms) {
          for (const r of parsed.rooms) {
            r.created_at = new Date(r.created_at);
            this.localData.rooms.set(r.id, r);
            this.localData.roomsByCode.set(r.code, r);
          }
        }
        if (parsed.scoreLedger) this.localData.scoreLedger = parsed.scoreLedger;
        if (parsed.gameResults) this.localData.gameResults = parsed.gameResults;
      } catch (e) {
        console.error('Error loading local data file:', e);
      }
    }
  }

  private persistLocal(): void {
    if (this.isPg) return;
    try {
      const dataToSave = {
        users: Array.from(this.localData.users.values()),
        playerStats: Array.from(this.localData.playerStats.values()),
        rooms: Array.from(this.localData.rooms.values()),
        scoreLedger: this.localData.scoreLedger,
        gameResults: this.localData.gameResults,
      };
      fs.writeFileSync(this.localFilePath, JSON.stringify(dataToSave, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving local data file:', e);
    }
  }

  // --- USER METHODS ---
  async getUserByUsername(username: string): Promise<UserRow | null> {
    const uname = username.trim().toLowerCase();
    if (this.isPg && this.pgPool) {
      const res = await this.pgPool.query('SELECT * FROM users WHERE LOWER(username) = $1 LIMIT 1', [uname]);
      return res.rows[0] || null;
    }
    return this.localData.usersByUsername.get(uname) || null;
  }

  async getUserById(id: string): Promise<UserRow | null> {
    if (this.isPg && this.pgPool) {
      const res = await this.pgPool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
      return res.rows[0] || null;
    }
    return this.localData.users.get(id) || null;
  }

  async createUser(user: { id: string; username: string; password_hash: string; display_name: string }): Promise<UserRow> {
    const row: UserRow = {
      id: user.id,
      username: user.username,
      password_hash: user.password_hash,
      display_name: user.display_name,
      created_at: new Date(),
    };

    if (this.isPg && this.pgPool) {
      await this.pgPool.query(
        'INSERT INTO users (id, username, password_hash, display_name, created_at) VALUES ($1, $2, $3, $4, $5)',
        [row.id, row.username, row.password_hash, row.display_name, row.created_at]
      );
    } else {
      this.localData.users.set(row.id, row);
      this.localData.usersByUsername.set(row.username.toLowerCase(), row);
      this.persistLocal();
    }
    return row;
  }

  async updateUserPassword(username: string, newHash: string): Promise<boolean> {
    const uname = username.trim().toLowerCase();
    if (this.isPg && this.pgPool) {
      const res = await this.pgPool.query('UPDATE users SET password_hash = $1 WHERE LOWER(username) = $2', [newHash, uname]);
      return (res.rowCount ?? 0) > 0;
    }
    const user = this.localData.usersByUsername.get(uname);
    if (!user) return false;
    user.password_hash = newHash;
    this.persistLocal();
    return true;
  }

  // --- STATS METHODS ---
  async getPlayerStats(userId: string): Promise<{ basic: PlayerStatsRow; fund: PlayerStatsRow }> {
    const defaultStats = (mode: string): PlayerStatsRow => ({
      user_id: userId,
      mode,
      net_score: 0,
      total_negative: 0,
      wins: 0,
      games_played: 0,
      updated_at: new Date(),
    });

    if (this.isPg && this.pgPool) {
      const res = await this.pgPool.query('SELECT * FROM player_mode_stats WHERE user_id = $1', [userId]);
      const basic = res.rows.find((r: PlayerStatsRow) => r.mode === 'basic') || defaultStats('basic');
      const fund = res.rows.find((r: PlayerStatsRow) => r.mode === 'fund') || defaultStats('fund');
      return { basic, fund };
    }

    const basic = this.localData.playerStats.get(`${userId}_basic`) || defaultStats('basic');
    const fund = this.localData.playerStats.get(`${userId}_fund`) || defaultStats('fund');
    return { basic, fund };
  }

  async updatePlayerStats(
    userId: string,
    mode: 'basic' | 'fund',
    scoreDelta: number,
    winDelta: number
  ): Promise<void> {
    if (this.isPg && this.pgPool) {
      const client = await this.pgPool.connect();
      try {
        await client.query('BEGIN');
        const check = await client.query('SELECT * FROM player_mode_stats WHERE user_id = $1 AND mode = $2 FOR UPDATE', [userId, mode]);
        if (check.rows.length === 0) {
          const net = mode === 'basic' ? scoreDelta : 0;
          const totalNeg = mode === 'fund' && scoreDelta < 0 ? scoreDelta : 0;
          await client.query(
            'INSERT INTO player_mode_stats (user_id, mode, net_score, total_negative, wins, games_played, updated_at) VALUES ($1, $2, $3, $4, $5, 1, NOW())',
            [userId, mode, net, totalNeg, winDelta]
          );
        } else {
          const row = check.rows[0];
          const newNet = mode === 'basic' ? row.net_score + scoreDelta : 0;
          const newTotalNeg = mode === 'fund' && scoreDelta < 0 ? row.total_negative + scoreDelta : row.total_negative;
          const newWins = row.wins + winDelta;
          const newGames = row.games_played + 1;
          await client.query(
            'UPDATE player_mode_stats SET net_score = $1, total_negative = $2, wins = $3, games_played = $4, updated_at = NOW() WHERE user_id = $5 AND mode = $6',
            [newNet, newTotalNeg, newWins, newGames, userId, mode]
          );
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
      return;
    }

    const key = `${userId}_${mode}`;
    let row = this.localData.playerStats.get(key);
    if (!row) {
      row = {
        user_id: userId,
        mode,
        net_score: mode === 'basic' ? scoreDelta : 0,
        total_negative: mode === 'fund' && scoreDelta < 0 ? scoreDelta : 0,
        wins: winDelta,
        games_played: 1,
        updated_at: new Date(),
      };
      this.localData.playerStats.set(key, row);
    } else {
      if (mode === 'basic') {
        row.net_score += scoreDelta;
      } else if (mode === 'fund' && scoreDelta < 0) {
        row.total_negative += scoreDelta;
      }
      row.wins += winDelta;
      row.games_played += 1;
      row.updated_at = new Date();
    }
    this.persistLocal();
  }

  // --- ROOM METHODS ---
  async getRoomByCode(code: string): Promise<RoomRow | null> {
    if (this.isPg && this.pgPool) {
      const res = await this.pgPool.query('SELECT * FROM rooms WHERE code = $1 LIMIT 1', [code]);
      return res.rows[0] || null;
    }
    return this.localData.roomsByCode.get(code) || null;
  }

  async createRoom(room: {
    id: string;
    code: string;
    name: string;
    mode: string;
    password_hash: string | null;
    max_players: number;
    owner_id: string;
  }): Promise<RoomRow> {
    const row: RoomRow = {
      id: room.id,
      code: room.code,
      name: room.name,
      mode: room.mode,
      password_hash: room.password_hash,
      max_players: room.max_players,
      owner_id: room.owner_id,
      is_active: true,
      created_at: new Date(),
    };

    if (this.isPg && this.pgPool) {
      await this.pgPool.query(
        'INSERT INTO rooms (id, code, name, mode, password_hash, max_players, owner_id, is_active, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [row.id, row.code, row.name, row.mode, row.password_hash, row.max_players, row.owner_id, row.is_active, row.created_at]
      );
    } else {
      this.localData.rooms.set(row.id, row);
      this.localData.roomsByCode.set(row.code, row);
      this.persistLocal();
    }
    return row;
  }

  // --- GAME & SETTLEMENT PERSISTENCE ---
  async saveGameSettlement(data: {
    gameId: string;
    roomId: string;
    mode: 'basic' | 'fund';
    participants: any[];
    endReason: string;
    winners: string[];
    ledger: ScoreLedgerRow[];
    results: GameResultRow[];
  }): Promise<void> {
    if (this.isPg && this.pgPool) {
      const client = await this.pgPool.connect();
      try {
        await client.query('BEGIN');

        // 1. Insert game record
        await client.query(
          `INSERT INTO games (id, room_id, mode, rules_version, participants, phase, end_reason, winners, created_at)
           VALUES ($1, $2, $3, '1.0', $4, 'ended', $5, $6, NOW())`,
          [
            data.gameId,
            data.roomId,
            data.mode,
            JSON.stringify(data.participants),
            data.endReason,
            JSON.stringify(data.winners),
          ]
        );

        // 2. Insert ledger entries
        for (const entry of data.ledger) {
          await client.query(
            `INSERT INTO score_ledger (id, game_id, event_id, mode, from_player_id, to_player_id, reason, amount, card_ids, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
            [
              entry.id,
              data.gameId,
              entry.event_id || null,
              entry.mode,
              entry.from_player_id,
              entry.to_player_id || null,
              entry.reason,
              entry.amount,
              entry.card_ids ? JSON.stringify(entry.card_ids) : null,
            ]
          );
        }

        // 3. Insert game results and update player_mode_stats
        for (const res of data.results) {
          await client.query(
            `INSERT INTO game_results (id, game_id, player_id, score_delta, win_delta, breakdown, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [
              res.id,
              data.gameId,
              res.player_id,
              res.score_delta,
              res.win_delta,
              JSON.stringify(res.breakdown),
            ]
          );
        }

        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        console.error('Failed to commit settlement transaction:', e);
        throw e;
      } finally {
        client.release();
      }
    } else {
      for (const entry of data.ledger) {
        this.localData.scoreLedger.push(entry);
      }
      for (const res of data.results) {
        this.localData.gameResults.push(res);
      }
      this.persistLocal();
    }

    // Update stats for each player
    for (const res of data.results) {
      await this.updatePlayerStats(res.player_id, data.mode, res.score_delta, res.win_delta);
    }
  }

  // --- RECENT GAMES HISTORY ---
  async getPlayerGameHistory(userId: string, limit: number = 10): Promise<any[]> {
    if (this.isPg && this.pgPool) {
      const res = await this.pgPool.query(
        `SELECT gr.id, gr.game_id, gr.score_delta, gr.win_delta, gr.breakdown, gr.created_at, g.mode, g.end_reason
         FROM game_results gr
         JOIN games g ON gr.game_id = g.id
         WHERE gr.player_id = $1
         ORDER BY gr.created_at DESC
         LIMIT $2`,
        [userId, limit]
      );
      return res.rows;
    }

    const filtered = this.localData.gameResults
      .filter(r => r.player_id === userId)
      .slice(-limit)
      .reverse();
    return filtered;
  }
}

export const db = new DatabaseAdapter();
