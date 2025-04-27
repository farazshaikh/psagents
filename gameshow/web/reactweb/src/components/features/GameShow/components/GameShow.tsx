import React, { useEffect, useRef } from 'react';
import { GameProvider } from '../context/GameContext';
import { ChatPanel } from './ChatPanel';
import { DebugConsole } from './DebugConsole';
import { VideoPlayer } from './VideoPlayer';

interface GameShowProps {
  videoUrl: string;
  captionsUrl: string;
}

export const GameShow: React.FC<GameShowProps> = ({ videoUrl, captionsUrl }) => {
  const loadedScriptsRef = useRef<Set<string>>(new Set());
  const loadedStylesRef = useRef<Set<string>>(new Set());

  const loadStyle = async (href: string) => {
    if (loadedStylesRef.current.has(href)) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = href;
    link.id = `style-${href.split('/').pop()?.replace('.css', '')}`;
    
    return new Promise<void>((resolve, reject) => {
      link.onload = () => {
        loadedStylesRef.current.add(href);
        resolve();
      };
      link.onerror = reject;
      document.head.appendChild(link);
    });
  };

  const loadScript = async (src: string) => {
    if (loadedScriptsRef.current.has(src)) return;

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.id = `script-${src.split('/').pop()?.replace('.js', '')}`;
    
    return new Promise<void>((resolve, reject) => {
      script.onload = () => {
        loadedScriptsRef.current.add(src);
        resolve();
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  };

  useEffect(() => {
    const loadResources = async () => {
      try {
        // Load CSS files
        await Promise.all([
          loadStyle('/css/styles.css'),
          loadStyle('/css/debug.css')
        ]);

        // Load scripts in sequence to maintain dependency order
        await loadScript('/scripts/debug.js');
        await loadScript('/scripts/script.js');
      } catch (error) {
        console.error('Error loading resources:', error);
      }
    };

    loadResources();

    // Cleanup function
    return () => {
      // Remove styles
      loadedStylesRef.current.forEach(href => {
        const id = `style-${href.split('/').pop()?.replace('.css', '')}`;
        const link = document.getElementById(id);
        if (link) document.head.removeChild(link);
      });
      loadedStylesRef.current.clear();

      // Remove scripts
      loadedScriptsRef.current.forEach(src => {
        const id = `script-${src.split('/').pop()?.replace('.js', '')}`;
        const script = document.getElementById(id);
        if (script) document.body.removeChild(script);
      });
      loadedScriptsRef.current.clear();
    };
  }, []);

  return (
    <GameProvider>
      <div className="game-show-container">
        <div className="zaia-status">
          <span className="name">ZAIA</span>
          <span className="online">online</span>
        </div>

        <VideoPlayer src={videoUrl} captionsSrc={captionsUrl} />
        <ChatPanel />
        <DebugConsole />
      </div>
    </GameProvider>
  );
}; 