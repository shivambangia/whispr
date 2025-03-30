// langchain/tools.js
import { Tool } from "@langchain/core/tools"; // Assuming Langchain v0.1+

// --- Tool Definition: Bookmark Current Page ---
class BookmarkCurrentPageTool extends Tool {
    name = "bookmark-current-page"; // Unique name for the tool
    description = "Bookmarks the currently active tab in the browser. Use this when the user asks to save, bookmark, or remember the current page."; // Crucial for the LLM

    async _call(input) { // input is often ignored for this specific tool but might be used for naming etc. later
        console.log("Bookmark tool called with input:", input); // Log tool usage
        try {
            // 1. Get the current active tab
            const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!currentTab) {
                console.error("Bookmark Tool: No active tab found.");
                return "Error: Could not find the active tab to bookmark.";
            }
            if (!currentTab.url) {
                 console.error("Bookmark Tool: Active tab has no URL (e.g., new tab page).");
                 return "Error: Cannot bookmark a page without a URL.";
            }
             if (currentTab.url.startsWith('chrome://')) {
                 console.error("Bookmark Tool: Cannot bookmark internal chrome pages.");
                 return "Error: Cannot bookmark internal browser pages.";
            }


            // 2. Create the bookmark
            const bookmark = await chrome.bookmarks.create({
                title: currentTab.title || `Bookmark: ${currentTab.url.substring(0, 50)}...`, // Use tab title or part of URL
                url: currentTab.url,
                // parentId: '1' // Optional: Specify a folder (e.g., '1' for Bookmarks Bar, '2' for Other Bookmarks)
            });

            console.log("Bookmark created:", bookmark);
            return `Successfully bookmarked page: ${currentTab.title || currentTab.url}`; // Confirmation message for the LLM/user

        } catch (error) {
            console.error("Error in BookmarkCurrentPageTool:", error);
            return `Error bookmarking page: ${error.message}`; // Error message for the LLM/user
        }
    }
}

// --- Export Tools ---
// Create instances of the tools
export const bookmarkTool = new BookmarkCurrentPageTool();

// Export a list of all tools the agent can use
export const availableTools = [bookmarkTool]; // Add more tools here later