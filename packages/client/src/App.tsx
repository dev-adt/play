import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useSocket } from './context/SocketContext';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { GameRoomPage } from './pages/GameRoomPage';
import { AuthModal } from './components/AuthModal';

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { joinRoom, roomState } = useSocket();
  const [currentRoomCode, setCurrentRoomCode] = useState<string | null>(null);
  const [roomPasswordPrompt, setRoomPasswordPrompt] = useState<string | null>(null);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Check URL path on initial mount: /room/:code
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/room\/([a-zA-Z0-9_-]+)/);
    if (match) {
      const code = match[1].toLowerCase();
      setCurrentRoomCode(code);
    }
  }, []);

  // When roomCode and user exist, join the room
  useEffect(() => {
    if (!currentRoomCode) return;

    if (!user && !isLoading) {
      // Must login/register first, then automatically return to room!
      setShowAuthModal(true);
      return;
    }

    if (user) {
      joinRoom(currentRoomCode).then(res => {
        if (!res.success && res.needPassword) {
          setRoomPasswordPrompt(currentRoomCode);
        }
      });
    }
  }, [currentRoomCode, user, isLoading]);

  const handleNavigateToRoom = (code: string) => {
    window.history.pushState({}, '', `/room/${code}`);
    setCurrentRoomCode(code);
  };

  const handleLeaveRoom = () => {
    window.history.pushState({}, '', '/');
    setCurrentRoomCode(null);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomPasswordPrompt) return;
    setPasswordError(null);

    const res = await joinRoom(roomPasswordPrompt, enteredPassword);
    if (res.success) {
      setRoomPasswordPrompt(null);
      setEnteredPassword('');
    } else {
      setPasswordError(res.error || 'Mật khẩu phòng không đúng');
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-950 text-amber-400 font-display text-lg font-bold">
        Đang khởi động trò chơi...
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-950 flex flex-col justify-between">
      <Navbar
        roomName={roomState?.name}
        roomCode={currentRoomCode || undefined}
        onLeaveRoom={handleLeaveRoom}
      />

      <main className="flex-1 flex flex-col">
        {currentRoomCode ? (
          <GameRoomPage roomCode={currentRoomCode} />
        ) : (
          <HomePage onNavigateToRoom={handleNavigateToRoom} />
        )}
      </main>

      {/* Password Prompt Modal */}
      {roomPasswordPrompt && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm w-full p-6 text-slate-100">
            <h3 className="text-lg font-bold font-display text-amber-400 mb-2">
              Phòng Chơi Có Mật Khẩu
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Vui lòng nhập mật khẩu phòng để tham gia.
            </p>

            {passwordError && (
              <div className="bg-red-950/80 border border-red-500/50 text-red-200 text-xs p-2.5 rounded-xl mb-3">
                {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <input
                type="password"
                required
                value={enteredPassword}
                onChange={e => setEnteredPassword(e.target.value)}
                placeholder="Nhập mật khẩu phòng..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleLeaveRoom}
                  className="flex-1 btn-secondary py-2 text-xs"
                >
                  Quay lại
                </button>
                <button type="submit" className="flex-1 btn-gold py-2 text-xs">
                  Vào phòng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal when entering via invite link */}
      {showAuthModal && (
        <AuthModal
          onClose={() => {
            setShowAuthModal(false);
          }}
        />
      )}
    </div>
  );
};
