import React, { useEffect } from 'react';
import { GameShow, MediaSource } from '../index';
import { debugLog } from '../../../../utils/debug';

// Force HTTPS for media server since it's running with SSL
const REMOTE_SERVER = 'https://10.0.0.100:8443';

// Define the sequence of videos to be played
const mediaSources: MediaSource[] = [
  // 1. Introduction video
  {
    videoUrl: `${REMOTE_SERVER}/videos/intro/video.mp4`,
    plainCaptionsSrc: `${REMOTE_SERVER}/videos/intro/captions.vtt`,
    interactiveCaptionsSrc: `${REMOTE_SERVER}/videos/intro/interactive_captions.vtt`,
  },

  // 2. First question/challenge
  {
    videoUrl: `${REMOTE_SERVER}/videos/superwoman/video.mp4`,
    plainCaptionsSrc: `${REMOTE_SERVER}/videos/superwoman/captions.vtt`,
    interactiveCaptionsSrc: `${REMOTE_SERVER}/videos/superwoman/interactive_captions.vtt`,
  }
];

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

  // Log the URLs being used
  useEffect(() => {
    debugLog('Media Sources: ' + JSON.stringify(mediaSources, null, 2));
  }, []);

  return (
    <div className="game-show-page">
      <GameShow mediaSources={mediaSources} />
    </div>
  );
};

export default GameShowPage;