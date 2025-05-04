import React, { useState, useCallback, useEffect } from 'react';
import './styles.css';
import { GameProvider } from './context/GameContext';
import { VideoPlayer } from './components/VideoPlayer';
import { ChatPanel } from './components/ChatPanel';
import { debugLog } from '../../../utils/debug';

export interface MediaSource {
  videoUrl: string;
  plainCaptionsSrc: string;
  interactiveCaptionsSrc: string;
}

interface GameShowProps {
  mediaSources: MediaSource[];
}

export const GameShow: React.FC<GameShowProps> = ({ mediaSources }) => {
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const currentSource = mediaSources[currentSourceIndex];

  // Log when current source changes
  useEffect(() => {
    debugLog(`Current video source changed to index ${currentSourceIndex}. Playing: ${JSON.stringify(currentSource)}`);
  }, [currentSourceIndex, currentSource]);

  const handleVideoEnd = useCallback(() => {
    debugLog(`Video ${currentSourceIndex} ended`);
    if (currentSourceIndex < mediaSources.length - 1) {
      debugLog('Moving to next video');
      setCurrentSourceIndex(prev => prev + 1);
    } else {
      debugLog('Reached end of sequence');
    }
  }, [currentSourceIndex, mediaSources.length]);

  return (
    <GameProvider>
      <div className="main-container">
        <VideoPlayer
          key={currentSourceIndex} // Add key to force remount on source change
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

export default GameShow;