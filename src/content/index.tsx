import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import Overlay from './Overlay';
import { getRenderedFont } from './fontUtils';


// Helper to find existing font-checker span
function findExistingWrapper(node: Node | null): HTMLElement | null {
    if (!node) return null;
    let current: Node | null = node;
    
    if (current.nodeType === Node.ELEMENT_NODE && (current as HTMLElement).dataset.fontCheckerStyled === "true") {
        return current as HTMLElement;
    }
    if (current.parentElement && current.parentElement.dataset.fontCheckerStyled === "true") {
        return current.parentElement;
    }
    return null;
}

let overlayRoot: ReactDOM.Root | null = null;
let overlayContainer: HTMLElement | null = null;
let globalTooltipContainer: HTMLElement | null = null;

function removeOverlay() {
  if (overlayRoot) {
    overlayRoot.unmount();
    overlayRoot = null;
  }
  if (overlayContainer) {
    overlayContainer.remove();
    overlayContainer = null;
  }
  
  // Remove visual highlight from active element
  if (lastSelectedElement) {
      lastSelectedElement.style.outline = '';
      lastSelectedElement.style.outlineOffset = '';
      // Optional: If we want to unwrap clean elements we created? 
      // For now, keeping the wrapper is safer for re-selection.
  }
}

// Track the last valid selected element for editing context
let lastSelectedElement: HTMLElement | null = null;
let lastSelectedText: string = "";

// Helper to handle selection wrapping/context updates
function prepareSelectionTarget(text: string): void {
  // Store context
  lastSelectedText = text;
  
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Check if we are already inside a styled span
      let existingWrapper = findExistingWrapper(range.commonAncestorContainer);

      // If we found a wrapper, check if we selected the WHOLE content or just a part.
      // If it's a partial selection, we should create a NEW nested wrapper instead of modifying the parent.
      if (existingWrapper) {
          const wrapperText = existingWrapper.textContent || "";
          const selectionText = selection.toString();
          
          if (selectionText.trim().length < wrapperText.trim().length && selectionText.trim().length > 0) {
              existingWrapper = null; // Forces new wrapper creation
          }
      }

      // If we are switching targets, we should clear the outline from the OLD target if possible.
      // But lastSelectedElement might be pointing to the old one.
      if (lastSelectedElement && lastSelectedElement !== existingWrapper) {
          lastSelectedElement.style.outline = '';
          lastSelectedElement.style.outlineOffset = '';
      }

      if (existingWrapper) {
          lastSelectedElement = existingWrapper;
      } else {
          // "Pre-wrap" strategy:
          try {
             const span = document.createElement('span');
             span.dataset.fontCheckerStyled = "true"; 
             
             range.surroundContents(span);
             
             lastSelectedElement = span;
             
             selection.removeAllRanges();
             const newRange = document.createRange();
             newRange.selectNodeContents(span);
             selection.addRange(newRange);
          } catch (e) {
              console.warn("FontChecker: Could not pre-wrap selection (maybe crosses block boundaries).", e);
              
              const anchorNode = selection.anchorNode;
              const parent = anchorNode?.nodeType === Node.TEXT_NODE 
                  ? anchorNode.parentElement 
                  : anchorNode as HTMLElement;
                  
              if (parent && parent.textContent?.trim() === selection.toString().trim()) {
                   lastSelectedElement = parent;
              } else {
                  lastSelectedElement = null; 
              }
          }
      }
  }
  
  if (lastSelectedElement) {
       const contrastColor = getContrastingOutlineColor(lastSelectedElement);
      lastSelectedElement.style.outline = `2px dashed ${contrastColor}`;
      lastSelectedElement.style.outlineOffset = '2px';
  }
}

function createOverlay(text: string, fontFamily: string, initialStyles?: { fontSize: string, fontWeight: string, fontStyle: string }) {
  removeOverlay(); // Remove existing if any
  
  prepareSelectionTarget(text);

  overlayContainer = document.createElement('div');
  overlayContainer.id = 'font-checker-overlay-root';
  document.body.appendChild(overlayContainer);
  
  const shadow = overlayContainer.attachShadow({ mode: 'open' });
  
  // Inject styles into Shadow DOM
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = chrome.runtime.getURL('assets/style.css'); 
  shadow.appendChild(styleLink);

  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  overlayRoot = ReactDOM.createRoot(mountPoint);
  overlayRoot.render(
    <React.StrictMode>
      <Overlay 
        text={text} 
        font={fontFamily} 
        initialStyles={initialStyles || { fontSize: '16px', fontWeight: '400', fontStyle: 'normal' }}
        onClose={removeOverlay} 
      />
    </React.StrictMode>
  );
}

