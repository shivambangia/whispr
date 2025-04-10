// popup/popup.js
window.onload = () => {
    console.log("Popup script loaded.");

    // Get reference to chat log area
    const chatLog = document.getElementById('chat-log');

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
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    let recognitionActive = false; 

    // --- Event Handlers ---
    recognition.onstart = () => {
        console.log("Recognition started.");
        recognitionActive = true;
        addMessageToLog("Listening...", 'status');
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
            }
        );
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error, event.message);
        recognitionActive = false;
        let errorMessage = 'Error: ' + event.error;
        if (event.error === 'no-speech') {
            errorMessage = "No speech detected. Please speak clearly.";
        } else if (event.error === 'audio-capture') {
            errorMessage = "Audio capture error. Check microphone.";
        } else if (event.error === 'not-allowed') {
            errorMessage = "Microphone access denied.";
        }
        addMessageToLog(errorMessage, 'status');
    };

    recognition.onend = () => {
        console.log("Recognition ended.");
        // If recognition ended without a result (e.g. timeout, no speech)
        if (recognitionActive) {
            recognitionActive = false;
             addMessageToLog("Recognition stopped or timed out.", 'status');
        }
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