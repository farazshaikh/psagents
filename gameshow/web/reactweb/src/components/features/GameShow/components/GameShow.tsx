import React from 'react';
import { GameProvider } from '../context/GameContext';
import { ChatPanel } from './ChatPanel';
import { VideoPlayer } from './VideoPlayer';

interface GameShowProps {
  videoUrl: string;
  plainCaptionsSrc: string;
  interactiveCaptionsSrc: string;
}

export const GameShow: React.FC<GameShowProps> = ({
  videoUrl,
  plainCaptionsSrc,
  interactiveCaptionsSrc
}) => {
  return (
    <GameProvider>
      <div className="main-container">
        <div className="zaia-status">
          <span className="name">ZAIA</span>
          <span className="online">online</span>
        </div>

        <VideoPlayer
          src={videoUrl}
          plainCaptionsSrc={plainCaptionsSrc}
          interactiveCaptionsSrc={interactiveCaptionsSrc}
        />
        <ChatPanel />
      </div>
    </GameProvider>
  );
};