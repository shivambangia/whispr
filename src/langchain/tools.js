// tools.js
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const bookmarkTool = tool(
  async () => {
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