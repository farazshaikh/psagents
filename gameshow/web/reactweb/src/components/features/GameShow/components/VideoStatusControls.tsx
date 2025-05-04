import React from 'react';
import { useGameContext } from '../context/GameContext';
import { debugLog } from '../../../../utils/debug';

export const VideoStatusControls: React.FC = () => {
  const { state, dispatch } = useGameContext();
  const { videoState } = state;

  const handleFullscreenToggle = async () => {
    try {
      const mainContainer = document.querySelector('.main-container') as HTMLElement;
      if (!mainContainer) return;

      if (!document.fullscreenElement) {
        await mainContainer.requestFullscreen();
        debugLog('Entered fullscreen mode');
      } else {
        await document.exitFullscreen();
        debugLog('Exited fullscreen mode');
      }
    } catch (e) {
      debugLog(`Fullscreen toggle failed: ${e}`);
    }
  };

  const handleMuteToggle = () => {
    try {
      const video = document.querySelector('.video-player') as HTMLVideoElement;
      if (!video) return;

      video.muted = !video.muted;
      dispatch({
        type: 'SET_VIDEO_STATE',
        payload: {
          isMuted: video.muted
        }
      });
      debugLog(`Video ${video.muted ? 'muted' : 'unmuted'}`);
    } catch (e) {
      debugLog(`Mute toggle failed: ${e}`);
    }
  };

  return (
    <div className="video-status-controls">
      <button
        onClick={handleFullscreenToggle}
        className={`status-icon ${videoState.isFullscreen ? 'active' : ''}`}
        title={videoState.isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {videoState.isFullscreen ? '⤧' : '⤢'}
      </button>
      <button
        onClick={handleMuteToggle}
        className={`status-icon ${videoState.isMuted ? 'active' : ''}`}
        title={videoState.isMuted ? 'Unmute' : 'Mute'}
      >
        {videoState.isMuted ? '🔇' : '🔊'}
      </button>
    </div>
  );
}; 