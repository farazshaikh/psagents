/**
 * Game Show Video Player with Interactive Captions
 *
 * Flow:
 * 1. Video and Caption Loading
 *    - Load video element and VTT captions
 *    - Parse captions and store them for timed display
 *    - Track the timestamp of the last caption for question timing
 *
 * 2. Initial UI Setup
 *    - Display the "Participate" button as a chat message
 *    - Button appears in the chat panel like a system message
 *
 * 3. Game Start
 *    - User clicks "Participate" to begin
 *    - Video playback starts from the beginning
 *
 * 4. Caption Display
 *    - Captions are displayed as chat messages
 *    - Each caption appears with timing from VTT
 *    - Messages styled as Instagram Live chat bubbles
 *
 * 5. Question Display
 *    - At the last caption timestamp:
 *      - Instead of showing the caption, display it as a question
 *      - Show 4 multiple choice options as interactive buttons
 *      - Options appear in sequence with animation
 *
 * This script manages the video player, caption timing,
 * chat message display, and interactive question handling
 * in an Instagram Live-style interface.
 */

function createStartCaption() {
  const startCaption = document.createElement('div');
  startCaption.className = 'caption-entry clickable';

  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';

  const button = document.createElement('button');
  button.className = 'participate-button';
  button.innerHTML = '<span class="green-dot"></span>Participate';
  button.onclick = startGame;

  messageContent.appendChild(button);
  startCaption.appendChild(messageContent);

  requestAnimationFrame(() => {
    startCaption.classList.add('show');
  });

  return startCaption;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  const captionsContainer = document.getElementById('captions');
  if (captionsContainer) {
    captionsContainer.appendChild(createStartCaption());
  }
});

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
  const captionsContainer = document.getElementById('captions');

  // Log initial video state
  showDebug('Initial video state:\n' +
    `    - Source: ${video.currentSrc}\n` +
    `    - Ready state: ${video.readyState}\n` +
    `    - Network state: ${video.networkState}\n` +
    `    - Autoplay: ${video.autoplay}\n` +
    `    - Muted: ${video.muted}\n` +
    `    - Controls: ${video.controls}\n` +
    `    - Width x Height: ${video.videoWidth} x ${video.videoHeight}\n` +
    `    - User Agent: ${navigator.userAgent}\n`
  );

  // Remove any existing typing indicators
  const existingIndicator = document.querySelector('.typing-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  // Show initial typing indicator
  setTimeout(() => {
    showTypingIndicator();
  }, 500);

  // Make sure video is loaded
  if (video.readyState < 2) { // HAVE_CURRENT_DATA
    showDebug('Video not ready, waiting for load...');
    video.addEventListener('loadeddata', () => {
      showDebug('Video loaded, starting playback...');
      startVideoPlayback();
    });
    // Also set a timeout in case loading takes too long
    setTimeout(() => {
      if (video.readyState < 2) {
        showDebug('Video load timeout, attempting playback anyway...');
        startVideoPlayback();
      }
    }, 2000);
  } else {
    showDebug('Video ready, starting playback immediately...');
    startVideoPlayback();
  }

  function startVideoPlayback() {
    // Set up captions
    const track = video.textTracks[0];
    if (track) {
      track.mode = 'showing';
      showDebug('Caption track found and enabled');
    } else {
      showDebug('No caption track found!');
    }

    // Try to unmute and play
    video.currentTime = 0;
    video.muted = false;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        showDebug('Video playback started successfully');
        if (track) track.mode = 'hidden';
      }).catch(error => {
        showDebug(`Error playing video: ${error}`);
        // Try one more time with muted playback
        video.muted = true;
        video.play().then(() => {
          showDebug('Video playing muted, attempting to unmute...');
          video.muted = false;
        }).catch(e => {
          showDebug(`Failed to play even muted: ${e}`);
        });
      });
    }
  }
}

