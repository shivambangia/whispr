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

export const openTabTool = tool(
  async ({ url }) => {
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