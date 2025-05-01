import React, { useEffect } from 'react';
import { GameShow } from '../index';

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

  return (
    <div className="game-show-page">
      <GameShow 
        videoUrl={`${REMOTE_SERVER}/videos/superwoman/video.mp4`}
        plainCaptionsSrc={`${REMOTE_SERVER}/videos/superwoman/captions.vtt`}
        interactiveCaptionsSrc={`${REMOTE_SERVER}/videos/superwoman/interactive_captions.vtt`}
      />
    </div>
  );
};

export default GameShowPage;