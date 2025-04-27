// src/content_script.js
console.log("Whispr Content Script Loaded.");

let recognition = null;
let recognitionActive = false;
let userManuallyStopped = false;
let chatLogElement = null; // Reference to the chat log div
let chatPanelElement = null; // Reference to the chat panel
let toggleButtonElement = null; // Reference to the toggle button
let textInputElement = null; // Reference to the text input
let sendButtonElement = null; // Reference to the send button

// --- UI Injection ---

function injectOverlayUI() {
    // Prevent duplicate injection
    if (document.getElementById('whispr-overlay-container')) {
        console.log("Whispr overlay already exists.");
        return;
    }

    const container = document.createElement('div');
    container.id = 'whispr-overlay-container';

    // Create Chat Panel (initially hidden)
    chatPanelElement = document.createElement('div');
    chatPanelElement.id = 'whispr-chat-panel';
    // Add chat log area inside the panel
    chatLogElement = document.createElement('div');
    chatLogElement.id = 'whispr-chat-log';
    chatPanelElement.appendChild(chatLogElement);

    // Create Input Area
    const inputArea = document.createElement('div');
    inputArea.id = 'whispr-input-area'; // Add an ID for styling

    textInputElement = document.createElement('input');
    textInputElement.type = 'text';
    textInputElement.id = 'whispr-text-input';
    textInputElement.placeholder = 'Type your message...';

    sendButtonElement = document.createElement('button');
    sendButtonElement.id = 'whispr-send-button';
    sendButtonElement.textContent = 'Send';

    inputArea.appendChild(textInputElement);
    inputArea.appendChild(sendButtonElement);
    chatPanelElement.appendChild(inputArea); // Add input area to the panel

    // Create Toggle Button
    toggleButtonElement = document.createElement('button');
    toggleButtonElement.id = 'whispr-toggle-button';
    toggleButtonElement.innerHTML = '🎙️'; // Microphone icon (example)
    toggleButtonElement.title = 'Start Whispr';

    // Add elements to container (panel first, then button)
    container.appendChild(chatPanelElement);
    container.appendChild(toggleButtonElement);

    // Add container to the body
    document.body.appendChild(container);

    // --- Event Listeners ---
    toggleButtonElement.onclick = toggleChatPanelAndRecognition;
    sendButtonElement.onclick = handleTextInput; // Add listener for send button
    textInputElement.addEventListener('keypress', (event) => { // Add listener for Enter key
        if (event.key === 'Enter') {
            handleTextInput();
        }
    });

    console.log("Whispr overlay UI injected.");

    // Initialize Speech Recognition after UI is ready
    initializeSpeechRecognition();
}

function toggleChatPanelAndRecognition() {
    if (!chatPanelElement) return;

    const isVisible = chatPanelElement.classList.toggle('visible');
    console.log("Toggling chat panel visibility:", isVisible);

    if (isVisible) {
        toggleButtonElement.innerHTML = '✕'; // Change icon to close
        toggleButtonElement.title = 'Close Whispr';
        // Start recognition only if panel is opened and recognition is available
        if (recognition && !recognitionActive) {
            console.log("Starting recognition as panel opened.");
            startRecognition();
        }
    } else {
        toggleButtonElement.innerHTML = '🎙️'; // Change icon back to mic
        toggleButtonElement.title = 'Start Whispr';
        // Stop recognition if panel is closed
        if (recognition && recognitionActive) {
            console.log("Stopping recognition as panel closed.");
            stopRecognition(true); // Manually stopped by closing panel
        }
    }
}


// --- Speech Recognition Logic (Adapted from popup.js) ---

function initializeSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        addMessageToLog("Speech Recognition not supported by this browser.", 'status');
        console.error("SpeechRecognition not supported");
        if(toggleButtonElement) toggleButtonElement.disabled = true; // Disable button if not supported
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false; // Turn-based
    recognition.interimResults = false;
    recognition.lang = 'en-US'; // Or make configurable

    recognition.onstart = () => {
        console.log("Content Script: Recognition started.");
        recognitionActive = true;
        userManuallyStopped = false;
        addMessageToLog("Listening...", 'status');
        if(toggleButtonElement) toggleButtonElement.style.backgroundColor = '#e63946'; // Indicate recording (example color)
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("Content Script: Transcript received:", transcript);
        // recognitionActive = false; // Don't set here, onend handles state

        addMessageToLog(transcript, 'user');
        addMessageToLog("Processing...", 'status');

        // Send to background script
        chrome.runtime.sendMessage(
            { type: "PROCESS_TRANSCRIPT", payload: transcript },
            (response) => {
                handleBackgroundResponse(response);
                // Recognition will restart via onend handler if not manually stopped
            }
        );
    };

    recognition.onerror = (event) => {
        console.error("Content Script: Speech recognition error:", event.error, event.message);
        let errorMessage = 'Error: ' + event.error;
        if (event.error === 'no-speech') {
            errorMessage = "No speech detected."; // Less alarming message
        } else if (event.error === 'audio-capture') {
            errorMessage = "Microphone error.";
        } else if (event.error === 'not-allowed') {
            errorMessage = "Microphone access denied. Please allow access via browser settings.";
            // Consider permanently disabling if not allowed?
        }
        addMessageToLog(errorMessage, 'status');
        // recognitionActive = false; // Let onend handle state
    };

    recognition.onend = () => {
        console.log("Content Script: Recognition ended.");
        const wasActive = recognitionActive;
        recognitionActive = false;
        if(toggleButtonElement) toggleButtonElement.style.backgroundColor = '#6e8efb'; // Reset button color

        // Restart automatically only if the panel is still visible and it wasn't a manual stop
        const panelVisible = chatPanelElement?.classList.contains('visible');
        if (panelVisible && !userManuallyStopped) {
            console.log("Content Script: Restarting recognition.");
            // Small delay before restarting, sometimes helps avoid errors
            setTimeout(() => {
                startRecognition();
            }, 100); // 100ms delay
        } else {
             console.log("Content Script: Recognition stopped (Panel closed or manual stop).");
             if (!panelVisible) addMessageToLog("Closed.", 'status');
        }
    };
}

