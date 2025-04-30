import { runWithHistory } from "./langchain/agent_graph.js"; // Renamed function
import { HumanMessage, AIMessage } from "@langchain/core/messages"; // Import message types
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { firebaseConfig } from './firebase_config'; // Import the config

console.log("Background service worker started.");

// In-memory chat history (cleared when the service worker restarts)
// For more persistence, consider chrome.storage.session or chrome.storage.local
let chatHistory = [];

// --- Firebase Initialization ---
let auth;
try {
    const firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    console.log("Firebase initialized successfully.");
} catch (error) {
    console.error("Firebase initialization failed:", error);
    // Handle initialization error (e.g., show an error message or disable features)
}

// --- Authentication State Listener ---
let currentUser = null; // Keep track of the current user state

if (auth) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            currentUser = user;
            console.log("Auth state changed: User is signed in.", user.uid, user.email);
            // You could potentially send a message to the content script here
            // if the overlay needs to react immediately to login/logout.
            // Example: chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => { ... });
        } else {
            // User is signed out
            currentUser = null;
            console.log("Auth state changed: User is signed out.");
            // Potentially send a message to hide/disable the overlay if it's open
        }
    });
} else {
    console.warn("Firebase Auth is not available. Authentication checks will be skipped.");
}

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

// --- Function to check auth and toggle overlay or open login ---
async function handleActionClick(tab) {
    if (!auth) {
        console.error("Firebase Auth not initialized. Cannot proceed.");
        // Optionally notify the user via an alert or console message in the extension popup/options
        return;
    }

    if (!tab || !tab.id) {
        console.error("Action clicked, but no active tab ID found.");
        return;
    }

    // Check current auth state directly (onAuthStateChanged handles updates)
    if (currentUser) {
        // User is logged in, proceed to toggle the overlay
        console.log(`User ${currentUser.email} is authenticated. Toggling overlay for tab ${tab.id}.`);
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: "toggleOverlay" });
            console.log("Toggle response from content script:", response);
        } catch (error) {
            console.error(`Could not send toggle message to tab ${tab.id}:`, error);
            // Handle error (e.g., content script not injected)
        }
    } else {
        // User is not logged in, open the login page
        const loginUrl = "https://whispr-web.vercel.app/login"; // Your login page URL
        console.log(`User not authenticated. Opening login page: ${loginUrl}`);
        try {
            await chrome.tabs.create({ url: loginUrl });
            console.log("Login page opened successfully.");
        } catch (error) {
            console.error("Failed to open login page:", error);
        }
        // Optional: You might want to show a notification telling the user
        // to click the extension icon again after logging in.
        // chrome.notifications.create(...)
    }
}

// --- Listener for toolbar icon click ---
chrome.action.onClicked.addListener(handleActionClick);

// --- Optional: Add a way to log out (e.g., via context menu or options page) ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "logoutWhispr",
    title: "Logout from Whispr",
    contexts: ["action"] // Show only when right-clicking the extension icon
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "logoutWhispr" && auth) {
    signOut(auth).then(() => {
      console.log("User signed out successfully.");
      currentUser = null; // Update local state immediately
      // Optional: Notify the user
    }).catch((error) => {
      console.error("Sign out error:", error);
      // Optional: Notify the user of the error
    });
  }
});

// --- Keep existing message listeners if needed ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Example: Handle messages from content scripts or other parts
    if (message.action === "getAuthState") {
        sendResponse({ authenticated: !!currentUser, email: currentUser?.email });
        return true; // Indicate async response
    }
    // Add other message handlers as needed
});

// --- LangChain Agent Initialization (Keep your existing logic) ---
// import { initializeAgentExecutorWithOptions } from "langchain/agents";
// import { getLLM } from './langchain/llm_setup.js';
// import { createTools } from './langchain/tools.js';
// ... rest of your LangChain setup ...

console.log("Background script loaded."); // Add this line

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "PROCESS_TRANSCRIPT") {
        const transcript = message.payload;
        console.log("Background: Received transcript:", transcript);

        // Add the new user message to the history
        chatHistory.push(new HumanMessage(transcript));

        // Pass a copy of the current history to invokeGraph
        invokeGraph([...chatHistory], sendResponse); // Pass a copy

        return true; // Indicates asynchronous response
    } else if (message.type === "PROCESS_TEXT_INPUT") { // Handle text input
        const textInput = message.payload;
        console.log("Background: Received text input:", textInput);

        // Add the new user message to the history
        chatHistory.push(new HumanMessage(textInput));

        // Pass a copy of the current history to invokeGraph
        invokeGraph([...chatHistory], sendResponse); // Pass a copy

        return true; // Indicates asynchronous response
    } else if (message.type === "RESET_CHAT") { // Add a way to reset history
         console.log("Background: Resetting chat history.");
         chatHistory = [];
         sendResponse({ success: true, message: "Chat history cleared." });
         return false; // Synchronous response is fine here
    }
    return false; // Indicate synchronous response for unknown messages
});

