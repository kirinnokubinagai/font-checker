/**
 * Detects which font from a font-family stack is likely being used to render the text.
 * Uses Canvas API to measure text widths against fallbacks.
 */
export function getRenderedFont(element: HTMLElement): string {
  const computedStyle = window.getComputedStyle(element);
  const fontFamilyStack = computedStyle.fontFamily;
  
  if (!fontFamilyStack) return 'Unknown';

  // Split stack into individual fonts
  const fonts = fontFamilyStack.split(',').map(f => f.trim().replace(/['"]/g, ''));
  
  // Create canvas for measurement
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return fontFamilyStack;

  const text = element.innerText.substring(0, 50) || 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const baseSize = '72px';
  // Fallback fonts to compare against
  const fallbacks = ['sans-serif', 'serif', 'monospace'];

  for (const font of fonts) {
    if (isFontAvailable(font, context, text, baseSize, fallbacks)) {
      return font; // This font caused a width change, so it's likely the one active
    }
  }

  return fonts[0] || 'Unknown';
}

function isFontAvailable(
  fontName: string, 
  ctx: CanvasRenderingContext2D, 
  text: string, 
  size: string, 
  fallbacks: string[]
): boolean {
  for (const fallback of fallbacks) {
    ctx.font = `${size} "${fallback}"`;
    const fallbackWidth = ctx.measureText(text).width;

    ctx.font = `${size} "${fontName}", "${fallback}"`;
    const fontWidth = ctx.measureText(text).width;

    // If widths are different, the fontName successfully overrode the fallback
    if (fontWidth !== fallbackWidth) {
      return true;
    }
  }
  return false;
}
