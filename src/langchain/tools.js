// tools.js
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const bookmarkTool = tool(
  async () => {
    return new Promise((resolve, reject) => {
      // Query the currently active tab in the current window.
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0) {
          const currentTab = tabs[0];
          // Create a new bookmark using Chrome's bookmarks API.
          chrome.bookmarks.create(
            {
              title: currentTab.title,
              url: currentTab.url,
            },
            (bookmark) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(`Bookmark created: ${bookmark.title} (ID: ${bookmark.id})`);
              }
            }
          );
        } else {
          reject("No active tab found.");
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