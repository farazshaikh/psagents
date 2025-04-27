import React from 'react';
import './styles.css';
import { GameProvider } from './context/GameContext';
import { VideoPlayer } from './components/VideoPlayer';
import { ChatPanel } from './components/ChatPanel';
import { DebugConsole } from './components/DebugConsole';

interface GameShowProps {
  videoUrl: string;
  captionsUrl: string;
}

export const GameShow: React.FC<GameShowProps> = ({ videoUrl, captionsUrl }) => {
  return (
    <GameProvider>
      <div className="main-container">
        <VideoPlayer src={videoUrl} captionsSrc={captionsUrl} />
        
        {/* ZAIA status in top left */}
        <div className="zaia-status">
          <span className="name">ZAIA</span>
          <span className="online">online</span>
        </div>

        <ChatPanel />
        <DebugConsole />
      </div>
    </GameProvider>
  );
};

export default GameShow; 