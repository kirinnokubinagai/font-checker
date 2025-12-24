import React from 'react';
import ReactDOM from 'react-dom/client';
import styles from '../index.css?inline';
import Overlay from './Overlay';
import { getRenderedFont } from './fontUtils';

// --- State Variables ---
let overlayRoot: ReactDOM.Root | null = null;
let overlayContainer: HTMLElement | null = null;
let globalTooltipContainer: HTMLElement | null = null;
let highlightElement: HTMLElement | null = null;

let lastSelectedText: string = "";
let lastTargetElement: HTMLElement | null = null;
let lastRange: Range | null = null;

// --- Helper Functions ---

/**
 * Finds an existing font-checker wrapped span.
 * @param node The node to check from.
 * @returns The wrapper element if found, null otherwise.
 */
function findExistingWrapper(node: Node | null): HTMLElement | null {
    if (!node) return null;
    const current: Node | null = node;
    
    if (current.nodeType === Node.ELEMENT_NODE && (current as HTMLElement).dataset.fontCheckerStyled === "true") {
        return current as HTMLElement;
    }
    if (current.parentElement && current.parentElement.dataset.fontCheckerStyled === "true") {
        return current.parentElement;
    }
    return null;
}

/**
 * Carefully unwraps a span element, moving its children to its parent.
 * @param el The element to unwrap.
 */
function unwrap(el: HTMLElement) {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
}

/**
 * Removes the visual selection highlight.
 */
function removeHighlight() {
    if (highlightElement) {
        highlightElement.remove();
        highlightElement = null;
    }
}

/**
 * Updates the visual selection highlight (non-destructive).
 * @param range The range to highlight.
 */
function updateHighlight(range: Range) {
    removeHighlight();
    const rects = range.getClientRects();
    if (rects.length === 0) return;

    highlightElement = document.createElement('div');
    highlightElement.id = 'font-checker-selection-highlight';
    Object.assign(highlightElement.style, {
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: '2147483646',
        border: '2px dashed #000',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        borderRadius: '2px',
        transition: 'allCode 0.1s ease-out'
    });

    const bounding = range.getBoundingClientRect();
    Object.assign(highlightElement.style, {
        top: `${bounding.top + window.scrollY}px`,
        left: `${bounding.left + window.scrollX}px`,
        width: `${bounding.width}px`,
        height: `${bounding.height}px`,
    });

    document.body.appendChild(highlightElement);
}

/**
 * Removes the overlay and clean up.
 */
function removeOverlay() {
  if (overlayRoot) {
    overlayRoot.unmount();
    overlayRoot = null;
  }
  if (overlayContainer) {
    overlayContainer.remove();
    overlayContainer = null;
  }
  removeHighlight();
}

/**
 * Prepares the selection context for the overlay.
 * @param text The selected text.
 */
function prepareSelectionTarget(text: string): void {
  lastSelectedText = text;
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      lastRange = range.cloneRange();
      
      const anchorNode = range.commonAncestorContainer;
      lastTargetElement = anchorNode.nodeType === Node.TEXT_NODE 
          ? anchorNode.parentElement 
          : anchorNode as HTMLElement;
      
      updateHighlight(lastRange);
  } else {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
          lastTargetElement = active;
      }
  }
}

/**
 * Creates the font checker overlay.
 */
