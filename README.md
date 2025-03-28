# Speech to Text Chrome Extension

A Chrome extension that converts your speech to text using the Web Speech API.

## Features

- Real-time speech recognition
- Continuous recording capability
- Clean, modern interface
- Visual feedback for recording status
- Support for multiple languages (based on your browser settings)

## How to Use

1. Click the extension icon in your Chrome toolbar
2. Click the "Start Recording" button
3. Speak into your microphone
4. Your speech will be converted to text in real-time
5. Click "Stop Recording" when you're done

## How to Load the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select the directory containing these files
4. The extension icon should appear in your Chrome toolbar

## Requirements

- Chrome browser with microphone access
- Internet connection (for speech recognition API)
- Microphone connected to your device

## Project Structure

```
├── manifest.json                    # Extension configuration
├── popup.html                       # Main popup interface
├── css/
│   └── styles.css                   # Styles for the popup
├── content_scripts/                 # Scripts that run in web pages
│   └── speech-recognition.js        # Speech recognition logic
├── background_scripts/              # Background service workers
│   └── background.js                # Background script for extension events
└── images/                          # Extension icons
    ├── icon16.png                   # 16x16 icon
    ├── icon48.png                   # 48x48 icon
    └── icon128.png                  # 128x128 icon
```

## Note

You'll need to add your own icon files (16x16, 48x48, and 128x128 pixels) in the `images` directory for the extension to display properly. 