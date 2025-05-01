import React from 'react';
import './styles.css';
import { GameProvider } from './context/GameContext';
import { VideoPlayer } from './components/VideoPlayer';
import { ChatPanel } from './components/ChatPanel';

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
        <VideoPlayer
          src={videoUrl}
          plainCaptionsSrc={plainCaptionsSrc}
          interactiveCaptionsSrc={interactiveCaptionsSrc}
        />

        {/* ZAIA status in top left */}
        <div className="zaia-status">
          <span className="name">ZAIA</span>
          <span className="online">online</span>
        </div>

        <ChatPanel />
      </div>
    </GameProvider>
  );
};

export default GameShow;