// popup/popup.js
window.onload = () => {
    console.log("Popup script loaded.");

    const btn = document.getElementById('startBtn');
    const output = document.getElementById('output');
    const statusDiv = document.getElementById('status'); // Get status element

    // Basic check for browser compatibility
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        statusDiv.textContent = "Speech Recognition API not supported in this browser.";
        console.error("SpeechRecognition not supported");
        btn.disabled = true;
        return; // Stop execution if not supported
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Process speech after user stops talking
    recognition.interimResults = false; // Only final results
    recognition.lang = 'en-US'; // Set language

    let isRecording = false;

    btn.onclick = () => {
        if (isRecording) {
            recognition.stop(); // Stop recognition if already recording
            // UI update handled in onend
        } else {
            console.log("Starting recognition...");
            output.value = ""; // Clear previous transcript
            statusDiv.textContent = "Listening...";
            btn.textContent = "Stop Recording";
            btn.disabled = true; // Disable button briefly to prevent immediate stop
            try {
                recognition.start();
                isRecording = true;
                // Re-enable after a short delay allows start() to initiate
                setTimeout(() => { btn.disabled = false; }, 500);
            } catch (err) {
                console.error("Error calling recognition.start():", err);
                statusDiv.textContent = "Error starting recording: " + err.message;
                btn.textContent = "Start Recording";
                btn.disabled = false;
                isRecording = false;
            }
        }
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("Transcript received:", transcript);
        output.value = transcript; // Show transcript in textarea
        statusDiv.textContent = "Processing request..."; // Update status
        btn.disabled = true; // Disable button while processing

        // Send the transcript to the background script for processing
        chrome.runtime.sendMessage(
            { type: "PROCESS_TRANSCRIPT", payload: transcript },
            (response) => {
                if (chrome.runtime.lastError) {
                    // Handle errors like the background script not being ready
                    console.error("Error sending message:", chrome.runtime.lastError.message);
                    statusDiv.textContent = "Error: Could not contact background script.";
                    // Consider re-enabling the button here or providing specific feedback
                } else if (response) {
                    console.log("Received response from background:", response);
                    statusDiv.textContent = response.message || "Processing complete."; // Update status with response
                } else {
                    // Handle cases where the background script didn't send a response
                    // This might be normal depending on your background script's logic
                    console.log("Background script did not send a response.");
                     statusDiv.textContent = "Request sent, no confirmation received.";
                }
                 // Re-enable the button once processing (or sending) is done/failed
                btn.disabled = false;
                btn.textContent = "Start Recording"; // Reset button text
            }
        );
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error, event.message);
        let errorMessage = 'Speech recognition error: ' + event.error;
        if (event.error === 'no-speech') {
            errorMessage = "No speech detected. Please try again.";
        } else if (event.error === 'audio-capture') {
            errorMessage = "Audio capture error. Ensure microphone is enabled.";
        } else if (event.error === 'not-allowed') {
            errorMessage = "Microphone access denied. Please allow access.";
        }
        statusDiv.textContent = errorMessage;
        isRecording = false; // Ensure state is reset
        btn.textContent = "Start Recording";
        btn.disabled = false;
    };

    recognition.onend = () => {
        console.log("Recognition ended.");
        isRecording = false;
        // Don't reset button text/state here if onresult is expected
        // If recognition ends without a result (e.g., timeout, manual stop without speech), reset UI
        if (output.value === "") { // Check if a result was processed
            btn.textContent = "Start Recording";
            btn.disabled = false;
            if(statusDiv.textContent === "Listening...") { // Avoid overwriting error messages
               statusDiv.textContent = "Click the button to start recording";
            }
        }
         // If it ends *after* processing, the onresult callback handles UI updates
    };

    // Optional: Listen for status updates from the background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === "STATUS_UPDATE") {
            console.log("Received status update:", request.payload);
            statusDiv.textContent = request.payload;
            // You could also re-enable/disable the button based on status if needed
            // if(request.payload === "Task Complete" || request.payload.startsWith("Error:")) {
            //      btn.disabled = false;
            //      btn.textContent = "Start Recording";
            // }
        }
        // Keep the message channel open for asynchronous responses if needed
        // return true;
    });

    // Initial status
    statusDiv.textContent = "Click the button to start recording";

}; // End window.onload