function startRecognition() {
    if (recognition && !recognitionActive) {
        try {
            userManuallyStopped = false; // Reset flag
            recognition.start();
        } catch (err) {
            // Handle potential errors like "InvalidStateError" if already started
            console.error("Content Script: Error starting recognition:", err);
            if (err.name === 'NotAllowedError') {
                 addMessageToLog("Microphone access denied.", 'status');
            } else {
                 addMessageToLog("Could not start microphone.", 'status');
            }
            recognitionActive = false; // Ensure state is correct
             if(toggleButtonElement) toggleButtonElement.style.backgroundColor = '#6e8efb'; // Reset button color
        }
    }
}

function stopRecognition(manual = false) {
    if (recognition && recognitionActive) {
        console.log(`Content Script: Stopping recognition (manual: ${manual})`);
        userManuallyStopped = manual; // Set flag if stopped manually
        recognition.stop();
    }
}

// --- Communication & UI Update ---

function handleTextInput() {
    if (!textInputElement || !textInputElement.value.trim()) {
        return; // Do nothing if input is empty
    }

    const text = textInputElement.value.trim();
    console.log("Content Script: Sending text input:", text);

    addMessageToLog(text, 'user');
    addMessageToLog("Processing...", 'status');

    // Send to background script
    chrome.runtime.sendMessage(
        { type: "PROCESS_TEXT_INPUT", payload: text }, // Use a new message type
        (response) => {
            handleBackgroundResponse(response);
        }
    );

    textInputElement.value = ''; // Clear the input field
}

function handleBackgroundResponse(response) {
    let statusMessage = "Error processing request.";
    let messageType = 'status';

    if (chrome.runtime.lastError) {
        console.error("Content Script: Error receiving message:", chrome.runtime.lastError.message);
        statusMessage = "Error: Could not contact background script.";
    } else if (response) {
        console.log("Content Script: Received response from background:", response);
        statusMessage = response.message || (response.success ? "Done." : "An unknown error occurred.");
        if (response.success && response.message && response.message !== "Processing complete.") {
            messageType = 'assistant';
        }
    } else {
        console.log("Content Script: Background script did not send a valid response.");
        statusMessage = "No response received from background.";
    }
    addMessageToLog(statusMessage, messageType);
}

// Helper to add messages to the overlay's chat log
function addMessageToLog(text, type) {
    if (!chatLogElement) return; // Don't add if UI not ready

    const messageElement = document.createElement('p');
    messageElement.textContent = text;
    // Apply class based on type ('user', 'assistant', 'status')
    messageElement.className = ''; // Clear existing classes first
    messageElement.classList.add(`${type}-message`);
    chatLogElement.appendChild(messageElement);
    // Scroll to the bottom
    chatLogElement.scrollTop = chatLogElement.scrollHeight;
}


// --- Initial Setup ---
// Inject the UI once the page is ready
if (document.readyState === "complete" || document.readyState === "interactive") {
    injectOverlayUI();
} else {
    document.addEventListener("DOMContentLoaded", injectOverlayUI);
}


// --- Listener for page content requests (keep existing functionality) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    console.log("Content script received getPageContent request.");
    try {
      // Basic extraction - might need refinement for complex pages
      const mainContent = document.body.innerText || document.documentElement.textContent; // Fallback
      console.log("Extracted text length:", mainContent?.length);
      if (mainContent && mainContent.trim().length > 0) {
         // Limit content length to avoid overwhelming the LLM context
         const MAX_LENGTH = 10000; // Adjust as needed (approx chars)
         const truncatedContent = mainContent.length > MAX_LENGTH
            ? mainContent.substring(0, MAX_LENGTH) + "... (truncated)"
            : mainContent;
        console.log(`Sending back content (truncated: ${mainContent.length > MAX_LENGTH})`);
        sendResponse({ success: true, content: truncatedContent });
      } else {
        console.log("No main text content found on the page.");
        sendResponse({ success: false, error: "No text content found on page." });
      }
    } catch (error) {
      console.error("Error getting page content:", error);
      sendResponse({ success: false, error: `Failed to extract content: ${error.message}` });
    }
    return true; // Indicates asynchronous response
  }
  // Handle other potential messages if needed
  // Example: Message from background to toggle visibility via toolbar icon click
  else if (request.action === "toggleOverlay") {
      console.log("Content script received toggleOverlay request.");
      toggleChatPanelAndRecognition();
      sendResponse({ success: true, visible: chatPanelElement?.classList.contains('visible') });
      return true;
  }

  return false; // Indicate synchronous response or no handler
}); 