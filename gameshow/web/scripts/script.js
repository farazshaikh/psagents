function goFullscreen() {
  document.documentElement.requestFullscreen().catch(e => console.log(e));
}

function toggleMute() {
  const video = document.getElementById('videoPlayer');
  const muteButton = document.getElementById('muteButton');
  video.muted = !video.muted;
  if (!video.muted) {
    // When unmuting, start playing if not already playing
    video.play().catch(e => console.log(e));
    muteButton.textContent = 'Mute';
  } else {
    // When muting, pause the video
    video.pause();
    muteButton.textContent = 'Unmute to Play';
  }
}

function startGame() {
  const video = document.getElementById('videoPlayer');
  const captionText = document.getElementById('captionText');

  // Show initial typing indicator
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'typing-indicator';
  typingIndicator.innerHTML = '<span></span><span></span><span></span>';
  captionText.appendChild(typingIndicator);

  // Go fullscreen
  document.documentElement.requestFullscreen().catch(e => console.log(e));
  
  // Set up captions
  const track = video.textTracks[0];
  track.mode = 'showing'; // First set to showing to ensure it loads

  // Start video and unmute after a short delay
  setTimeout(() => {
    video.muted = false;
    video.play().catch(e => console.log(e));
    track.mode = 'hidden'; // Then hide it after it's loaded
  }, 1000);

  // Hide start button's container
  document.querySelector('.fullscreen-panel').style.display = 'none';
}

function showCaption(cue, nextCue) {
  // Create message bubble immediately
  const captionEntry = document.createElement('div');
  captionEntry.className = 'caption-entry';
  
  const messageText = document.createElement('div');
  messageText.textContent = cue.text;
  captionEntry.appendChild(messageText);
  
  const timestamp = document.createElement('div');
  timestamp.className = 'timestamp';
  const time = new Date();
  timestamp.textContent = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  captionEntry.appendChild(timestamp);
  
  captionText.appendChild(captionEntry);
  
  // Mark previous captions as past
  const previousCaptions = captionText.querySelectorAll('.caption-entry.active');
  previousCaptions.forEach(caption => {
    caption.classList.remove('active');
    caption.classList.add('past');
  });
  
  // Activate new caption with animation
  requestAnimationFrame(() => {
    captionEntry.classList.add('active');
  });
  
  // Scroll to bottom
  captionText.scrollTop = captionText.scrollHeight;

  // If there's a next cue, show typing indicator for it
  if (nextCue) {
    // Remove any existing typing indicator first
    const existingIndicator = document.querySelector('.typing-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Create typing indicator for next message
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = '<span></span><span></span><span></span>';
    captionText.appendChild(typingIndicator);
    
    // Scroll to show typing indicator
    captionText.scrollTop = captionText.scrollHeight;
  }
}

function createStartCaption() {
  const startCaption = document.createElement('div');
  startCaption.className = 'caption-entry';
  
  const button = document.createElement('button');
  button.textContent = 'Participate';
  button.onclick = startGame;
  startCaption.appendChild(button);
  
  requestAnimationFrame(() => {
    startCaption.classList.add('active');
  });
  
  return startCaption;
}

function showQuestionInChat(text) {
  showDebug('Attempting to show question in chat panel');
  
  const captionEntry = document.createElement('div');
  captionEntry.className = 'caption-entry';
  
  const messageText = document.createElement('div');
  messageText.textContent = `ZAIA: ${text} ....`;
  captionEntry.appendChild(messageText);
  
  captionText.appendChild(captionEntry);
  requestAnimationFrame(() => {
    captionEntry.classList.add('active');
  });
  
  captionText.scrollTop = captionText.scrollHeight;
}

function showOptionsInChat(options) {
  const optionsCaption = document.createElement('div');
  optionsCaption.className = 'caption-entry';
  
  options.forEach((text, index) => {
    const button = document.createElement('button');
    button.className = 'game-option';
    button.innerHTML = `<span class="option-letter">${String.fromCharCode(65 + index)}.</span><span class="option-text">${text}</span>`;
    optionsCaption.appendChild(button);
  });
  
  captionText.appendChild(optionsCaption);
  requestAnimationFrame(() => {
    optionsCaption.classList.add('active');
  });
  
  captionText.scrollTop = captionText.scrollHeight;
}

window.onload = function() {
  const video = document.getElementById('videoPlayer');
  const captionText = document.getElementById('captionText');
  const captionsContainer = document.getElementById('captions');

  // Add start caption as first message
  captionText.appendChild(createStartCaption());

  let lastCaptionTime = 0;

  // Handle window resize
  function handleResize() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  window.addEventListener('resize', handleResize);
  handleResize();

  // Create options array
  const options = [
    "decode, like it's standing face-to-face with a cursed scroll",
    "race, like a scarab on hot stone chasing the final clue",
    "gonna burn, like Ra's sun hitting a forgotten riddle",
    "crack, before the tomb door does"
  ];

  // Set up caption handling
  const track = video.textTracks[0];
  track.mode = 'showing'; // First set to showing to ensure it loads
  
  const checkTrack = setInterval(() => {
    if (track.cues && track.cues.length > 0) {
      const lastCue = track.cues[track.cues.length - 1];
      lastCaptionTime = lastCue.startTime;
      clearInterval(checkTrack);
      
      track.mode = 'hidden';
      track.addEventListener('cuechange', function() {
        const cue = this.activeCues[0];
        if (cue) {
          const currentIndex = Array.from(track.cues).findIndex(c => c === cue);
          const nextCue = currentIndex < track.cues.length - 1 ? track.cues[currentIndex + 1] : null;
          
          if (Math.abs(cue.startTime - lastCaptionTime) < 0.1) {
            setTimeout(() => {
              showQuestionInChat(cue.text);
              setTimeout(() => {
                showOptionsInChat(options);
              }, 500);
            }, 500);
            return;
          }

          showCaption(cue, nextCue);
        }
      });
    }
  }, 100);

  // Track if user is manually scrolling
  let isUserScrolling = false;
  let scrollTimeout;

  captionsContainer.addEventListener('scroll', () => {
    isUserScrolling = true;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      isUserScrolling = false;
    }, 2000);
  });

  video.volume = 1.0;

  if (video.textTracks && video.textTracks.length > 0) {
    video.textTracks[0].mode = 'hidden';
  }
  
  video.addEventListener('timeupdate', () => {
    if (lastCaptionTime > 0 && video.currentTime >= lastCaptionTime) {
      video.removeEventListener('timeupdate', arguments.callee);
      setTimeout(() => {
        showQuestionInChat(lastCue.text);
        setTimeout(() => {
          showOptionsInChat(options);
        }, 500);
      }, 2000);
    }
  });

  showDebug('Debug console initialized');
} 
