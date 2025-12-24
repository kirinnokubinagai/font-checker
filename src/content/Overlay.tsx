import React from 'react';
import FontPreview from '../popup/FontPreview';

import { getFontDescription } from './fontDescriptions';

interface OverlayProps {
  text: string;
  font: string;
  initialStyles: { fontSize: string; fontWeight: string; fontStyle: string };
  onClose: () => void;
}

export default function Overlay({ text, font, initialStyles, onClose }: OverlayProps) {
  const [showPreview, setShowPreview] = React.useState(false);
  const description = getFontDescription(font);
  
  const [siteFonts, setSiteFonts] = React.useState<string[]>([]);
  const [isScanning, setIsScanning] = React.useState(false);

  // Parse initial values
  const initialSize = parseInt(initialStyles.fontSize) || 16;
  
  // Clean up initial weight if string
  let startWeight = 400;
  if (initialStyles.fontWeight === 'bold') startWeight = 700;
  else if (initialStyles.fontWeight === 'normal') startWeight = 400;
  else startWeight = parseInt(initialStyles.fontWeight) || 400;

  const initialItalic = initialStyles.fontStyle.includes('italic');
  const initialBold = startWeight >= 700;

  // Editor State
  const [editFontFamily, setEditFontFamily] = React.useState(font?.replace(/['"]/g, '') || 'Inherit');
  const [editFontSize, setEditFontSize] = React.useState(initialSize);
  const [isBold, setIsBold] = React.useState(initialBold);
  const [isItalic, setIsItalic] = React.useState(initialItalic);

  const updateStyle = (changes: { fontFamily?: string; fontSize?: string; fontWeight?: string; fontStyle?: string }) => {
      window.dispatchEvent(new CustomEvent('font-checker-update-style', { detail: changes }));
  };

  const handleReset = () => {
      setEditFontFamily(font?.replace(/['"]/g, '') || '');
      setEditFontSize(initialSize);
      setIsBold(initialBold);
      setIsItalic(initialItalic);
      window.dispatchEvent(new CustomEvent('font-checker-reset-style'));
  };

  // Scan on mount
  React.useEffect(() => {
    scanSiteFonts();
  }, []);

  // Sync state when props change (Live Update)
  React.useEffect(() => {
     setEditFontFamily(font?.replace(/['"]/g, '') || 'Inherit');
     setEditFontSize(initialSize);
     setIsBold(initialBold);
     setIsItalic(initialItalic);
  }, [font, initialSize, initialBold, initialItalic]);

  const handleFontSelect = (newFont: string) => {
    setEditFontFamily(newFont);
    updateStyle({ fontFamily: newFont });
  };

  const scanSiteFonts = () => {
    setIsScanning(true);
    const fonts = new Set<string>();
    const elements = Array.from(document.getElementsByTagName('*'));
    let index = 0;
    const batchSize = 100; // Process 100 elements at a time

    const processBatch = () => {
        const end = Math.min(index + batchSize, elements.length);
        for (; index < end; index++) {
            try {
                const font = window.getComputedStyle(elements[index]).fontFamily;
                const families = font.split(',');
                if (families.length > 0) {
                    const clean = families[0].replace(/['"]/g, '').trim();
                    if (clean && !clean.startsWith('__')) fonts.add(clean);
                }
            } catch (_e) {
                // Ignore elements that might have been removed or are inaccessible
            }
        }

        if (index < elements.length) {
            if ('requestIdleCallback' in window) {
                (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(() => processBatch());
            } else {
                setTimeout(processBatch, 10);
            }
        } else {
            setSiteFonts(Array.from(fonts).sort());
            setIsScanning(false);
        }
    };

    processBatch();
  };

  return (
    <div 
        className="fixed top-4 right-4 z-[2147483647] bg-white text-black font-sans border-4 border-black w-[min(350px,calc(100vw-2rem))] shadow-2xl animate-accordion-down max-h-[90vh] flex flex-col"
        role="dialog"
        aria-label="Font Checker Overlay"
    >
      <header className="flex justify-between items-center p-3 border-b-4 border-black bg-white shrink-0">
        <h2 className="font-black uppercase tracking-tighter text-xl">Font Checker</h2>
        <button 
            onClick={onClose} 
            className="font-mono text-xl font-bold hover:bg-black hover:text-white px-2 rounded-sm transition-colors"
            aria-label="Close overlay"
        >
          ✕
        </button>
      </header>

      <div className="overflow-y-auto flex-1">
        <section className="p-4 border-b border-black">
          <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-2 opacity-60">Selection</label>
          <div className="text-xl font-bold leading-tight break-words">
            "{text}"
          </div>
        </section>

        <section className="p-4 border-b border-black bg-black text-white">
          <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-1 opacity-80 decoration-white underline">Typeset In</label>
          <div className="font-mono text-lg break-all mb-2">
            {font?.replace(/['"]/g, '') || "Unknown"}
          </div>
          <div className="text-xs opacity-80 leading-relaxed font-light border-t border-white/20 pt-2">
            {description}
          </div>
        </section>

        {/* Site Fonts Section */}
        <section className="border-b border-black">
             {isScanning && (
                <div className="p-3 text-xs font-mono animate-pulse">Scanning DOM...</div>
             )}

             {!isScanning && siteFonts.length === 0 && (
                 <div className="p-3 text-xs font-mono opacity-50">No fonts detected or check blocked by CSP.</div>
             )}
             

             {siteFonts.length > 0 && (
                <div className="p-3 bg-gray-50">
                    <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-2 opacity-60">Detected on Page</label>
                    <div className="flex flex-wrap gap-2">
                        {siteFonts.map(f => (
                            <span key={f} className="text-xs border border-black px-1.5 py-0.5 bg-white font-mono break-all">{f}</span>
                        ))}
                    </div>
                </div>
             )}
        </section>

        {/* Font Editor Section */}
         <section className="border-b border-black p-4 bg-gray-50 flex-1 overflow-hidden flex flex-col">
            <label className="block text-xs font-bold uppercase tracking-[0.2em] mb-3 opacity-60">Font Editor</label>
            
            <div className="space-y-4">
                {/* Family Input & Picker */}
                <div>
                    <label className="block text-[11px] font-bold uppercase mb-1">Family</label>
                    <div className="flex gap-2 relative">
                        <input 
                            type="text" 
                            value={editFontFamily} 
                            onChange={(e) => {
                                setEditFontFamily(e.target.value);
                                updateStyle({ fontFamily: e.target.value });
                            }}
                            className="flex-1 border border-black p-2 text-xs font-mono"
                            placeholder="e.g. Arial..."
                        />
                        <button 
                          onClick={() => setShowPreview(!showPreview)}
                          className={`w-8 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors ${showPreview ? 'bg-black text-white' : 'bg-white'}`}
                        >
                           {showPreview ? '▲' : '▼'}
                        </button>
                    </div>
                    
                    {/* Collapsible Font Picker */}
                    {showPreview && (
                        <div className="mt-2 border border-black max-h-[200px] overflow-y-auto animate-accordion-down sticky top-0 bg-white z-10 shadow-lg">
                           <div className="p-2 bg-gray-100 border-b border-black text-[10px] font-bold uppercase flex justify-between">
                              <span>Select Font</span>
                              <button onClick={() => setShowPreview(false)} className="underline">Close</button>
                           </div>
                           <FontPreview text={text} onFontSelect={(newFont: string) => {
                               handleFontSelect(newFont);
                               // Optional: close on select? User might want to try many. Let's keep it open or let them close.
                               // User said "Check other fonts" replacing the old list. 
                           }} />
                        </div>
                    )}
                </div>

                {/* Size & Style Controls */}
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-[11px] font-bold uppercase mb-1">Size: {editFontSize}px</label>
                        <input 
                            type="range" 
                            min="8" 
                            max="72" 
                            value={editFontSize} 
                            onChange={(e) => {
                                const size = parseInt(e.target.value);
                                setEditFontSize(size);
                                updateStyle({ fontSize: `${size}px` });
                            }}
                            className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-black"
                        />
                    </div>
                </div>

                {/* Toggles Row */}
                <div className="flex gap-4 pt-2">
                    <div 
                        className="flex items-center gap-2 border border-black px-2 py-1 bg-white hover:bg-gray-50 cursor-pointer" 
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                            const newBold = !isBold;
                            setIsBold(newBold);
                            updateStyle({ fontWeight: newBold ? 'bold' : 'normal' });
                        }}
                    >
                        <input 
                            type="checkbox" 
                            checked={isBold}
                            readOnly
                            className="accent-black pointer-events-none"
                        />
                        <label className="text-[10px] font-bold uppercase cursor-pointer">Bold</label>
                    </div>

                    <div 
                        className="flex items-center gap-2 border border-black px-2 py-1 bg-white hover:bg-gray-50 cursor-pointer" 
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                            const newItalic = !isItalic;
                            setIsItalic(newItalic);
                            updateStyle({ fontStyle: newItalic ? 'italic' : 'normal' });
                        }}
                    >
                        <input 
                            type="checkbox" 
                            checked={isItalic}
                            readOnly
                            className="accent-black pointer-events-none"
                        />
                        <label className="text-[10px] font-bold uppercase cursor-pointer">Italic</label>
                    </div>
                </div>

                <div className="pt-4 mt-2 border-t border-gray-200">
                    <button 
                        onClick={handleReset}
                        className="w-full text-[10px] font-bold uppercase underline hover:bg-black hover:text-white p-2 transition-colors border border-black mb-2"
                    >
                        Reset Selection
                    </button>
                    
                    <button 
                        onClick={() => {
                            if (confirm('Are you sure you want to reset ALL font changes on this page?')) {
                                window.dispatchEvent(new CustomEvent('font-checker-reset-all'));
                            }
                        }}
                        className="w-full text-[10px] font-bold uppercase text-red-600 hover:bg-red-600 hover:text-white p-2 transition-colors border border-red-600"
                    >
                        Reset All Page Edits
                    </button>
                </div>
            </div>
        </section>
      </div>
    </div>
  );
}
