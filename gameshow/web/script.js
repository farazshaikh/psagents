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

window.onload = function() {
  const video = document.getElementById('videoPlayer');
  const questionText = document.getElementById('questionText');
  const optionsContainer = document.getElementById('optionsContainer');
  const muteButton = document.getElementById('muteButton');
  const captionText = document.getElementById('captionText');
  const captionsContainer = document.getElementById('captions');

  let currentCaptionIndex = -1;
  let lastCaptionTime = 0;

  // Handle window resize
  function handleResize() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  window.addEventListener('resize', handleResize);
  handleResize();

  // Create options dynamically
  const options = [
    "decode, like it's standing face-to-face with a cursed scroll",
    "race, like a scarab on hot stone chasing the final clue",
    "gonna burn, like Ra's sun hitting a forgotten riddle",
    "crack, before the tomb door does"
  ];

  options.forEach((text, index) => {
    const button = document.createElement('button');
    button.className = 'game-option';
    button.innerHTML = `<span class="option-letter">${String.fromCharCode(65 + index)}.</span><span class="option-text">${text}</span>`;
    optionsContainer.appendChild(button);
  });

  const gameOptions = document.querySelectorAll('.game-option');

  // Set up caption handling
  const track = video.textTracks[0];
  track.mode = 'showing'; // First set to showing to ensure it loads
  
  // Wait for track to load and get last caption time
  const checkTrack = setInterval(() => {
    if (track.cues && track.cues.length > 0) {
      const lastCue = track.cues[track.cues.length - 1];
      lastCaptionTime = lastCue.startTime;
      // Set the question text with ZAIA prefix
      questionText.textContent = `ZAIA: ${lastCue.text} ....`;
      clearInterval(checkTrack);
      
      // Now that we have the last time, set up the cue change listener
      track.mode = 'hidden';
      track.addEventListener('cuechange', function() {
        const cue = this.activeCues[0];
        if (cue) {
          // Find the index of current cue
          const currentIndex = Array.from(track.cues).findIndex(c => c === cue);
          const nextCue = currentIndex < track.cues.length - 1 ? track.cues[currentIndex + 1] : null;
          
          // Skip displaying the last caption
          if (Math.abs(cue.startTime - lastCaptionTime) < 0.1) {
            setTimeout(() => {
              questionText.classList.add('reveal');
              const options = document.querySelectorAll('.game-option');
              options.forEach((option, index) => {
                setTimeout(() => {
                  option.classList.add('reveal');
                }, index * 200);
              });
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

  // Detect when user scrolls manually
  captionsContainer.addEventListener('scroll', () => {
    isUserScrolling = true;
    clearTimeout(scrollTimeout);
    
    // Reset after 2 seconds of no scrolling
    scrollTimeout = setTimeout(() => {
      isUserScrolling = false;
    }, 2000);
  });

  video.volume = 1.0;
  muteButton.textContent = 'Unmute to Play';

  // Handle captions
  // Ensure captions are hidden by default and handled by our custom display
  if (video.textTracks && video.textTracks.length > 0) {
    video.textTracks[0].mode = 'hidden';
  }
  
  // Add timeupdate listener to check for last caption
  video.addEventListener('timeupdate', () => {
    if (lastCaptionTime > 0 && video.currentTime >= lastCaptionTime) {
      // Remove the listener to prevent multiple triggers
      video.removeEventListener('timeupdate', arguments.callee);
      
      // Reveal question and options with delay
      setTimeout(() => {
        questionText.classList.add('reveal');
        gameOptions.forEach((option, index) => {
          setTimeout(() => {
            option.classList.add('reveal');
          }, index * 200);
        });
      }, 2000); // Wait 2 seconds after last caption
    }
  });
} 