function showCaption(cue, nextCue) {
  showDebug(`Showing caption at time ${cue.startTime}`);
  showDebug(`Caption text: ${cue.text}`);
  if (nextCue) {
    showDebug(`Next cue starts at: ${nextCue.startTime}`);
  }

  const captionsContainer = document.getElementById('captions');
  if (!captionsContainer) {
    showDebug('Captions container not found');
    return;
  }

  // Remove existing typing indicator if present
  const existingIndicator = document.querySelector('.typing-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  // Create message container
  const messageContainer = document.createElement('div');
  messageContainer.className = 'caption-entry';

  // Create message content
  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  messageContent.textContent = cue.text;

  // Add message to container
  messageContainer.appendChild(messageContent);

  // Add to chat with animation
  requestAnimationFrame(() => {
    captionsContainer.appendChild(messageContainer);
    requestAnimationFrame(() => {
      messageContainer.style.opacity = '1';
      messageContainer.style.transform = 'translateY(0)';
      scrollToLatest();
    });
  });

  // Show typing indicator for next message
  if (nextCue) {
    setTimeout(showTypingIndicator, 1000);
  }
}

function showTypingIndicator(timeout = null) {
  const captionsContainer = document.getElementById('captions');
  if (!captionsContainer) return;

  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'typing-indicator';
  typingIndicator.innerHTML = '<span></span><span></span><span></span>';

  requestAnimationFrame(() => {
    captionsContainer.appendChild(typingIndicator);
    requestAnimationFrame(() => {
      typingIndicator.style.opacity = '1';
      typingIndicator.style.transform = 'translateY(0)';
      scrollToLatest();
    });
  });

  if (timeout) {
    setTimeout(() => {
      if (typingIndicator && typingIndicator.parentNode) {
        typingIndicator.remove();
      }
    }, timeout);
  }

  return typingIndicator;
}

function showQuestionInChat(questionText, options) {
  showDebug('Attempting to show question and options in chat panel');
  showDebug(`Question text received: "${questionText}"`);

  const captionsContainer = document.getElementById('captions');
  if (!captionsContainer) {
    showDebug('Captions container not found');
    return;
  }

  // Remove existing typing indicator if present
  const existingIndicator = document.querySelector('.typing-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  // Create question container
  const questionContainer = document.createElement('div');
  questionContainer.className = 'caption-entry question';

  // Create question content
  const questionContent = document.createElement('div');
  questionContent.className = 'message-content';

  // Add question text
  const questionTextDiv = document.createElement('div');
  questionTextDiv.className = 'question-text';
  questionTextDiv.textContent = questionText;
  questionContent.appendChild(questionTextDiv);

  // Add options container
  const optionsContent = document.createElement('div');
  optionsContent.className = 'options-container';

  options.forEach((option, index) => {
    showDebug(`Creating option ${index + 1}: ${option}`);
    const button = document.createElement('button');
    button.className = 'game-option';
    button.innerHTML = `<span class="option-letter">${String.fromCharCode(65 + index)}.</span><span class="option-text">${option}</span>`;
    optionsContent.appendChild(button);
  });

  questionContent.appendChild(optionsContent);
  questionContainer.appendChild(questionContent);

  // Add to chat with animation
  requestAnimationFrame(() => {
    captionsContainer.appendChild(questionContainer);
    requestAnimationFrame(() => {
      questionContainer.classList.add('show');
      // Reveal options with staggered animation
      const options = questionContainer.querySelectorAll('.game-option');
      options.forEach((option, index) => {
        setTimeout(() => option.classList.add('reveal'), index * 200);
      });
      scrollToLatest();
    });
  });
}

function showOptionsInChat(optionsToShow) {
  showDebug('Showing options in chat');
  showDebug(`Number of options: ${optionsToShow.length}`);

  const captionsContainer = document.getElementById('captions');
  if (!captionsContainer) {
    showDebug('Captions container not found');
    return;
  }

  // Remove existing typing indicator if present
  const existingIndicator = document.querySelector('.typing-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  // Create options container
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'caption-entry options';

  const optionsContent = document.createElement('div');
  optionsContent.className = 'message-content options-container';

  optionsToShow.forEach((option, index) => {
    showDebug(`Creating option ${index + 1}: ${option}`);
    const button = document.createElement('button');
    button.className = 'game-option';
    button.innerHTML = `<span class="option-letter">${String.fromCharCode(65 + index)}.</span><span class="option-text">${option}</span>`;
    optionsContent.appendChild(button);

    // Add reveal class after a short delay
    setTimeout(() => button.classList.add('reveal'), index * 200);
  });

  optionsContainer.appendChild(optionsContent);

  // Add to chat with animation
  requestAnimationFrame(() => {
    captionsContainer.appendChild(optionsContainer);
    requestAnimationFrame(() => {
      optionsContainer.style.opacity = '1';
      optionsContainer.style.transform = 'translateY(0)';
      scrollToLatest();
    });
  });
}

window.onload = function() {
  const video = document.getElementById('videoPlayer');
  const captionsContainer = document.getElementById('captions');
  let hasShownFinalQuestion = false;
  let lastCaptionTime = 0;

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
                showQuestionInChat(cue.text, options);
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

  function handleTimeUpdate() {
    showDebug(`Video time: ${video.currentTime}`);
    const track = video.textTracks[0];

    if (track && track.activeCues && track.activeCues.length > 0) {
      showDebug(`Active cues: ${track.activeCues.length}`);
      const currentCue = track.activeCues[0];
      showDebug(`Current cue text: ${currentCue.text}`);
    }
  }

  video.addEventListener('timeupdate', handleTimeUpdate);

  showDebug('Debug console initialized');
}
