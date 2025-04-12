// tools.js
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const bookmarkTool = tool(
  async () => {
    console.log("--- Executing bookmarkTool ---");
    return new Promise((resolve, reject) => {
      // Get the last focused window
      chrome.windows.getLastFocused({ populate: true }, (window) => {
        if (chrome.runtime.lastError || !window) {
          return reject("Could not get the last focused window: " + (chrome.runtime.lastError?.message || "No window found"));
        }

        // Find the active tab within that window
        const activeTab = window.tabs?.find(tab => tab.active);

        if (activeTab) {
          // Create a new bookmark using Chrome's bookmarks API.
          chrome.bookmarks.create(
            {
              title: activeTab.title,
              url: activeTab.url,
            },
            (bookmark) => {
              if (chrome.runtime.lastError) {
                reject("Bookmark creation failed: " + chrome.runtime.lastError.message);
              } else {
                resolve(`Bookmark created: ${bookmark.title} (ID: ${bookmark.id})`);
              }
            }
          );
        } else {
          reject("No active tab found in the last focused window.");
        }
      });
    });
  },
  {
    name: "bookmarkTool",
    description: "Bookmarks the active page using the Chrome API.",
    // No parameters are required.
    schema: z.object({}),
  }
);

export const openTabTool = tool(
  async ({ url }) => {
    console.log(`--- Executing openTabTool with URL: ${url} ---`);
    return new Promise((resolve, reject) => {
      // Ensure URL starts with http:// or https://
      let fullUrl = url;
      if (!/^https?:\/\//i.test(url)) {
        fullUrl = 'https://' + url;
        console.log(`Prepended https:// to URL: ${fullUrl}`);
      }

      chrome.tabs.create({ url: fullUrl }, (newTab) => {
        if (chrome.runtime.lastError) {
          reject(`Failed to open tab: ${chrome.runtime.lastError.message}`);
        } else if (!newTab) {
            reject("Failed to create new tab. The tab object was unexpectedly null or undefined.");
        }
         else {
          resolve(`Successfully opened ${fullUrl} in new tab (ID: ${newTab.id})`);
        }
      });
    });
  },
  {
    name: "openTabTool",
    description: "Opens a new browser tab with the specified URL. Always provide the full domain name (e.g., google.com, example.org).",
    schema: z.object({
      url: z.string().describe("The URL to open (e.g., google.com, www.example.com). Protocol (http/https) will be added if missing."),
    }),
  }
);

export const createBookmarkFolderTool = tool(
  async ({ folderName }) => {
    console.log(`--- Executing createBookmarkFolderTool with Name: ${folderName} ---`);
    return new Promise((resolve, reject) => {
      if (!folderName || folderName.trim() === "") {  
        folderName = "Whispr Bookmarks";
      }

      // Create the folder on the bookmarks bar (parentId '1')
      chrome.bookmarks.create({ parentId: '1', title: folderName.trim() }, (newFolder) => {
        if (chrome.runtime.lastError) {
          // Check if the error is because the folder already exists (less reliable way)
          // A better approach might involve searching first, but this is simpler for a direct create request.
          if (chrome.runtime.lastError.message?.includes("already exists")) {
             reject(`Bookmark folder '${folderName.trim()}' might already exist or another error occurred: ${chrome.runtime.lastError.message}`);
          } else {
             reject(`Failed to create bookmark folder '${folderName.trim()}': ${chrome.runtime.lastError.message}`);
          }
        } else if (!newFolder) {
           reject(`Failed to create bookmark folder '${folderName.trim()}'. Unknown error.`);
        } else {
          resolve(`Successfully created bookmark folder '${newFolder.title}' (ID: ${newFolder.id})`);
        }
      });
    });
  },
  {
    name: "createBookmarkFolderTool",
    description: "Creates a new, empty bookmark folder on the main bookmarks bar with the specified name.",
    schema: z.object({
      folderName: z.string().describe("The name for the new bookmark folder."),
    }),
  }
);

export const getPageContentTool = tool(
  async () => {
    console.log("--- Executing getPageContentTool ---");
    return new Promise(async (resolve, reject) => {
      try {
        // 1. Get the active tab in the last focused window
        const window = await chrome.windows.getLastFocused({ populate: true });
        if (!window) throw new Error("No focused window found.");
        
        const activeTab = window.tabs?.find(tab => tab.active);
        if (!activeTab || !activeTab.id) {
          throw new Error("No active tab found or tab has no ID.");
        }

        // Check if the URL is accessible (avoid chrome://, file:// etc.)
        if (!activeTab.url || !activeTab.url.startsWith('http')) {
             throw new Error(`Cannot get content from this URL type: ${activeTab.url}`);
        }

        console.log(`Sending message to content script in tab ${activeTab.id} `);
        
        // 2. Send message to content script in that tab
        const response = await chrome.tabs.sendMessage(activeTab.id, { action: "getPageContent" });

        console.log("Received response from content script:", response);

        // 3. Handle response
        if (response?.success && response.content) {
          resolve(`Page content retrieved (length: ${response.content.length}). The agent should now summarize this: ${response.content}`);
        } else {
          reject(`Failed to get page content: ${response?.error || 'Unknown error from content script.'}`);
        }
      } catch (error) {
         console.error("Error in getPageContentTool:", error);
        // Handle errors like no content script injected, tab closed, etc.
         if (error.message?.includes("Could not establish connection")) {
             reject("Could not connect to the page. Ensure it's loaded and not a restricted page (e.g., chrome:// URLs, file URLs, Chrome Web Store).");
         } else {
            reject(`Error getting page content: ${error.message}`);
         }
      }
    });
  },
  {
    name: "getPageContentTool",
    description: "Retrieves the text content of the current active browser tab. Use this before summarizing the current page.",
    schema: z.object({}), // No input needed from LLM for this version
  }
);