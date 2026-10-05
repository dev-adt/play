import pg from 'pg';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
  mode?: string;
  end_reason?: string;
}

class DatabaseAdapter {
  private pgPool: pg.Pool | null = null;
  private mysqlPool: mysql.Pool | null = null;
  private dbType: 'pg' | 'mysql' | 'local' = 'local';

  private localData = {
    users: new Map<string, UserRow>(),
    usersByUsername: new Map<string, UserRow>(),
    rooms: new Map<string, RoomRow>(),
    roomsByCode: new Map<string, RoomRow>(),
    playerStats: new Map<string, PlayerStatsRow>(),
    games: new Map<string, any>(),
    gameEvents: [] as any[],
    scoreLedger: [] as ScoreLedgerRow[],
    gameResults: [] as GameResultRow[],
  };
  private localFilePath = path.resolve(process.cwd(), 'data_local.json');

  async init(): Promise<void> {
    const dbUrl = config.databaseUrl.trim();

    // 1. Check if MySQL URL
    if (dbUrl.startsWith('mysql://') || dbUrl.startsWith('mysql2://')) {
      try {
        console.log('Connecting to MySQL database (aaPanel)...');
        this.mysqlPool = mysql.createPool({
          uri: dbUrl,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });

        // Test connection
        const conn = await this.mysqlPool.getConnection();
        console.log('Connected to MySQL successfully.');
        this.dbType = 'mysql';

        // Apply MySQL schema migrations
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const schemaPath = path.resolve(__dirname, 'schema.mysql.sql');
        if (fs.existsSync(schemaPath)) {
          const sql = fs.readFileSync(schemaPath, 'utf8');
          // Split by semicolons for individual statements
          const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

          for (const stmt of statements) {
            try {
              await conn.query(stmt);
            } catch (err: any) {
              // Ignore table already exists
            }
          }
          console.log('MySQL schema verified and ready.');
        }

        conn.release();
        return;
      } catch (err: any) {
        console.warn('MySQL connection failed:', err.message, '- Falling back to local embedded database.');
        this.dbType = 'local';
      }
    }
    // 2. Check if PostgreSQL URL
    else if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
      try {
        console.log('Connecting to PostgreSQL database...');
        this.pgPool = new pg.Pool({
          connectionString: dbUrl,
          connectionTimeoutMillis: 5000,
        });
        const client = await this.pgPool.connect();
        console.log('Connected to PostgreSQL successfully.');
        this.dbType = 'pg';

        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const schemaPath = path.resolve(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
          const schemaSql = fs.readFileSync(schemaPath, 'utf8');
          await client.query(schemaSql);
          console.log('PostgreSQL migrations applied successfully.');
        }
        client.release();
        return;
      } catch (err: any) {
        console.warn('PostgreSQL connection failed:', err.message, '- Falling back to local embedded database.');
        this.dbType = 'local';
      }
    } else {
      console.log('No external DATABASE_URL provided. Using local embedded database.');
      this.dbType = 'local';
    }