function createOverlay(text: string, fontFamily: string, initialStyles?: { fontSize: string, fontWeight: string, fontStyle: string }) {
  removeOverlay();
  prepareSelectionTarget(text);

  overlayContainer = document.createElement('div');
  overlayContainer.id = 'font-checker-overlay-root';
  document.body.appendChild(overlayContainer);
  
  const shadow = overlayContainer.attachShadow({ mode: 'open' });
  
  const styleElement = document.createElement('style');
  styleElement.textContent = typeof styles === 'string' ? styles : '';
  shadow.appendChild(styleElement);

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

// --- Event Listeners ---

window.addEventListener('font-checker-update-style', ((e: CustomEvent) => {
  const detail = e.detail;
  if (!detail || typeof detail !== 'object') return;
  
  const { fontFamily, fontSize, fontWeight, fontStyle } = detail;
  let targetElement: HTMLElement | null = null;
  
  const selection = window.getSelection();
  const activeRange = (selection && selection.rangeCount > 0 && !selection.isCollapsed) 
    ? selection.getRangeAt(0) 
    : lastRange;
  
  if (activeRange) {
      targetElement = findExistingWrapper(activeRange.commonAncestorContainer);
      if (!targetElement && !activeRange.collapsed) {
          try {
              const span = document.createElement('span');
              span.dataset.fontCheckerStyled = "true";
              activeRange.surroundContents(span);
              targetElement = span;
              lastTargetElement = span;
              const newRange = document.createRange();
              newRange.selectNodeContents(span);
              updateHighlight(newRange);
          } catch (err) {
              console.warn("FontChecker: Could not wrap selection.", err);
              const parent = activeRange.commonAncestorContainer.nodeType === Node.TEXT_NODE 
                ? activeRange.commonAncestorContainer.parentElement 
                : activeRange.commonAncestorContainer as HTMLElement;
              if (parent && parent.textContent?.trim() === lastSelectedText.trim()) {
                  targetElement = parent;
              }
          }
      }
  }

  if (!targetElement && lastTargetElement) {
      targetElement = lastTargetElement;
  }
  
  if (targetElement) {
      targetElement.dataset.fontCheckerStyled = "true";
      if (fontFamily) targetElement.style.fontFamily = fontFamily.includes(' ') ? `"${fontFamily}"` : fontFamily;
      if (fontSize) targetElement.style.fontSize = fontSize;
      if (fontWeight) targetElement.style.fontWeight = fontWeight;
      if (fontStyle) targetElement.style.fontStyle = fontStyle;
  }
}) as EventListener);

window.addEventListener('font-checker-reset-style', (() => {
    const selection = window.getSelection();
    const activeRange = (selection && selection.rangeCount > 0) ? selection.getRangeAt(0) : lastRange;
    if (!activeRange) return;

    const targetElement = findExistingWrapper(activeRange.commonAncestorContainer);
    if (targetElement) {
        if (targetElement.tagName === 'SPAN') {
            unwrap(targetElement);
        } else {
            targetElement.style.fontFamily = '';
            targetElement.style.fontSize = '';
            targetElement.style.fontWeight = '';
            targetElement.style.fontStyle = '';
            delete targetElement.dataset.fontCheckerStyled;
        }
    }
    removeHighlight();
}) as EventListener);

window.addEventListener('font-checker-reset-all', (() => {
    const allStyled = document.querySelectorAll('[data-font-checker-styled="true"]');
    allStyled.forEach(el => {
        const targetElement = el as HTMLElement;
        if (targetElement.tagName === 'SPAN') {
            unwrap(targetElement);
        } else {
            targetElement.style.fontFamily = '';
            targetElement.style.fontSize = '';
            targetElement.style.fontWeight = '';
            targetElement.style.fontStyle = '';
            delete targetElement.dataset.fontCheckerStyled;
        }
    });
    removeHighlight();
}) as EventListener);

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "getSelectedText") {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
            const start = active.selectionStart;
            const end = active.selectionEnd;
            if (start !== null && end !== null && start !== end) {
                const text = active.value.substring(start, end);
                sendResponse({ text, fontFamily: getRenderedFont(active) });
                return;
            }
        }
        sendResponse({ text: null });
        return;
    }

    const text = selection.toString();
    const anchorNode = selection.anchorNode;
    const element = anchorNode?.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode as HTMLElement;
    sendResponse({ text, fontFamily: element ? getRenderedFont(element) : 'Unknown' });
  }

  if (request.action === "showOverlay") {
      createOverlay(request.selectionText, 'Unknown');
      sendResponse({ success: true });
  }
});

