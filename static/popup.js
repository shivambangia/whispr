// popup/popup.js
window.onload = () => {
    console.log("Popup script loaded.");

    // Get reference to chat log area
    const chatLog = document.getElementById('chat-log');
    // Optional: Add a button to reset chat
    const resetButton = document.getElementById('reset-button'); // Assuming you add <button id="reset-button">Reset</button> in popup.html

    // Helper function to add a message to the chat log and scroll down
    const addMessageToLog = (text, type) => {
        const messageElement = document.createElement('p');
        messageElement.textContent = text;
        // Apply class based on type ('user', 'assistant', 'status')
        messageElement.classList.add(`${type}-message`); 
        chatLog.appendChild(messageElement);
        // Scroll to the bottom
        chatLog.scrollTop = chatLog.scrollHeight; 
    };

    // Basic check for browser compatibility
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        addMessageToLog("Speech Recognition not supported.", 'status');
        console.error("SpeechRecognition not supported");
        return; 
    }

    // --- Recognition Setup ---
    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Keep false for turn-based interaction
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    let recognitionActive = false;
    let userManuallyStopped = false; // Flag to prevent auto-restart if user stops it

    // --- Event Handlers ---
    recognition.onstart = () => {
        console.log("Recognition started.");
        recognitionActive = true;
        userManuallyStopped = false; // Reset flag on start
        addMessageToLog("Listening...", 'status');
        // Optional: Update button text/state if you add start/stop buttons
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("Transcript received:", transcript);
        recognitionActive = false; // Recognition ended with a result
        
        // Add User message to log
        addMessageToLog(transcript, 'user'); 
        addMessageToLog("Processing request...", 'status');

        // Send the transcript to the background script
        chrome.runtime.sendMessage(
            { type: "PROCESS_TRANSCRIPT", payload: transcript },
            (response) => {
                let statusMessage = "Error: Unknown issue.";
                if (chrome.runtime.lastError) {
                    console.error("Error sending message:", chrome.runtime.lastError.message);
                    statusMessage = "Error: Could not contact background script.";
                    addMessageToLog(statusMessage, 'status'); // Add error to log
                } else if (response) {
                    console.log("Received response from background:", response);
                    // Use the response message from background script as assistant/status message
                    statusMessage = response.message || (response.success ? "Processing complete." : "An unknown error occurred.");
                    // Display as assistant message if successful and meaningful, otherwise status
                    const messageType = response.success && response.message && response.message !== "Processing complete." ? 'assistant' : 'status';
                     addMessageToLog(statusMessage, messageType);
                } else {
                    console.log("Background script did not send a valid response.");
                    statusMessage = "Request sent, but no confirmation received.";
                    addMessageToLog(statusMessage, 'status');
                }

                // --- Restart recognition after processing the response ---
                if (!userManuallyStopped) {
                    console.log("Restarting recognition after response.");
                    try {
                        recognition.start();
                    } catch (err) {
                        // Avoid error if recognition is already starting (rare edge case)
                        if (err.name !== 'InvalidStateError') {
                            console.error("Error restarting recognition:", err);
                            addMessageToLog("Could not restart microphone.", 'status');
                        }
                    }
                }
            }
        );
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error, event.message);
        recognitionActive = false;
        let errorMessage = 'Error: ' + event.error;
        if (event.error !== 'no-speech') {
            if (event.error === 'audio-capture') {
                errorMessage = "Audio capture error. Check microphone.";
            } else if (event.error === 'not-allowed') {
                errorMessage = "Microphone access denied.";
            }
            addMessageToLog(errorMessage, 'status');
        } else {
             console.log("No speech detected, will restart silently.");
        }
    };

    recognition.onend = () => {
        console.log("Recognition ended.");
        const wasActive = recognitionActive; // Store state before resetting
        recognitionActive = false; // Reset flag

        if (wasActive && !userManuallyStopped) {
             console.log("Restarting recognition due to unexpected end (e.g., timeout/no-speech).");
             try {
                 recognition.start(); // Attempt to restart
             } catch (err) {
                 if (err.name !== 'InvalidStateError') {
                     console.error("Error restarting recognition on end:", err);
                     addMessageToLog("Could not restart microphone.", 'status');
                 }
             }
        } else if (userManuallyStopped) {
            addMessageToLog("Recognition stopped by user.", 'status');
        }
        // Optional: Update button text/state if you add start/stop buttons
    };

    // --- Start Recognition Immediately ---
    try {
        console.log("Attempting to start recognition immediately...");
        addMessageToLog("Initializing microphone...", 'status');
        recognition.start();
    } catch (err) {
        console.error("Error starting recognition immediately:", err);
         addMessageToLog("Could not start microphone: " + err.message, 'status');
    }

    // --- Optional: Add Reset Button Listener ---
    if (resetButton) {
        resetButton.onclick = () => {
            addMessageToLog("Resetting chat...", 'status');
            chatLog.innerHTML = ''; // Clear the popup log
            chrome.runtime.sendMessage({ type: "RESET_CHAT" }, (response) => {
                if (response?.success) {
                    addMessageToLog("Chat history cleared. Ready.", 'status');
                } else {
                    addMessageToLog("Failed to clear chat history.", 'status');
                }
                // Optionally restart recognition after reset
                if (!recognitionActive && !userManuallyStopped) {
                    try { recognition.start(); } catch(e) { console.error(e); }
                }
            });
        };
    }

    // Optional: Add a way to manually stop recognition
    // e.g., add a stop button:
    // const stopButton = document.getElementById('stop-button');
    // if (stopButton) {
    //     stopButton.onclick = () => {
    //         if (recognitionActive) {
    //             console.log("Manually stopping recognition.");
    //             userManuallyStopped = true; // Set flag to prevent auto-restart
    //             recognition.stop();
    //         }
    //     };
    // }

    // Optional: Listener for status updates 
    // (Could potentially add these as status messages too)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === "STATUS_UPDATE") {
            console.log("Received status update:", request.payload);
            addMessageToLog(`Update: ${request.payload}`, 'status');
        }
        // return true; 
    });

}; // End window.onload