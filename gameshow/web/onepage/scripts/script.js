/**
 * Game Show Video Player with Interactive Captions
 *
 * Two caption streams:
 * 1. captions.vtt: Regular text captions
 *    - Simple text messages
 *    - Displayed directly in chat
 *
 * 2. interactive_captions.vtt: Interactive elements
 *    - JSON formatted messages
 *    - Can contain questions and options
 *    - Rendered as interactive elements
 *
 * Flow:
 * 1. Video and Caption Loading
 *    - Load video element with regular captions and interactive captions tracks
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
 *    - Both regular and interactive captions are displayed as chat messages
 *    - Each caption appears with timing from VTT
 *    - Messages styled as Instagram Live chat bubbles
 *
 * 5. Question Display
 *    - At question timestamps:
 *      - Show question and options from interactive captions
 *      - Options appear in sequence with animation
 *
 * This script manages the video player, caption timing,
 * chat message display, and interactive question handling
 * in an Instagram Live-style interface.
 */

// ============================================================================
// Constants and State Management
// ============================================================================

const PLAYER_CONFIG = {
  READY_STATE: {
    HAVE_CURRENT_DATA: 2
  },
  SCROLL_TIMEOUT_MS: 2000,
  OPTION_REVEAL_DELAY_MS: 200
};

let isUserScrolling = false;
let scrollTimeout;

// ============================================================================
// UI Control Functions
// ============================================================================

/**
 * Request fullscreen mode for the document
 */
function goFullscreen() {
  document.documentElement.requestFullscreen().catch(e => showDebug(e));
}

/**
 * Toggle video mute state and handle play/pause accordingly
 */
function toggleMute() {
  const video = document.getElementById('videoPlayer');
  const muteButton = document.getElementById('muteButton');

  video.muted = !video.muted;

  if (!video.muted) {
    video.play().catch(e => showDebug(e));
    muteButton.textContent = 'Mute';
  } else {
    video.pause();
    muteButton.textContent = 'Unmute to Play';
  }
}

/**
 * Scroll the captions container to show the latest messages
 */
function scrollToLatest() {
  if (isUserScrolling) return;

  const captionsContainer = document.getElementById('captions');
  if (captionsContainer) {
    captionsContainer.scrollTop = captionsContainer.scrollHeight;
  }
}

// ============================================================================
// Caption Track Management
// ============================================================================

/**
 * Set up a caption track with event listeners and handlers
 * @param {string} trackId - ID of the track element
 * @param {Function} cueHandler - Function to handle cue events
 * @returns {TextTrack|null} - The configured track or null if setup fails
 */
function setupCaptionTrack(trackId, cueHandler) {
  const track = document.getElementById(trackId);
  if (!track) {
    showDebug(`Track element ${trackId} not found!`);
    return null;
  }

  const captionsTrack = track.track;
  if (!captionsTrack) {
    showDebug(`Caption track ${trackId} not found!`);
    return null;
  }

  // Log track details
  logTrackDetails(trackId, captionsTrack);

  // Enable the track but keep it hidden (we'll handle display manually)
  try {
    captionsTrack.mode = 'hidden';
    showDebug(`Set ${trackId} mode to hidden`);
  } catch (e) {
    showDebug(`Error setting track mode: ${e.message}`);
  }

  // Set up track event listeners
  setupTrackEventListeners(trackId, captionsTrack, cueHandler);

  return captionsTrack;
}

/**
 * Log details about a caption track
 */
function logTrackDetails(trackId, track) {
  showDebug(`Setting up track ${trackId}:`);
  showDebug(`- Kind: ${track.kind}`);
  showDebug(`- Label: ${track.label}`);
  showDebug(`- Language: ${track.language}`);
  showDebug(`- Mode: ${track.mode}`);
  showDebug(`- Ready State: ${track.readyState}`);

  // Get the source element and log its src attribute
  const trackElement = document.getElementById(trackId);
  if (trackElement) {
    const src = trackElement.getAttribute('src');
    showDebug(`- Source VTT: ${src || 'Not found'}`);
  } else {
    showDebug(`- Source VTT: Unable to get track element`);
  }
}

/**
 * Set up event listeners for a caption track
 */
function setupTrackEventListeners(trackId, track, cueHandler) {
  // Remove any existing listeners first
  track.removeEventListener('cuechange', track._cueChangeHandler);

  // Create and store the handler
  track._cueChangeHandler = function() {
    const cues = track.activeCues;
    if (cues && cues.length > 0) {
      for (const cue of cues) {
        cueHandler(cue);
      }
    }
  };

  // Add the new listener
  track.addEventListener('cuechange', track._cueChangeHandler);
  showDebug(`Set up cuechange listener for ${trackId}`);
}

// ============================================================================
// Caption Display Functions
// ============================================================================

/**
 * Display a regular text caption
 */
