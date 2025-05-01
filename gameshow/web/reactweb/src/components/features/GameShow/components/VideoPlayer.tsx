import React, { useEffect, useRef } from 'react';
import { useGameContext } from '../context/GameContext';

interface VideoPlayerProps {
  src: string;
  plainCaptionsSrc: string;
  interactiveCaptionsSrc: string;
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

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  plainCaptionsSrc,
  interactiveCaptionsSrc
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const plainTrackRef = useRef<HTMLTrackElement>(null);
  const interactiveTrackRef = useRef<HTMLTrackElement>(null);
  const { dispatch, state } = useGameContext();

  // Handle video playback when game starts
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (state.isPlaying) {
      video.currentTime = 0;
      video.muted = false;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Error playing video:', error);
          // Try playing muted if autoplay was blocked
          video.muted = true;
          video.play().then(() => {
            // Try to unmute after successful muted playback
            video.muted = false;
          }).catch(e => {
            console.error('Failed to play even muted:', e);
          });
        });
      }
    } else {
      video.pause();
    }
  }, [state.isPlaying]);

  // Track video state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateVideoState = () => {
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

    // Update state on various video events
    video.addEventListener('play', updateVideoState);
    video.addEventListener('pause', updateVideoState);
    video.addEventListener('timeupdate', updateVideoState);
    video.addEventListener('durationchange', updateVideoState);
    video.addEventListener('volumechange', updateVideoState);
    document.addEventListener('fullscreenchange', updateVideoState);

    // Initial state update
    updateVideoState();

    return () => {
      video.removeEventListener('play', updateVideoState);
      video.removeEventListener('pause', updateVideoState);
      video.removeEventListener('timeupdate', updateVideoState);
      video.removeEventListener('durationchange', updateVideoState);
      video.removeEventListener('volumechange', updateVideoState);
      document.removeEventListener('fullscreenchange', updateVideoState);
    };
  }, [dispatch]);

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
          console.log('Interactive caption cue:', cue.text);
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
          console.error('Error parsing interactive caption:', error);
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
        muted
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
          default
        />
      </video>
    </div>
  );
};

export default VideoPlayer;