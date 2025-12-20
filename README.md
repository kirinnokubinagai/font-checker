# 🔤 Font Checker

## ✨ Features

- **🔍 Smart Detection**: Instantly identifies the *actual rendered* font family (not just the CSS stack) using advanced canvas fingerprinting.
- **🖱️ Smart Tooltip**: Select any text to reveal a DeepL-style floating action button. Click to inspect.
- **🎨 Live Font Editor**:
  - **Family**: Type any font name to apply it instantly.
  - **Size**: Drag slider to resize (8px - 72px).
  - **Style**: Toggle **Bold** and **Italic** with one click.
  - **Site Fonts Scanner**: Automatically scans and lists all fonts currently rendered on the page.
  - **Preview Gallery**: Test your text with a verified list of system and web fonts.
- **⚡ Reset & Undo**:
  - **Reset Selection**: Revert the current selection to its original style.
  - **Reset All**: A "Panic Button" to clear all edits made to the page instantly.
- **🔒 Shadow DOM Architecture**: The UI is completely isolated in a Shadow Root, ensuring extension styles never conflict with the website's CSS.

## 🚀 Getting Started

This project uses **pnpm** for fast and efficient package management.

### Prerequisites
- Node.js (v18 or higher)
- pnpm (`npm install -g pnpm`)

### Installation

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Build the Extension**
   ```bash
   pnpm run build
   ```
   This will generate a `dist` directory containing the compiled extension.

3. **Load in Chrome**
   1. Open Chrome and navigate to `chrome://extensions/`.
   2. Toggle **Developer mode** in the top right corner.
   3. Click **Load unpacked**.
   4. Select the `dist` folder from your project directory.

## 📖 How to Use

1. **Highlight Text**: Select any text snippet on a webpage.
2. **Click the Tooltip**: A small Font Checker icon will appear near your selection (similar to DeepL or Grammarly).
3. **Inspect & Edit**: The Brutalist Overlay will slide in from the right.
   - **Top Section**: Shows the detected font name and category.
   - **Scanner**: Click "Scan Page Fonts" to see what other fonts are used on the page.
   - **Editor**: Use the inputs to change family, size, or weight in real-time.
4. **Context Menu**: You can also right-click selected text and choose "Font Checker" > "Check Font".

## 🛠️ Tech Stack

- **Core Framework**: **React 18** + **TypeScript**
  - Provides a robust, type-safe foundation for managing complex state (font editor inputs, history, site scanning).
- **Styling & Isolation**: **Tailwind CSS** + **Shadow DOM**
  - The entire overlay is injected into a Shadow Root. This guarantees that the extension's styles (reset, utilities) **never** bleed into the host page, and conversely, the host page's CSS does not break the extension's UI.
- **Build Tool**: **Vite**
  - Optimized for speed with specific configurations for building Chrome Extension content scripts and popups efficiently.
- **Font Detection**: **Canvas API**
  - Instead of relying solely on `window.getComputedStyle` (which only returns the font stack), this extension uses an HTML5 Canvas measurement technique to determine which font from the stack is *actually* being rendered by the browser.
- **Manifest V3**:
  - Fully compliant with the latest Chrome Extension architecture, using Service Workers for background tasks and efficient script injection.
- **Package Manager**: **pnpm**
  - Used for fast, disk-space efficient dependency management.

## ❓ Troubleshooting

- **Changes not showing up?**
  Reload the extension in `chrome://extensions/` by clicking the refresh icon.

---

**License**: MIT