    // 3. Fallback: Load local file
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
    if (this.dbType !== 'local') return;
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
    if (this.dbType === 'mysql' && this.mysqlPool) {
      const [rows] = await this.mysqlPool.query<any[]>(
        'SELECT * FROM users WHERE LOWER(username) = ? LIMIT 1',
        [uname]
      );
      return rows[0] || null;
    }
    if (this.dbType === 'pg' && this.pgPool) {
      const res = await this.pgPool.query('SELECT * FROM users WHERE LOWER(username) = $1 LIMIT 1', [uname]);
      return res.rows[0] || null;
    }
    return this.localData.usersByUsername.get(uname) || null;
  }

  async getUserById(id: string): Promise<UserRow | null> {
    if (this.dbType === 'mysql' && this.mysqlPool) {
      const [rows] = await this.mysqlPool.query<any[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
      return rows[0] || null;
    }
    if (this.dbType === 'pg' && this.pgPool) {
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

    if (this.dbType === 'mysql' && this.mysqlPool) {
      await this.mysqlPool.query(
        'INSERT INTO users (id, username, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, NOW())',
        [row.id, row.username, row.password_hash, row.display_name]
      );
    } else if (this.dbType === 'pg' && this.pgPool) {
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
    if (this.dbType === 'mysql' && this.mysqlPool) {
      const [res]: any = await this.mysqlPool.query('UPDATE users SET password_hash = ? WHERE LOWER(username) = ?', [newHash, uname]);
      return res.affectedRows > 0;
    }
    if (this.dbType === 'pg' && this.pgPool) {
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

    if (this.dbType === 'mysql' && this.mysqlPool) {
      const [rows] = await this.mysqlPool.query<any[]>('SELECT * FROM player_mode_stats WHERE user_id = ?', [userId]);
      const basic = rows.find((r: PlayerStatsRow) => r.mode === 'basic') || defaultStats('basic');
      const fund = rows.find((r: PlayerStatsRow) => r.mode === 'fund') || defaultStats('fund');
      return { basic, fund };
    }

    if (this.dbType === 'pg' && this.pgPool) {
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
    if (this.dbType === 'mysql' && this.mysqlPool) {
      const net = mode === 'basic' ? scoreDelta : 0;
      const totalNeg = mode === 'fund' && scoreDelta < 0 ? scoreDelta : 0;
      await this.mysqlPool.query(
        `INSERT INTO player_mode_stats (user_id, mode, net_score, total_negative, wins, games_played, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE
           net_score = IF(mode = 'basic', net_score + VALUES(net_score), 0),
           total_negative = IF(mode = 'fund' AND ? < 0, total_negative + ?, total_negative),
           wins = wins + VALUES(wins),
           games_played = games_played + 1,
           updated_at = NOW()`,
        [userId, mode, net, totalNeg, winDelta, scoreDelta, scoreDelta]
      );
      return;
    }

    if (this.dbType === 'pg' && this.pgPool) {
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
    if (this.dbType === 'mysql' && this.mysqlPool) {
      const [rows] = await this.mysqlPool.query<any[]>('SELECT * FROM rooms WHERE code = ? LIMIT 1', [code]);
      return rows[0] || null;
    }
    if (this.dbType === 'pg' && this.pgPool) {
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

    if (this.dbType === 'mysql' && this.mysqlPool) {
      await this.mysqlPool.query(
        'INSERT INTO rooms (id, code, name, mode, password_hash, max_players, owner_id, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        [row.id, row.code, row.name, row.mode, row.password_hash, row.max_players, row.owner_id, 1]
      );
    } else if (this.dbType === 'pg' && this.pgPool) {
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
    if (this.dbType === 'mysql' && this.mysqlPool) {
      const conn = await this.mysqlPool.getConnection();
      try {
        await conn.beginTransaction();

        // 1. Insert game
        await conn.query(
          `INSERT INTO games (id, room_id, mode, rules_version, participants, phase, end_reason, winners, created_at)
           VALUES (?, ?, ?, '1.0', ?, 'ended', ?, ?, NOW())`,
          [
            data.gameId,
            data.roomId,
            data.mode,
            JSON.stringify(data.participants),
            data.endReason,
            JSON.stringify(data.winners),
          ]
        );

        // 2. Insert ledger
        for (const entry of data.ledger) {
          await conn.query(
            `INSERT INTO score_ledger (id, game_id, event_id, mode, from_player_id, to_player_id, reason, amount, card_ids, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
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

        // 3. Insert results
        for (const res of data.results) {
          await conn.query(
            `INSERT INTO game_results (id, game_id, player_id, score_delta, win_delta, breakdown, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
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

        await conn.commit();
      } catch (e) {
        await conn.rollback();
        console.error('Failed to commit MySQL settlement transaction:', e);
        throw e;
      } finally {
        conn.release();
      }
    } else if (this.dbType === 'pg' && this.pgPool) {
      const client = await this.pgPool.connect();
      try {
        await client.query('BEGIN');

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
        console.error('Failed to commit PostgreSQL settlement transaction:', e);
        throw e;
      } finally {
        client.release();
      }
    } else {
      for (const entry of data.ledger) {
        this.localData.scoreLedger.push(entry);
      }
      for (const res of data.results) {
        this.localData.gameResults.push({
          ...res,
          game_id: data.gameId,
          mode: data.mode,
          end_reason: data.endReason,
          created_at: (res as any).created_at || new Date().toISOString(),
        });
      }
      this.persistLocal();
    }

    // Update stats for each player
    for (const res of data.results) {
      await this.updatePlayerStats(res.player_id, data.mode, res.score_delta, res.win_delta);
    }
  }

  // --- RECENT GAMES HISTORY ---
  async getPlayerGameHistory(userId: string, limit: number = 30, mode?: string): Promise<any[]> {
    if (this.dbType === 'mysql' && this.mysqlPool) {
      let query = `SELECT gr.id, gr.game_id, gr.score_delta, gr.win_delta, gr.breakdown, gr.created_at, g.mode, g.end_reason
         FROM game_results gr
         JOIN games g ON gr.game_id = g.id
         WHERE gr.player_id = ?`;
      const params: any[] = [userId];
      if (mode && (mode === 'basic' || mode === 'fund')) {
        query += ` AND g.mode = ?`;
        params.push(mode);
      }
      query += ` ORDER BY gr.created_at DESC LIMIT ?`;
      params.push(limit);

      const [rows] = await this.mysqlPool.query<any[]>(query, params);
      return rows;
    }

    if (this.dbType === 'pg' && this.pgPool) {
      let query = `SELECT gr.id, gr.game_id, gr.score_delta, gr.win_delta, gr.breakdown, gr.created_at, g.mode, g.end_reason
         FROM game_results gr
         JOIN games g ON gr.game_id = g.id
         WHERE gr.player_id = $1`;
      const params: any[] = [userId];
      if (mode && (mode === 'basic' || mode === 'fund')) {
        query += ` AND g.mode = $2 ORDER BY gr.created_at DESC LIMIT $3`;
        params.push(mode, limit);
      } else {
        query += ` ORDER BY gr.created_at DESC LIMIT $2`;
        params.push(limit);
      }

      const res = await this.pgPool.query(query, params);
      return res.rows;
    }

    let filtered = this.localData.gameResults.filter(r => r.player_id === userId);
    if (mode && (mode === 'basic' || mode === 'fund')) {
      filtered = filtered.filter(r => r.mode === mode);
    }
    return filtered.slice(-limit).reverse();
  }
}

export const db = new DatabaseAdapter();
