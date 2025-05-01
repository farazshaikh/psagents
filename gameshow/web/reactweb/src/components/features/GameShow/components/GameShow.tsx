import React, { useState } from 'react';
import { GameProvider } from '../context/GameContext';
import { ChatPanel } from './ChatPanel';
import { VideoPlayer } from './VideoPlayer';
import { MediaSource } from '../index';

interface GameShowProps {
  mediaSources: MediaSource[];
}

export const GameShow: React.FC<GameShowProps> = ({ mediaSources }) => {
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const currentSource = mediaSources[currentSourceIndex];

  const handleVideoEnd = () => {
    if (currentSourceIndex < mediaSources.length - 1) {
      setCurrentSourceIndex(prev => prev + 1);
    }
  };

  return (
    <GameProvider>
      <div className="main-container">
        <div className="zaia-status">
          <span className="name">ZAIA</span>
          <span className="online">online</span>
        </div>

        <VideoPlayer
          src={currentSource.videoUrl}
          plainCaptionsSrc={currentSource.plainCaptionsSrc}
          interactiveCaptionsSrc={currentSource.interactiveCaptionsSrc}
          onEnded={handleVideoEnd}
        />
        <ChatPanel />
      </div>
    </GameProvider>
  );
};