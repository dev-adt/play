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
  balance: number;
  last_login_reward_at: string | null;
  login_streak: number;
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
  bet_amount: number;
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

export interface FeedbackWishRow {
  id: string;
  user_id: string;
  type: 'wish' | 'feedback' | 'bug';
  title?: string | null;
  content: string;
  reward_amount: number;
  status: 'pending' | 'rewarded' | 'rejected';
  admin_note?: string | null;
  rewarded_at?: Date | string | null;
  created_at: Date | string;
}

export interface FeedbackWishView extends FeedbackWishRow {
  username?: string;
  display_name?: string;
  balance?: number;
}

function getTodayDateStr(): string {
  // Vietnam timezone GMT+7
  const d = new Date(Date.now() + 7 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function getYesterdayDateStr(): string {
  const d = new Date(Date.now() + 7 * 3600 * 1000 - 24 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
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
    feedbackWishes: [] as FeedbackWishRow[],
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
          // Column migrations if tables already existed
          try { await conn.query('ALTER TABLE users ADD COLUMN balance INT NOT NULL DEFAULT 1000'); } catch {}
          try { await conn.query('ALTER TABLE users ADD COLUMN last_login_reward_at VARCHAR(32) DEFAULT NULL'); } catch {}
          try { await conn.query('ALTER TABLE users ADD COLUMN login_streak INT NOT NULL DEFAULT 0'); } catch {}
          try { await conn.query('ALTER TABLE rooms ADD COLUMN bet_amount INT NOT NULL DEFAULT 10'); } catch {}
          try {
            await conn.query(`CREATE TABLE IF NOT EXISTS feedback_wishes (
              id VARCHAR(64) PRIMARY KEY,
              user_id VARCHAR(64) NOT NULL,
              type VARCHAR(32) NOT NULL DEFAULT 'wish',
              title VARCHAR(128) DEFAULT NULL,
              content TEXT NOT NULL,
              reward_amount INT NOT NULL DEFAULT 0,
              status VARCHAR(32) NOT NULL DEFAULT 'pending',
              admin_note TEXT DEFAULT NULL,
              rewarded_at DATETIME DEFAULT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_feedback_user (user_id),
              INDEX idx_feedback_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
          } catch {}

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

          // Column migrations if tables already existed
          try { await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS balance INT NOT NULL DEFAULT 1000'); } catch {}
          try { await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_reward_at VARCHAR(32) DEFAULT NULL'); } catch {}
          try { await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS login_streak INT NOT NULL DEFAULT 0'); } catch {}
          try { await client.query('ALTER TABLE rooms ADD COLUMN IF NOT EXISTS bet_amount INT NOT NULL DEFAULT 10'); } catch {}
          try {
            await client.query(`CREATE TABLE IF NOT EXISTS feedback_wishes (
              id VARCHAR(64) PRIMARY KEY,
              user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              type VARCHAR(32) NOT NULL DEFAULT 'wish',
              title VARCHAR(128),
              content TEXT NOT NULL,
              reward_amount INT NOT NULL DEFAULT 0,
              status VARCHAR(32) NOT NULL DEFAULT 'pending',
              admin_note TEXT,
              rewarded_at TIMESTAMP,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
          } catch {}

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
        if (raw && raw.trim().length > 0) {
          const parsed = JSON.parse(raw);
        if (parsed.users) {
          for (const u of parsed.users) {
            u.created_at = new Date(u.created_at);
            u.balance = u.balance !== undefined ? Number(u.balance) : 1000;
            u.login_streak = Number(u.login_streak) || 0;
            u.last_login_reward_at = u.last_login_reward_at || null;
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
            r.bet_amount = Number(r.bet_amount) || 10;
            this.localData.rooms.set(r.id, r);
            this.localData.roomsByCode.set(r.code, r);
          }
        }
        if (parsed.scoreLedger) this.localData.scoreLedger = parsed.scoreLedger;
        if (parsed.gameResults) this.localData.gameResults = parsed.gameResults;
        if (parsed.feedbackWishes) this.localData.feedbackWishes = parsed.feedbackWishes;
        }
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
        feedbackWishes: this.localData.feedbackWishes,
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

  async createUser(user: { id: string; username: string; password_hash: string; display_name: string; balance?: number }): Promise<UserRow> {
    const initialBalance = user.balance !== undefined ? user.balance : 1000;
    const row: UserRow = {
      id: user.id,
      username: user.username,
      password_hash: user.password_hash,
      display_name: user.display_name,
      balance: initialBalance,
      last_login_reward_at: null,
      login_streak: 0,
      created_at: new Date(),
    };

    if (this.dbType === 'mysql' && this.mysqlPool) {
      await this.mysqlPool.query(
        'INSERT INTO users (id, username, password_hash, display_name, balance, last_login_reward_at, login_streak, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
        [row.id, row.username, row.password_hash, row.display_name, row.balance, row.last_login_reward_at, row.login_streak]
      );
    } else if (this.dbType === 'pg' && this.pgPool) {
      await this.pgPool.query(
        'INSERT INTO users (id, username, password_hash, display_name, balance, last_login_reward_at, login_streak, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [row.id, row.username, row.password_hash, row.display_name, row.balance, row.last_login_reward_at, row.login_streak, row.created_at]
      );
    } else {
      this.localData.users.set(row.id, row);
      this.localData.usersByUsername.set(row.username.toLowerCase(), row);
      this.persistLocal();
    }
    return row;
  }

  async updateUserBalance(userId: string, delta: number): Promise<number> {
    const user = await this.getUserById(userId);
    if (!user) return 0;
    const current = user.balance !== undefined ? Number(user.balance) : 1000;
    const newBalance = Math.max(0, current + delta);

    if (this.dbType === 'mysql' && this.mysqlPool) {
      await this.mysqlPool.query('UPDATE users SET balance = ? WHERE id = ?', [newBalance, userId]);
    } else if (this.dbType === 'pg' && this.pgPool) {
      await this.pgPool.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);
    } else {
      user.balance = newBalance;
      this.persistLocal();
    }
    return newBalance;
  }

  async setUserBalance(userId: string, newBalance: number): Promise<number> {
    const user = await this.getUserById(userId);
    if (!user) return 0;
    const validBalance = Math.max(0, Math.floor(newBalance));

    if (this.dbType === 'mysql' && this.mysqlPool) {
      await this.mysqlPool.query('UPDATE users SET balance = ? WHERE id = ?', [validBalance, userId]);
    } else if (this.dbType === 'pg' && this.pgPool) {
      await this.pgPool.query('UPDATE users SET balance = $1 WHERE id = $2', [validBalance, userId]);
    } else {
      user.balance = validBalance;
      this.persistLocal();
    }
    return validBalance;
  }

  async getDailyRewardStatus(userId: string): Promise<{
    canClaim: boolean;
    currentStreak: number;
    nextRewardDay: number;
    nextRewardAmount: number;
    lastRewardAt: string | null;
    rewardsList: number[];
  }> {
    const user = await this.getUserById(userId);
    const rewardsList = [1000, 2000, 3000, 4000, 5000, 6000, 7000];
    if (!user) {
      return {
        canClaim: false,
        currentStreak: 0,
        nextRewardDay: 1,
        nextRewardAmount: 1000,
        lastRewardAt: null,
        rewardsList,
      };
    }

    const todayStr = getTodayDateStr();
    const yesterdayStr = getYesterdayDateStr();
    const lastRewardAt = user.last_login_reward_at || null;
    const currentStreak = user.login_streak || 0;

    if (lastRewardAt === todayStr) {
      // Already claimed today
      const nextRewardDay = (currentStreak % 7) + 1;
      return {
        canClaim: false,
        currentStreak,
        nextRewardDay,
        nextRewardAmount: nextRewardDay * 1000,
        lastRewardAt,
        rewardsList,
      };
    }

    let nextRewardDay = 1;
    if (lastRewardAt === yesterdayStr) {
      // Consecutive login!
      nextRewardDay = (currentStreak % 7) + 1;
    } else {
      // Missed streak or first time
      nextRewardDay = 1;
    }

    return {
      canClaim: true,
      currentStreak,
      nextRewardDay,
      nextRewardAmount: nextRewardDay * 1000,
      lastRewardAt,
      rewardsList,
    };
  }

  async claimDailyReward(userId: string): Promise<{
    success: boolean;
    claimedAmount: number;
    newStreak: number;
    newBalance: number;
    error?: string;
  }> {
    const status = await this.getDailyRewardStatus(userId);
    if (!status.canClaim) {
      return {
        success: false,
        claimedAmount: 0,
        newStreak: status.currentStreak,
        newBalance: 0,
        error: 'Bạn đã nhận quà đăng nhập hôm nay rồi. Hãy quay lại vào ngày mai!',
      };
    }

    const user = await this.getUserById(userId);
    if (!user) {
      return {
        success: false,
        claimedAmount: 0,
        newStreak: 0,
        newBalance: 0,
        error: 'Tài khoản không tồn tại',
      };
    }

    const todayStr = getTodayDateStr();
    const claimedAmount = status.nextRewardAmount;
    const newStreak = status.nextRewardDay;
    const currentBal = user.balance !== undefined ? Number(user.balance) : 1000;
    const newBalance = currentBal + claimedAmount;

    if (this.dbType === 'mysql' && this.mysqlPool) {
      await this.mysqlPool.query(
        'UPDATE users SET balance = ?, last_login_reward_at = ?, login_streak = ? WHERE id = ?',
        [newBalance, todayStr, newStreak, userId]
      );
    } else if (this.dbType === 'pg' && this.pgPool) {
      await this.pgPool.query(
        'UPDATE users SET balance = $1, last_login_reward_at = $2, login_streak = $3 WHERE id = $4',
        [newBalance, todayStr, newStreak, userId]
      );
    } else {
      user.balance = newBalance;
      user.last_login_reward_at = todayStr;
      user.login_streak = newStreak;
      this.persistLocal();
    }

    return {
      success: true,
      claimedAmount,
      newStreak,
      newBalance,
    };
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

  async ensureAdminUser(passwordHash: string): Promise<UserRow> {
    const existing = await this.getUserByUsername('admin');
    if (existing) {
      return existing;
    }
    const admin = await this.createUser({
      id: 'u_admin_system',
      username: 'admin',
      password_hash: passwordHash,
      display_name: 'Quản Trị Viên (Admin)',
    });
    console.log('Default admin user successfully initialized (username: admin)');
    return admin;
  }

  async getAllUsersWithStats(): Promise<any[]> {
    if (this.dbType === 'mysql' && this.mysqlPool) {
      const [rows] = await this.mysqlPool.query<any[]>(`
        SELECT u.id, u.username, u.display_name, u.created_at, u.balance, u.login_streak, u.last_login_reward_at,
               COALESCE(sb.games_played, 0) as basic_games,
               COALESCE(sb.wins, 0) as basic_wins,
               COALESCE(sb.net_score, 0) as basic_net_score,
               COALESCE(sf.games_played, 0) as fund_games,
               COALESCE(sf.wins, 0) as fund_wins,
               COALESCE(sf.total_negative, 0) as fund_negative
        FROM users u
        LEFT JOIN player_mode_stats sb ON u.id = sb.user_id AND sb.mode = 'basic'
        LEFT JOIN player_mode_stats sf ON u.id = sf.user_id AND sf.mode = 'fund'
        ORDER BY u.created_at DESC
      `);
      return rows.map((r: any) => {
        const isGuest = r.username.startsWith('guest_');
        const isAdmin = r.username.toLowerCase() === 'admin';
        const basicGames = Number(r.basic_games) || 0;
        const basicWins = Number(r.basic_wins) || 0;
        const basicWinRate = basicGames > 0 ? Math.round((basicWins / basicGames) * 100) : 0;
        const fundGames = Number(r.fund_games) || 0;
        const fundWins = Number(r.fund_wins) || 0;
        const fundWinRate = fundGames > 0 ? Math.round((fundWins / fundGames) * 100) : 0;
        const totalGames = basicGames + fundGames;
        const totalWins = basicWins + fundWins;
        const overallWinRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

        return {
          id: r.id,
          username: r.username,
          displayName: r.display_name,
          createdAt: r.created_at,
          balance: r.balance !== undefined && r.balance !== null ? Number(r.balance) : 1000,
          loginStreak: Number(r.login_streak) || 0,
          lastLoginRewardAt: r.last_login_reward_at || null,
          isGuest,
          isAdmin,
          basic: {
            gamesPlayed: basicGames,
            wins: basicWins,
            winRate: basicWinRate,
            netScore: Number(r.basic_net_score) || 0,
          },
          fund: {
            gamesPlayed: fundGames,
            wins: fundWins,
            winRate: fundWinRate,
            totalNegative: Number(r.fund_negative) || 0,
          },
          totalGames,
          totalWins,
          overallWinRate,
        };
      });
    }

    if (this.dbType === 'pg' && this.pgPool) {
      const res = await this.pgPool.query(`
        SELECT u.id, u.username, u.display_name, u.created_at, u.balance, u.login_streak, u.last_login_reward_at,
               COALESCE(sb.games_played, 0) as basic_games,
               COALESCE(sb.wins, 0) as basic_wins,
               COALESCE(sb.net_score, 0) as basic_net_score,
               COALESCE(sf.games_played, 0) as fund_games,
               COALESCE(sf.wins, 0) as fund_wins,
               COALESCE(sf.total_negative, 0) as fund_negative
        FROM users u
        LEFT JOIN player_mode_stats sb ON u.id = sb.user_id AND sb.mode = 'basic'
        LEFT JOIN player_mode_stats sf ON u.id = sf.user_id AND sf.mode = 'fund'
        ORDER BY u.created_at DESC
      `);
      return res.rows.map((r: any) => {
        const isGuest = r.username.startsWith('guest_');
        const isAdmin = r.username.toLowerCase() === 'admin';
        const basicGames = Number(r.basic_games) || 0;
        const basicWins = Number(r.basic_wins) || 0;
        const basicWinRate = basicGames > 0 ? Math.round((basicWins / basicGames) * 100) : 0;
        const fundGames = Number(r.fund_games) || 0;
        const fundWins = Number(r.fund_wins) || 0;
        const fundWinRate = fundGames > 0 ? Math.round((fundWins / fundGames) * 100) : 0;
        const totalGames = basicGames + fundGames;
        const totalWins = basicWins + fundWins;
        const overallWinRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

        return {
          id: r.id,
          username: r.username,
          displayName: r.display_name,
          createdAt: r.created_at,
          balance: r.balance !== undefined && r.balance !== null ? Number(r.balance) : 1000,
          loginStreak: Number(r.login_streak) || 0,
          lastLoginRewardAt: r.last_login_reward_at || null,
          isGuest,
          isAdmin,
          basic: {
            gamesPlayed: basicGames,
            wins: basicWins,
            winRate: basicWinRate,
            netScore: Number(r.basic_net_score) || 0,
          },
          fund: {
            gamesPlayed: fundGames,
            wins: fundWins,
            winRate: fundWinRate,
            totalNegative: Number(r.fund_negative) || 0,
          },
          totalGames,
          totalWins,
          overallWinRate,
        };
      });
    }

    const userList = Array.from(this.localData.users.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return userList.map(u => {
      const isGuest = u.username.startsWith('guest_');
      const isAdmin = u.username.toLowerCase() === 'admin';
      const basicStat = this.localData.playerStats.get(`${u.id}_basic`);
      const fundStat = this.localData.playerStats.get(`${u.id}_fund`);

      const basicGames = basicStat?.games_played || 0;
      const basicWins = basicStat?.wins || 0;
      const basicWinRate = basicGames > 0 ? Math.round((basicWins / basicGames) * 100) : 0;

      const fundGames = fundStat?.games_played || 0;
      const fundWins = fundStat?.wins || 0;
      const fundWinRate = fundGames > 0 ? Math.round((fundWins / fundGames) * 100) : 0;

      const totalGames = basicGames + fundGames;
      const totalWins = basicWins + fundWins;
      const overallWinRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

      return {
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        createdAt: u.created_at,
        balance: u.balance !== undefined ? Number(u.balance) : 1000,
        loginStreak: Number(u.login_streak) || 0,
        lastLoginRewardAt: u.last_login_reward_at || null,
        isGuest,
        isAdmin,
        basic: {
          gamesPlayed: basicGames,
          wins: basicWins,
          winRate: basicWinRate,
          netScore: basicStat?.net_score || 0,
        },
        fund: {
          gamesPlayed: fundGames,
          wins: fundWins,
          winRate: fundWinRate,
          totalNegative: fundStat?.total_negative || 0,
        },
        totalGames,
        totalWins,
        overallWinRate,
      };
    });
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
    bet_amount?: number;
    owner_id: string;
  }): Promise<RoomRow> {
    const betAmount = room.bet_amount && room.bet_amount >= 10 && room.bet_amount % 10 === 0 ? room.bet_amount : 10;
    const row: RoomRow = {
      id: room.id,
      code: room.code,
      name: room.name,
      mode: room.mode,
      password_hash: room.password_hash,
      max_players: room.max_players,
      bet_amount: betAmount,
      owner_id: room.owner_id,
      is_active: true,
      created_at: new Date(),
    };

    if (this.dbType === 'mysql' && this.mysqlPool) {
      await this.mysqlPool.query(
        'INSERT INTO rooms (id, code, name, mode, password_hash, max_players, bet_amount, owner_id, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        [row.id, row.code, row.name, row.mode, row.password_hash, row.max_players, row.bet_amount, row.owner_id, 1]
      );
    } else if (this.dbType === 'pg' && this.pgPool) {
      await this.pgPool.query(
        'INSERT INTO rooms (id, code, name, mode, password_hash, max_players, bet_amount, owner_id, is_active, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [row.id, row.code, row.name, row.mode, row.password_hash, row.max_players, row.bet_amount, row.owner_id, row.is_active, row.created_at]
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

  // --- FEEDBACK & WISHES METHODS ---
  async createFeedbackWish(params: {
    id: string;
    userId: string;
    type: 'wish' | 'feedback' | 'bug';
    title?: string;
    content: string;
  }): Promise<FeedbackWishRow> {
    const row: FeedbackWishRow = {
      id: params.id,
      user_id: params.userId,
      type: params.type || 'wish',
      title: params.title || null,
      content: params.content,
      reward_amount: 0,
      status: 'pending',
      admin_note: null,
      rewarded_at: null,
      created_at: new Date().toISOString(),
    };

    if (this.dbType === 'mysql' && this.mysqlPool) {
      await this.mysqlPool.query(
        'INSERT INTO feedback_wishes (id, user_id, type, title, content, reward_amount, status, created_at) VALUES (?, ?, ?, ?, ?, 0, "pending", NOW())',
        [row.id, row.user_id, row.type, row.title, row.content]
      );
      return row;
    }

    if (this.dbType === 'pg' && this.pgPool) {
      await this.pgPool.query(
        'INSERT INTO feedback_wishes (id, user_id, type, title, content, reward_amount, status, created_at) VALUES ($1, $2, $3, $4, $5, 0, \'pending\', NOW())',
        [row.id, row.user_id, row.type, row.title, row.content]
      );
      return row;
    }

    this.localData.feedbackWishes.push(row);
    this.persistLocal();
    return row;
  }

  async getMyFeedbackWishes(userId: string): Promise<FeedbackWishRow[]> {
    if (this.dbType === 'mysql' && this.mysqlPool) {
      const [rows] = await this.mysqlPool.query<any[]>(
        'SELECT * FROM feedback_wishes WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      return rows;
    }

    if (this.dbType === 'pg' && this.pgPool) {
      const res = await this.pgPool.query(
        'SELECT * FROM feedback_wishes WHERE user_id = $1 ORDER BY created_at DESC',
        [userId]
      );
      return res.rows;
    }

    return this.localData.feedbackWishes
      .filter(w => w.user_id === userId)
      .slice()
      .reverse();
  }

  async getAllFeedbackWishes(status?: string): Promise<FeedbackWishView[]> {
    if (this.dbType === 'mysql' && this.mysqlPool) {
      let query = `SELECT fw.*, u.username, u.display_name, u.balance
        FROM feedback_wishes fw
        JOIN users u ON fw.user_id = u.id`;
      const params: any[] = [];
      if (status && status !== 'all') {
        query += ' WHERE fw.status = ?';
        params.push(status);
      }
      query += ' ORDER BY fw.created_at DESC';
      const [rows] = await this.mysqlPool.query<any[]>(query, params);
      return rows;
    }

    if (this.dbType === 'pg' && this.pgPool) {
      let query = `SELECT fw.*, u.username, u.display_name, u.balance
        FROM feedback_wishes fw
        JOIN users u ON fw.user_id = u.id`;
      const params: any[] = [];
      if (status && status !== 'all') {
        query += ' WHERE fw.status = $1';
        params.push(status);
      }
      query += ' ORDER BY fw.created_at DESC';
      const res = await this.pgPool.query(query, params);
      return res.rows;
    }

    let items = this.localData.feedbackWishes;
    if (status && status !== 'all') {
      items = items.filter(w => w.status === status);
    }
    return items
      .map(w => {
        const user = this.localData.users.get(w.user_id);
        return {
          ...w,
          username: user?.username || 'Ẩn danh',
          display_name: user?.display_name || 'Người chơi',
          balance: user?.balance ?? 1000,
        };
      })
      .reverse();
  }

  async rewardFeedbackWish(params: {
    feedbackId: string;
    rewardAmount: number;
    adminNote?: string;
  }): Promise<{ success: boolean; newBalance: number; feedback: FeedbackWishRow }> {
    const { feedbackId, rewardAmount, adminNote } = params;

    let targetUserId = '';
    let currentFeedback: FeedbackWishRow | null = null;

    if (this.dbType === 'mysql' && this.mysqlPool) {
      const [rows] = await this.mysqlPool.query<any[]>(
        'SELECT * FROM feedback_wishes WHERE id = ? LIMIT 1',
        [feedbackId]
      );
      if (!rows || rows.length === 0) {
        throw new Error('Không tìm thấy lời chúc/góp ý này');
      }
      currentFeedback = rows[0];
      targetUserId = currentFeedback!.user_id;

      await this.mysqlPool.query(
        'UPDATE feedback_wishes SET status = "rewarded", reward_amount = ?, admin_note = ?, rewarded_at = NOW() WHERE id = ?',
        [rewardAmount, adminNote || null, feedbackId]
      );
    } else if (this.dbType === 'pg' && this.pgPool) {
      const res = await this.pgPool.query(
        'SELECT * FROM feedback_wishes WHERE id = $1 LIMIT 1',
        [feedbackId]
      );
      if (!res.rows || res.rows.length === 0) {
        throw new Error('Không tìm thấy lời chúc/góp ý này');
      }
      currentFeedback = res.rows[0];
      targetUserId = currentFeedback!.user_id;

      await this.pgPool.query(
        'UPDATE feedback_wishes SET status = \'rewarded\', reward_amount = $1, admin_note = $2, rewarded_at = NOW() WHERE id = $3',
        [rewardAmount, adminNote || null, feedbackId]
      );
    } else {
      const found = this.localData.feedbackWishes.find(w => w.id === feedbackId);
      if (!found) {
        throw new Error('Không tìm thấy lời chúc/góp ý này');
      }
      currentFeedback = found;
      targetUserId = found.user_id;

      found.status = 'rewarded';
      found.reward_amount = rewardAmount;
      found.admin_note = adminNote || null;
      found.rewarded_at = new Date().toISOString();
      this.persistLocal();
    }

    // Reward user with balance
    const newBalance = await this.updateUserBalance(targetUserId, rewardAmount);

    return {
      success: true,
      newBalance,
      feedback: {
        ...currentFeedback!,
        status: 'rewarded',
        reward_amount: rewardAmount,
        admin_note: adminNote || null,
        rewarded_at: new Date().toISOString(),
      },
    };
  }
}

export const db = new DatabaseAdapter();
