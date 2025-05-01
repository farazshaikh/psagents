import React, { useEffect } from 'react';
import { GameShow } from '../index';
import { debugLog } from '../../../../utils/debug';

// Force HTTPS for media server since it's running with SSL
const REMOTE_SERVER = 'https://10.0.0.100:8443';

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
    const videoUrl = `${REMOTE_SERVER}/videos/superwoman/video.mp4`;
    const plainCaptionsSrc = `${REMOTE_SERVER}/videos/superwoman/captions.vtt`;
    const interactiveCaptionsSrc = `${REMOTE_SERVER}/videos/superwoman/interactive_captions.vtt`;

    debugLog('Media URLs: ' + JSON.stringify({
      videoUrl,
      plainCaptionsSrc,
      interactiveCaptionsSrc,
      origin: window.location.origin,
      host: window.location.host,
      isLocalhost: window.location.hostname === 'localhost',
      hostname: window.location.hostname
    }, null, 2));
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