function removeTooltip() {
  if (globalTooltipContainer) {
    globalTooltipContainer.remove();
    globalTooltipContainer = null;
  }
}

/**
 * Shows the tooltip near the selection.
 */
function showTooltip(x: number, y: number, text: string) {
  removeTooltip();
  globalTooltipContainer = document.createElement('div');
  globalTooltipContainer.className = 'font-checker-tooltip';
  Object.assign(globalTooltipContainer.style, {
    position: 'absolute', top: `${y}px`, left: `${x}px`, zIndex: '2147483647',
    cursor: 'pointer', width: '40px', height: '40px', display: 'flex',
    alignItems: 'center', justifyContent: 'center', background: 'transparent',
    transition: 'transform 0.1s ease-in-out', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
  });
  
  const iconUrl = chrome.runtime.getURL('icon48.png');
  globalTooltipContainer.innerHTML = `<img src="${iconUrl}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;" alt="Check Font" />`;
  
  globalTooltipContainer.onmouseenter = () => { if (globalTooltipContainer) globalTooltipContainer.style.transform = 'scale(1.1)'; };
  globalTooltipContainer.onmouseleave = () => { if (globalTooltipContainer) globalTooltipContainer.style.transform = 'scale(1.0)'; };
  
  globalTooltipContainer.onmousedown = (e) => {
    e.preventDefault(); e.stopPropagation();
    let styles = { fontSize: '16px', fontWeight: '400', fontStyle: 'normal' };
    let fontFamily = 'Unknown';
    const selection = window.getSelection();
    let element: HTMLElement | null = null;
    
    if (selection && !selection.isCollapsed) {
        const anchorNode = selection.anchorNode;
        element = anchorNode?.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode as HTMLElement;
    } else {
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) element = active;
    }

    if (element) {
        fontFamily = getRenderedFont(element);
        const computed = window.getComputedStyle(element);
        styles = { fontSize: computed.fontSize, fontWeight: computed.fontWeight, fontStyle: computed.fontStyle };
    }

    createOverlay(text, fontFamily, styles);
    removeTooltip();
  };
  document.body.appendChild(globalTooltipContainer);
}

document.addEventListener('mouseup', () => {
    requestAnimationFrame(() => {
        const selection = window.getSelection();
        let text = "";
        let rects: DOMRectList | null = null;
        let isBackwards = false;

        if (selection && !selection.isCollapsed) {
            text = selection.toString();
            const range = selection.getRangeAt(0);
            rects = range.getClientRects();
            const anchorOffset = selection.anchorOffset;
            const focusOffset = selection.focusOffset;
            if (selection.anchorNode === selection.focusNode) {
                isBackwards = anchorOffset > focusOffset;
            } else {
                const pos = selection.anchorNode?.compareDocumentPosition(selection.focusNode || document.body);
                if (pos && (pos & Node.DOCUMENT_POSITION_PRECEDING)) isBackwards = true;
            }
        } else {
            const active = document.activeElement;
            if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
                const start = active.selectionStart;
                const end = active.selectionEnd;
                if (start !== null && end !== null && start !== end) {
                    text = active.value.substring(start, end);
                    rects = active.getClientRects();
                }
            }
        }

        if (!text || !rects || rects.length === 0) {
            removeTooltip();
            return;
        }

        let x = 0, y = 0;
        if (isBackwards) {
            const firstRect = rects[0];
            x = firstRect.left; y = firstRect.bottom + 10;
        } else {
            const lastRect = rects[rects.length - 1];
            x = lastRect.right; y = lastRect.bottom + 10;
        }
        x += window.scrollX; y += window.scrollY;
        
        if (overlayRoot && overlayContainer) return;
        showTooltip(x, y, text);
    });
});

document.addEventListener('mousedown', (e) => {
   if (globalTooltipContainer && !globalTooltipContainer.contains(e.target as Node)) removeTooltip();
});
