import React, { useEffect, useRef, useState } from 'react';
import { useGameContext } from '../context/GameContext';

interface VideoPlayerProps {
  src: string;
  captionsSrc: string;
}

// Final question options
const FINAL_OPTIONS = [
  "decode, like it's standing face-to-face with a cursed scroll",
  "race, like a scarab on hot stone chasing the final clue",
  "gonna burn, like Ra's sun hitting a forgotten riddle",
  "crack, before the tomb door does"
];

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, captionsSrc }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { state, dispatch } = useGameContext();
  const { isPlaying } = state;
  const [lastCaptionTime, setLastCaptionTime] = useState<number | null>(null);

  // Prevent context menu and clicks
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const preventDefault = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Prevent all mouse events
    video.addEventListener('contextmenu', preventDefault);
    video.addEventListener('click', preventDefault);
    video.addEventListener('dblclick', preventDefault);
    video.addEventListener('mousedown', preventDefault);

    // Prevent pause/play through space bar
    const preventSpaceBar = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', preventSpaceBar);

    return () => {
      video.removeEventListener('contextmenu', preventDefault);
      video.removeEventListener('click', preventDefault);
      video.removeEventListener('dblclick', preventDefault);
      video.removeEventListener('mousedown', preventDefault);
      document.removeEventListener('keydown', preventSpaceBar);
    };
  }, []);

  // Handle game start
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;

    // Reset video state
    video.currentTime = 0;
    video.muted = false;

    // Try to play unmuted first
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error('Error playing video:', error);
        // If unmuted play fails, try muted
        video.muted = true;
        video.play().then(() => {
          // Try to unmute after autoplay starts
          video.muted = false;
        }).catch(e => {
          console.error('Failed to play even muted:', e);
        });
      });
    }
  }, [isPlaying]);

  // Find last caption time when track loads
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const track = video.textTracks[0];
    if (!track) return;

    const checkTrack = setInterval(() => {
      if (track.cues && track.cues.length > 0) {
        const lastCue = track.cues[track.cues.length - 1];
        setLastCaptionTime(lastCue.startTime);
        clearInterval(checkTrack);
      }
    }, 100);

    return () => clearInterval(checkTrack);
  }, []);

  // Handle video events and captions
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Remove loop setting
    video.loop = false;

    const handleTimeUpdate = () => {
      dispatch({
        type: 'SET_VIDEO_STATE',
        payload: {
          currentTime: video.currentTime,
          duration: video.duration,
          isPlaying: !video.paused,
          isMuted: video.muted,
          isFullscreen: document.fullscreenElement !== null
        }
      });
    };

    const handleEnded = () => {
      // When video ends, pause it and dispatch timeout action
      video.pause();
      dispatch({ type: 'QUESTION_TIMEOUT' });
    };

    // Handle captions
    const handleCueChange = () => {
      const track = video.textTracks[0];
      if (!track) return;

      const activeCues = track.activeCues;
      if (activeCues && activeCues.length > 0) {
        const cue = activeCues[0] as VTTCue;
        
        // Check if this is the last caption
        if (lastCaptionTime && Math.abs(cue.startTime - lastCaptionTime) < 0.1) {
          // Show the final question
          dispatch({
            type: 'SET_CURRENT_QUESTION',
            payload: {
              id: 'final',
              text: cue.text,
              options: FINAL_OPTIONS
            }
          });
          dispatch({ type: 'SET_FINAL_QUESTION_SHOWN', payload: true });
          
          // Start 20-second timer for the final question
          setTimeout(() => {
            video.pause();
            dispatch({ type: 'QUESTION_TIMEOUT' });
          }, 20000);
          return;
        }
        
        // Set typing indicator before showing message
        dispatch({ type: 'SET_TYPING', payload: true });
        
        // Add message after a short delay
        setTimeout(() => {
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: Date.now().toString(),
              text: cue.text,
              type: 'text',
              timestamp: Date.now()
            }
          });
        }, 1000);
      }
    };

    // Setup video event listeners
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handleTimeUpdate);
    video.addEventListener('pause', handleTimeUpdate);
    video.addEventListener('volumechange', handleTimeUpdate);

    // Setup captions
    if (video.textTracks.length > 0) {
      const track = video.textTracks[0];
      track.mode = 'hidden'; // Hide native captions
      track.addEventListener('cuechange', handleCueChange);
    }

    // Prevent pause through video element except for timeouts
    const preventPause = (e: Event) => {
      if (video.paused && isPlaying && !video.ended) {
        e.preventDefault();
        video.play().catch(console.error);
      }
    };
    video.addEventListener('pause', preventPause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handleTimeUpdate);
      video.removeEventListener('pause', handleTimeUpdate);
      video.removeEventListener('volumechange', handleTimeUpdate);
      video.removeEventListener('pause', preventPause);
      
      if (video.textTracks.length > 0) {
        const track = video.textTracks[0];
        track.removeEventListener('cuechange', handleCueChange);
      }
    };
  }, [dispatch, lastCaptionTime, isPlaying]);

  const handleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    dispatch({
      type: 'SET_VIDEO_STATE',
      payload: { 
        isMuted: video.muted,
        isPlaying: !video.paused,
        currentTime: video.currentTime,
        duration: video.duration
      }
    });
  };

  const handleFullscreen = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (!document.fullscreenElement) {
      try {
        await video.requestFullscreen();
        dispatch({
          type: 'SET_VIDEO_STATE',
          payload: {
            isPlaying: !video.paused,
            currentTime: video.currentTime,
            duration: video.duration,
            isMuted: video.muted
          }
        });
      } catch (error) {
        console.error('Error attempting to enable fullscreen:', error);
      }
    } else {
      await document.exitFullscreen();
      dispatch({
        type: 'SET_VIDEO_STATE',
        payload: {
          isPlaying: !video.paused,
          currentTime: video.currentTime,
          duration: video.duration,
          isMuted: video.muted
        }
      });
    }
  };

  return (
    <div className="video-container">
      <video
        ref={videoRef}
        src={src}
        className="video-player"
        playsInline
        crossOrigin="anonymous"
        style={{ pointerEvents: 'none' }}
      >
        <track
          kind="captions"
          src={captionsSrc}
          srcLang="en"
          label="English"
          default
        />
      </video>
      <div className="video-controls">
        <button onClick={handleMute} className="control-button">
          <i className={`fas fa-volume-${videoRef.current?.muted ? 'mute' : 'up'}`} />
        </button>
        <button onClick={handleFullscreen} className="control-button">
          <i className="fas fa-expand" />
        </button>
      </div>
    </div>
  );
};

export default VideoPlayer; 