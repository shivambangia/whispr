// src/content_script.js
console.log("Whispr Content Script Loaded.");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    console.log("Content script received getPageContent request.");
    try {
      // Basic extraction - might need refinement for complex pages
      // Consider libraries like Readability.js for more robust extraction later
      const mainContent = document.body.innerText; 
      if (mainContent && mainContent.trim().length > 0) {
         // Limit content length to avoid overwhelming the LLM context
         const MAX_LENGTH = 10000; // Adjust as needed (approx chars)
         const truncatedContent = mainContent.length > MAX_LENGTH 
            ? mainContent.substring(0, MAX_LENGTH) + "... (truncated)" 
            : mainContent;
        console.log(`Sending back content (truncated: ${mainContent.length > MAX_LENGTH})`);
        sendResponse({ success: true, content: truncatedContent });
      } else {
        console.log("No main content found on the page.");
        sendResponse({ success: false, error: "No text content found on page." });
      }
    } catch (error) {
      console.error("Error getting page content:", error);
      sendResponse({ success: false, error: `Failed to extract content: ${error.message}` });
    }
    return true; // Indicates asynchronous response
  }
  return false; // Handle other messages if needed
}); 