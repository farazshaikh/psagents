import React, { useEffect, useRef } from 'react';
import { useGameContext } from '../context/GameContext';
import { debugLog } from '../../../../utils/debug';

interface VideoPlayerProps {
  src: string;
  plainCaptionsSrc: string;
  interactiveCaptionsSrc: string;
  onEnded?: () => void;
}

interface InteractiveCaptionData {
  caption: string;
  interactive?: {
    type: 'singleChoiceQuestion';
    content: {
      question: string;
      active_duration_sec: number;
      options: string[];
    };
  };
}

// Helper function to detect mobile devices
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  plainCaptionsSrc,
  interactiveCaptionsSrc,
  onEnded
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const plainTrackRef = useRef<HTMLTrackElement>(null);
  const interactiveTrackRef = useRef<HTMLTrackElement>(null);
  const { dispatch, state } = useGameContext();
  const isMobile = isMobileDevice();

  // Handle video playback when game starts
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set initial attributes for mobile compatibility
    video.playsInline = true;
    if (isMobile) {
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
    }

    // Configure for streaming playback
    video.preload = 'metadata'; // Only load metadata initially
    video.autoplay = false; // We'll control playback manually
    
    // Load just enough to start playback
    const handleLoadedMetadata = () => {
      debugLog(`Video metadata loaded - Duration: ${video.duration}`);
      if (state.isPlaying) {
        // Start playback as soon as we have enough data
        video.play().catch(e => {
          debugLog(`Initial playback failed: ${e}`);
        });
      }
    };

    // Monitor buffering progress
    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const duration = video.duration;
        const bufferedPercent = (bufferedEnd / duration) * 100;
        debugLog(`Buffered: ${bufferedPercent.toFixed(2)}%`);
      }
    };

    // Handle waiting/buffering states
    const handleWaiting = () => {
      debugLog('Video is buffering...');
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('waiting', handleWaiting);

    // Load the video source
    video.load();

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('waiting', handleWaiting);
    };
  }, [src, isMobile, state.isPlaying]);

  // Track video state and handle ended event
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      dispatch({
        type: 'SET_VIDEO_STATE',
        payload: {
          currentTime: video.currentTime,
          duration: video.duration,
          isPlaying: !video.paused
        }
      });
    };

    const handleEnded = () => {
      debugLog('Video ended event fired');
      // Ensure we're really at the end
      if (Math.abs(video.currentTime - video.duration) < 0.5) {
        onEnded?.();
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [dispatch, onEnded]);

  // Handle caption tracks
  useEffect(() => {
    const video = videoRef.current;
    const plainTrack = plainTrackRef.current;
    const interactiveTrack = interactiveTrackRef.current;
    if (!video || !plainTrack || !interactiveTrack) return;

    // Handle track loading
    const handleTrackLoad = (track: TextTrack, type: string) => {
      console.log(`${type} track loaded:`, track);
      track.mode = 'showing'; // First set to showing to force load
      setTimeout(() => {
        track.mode = 'hidden'; // Then hide after load
      }, 100);
    };

    const handleTrackError = (event: Event, type: string) => {
      console.error(`Error loading ${type} track:`, event);
    };

    // Set up plain captions track
    plainTrack.addEventListener('load', () => handleTrackLoad(plainTrack.track, 'Plain'));
    plainTrack.addEventListener('error', (e) => handleTrackError(e, 'Plain'));

    // Set up interactive captions track
    interactiveTrack.addEventListener('load', () => handleTrackLoad(interactiveTrack.track, 'Interactive'));
    interactiveTrack.addEventListener('error', (e) => handleTrackError(e, 'Interactive'));

    // Handle plain captions (normal text messages)
    const handlePlainCueChange = () => {
      const track = plainTrack.track;
      if (!track) return;

      const activeCues = Array.from(track.activeCues || []);
      if (activeCues.length > 0) {
        const cue = activeCues[0] as VTTCue;
        console.log('Plain caption cue:', cue.text);
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            id: `caption-${Date.now()}`,
            text: cue.text,
            type: 'text',
            timestamp: Date.now()
          }
        });
      }
    };

    // Handle interactive captions (JSON-formatted UI elements)
    const handleInteractiveCueChange = () => {
      const track = interactiveTrack.track;
      if (!track) return;

      const activeCues = Array.from(track.activeCues || []);
      if (activeCues.length > 0) {
        const cue = activeCues[0] as VTTCue;
        try {
          debugLog(`Interactive caption cue: ${cue.text}`);
          const data: InteractiveCaptionData = JSON.parse(cue.text);

          // If there's a caption text in the JSON, add it as a message
          if (data.caption) {
            dispatch({
              type: 'ADD_MESSAGE',
              payload: {
                id: `interactive-caption-${Date.now()}`,
                text: data.caption,
                type: 'text',
                timestamp: Date.now()
              }
            });
          }

          // If there's an interactive element, handle it separately
          if (data.interactive?.type === 'singleChoiceQuestion') {
            const { question, options, active_duration_sec } = data.interactive.content;
            dispatch({
              type: 'SET_CURRENT_QUESTION',
              payload: {
                id: Date.now().toString(),
                text: question,
                options: options,
                duration: active_duration_sec
              }
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          debugLog(`Error parsing interactive caption: ${errorMessage}`);
          
          // Display the parsing error and the problematic caption text in the chat
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: `caption-error-${Date.now()}`,
              text: `⚠️ Caption parsing error:\n${errorMessage}\n\nCaption text:\n${cue.text}`,
              type: 'system',
              timestamp: Date.now()
            }
          });
        }
      }
    };

    // Set up track change listeners
    plainTrack.track.addEventListener('cuechange', handlePlainCueChange);
    interactiveTrack.track.addEventListener('cuechange', handleInteractiveCueChange);

    // Force tracks to load by temporarily setting them to showing
    video.textTracks[0].mode = 'showing';
    video.textTracks[1].mode = 'showing';

    // Then hide them after a short delay
    setTimeout(() => {
      video.textTracks[0].mode = 'hidden';
      video.textTracks[1].mode = 'hidden';
    }, 100);

    return () => {
      plainTrack.track.removeEventListener('cuechange', handlePlainCueChange);
      interactiveTrack.track.removeEventListener('cuechange', handleInteractiveCueChange);
      plainTrack.removeEventListener('load', () => handleTrackLoad(plainTrack.track, 'Plain'));
      plainTrack.removeEventListener('error', (e) => handleTrackError(e, 'Plain'));
      interactiveTrack.removeEventListener('load', () => handleTrackLoad(interactiveTrack.track, 'Interactive'));
      interactiveTrack.removeEventListener('error', (e) => handleTrackError(e, 'Interactive'));
    };
  }, [dispatch]);

  return (
    <div className="video-container">
      <video
        ref={videoRef}
        className="video-player"
        playsInline
        preload="auto"
        crossOrigin="anonymous"
      >
        <source src={src} type="video/mp4" />
        <track
          ref={plainTrackRef}
          label="Plain Captions"
          kind="subtitles"
          srcLang="en"
          src={plainCaptionsSrc}
          default
        />
        <track
          ref={interactiveTrackRef}
          label="Interactive Captions"
          kind="subtitles"
          srcLang="en"
          src={interactiveCaptionsSrc}
        />
      </video>
    </div>
  );
};

export default VideoPlayer;
