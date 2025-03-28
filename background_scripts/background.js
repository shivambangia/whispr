// Background script for handling extension events
chrome.runtime.onInstalled.addListener(() => {
  console.log('Speech to Text Extension installed');
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SPEECH_RECOGNITION_STATUS') {
    console.log('Speech recognition status:', request.status);
  }
  return true;
}); 