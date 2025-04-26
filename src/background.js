import { runWithHistory } from "./langchain/agent_graph.js"; // Renamed function
import { HumanMessage, AIMessage } from "@langchain/core/messages"; // Import message types

console.log("Background service worker started.");

// In-memory chat history (cleared when the service worker restarts)
// For more persistence, consider chrome.storage.session or chrome.storage.local
let chatHistory = [];

const invokeGraph = async (history, sendResponse) => {
    console.log("Background: Invoking LangGraph agent with history:", history);
    try {
        // Pass the entire history to the agent graph runner
        const finalMessageContent = await runWithHistory(history);
        console.log("Background: LangGraph finished successfully. Final message:", finalMessageContent);

        // Add the successful AI response to the history
        if (finalMessageContent) {
            chatHistory.push(new AIMessage(finalMessageContent));
        }

        sendResponse({ success: true, message: finalMessageContent });
    } catch (error) {
        console.error("Background: Error invoking LangGraph:", error);
        // Important: Remove the last user message from history if the agent failed
        if (history.length > 0 && history[history.length - 1]._getType() === "human") {
             console.log("Removing last user message from history due to error.");
             chatHistory.pop();
        }
        sendResponse({ success: false, message: `Error: ${error.message || 'Unknown error'}` });
    }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "PROCESS_TRANSCRIPT") {
        const transcript = message.payload;
        console.log("Background: Received transcript:", transcript);

        // Add the new user message to the history
        chatHistory.push(new HumanMessage(transcript));

        // Pass a copy of the current history to invokeGraph
        invokeGraph([...chatHistory], sendResponse); // Pass a copy to avoid mutation issues if async takes time

        return true; // Indicates asynchronous response
    } else if (message.type === "RESET_CHAT") { // Add a way to reset history
         console.log("Background: Resetting chat history.");
         chatHistory = [];
         sendResponse({ success: true, message: "Chat history cleared." });
         return false; // Synchronous response is fine here
    }
    return false; // Indicate synchronous response for unknown messages
});

// --- Add listener for toolbar icon click ---
chrome.action.onClicked.addListener(async (tab) => {
    if (tab.id) {
        console.log(`Toolbar icon clicked for tab ${tab.id}. Sending toggle request.`);
        try {
            // Send a message to the content script in the active tab
            const response = await chrome.tabs.sendMessage(tab.id, { action: "toggleOverlay" });
            console.log("Toggle response from content script:", response);
        } catch (error) {
            console.error(`Could not send toggle message to tab ${tab.id}:`, error);
            // Handle error (e.g., content script not injected or page not supported)
            // Maybe try injecting the script if possible? (More complex)
        }
    } else {
        console.error("Toolbar icon clicked, but no active tab ID found.");
    }
});