// Helper to determine best outline color based on background
function getContrastingOutlineColor(element: HTMLElement): string {
    let current: HTMLElement | null = element;
    let backgroundColor = 'rgba(0, 0, 0, 0)';

    // Traverse up to find a non-transparent background
    while (current) {
        const style = window.getComputedStyle(current);
        const bg = style.backgroundColor;
        // Check if not transparent (rgba(0,0,0,0) or transparent)
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
            backgroundColor = bg;
            break;
        }
        current = current.parentElement;
    }

    // Default to white background if body/html is reached with no color
    if (backgroundColor === 'rgba(0, 0, 0, 0)') {
        backgroundColor = 'rgb(255, 255, 255)'; 
    }

    // Parse RGB(A)
    const rgbMatch = backgroundColor.match(/\d+/g);
    if (!rgbMatch) return '#000000'; // Fallback

    const r = parseInt(rgbMatch[0], 10);
    const g = parseInt(rgbMatch[1], 10);
    const b = parseInt(rgbMatch[2], 10);

    // Calculate relative luminance
    // Formula: 0.2126 * R + 0.7152 * G + 0.0722 * B
    // (Linearized/Approximate for UI contrast)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // If dark background (low luminance), use white outline. Else black.
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

// ... (Global Reset Listener - unchanged)

// ... (Reset All Listener - unchanged)

// ... (chrome.runtime.onMessage - unchanged)

// Update Style Listener
window.addEventListener('font-checker-update-style', ((e: CustomEvent) => {
  const { fontFamily, fontSize, fontWeight, fontStyle } = e.detail;
  
  let targetElement: HTMLElement | null = null;
  
  // Try to use current selection first
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      
      targetElement = findExistingWrapper(range.commonAncestorContainer);
      
      // We removed the complex wrap logic here in favor of "pre-wrap" at overlay time.
      // So if no targetElement found, we rely on lastSelectedElement fallback below.
  }

  // If no target from current selection (e.g. focus is in overlay), use lastSelectedElement
  if (!targetElement && lastSelectedElement) {
      // additional check: is the lastSelectedElement still valid/in DOM?
      if (document.contains(lastSelectedElement)) {
          targetElement = lastSelectedElement;
      }
  }
  
  // Logic to wrap if needed is complex to replay without range. 
  // Simplified: If we found an existing wrapper or element from last context, use it.
  // If we need to wrap new text but lost selection, we can't easily do it.
  // But usually createOverlay is called -> we have a selection -> user edits font -> we upgrade that element.
  
  // If targetElement is still null, we might need to recreate wrapper on lastSelectedElement if it wasn't wrapped yet?
  // Let's assume if it wasn't wrapped, lastSelectedElement IS the element we want to style (e.g. the paragraph or span).
  
   if (!targetElement && lastSelectedElement && lastSelectedElement.textContent?.includes(lastSelectedText)) {
       targetElement = lastSelectedElement; 
       // Note: this applies to the whole element. If user selected partial text and lost focus, 
       // we might over-apply. But this is a fallback for "lost selection".
   }

  if (targetElement) {
      // Mark it as styled if not already
      if (!targetElement.dataset.fontCheckerStyled) {
          targetElement.dataset.fontCheckerStyled = "true";
      }

      if (fontFamily) targetElement.style.fontFamily = fontFamily.includes(' ') ? `"${fontFamily}"` : fontFamily;
      if (fontSize) targetElement.style.fontSize = fontSize;
      if (fontWeight) targetElement.style.fontWeight = fontWeight;
      if (fontStyle) targetElement.style.fontStyle = fontStyle;
  }
}) as EventListener);

// Global Reset Listener
window.addEventListener('font-checker-reset-style', (() => {
    // Reset means removing the inline styles we added.
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    let targetElement = findExistingWrapper(range.commonAncestorContainer);

    if (targetElement) {
        targetElement.style.fontFamily = '';
        targetElement.style.fontSize = '';
        targetElement.style.fontWeight = '';
        targetElement.style.fontStyle = '';
    }
}) as EventListener);

// Reset All Listener
window.addEventListener('font-checker-reset-all', (() => {
    const allStyled = document.querySelectorAll('[data-font-checker-styled="true"]');
    allStyled.forEach(el => {
        const targetElement = el as HTMLElement;
        targetElement.style.fontFamily = '';
        targetElement.style.fontSize = '';
        targetElement.style.fontWeight = '';
        targetElement.style.fontStyle = '';
        // We keep the dataset attribute so we can re-edit it later if needed, 
        // or we could remove it to "fully" reset. 
        // For now, clearing styles is sufficient visual reset.
    });
}) as EventListener);


chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "getSelectedText") {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
      sendResponse({ text: null });
      return;
    }

    const text = selection.toString();
    const anchorNode = selection.anchorNode;
    const element = anchorNode?.nodeType === Node.TEXT_NODE 
      ? anchorNode.parentElement 
      : anchorNode as HTMLElement;
    
    let fontFamily = 'Unknown';
    if (element) {
       fontFamily = getRenderedFont(element);
    }

    sendResponse({ 
      text: text,
      fontFamily: fontFamily
    });
  }

  if (request.action === "showOverlay") {
     const selection = window.getSelection();
     let text = request.selectionText;
     let fontFamily = 'Unknown';
     let styles = { fontSize: '16px', fontWeight: '400', fontStyle: 'normal' };
     
     if (selection && selection.toString().trim() !== '') {
        const anchorNode = selection.anchorNode;
        const element = anchorNode?.nodeType === Node.TEXT_NODE 
          ? anchorNode.parentElement 
          : anchorNode as HTMLElement;
        
        if (element) {
          fontFamily = getRenderedFont(element);
          const computed = window.getComputedStyle(element);
          styles = {
              fontSize: computed.fontSize,
              fontWeight: computed.fontWeight,
              fontStyle: computed.fontStyle
          };
        }
     }

     createOverlay(text, fontFamily, styles);
     sendResponse({ success: true });
  }
});

