// tools.js

// Define the actual function separately.
async function bookmarkCurrentTabFunction(params = {}) {
  return new Promise((resolve, reject) => {
    // Query the currently active tab in the current window.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        const currentTab = tabs[0];
        // Create a new bookmark with the tab's title and URL.
        chrome.bookmarks.create(
          {
            title: currentTab.title,
            url: currentTab.url,
          },
          (bookmark) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(
                `Bookmark created: ${bookmark.title} (ID: ${bookmark.id})`
              );
            }
          }
        );
      } else {
        reject("No active tab found.");
      }
    });
  });
}

export const availableTools = {
  bookmarkCurrentTab: {
    name: "bookmarkCurrentTab",
    type: "function",
    description: "Bookmarks the current active tab in the browser.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    // Explicitly assign the function using the key "function"
    function: bookmarkCurrentTabFunction,
  },
  // Additional tools can be added here...
};