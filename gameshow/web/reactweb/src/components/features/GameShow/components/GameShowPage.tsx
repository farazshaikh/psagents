import React, { useEffect } from 'react';
import { GameShow } from './GameShow';

const REMOTE_SERVER = 'https://localhost:8443';

export const GameShowPage: React.FC = () => {
  useEffect(() => {
    // Load Font Awesome for icons
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const videoUrl = `${REMOTE_SERVER}/videos/game_show.mp4`;
  const captionsUrl = `${REMOTE_SERVER}/videos/captions.vtt`;

  return (
    <div className="game-show-page">
      <GameShow videoUrl={videoUrl} captionsUrl={captionsUrl} />
    </div>
  );
}; 