// Update Style Listener


// Tooltip Logic
function removeTooltip() {
  if (globalTooltipContainer) {
    globalTooltipContainer.remove();
    globalTooltipContainer = null;
  }
}

function showTooltip(x: number, y: number, text: string, font: string) {
  removeTooltip();
  
  globalTooltipContainer = document.createElement('div');
  globalTooltipContainer.className = 'font-checker-tooltip';
  Object.assign(globalTooltipContainer.style, {
    position: 'absolute',
    top: `${y}px`,
    left: `${x}px`,
    zIndex: '2147483647',
    cursor: 'pointer',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent', 
    transition: 'transform 0.1s ease-in-out',
    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
  });
  
  const iconUrl = chrome.runtime.getURL('icon48.png');
  globalTooltipContainer.innerHTML = `
    <img src="${iconUrl}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;" alt="Check Font" />
  `;
  
  globalTooltipContainer.onmouseenter = () => {
     globalTooltipContainer!.style.transform = 'scale(1.1)';
  };
  globalTooltipContainer.onmouseleave = () => {
     globalTooltipContainer!.style.transform = 'scale(1.0)';
  };
  
  globalTooltipContainer.onmousedown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Capture current styles
    let styles = { fontSize: '16px', fontWeight: '400', fontStyle: 'normal' };
    const selection = window.getSelection();
    if (selection) {
        const anchorNode = selection.anchorNode;
         const element = anchorNode?.nodeType === Node.TEXT_NODE 
          ? anchorNode.parentElement 
          : anchorNode as HTMLElement;
        if (element) {
           const computed = window.getComputedStyle(element);
           styles = {
              fontSize: computed.fontSize,
              fontWeight: computed.fontWeight,
              fontStyle: computed.fontStyle
           };
        }
    }

    createOverlay(text, font, styles);
    removeTooltip();
  };

  document.body.appendChild(globalTooltipContainer);
}

document.addEventListener('mouseup', () => {
    // Use requestAnimationFrame to wait for layout/selection update cycle
    requestAnimationFrame(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
          removeTooltip();
          return;
        }

        const anchorNode = selection.anchorNode;
        const focusNode = selection.focusNode;
        
        const range = selection.getRangeAt(0);
        const rects = range.getClientRects();
        if (rects.length === 0) return;

        const text = selection.toString();
        
        // ... (rest of logic remains same, just removing the wrapper) ...
        // Re-declaring vars that were inside
        const element = anchorNode?.nodeType === Node.TEXT_NODE 
          ? anchorNode.parentElement 
          : anchorNode as HTMLElement;
        
        let fontFamily = 'Unknown';
        let styles = { fontSize: '16px', fontWeight: '400', fontStyle: 'normal' };
    
        if (element) {
           fontFamily = getRenderedFont(element);
           const computed = window.getComputedStyle(element);
           styles = {
              fontSize: computed.fontSize,
              fontWeight: computed.fontWeight,
              fontStyle: computed.fontStyle
           };
        }
    
        // IF OVERLAY IS OPEN, UPDATE IT LIVE
        if (overlayRoot && overlayContainer) {
            // Just re-render
           overlayRoot.render(
            <React.StrictMode>
              <Overlay 
                text={text} 
                font={fontFamily} 
                initialStyles={styles}
                onClose={removeOverlay} 
              />
            </React.StrictMode>
           );
           return; 
        }
    
        // Otherwise show tooltip
        const anchorOffset = selection.anchorOffset;
        const focusOffset = selection.focusOffset;
        let isBackwards = false;
        if (anchorNode === focusNode) {
            isBackwards = anchorOffset > focusOffset;
        } else {
            const position = anchorNode?.compareDocumentPosition(focusNode || document.body);
            if (position && (position & Node.DOCUMENT_POSITION_PRECEDING)) {
                isBackwards = true;
            }
        }
    
        let x = 0;
        let y = 0;
    
        if (isBackwards) {
            const firstRect = rects[0];
            x = firstRect.left;
            y = firstRect.bottom + 10; 
        } else {
            const lastRect = rects[rects.length - 1];
            x = lastRect.right;
            y = lastRect.bottom + 10;
        }
    
        x += window.scrollX;
        y += window.scrollY;
    
        showTooltip(x, y, text, fontFamily);
    });
});

document.addEventListener('mousedown', (e) => {
   if (globalTooltipContainer && !globalTooltipContainer.contains(e.target as Node)) {
     removeTooltip();
   }
});
