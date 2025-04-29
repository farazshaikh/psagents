import React from 'react';
import { GameProvider } from '../context/GameContext';
import { ChatPanel } from './ChatPanel';
import { VideoPlayer } from './VideoPlayer';

interface GameShowProps {
  videoUrl: string;
  captionsUrl: string;
}

export const GameShow: React.FC<GameShowProps> = ({ videoUrl, captionsUrl }) => {
  return (
    <GameProvider>
      <div className="game-show-container">
        <div className="zaia-status">
          <span className="name">ZAIA</span>
          <span className="online">online</span>
        </div>

        <VideoPlayer src={videoUrl} captionsSrc={captionsUrl} />
        <ChatPanel />
      </div>
    </GameProvider>
  );
};