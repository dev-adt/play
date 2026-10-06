import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { VoiceChatProvider } from './context/VoiceChatContext';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <SocketProvider>
        <VoiceChatProvider>
          <App />
        </VoiceChatProvider>
      </SocketProvider>
    </AuthProvider>
  </React.StrictMode>
);
