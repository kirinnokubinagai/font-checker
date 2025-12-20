
const PREVIEW_FONTS = [
  "Arial",
  "Helvetica", 
  "Times New Roman",
  "Courier New",
  "Georgia",
  "Verdana",
  "Impact",
  "Comic Sans MS",
  "Trebuchet MS",
  "Arial Black",
  "Palatino",
  "Garamond",
  "Bookman",
  "Avant Garde",
  "Apple Chancery",
  "Brush Script MT",
  "Segoe UI",
  "Roboto",
  "Noto Sans",
  "Open Sans"
]

interface FontPreviewProps {
  text: string;
  onFontSelect?: (font: string) => void;
}

export default function FontPreview({ text, onFontSelect }: FontPreviewProps) {
  return (
    <div className="grid grid-cols-1 gap-0 border-t border-black">
      <div className="p-2 bg-black text-white text-[10px] uppercase tracking-widest font-bold">
        Check other fonts
      </div>
      {PREVIEW_FONTS.map((font) => (
        <button 
          key={font} 
          onClick={() => onFontSelect?.(font)}
          className="group border-b border-black p-4 hover:bg-black hover:text-white transition-colors duration-200 text-left w-full block"
        >
          <div className="flex flex-col gap-1 pointer-events-none">
            <span className="text-[10px] uppercase tracking-widest opacity-60 group-hover:opacity-100 font-sans">{font}</span>
            <p 
              className="text-2xl whitespace-nowrap overflow-hidden text-ellipsis" 
              style={{ fontFamily: `"${font}"` }} // Quote font names
              title={text}
            >
              {text}
            </p>
          </div>
        </button>
      ))}
    </div>
  )
}