function showTextCaption(cue) {
  showDebug(`Showing text caption at time ${cue.startTime} -> ${cue.endTime}`);

  const captionsContainer = document.getElementById('captions');
  if (!captionsContainer) {
    showDebug('Captions container not found');
    return;
  }

  const messageContainer = createCaptionElement('caption-entry', cue.startTime);
  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  messageContent.textContent = cue.text;

  messageContainer.appendChild(messageContent);
  addCaptionToDisplay(captionsContainer, messageContainer, cue.startTime);
}

/**
 * Display an interactive caption with questions/choices
 */
function showInteractiveCaption(cue) {
  showDebug(`Showing interactive caption at time ${cue.startTime} -> ${cue.endTime}`);
  showDebug(`Raw cue text: ${cue.text}`);

  try {
    const cleanText = cue.text.trim();
    const interactiveData = JSON.parse(cleanText);
    showDebug(`Interactive caption data parsed successfully: ${JSON.stringify(interactiveData)}`);

    // Validate the interactive data structure
    if (!validateInteractiveData(interactiveData)) {
      return;
    }

    const captionsContainer = document.getElementById('captions');
    if (!captionsContainer) {
      showDebug('Captions container not found');
      return;
    }

    // Check for duplicate captions
    if (isDuplicateCaption(captionsContainer, cue.startTime)) {
      return;
    }

    const messageContainer = createInteractiveCaptionElement(interactiveData, cue.startTime);
    addCaptionToDisplay(captionsContainer, messageContainer, cue.startTime);

  } catch (e) {
    showDebug(`Error processing interactive caption: ${e.message}`);
    showDebug(`Stack trace: ${e.stack}`);
  }
}

/**
 * Create and display a typing indicator
 */
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate the structure of interactive caption data
 */
function validateInteractiveData(data) {
  if (!data.interactive || !data.interactive.type || !data.interactive.content) {
    showDebug('Invalid interactive caption format - missing required fields');
    return false;
  }
  return true;
}

/**
 * Check if a caption with the same timestamp already exists
 */
function isDuplicateCaption(container, timestamp) {
  const existingCaption = Array.from(container.querySelectorAll('.caption-entry')).find(
    entry => entry.dataset.timestamp === timestamp.toString()
  );
  if (existingCaption) {
    showDebug('This interactive caption is already displayed');
    return true;
  }
  return false;
}

/**
 * Create a basic caption element
 */
function createCaptionElement(className, timestamp) {
  const element = document.createElement('div');
  element.className = className;
  element.dataset.timestamp = timestamp;
  return element;
}

/**
 * Create an interactive caption element with all its components
 */
function createInteractiveCaptionElement(data, timestamp) {
  const container = createCaptionElement('caption-entry interactive-caption', timestamp);
  const content = document.createElement('div');
  content.className = 'message-content';

  // Add caption text if present
  if (data.caption) {
    const captionText = document.createElement('div');
    captionText.className = 'caption-text';
    captionText.textContent = data.caption;
    content.appendChild(captionText);
    showDebug(`Added caption text: ${data.caption}`);
  }

  // Add interactive content
  const interactive = data.interactive;
  container.dataset.interactiveType = interactive.type;

  if (interactive.type === 'singleChoiceQuestion' || interactive.type === 'multiChoiceQuestion') {
    addQuestionContent(content, interactive.content);
  } else {
    showDebug(`Unknown interactive type: ${interactive.type}`);
    return null;
  }

  container.appendChild(content);
  return container;
}

/**
 * Add question content to an interactive caption
 */
function addQuestionContent(container, content) {
  if (content.question) {
    const questionText = document.createElement('div');
    questionText.className = 'question-text';
    questionText.textContent = content.question;
    container.appendChild(questionText);
    showDebug(`Added question: ${content.question}`);
  }

  if (content.options && Array.isArray(content.options)) {
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'options-container';

    content.options.forEach((option, index) => {
      const button = document.createElement('button');
      button.className = 'game-option';
      button.innerHTML = `<span class="option-letter">${String.fromCharCode(65 + index)}.</span><span class="option-text">${option}</span>`;
      optionsContainer.appendChild(button);
      showDebug(`Added option ${index + 1}: ${option}`);
    });

    container.appendChild(optionsContainer);
  }

  if (content.active_duration_sec) {
    container.dataset.duration = content.active_duration_sec;
    showDebug(`Set duration: ${content.active_duration_sec} seconds`);
  }
}

/**
 * Add a caption element to the display with proper positioning and animation
 */
function addCaptionToDisplay(container, captionElement, timestamp) {
  requestAnimationFrame(() => {
    // Find insertion point based on timestamp
    let insertBefore = null;
    const existingMessages = container.querySelectorAll('.caption-entry');
    for (const msg of existingMessages) {
      if (parseFloat(msg.dataset.timestamp) > timestamp) {
        insertBefore = msg;
        break;
      }
    }

    if (insertBefore) {
      container.insertBefore(captionElement, insertBefore);
    } else {
      container.appendChild(captionElement);
    }

    requestAnimationFrame(() => {
      captionElement.classList.add('show');

      // Animate options if present
      const options = captionElement.querySelectorAll('.game-option');
      options.forEach((option, index) => {
        setTimeout(() => option.classList.add('reveal'), index * PLAYER_CONFIG.OPTION_REVEAL_DELAY_MS);
      });

      scrollToLatest();
      showDebug('Caption added to DOM and animated');
    });
  });
}

