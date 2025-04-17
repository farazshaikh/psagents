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
  showDebug('Starting game...');
  const video = document.getElementById('videoPlayer');
  const captionText = document.getElementById('captionText');

  // Remove any existing typing indicators
  const existingIndicator = document.querySelector('.typing-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  // Show initial typing indicator
  showTypingIndicator();

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

  // Add debug log for options
  showDebug(`Options available: ${JSON.stringify(options)}`);
}

function showCaption(cue, nextCue) {
  showDebug(`Showing caption at time ${cue.startTime}`);
  showDebug(`Caption text: ${cue.text}`);
  if (nextCue) {
    showDebug(`Next cue starts at: ${nextCue.startTime}`);
  }

  // Remove existing typing indicator if present
  const existingIndicator = document.querySelector('.typing-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  const captionEntry = document.createElement('div');
  captionEntry.className = 'caption-entry';
  
  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  messageContent.textContent = cue.text;
  
  captionEntry.appendChild(messageContent);
  captionText.appendChild(captionEntry);
  
  // Force reflow
  captionEntry.offsetHeight;
  captionEntry.classList.add('active');
  
  // Auto-scroll
  captionText.scrollTop = captionText.scrollHeight;
  
  // Always show a typing indicator after a caption
  if (nextCue) {
    showTypingIndicator();
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

function showTypingIndicator(timeout = null) {
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'typing-indicator';
  typingIndicator.innerHTML = '<span></span><span></span><span></span>';
  captionText.appendChild(typingIndicator);
  
  // Auto-scroll to show typing indicator
  captionText.scrollTop = captionText.scrollHeight;

  // If timeout is provided, remove the indicator after timeout
  if (timeout) {
    setTimeout(() => {
      if (typingIndicator && typingIndicator.parentNode) {
        typingIndicator.remove();
      }
    }, timeout);
  }
  
  return typingIndicator;
}

function showQuestionInChat(questionText) {
  showDebug('Attempting to show question in chat panel');
  showDebug(`Question text received: "${questionText}"`);
  
  // Remove existing typing indicator if present
  const existingIndicator = document.querySelector('.typing-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  const captionEntry = document.createElement('div');
  captionEntry.className = 'caption-entry';
  
  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  
  const messageText = document.createElement('div');
  messageText.className = 'question-text';
  messageText.textContent = questionText;
  messageContent.appendChild(messageText);
  
  captionEntry.appendChild(messageContent);
  captionText.appendChild(captionEntry);
  
  // Force reflow and add active class
  captionEntry.offsetHeight;
  captionEntry.classList.add('active');
  messageText.classList.add('reveal');
  
  // Auto-scroll
  captionText.scrollTop = captionText.scrollHeight;
  
  // Always show a typing indicator after the question
  showTypingIndicator();
}

function showOptionsInChat(optionsToShow) {
  showDebug('Showing options in chat');
  showDebug(`Number of options: ${optionsToShow.length}`);
  
  // Remove existing typing indicator if present
  const existingIndicator = document.querySelector('.typing-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  const captionEntry = document.createElement('div');
  captionEntry.className = 'caption-entry';
  
  const messageContent = document.createElement('div');
  messageContent.className = 'message-content options-container';
  
  optionsToShow.forEach((option, index) => {
    showDebug(`Option ${index + 1}: ${option}`);
    const button = document.createElement('button');
    button.className = 'game-option';
    button.innerHTML = `<span class="option-letter">${String.fromCharCode(65 + index)}.</span><span class="option-text">${option}</span>`;
    messageContent.appendChild(button);
    showDebug(`Created option ${index + 1}: ${option}`);
    
    // Add reveal class after a short delay
    setTimeout(() => button.classList.add('reveal'), index * 200);
  });
  
  captionEntry.appendChild(messageContent);
  captionText.appendChild(captionEntry);
  
  // Force reflow and add active class
  captionEntry.offsetHeight;
  captionEntry.classList.add('active');
  
  // Auto-scroll
  captionText.scrollTop = captionText.scrollHeight;
  
  // Show a typing indicator that will clean itself up after 3 seconds
  showTypingIndicator(3000);
}

window.onload = function() {
  const video = document.getElementById('videoPlayer');
  const captionText = document.getElementById('captionText');
  const captionsContainer = document.getElementById('captions');
  let hasShownFinalQuestion = false;

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
            showDebug(`Last cue detected at time ${cue.startTime}`);
            if (!hasShownFinalQuestion) {
              hasShownFinalQuestion = true;
              setTimeout(() => {
                // Remove typing indicator before showing last question
                const existingIndicator = document.querySelector('.typing-indicator');
                if (existingIndicator) {
                  existingIndicator.remove();
                  showDebug('Removed typing indicator before last question');
                }
                showQuestionInChat(cue.text);
                setTimeout(() => {
                  showDebug('Attempting to show options after question');
                  showOptionsInChat(options);
                }, 500);
              }, 500);
            }
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
  
  function handleTimeUpdate() {
    showDebug(`Video time: ${video.currentTime}`);
    const track = video.textTracks[0];
    
    if (track && track.activeCues && track.activeCues.length > 0) {
      showDebug(`Active cues: ${track.activeCues.length}`);
      const currentCue = track.activeCues[0];
      showDebug(`Current cue text: ${currentCue.text}`);
    }
    
    if (lastCaptionTime > 0 && video.currentTime >= lastCaptionTime && !hasShownFinalQuestion) {
      showDebug(`Video reached last caption time: ${lastCaptionTime}`);
      showDebug('Preparing to show question');
      showDebug(`Current video time: ${video.currentTime}`);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      hasShownFinalQuestion = true;
      setTimeout(() => {
        showDebug('Showing final question from timeupdate');
        showQuestionInChat(track.activeCues[0].text);
        setTimeout(() => {
          showDebug('Showing options from timeupdate');
          showOptionsInChat(options);
        }, 500);
      }, 2000);
    }
  }
  
  video.addEventListener('timeupdate', handleTimeUpdate);

  showDebug('Debug console initialized');
} 
