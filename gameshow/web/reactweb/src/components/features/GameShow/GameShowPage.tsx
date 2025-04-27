import React from 'react';
import GameShow from './index';

// In a real app, these would come from environment variables or configuration
const REMOTE_SERVER = 'https://localhost:8443';

export const GameShowPage: React.FC = () => {
  return (
    <GameShow 
      videoUrl={`${REMOTE_SERVER}/videos/vid1.mp4`}
      captionsUrl={`${REMOTE_SERVER}/videos/detailed_captions.vtt`}
    />
  );
};

export default GameShowPage; 