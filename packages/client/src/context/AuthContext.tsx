import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  userId: string;
  username: string;
  displayName: string;
  isAdmin?: boolean;
}

export interface PlayerStats {
  basic: {
    net_score: number;
    wins: number;
    games_played: number;
  };
  fund: {
    total_negative: number;
    wins: number;
    games_played: number;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  stats: PlayerStats | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  guestLogin: (displayName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshStats: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshStats = async () => {
    const activeToken = token || localStorage.getItem('tienlen_token');
    if (!activeToken) return;

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setStats(data.stats);
      } else {
        logout();
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('tienlen_token');
    if (savedToken) {
      setToken(savedToken);
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
            setStats(data.stats);
          } else {
            localStorage.removeItem('tienlen_token');
          }
        })
        .catch(() => {
          localStorage.removeItem('tienlen_token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Đăng nhập thất bại' };
      }
      setUser(data.user);
      setToken(data.token);
      setStats(data.stats);
      localStorage.setItem('tienlen_token', data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi mạng khi đăng nhập' };
    }
  };

  const register = async (username: string, password: string, displayName: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Đăng ký thất bại' };
      }
      setUser(data.user);
      setToken(data.token);
      setStats(data.stats);
      localStorage.setItem('tienlen_token', data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi mạng khi đăng ký' };
    }
  };

  const guestLogin = async (displayName?: string) => {
    try {
      const res = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Chơi nhanh thất bại' };
      }
      setUser(data.user);
      setToken(data.token);
      setStats(data.stats);
      localStorage.setItem('tienlen_token', data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi mạng khi chơi nhanh' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setStats(null);
    localStorage.removeItem('tienlen_token');
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{ user, token, stats, isLoading, login, register, guestLogin, logout, refreshStats }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
