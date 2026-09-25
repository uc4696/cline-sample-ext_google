# Resizer & Screenshot Extension

Chrome Extension (Manifest V3) for resizing the browser window/viewport and taking screenshots.

## Features

- **Window/Viewport Resizing**: 
  - Resize by window bounds or exact viewport dimensions.
  - Built-in templates for Mobile, Tablet, and PC sizes.
  - Add custom templates with validation against the current display's resolution.
- **Screenshots**:
  - Capture the visible part of the tab.
  - Capture the full page (using Chrome Debugger API).
- **Settings**:
  - Configure the download directory (default: `Captures`).
  - Toggle between local and synced storage for settings.
- **Dark Mode Support**:
  - UI automatically adapts to system color scheme.

## Tech Stack
- Framework: Plasmo
- UI: React, TypeScript
- Storage: `@plasmohq/storage`

## Setup & Build

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Development**
   ```bash
   npm run dev
   ```
   This will start the development server and create a `build/chrome-mv3-dev` folder. Load this folder into Chrome via `chrome://extensions` (Enable "Developer mode" and click "Load unpacked").

3. **Build for Production**
   ```bash
   npm run build
   ```
   The production build will be available in the `build/chrome-mv3-prod` folder.

## Directory Structure
- `popup.tsx`: The main extension popup UI.
- `options.tsx`: The extension settings page.
- `background.ts`: Service worker for screenshot handling.
- `styles.css`: Shared styles with dark mode support.
- `assets/`: Contains extension icons.