/**
 * Create the initial start caption with participate button
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

// ============================================================================
// Game Control Functions
// ============================================================================

/**
 * Start the game and video playback
 */
function startGame() {
  showDebug('Starting game...');
  const video = document.getElementById('videoPlayer');

  // Log initial video state
  logVideoState(video);

  // Remove any existing typing indicators
  const existingIndicator = document.querySelector('.typing-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  // Show initial typing indicator
  setTimeout(() => {
    showTypingIndicator();
  }, 500);

  // Start video playback
  if (video.readyState < PLAYER_CONFIG.READY_STATE.HAVE_CURRENT_DATA) {
    showDebug('Video not ready, waiting for load...');
    video.addEventListener('loadeddata', () => {
      showDebug('Video loaded, starting playback...');
      startVideoPlayback(video);
    });

    setTimeout(() => {
      if (video.readyState < PLAYER_CONFIG.READY_STATE.HAVE_CURRENT_DATA) {
        showDebug('Video load timeout, attempting playback anyway...');
        startVideoPlayback(video);
      }
    }, 2000);
  } else {
    showDebug('Video ready, starting playback immediately...');
    startVideoPlayback(video);
  }
}

/**
 * Log the current state of the video player
 */
function logVideoState(video) {
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
}

/**
 * Start video playback with proper error handling
 */
function startVideoPlayback(video) {
  video.currentTime = 0;
  video.muted = false;

  const playPromise = video.play();
  if (playPromise !== undefined) {
    playPromise.then(() => {
      showDebug('Video playback started successfully');
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

// ============================================================================
// Initialization
// ============================================================================

window.onload = function() {
  console.log('Window load event triggered');
  try {
    // Get required DOM elements
    const video = document.getElementById('videoPlayer');
    const captionsContainer = document.getElementById('captions');

    if (!video || !captionsContainer) {
      console.error('Required elements not found:', {
        video: !!video,
        captionsContainer: !!captionsContainer
      });
      return;
    }

    let interactiveTrack = null;

    // Initialize tracks
    const initializeTracks = () => {
      showDebug('Initializing video tracks...');

      // Log available text tracks
      showDebug(`Number of text tracks: ${video.textTracks.length}`);
      for (let i = 0; i < video.textTracks.length; i++) {
        const track = video.textTracks[i];
        showDebug(`Track ${i}: ${track.label} (${track.kind})`);
      }

      // Set up caption tracks
      setupCaptionTrack('plainCaptions', showTextCaption);
      interactiveTrack = setupCaptionTrack('interactiveCaptions', showInteractiveCaption);

      if (interactiveTrack) {
        showDebug(`Interactive track mode after setup: ${interactiveTrack.mode}`);
        showDebug(`Interactive track ready state: ${interactiveTrack.readyState}`);
        if (interactiveTrack.cues) {
          showDebug(`Interactive track has ${interactiveTrack.cues.length} cues`);
        } else {
          showDebug('Interactive track has no cues array');
        }
      }
    };

    // Set up video event listeners
    video.addEventListener('loadeddata', () => {
      showDebug('Video data loaded, checking tracks...');
      initializeTracks();
    });

    // Initialize tracks if video is already loaded
    if (video.readyState >= PLAYER_CONFIG.READY_STATE.HAVE_CURRENT_DATA) {
      showDebug('Video already has data, initializing tracks now...');
      initializeTracks();
    }

    // Set up scroll handling
    captionsContainer.addEventListener('scroll', () => {
      isUserScrolling = true;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isUserScrolling = false;
      }, PLAYER_CONFIG.SCROLL_TIMEOUT_MS);
    });

    // Set initial video volume
    video.volume = 1.0;

    // Add start caption
    captionsContainer.appendChild(createStartCaption());
    showDebug("Setup complete!");
  } catch (error) {
    console.error('Error during initialization:', error);
    window.alert('Error during initialization: ' + error.message);
  }
};

function handleCaptionCue(cue) {
  if (!cue || !cue.text) return;

  // Create a unique ID for this cue based on its timing and text
  const cueId = `cue-${cue.startTime}-${cue.endTime}`;

  // Check if we've already handled this cue
  if (document.getElementById(cueId)) {
    return;
  }

  const messageElement = document.createElement('div');
  messageElement.id = cueId;
  messageElement.className = 'message';
  messageElement.textContent = cue.text;

  appendMessage(messageElement);
}

function handleInteractiveCue(cue) {
  if (!cue || !cue.text) return;

  // Create a unique ID for this interactive cue
  const cueId = `interactive-${cue.startTime}-${cue.endTime}`;

  // Check if we've already handled this cue
  if (document.getElementById(cueId)) {
    return;
  }

  try {
    const data = JSON.parse(cue.text);
    const messageElement = createInteractiveMessage(data);
    messageElement.id = cueId;
    appendMessage(messageElement);
  } catch (e) {
    showDebug(`Error parsing interactive cue: ${e.message}`);
  }
}
