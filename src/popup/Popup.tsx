import { useEffect, useState } from 'react';

export default function Popup() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const handleNoText = () => setLoading(false);
      
      const activeTab = tabs[0];
      if (activeTab?.id !== undefined) {
         const tabId = activeTab.id;

         const handleTextFound = (text: string) => {
            // Found text! Directly open overlay and close popup
            chrome.tabs.sendMessage(tabId, { 
                action: "showOverlay", 
                selectionText: text 
            }, () => {
                window.close();
            });
         };

        try {
          // Try sending message first
          chrome.tabs.sendMessage(tabId, { action: "getSelectedText" }, (response) => {
            if (chrome.runtime.lastError) {
              // Failed? Try injecting the script manually
              chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['assets/content.js']
              }, () => {
                 if (chrome.runtime.lastError) {
                    // Silent fail - script injection might be blocked or not needed
                    handleNoText();
                    return;
                 }
                 // Retry sending message after injection
                 setTimeout(() => {
                    try {
                        if (!chrome.runtime.id) return; // Context invalid
                        chrome.tabs.sendMessage(tabId, { action: "getSelectedText" }, (res) => {
                          if (chrome.runtime.lastError) {
                             handleNoText();
                             return;
                          }
                          if (res && res.text) {
                            handleTextFound(res.text);
                          } else {
                            handleNoText();
                          }
                        });
                    } catch (_err) {
                        handleNoText();
                    }
                 }, 50); // Reduced timeout for faster perceived response
              });
            } else if (response && response.text) {
              handleTextFound(response.text);
            } else {
              handleNoText();
            }
          });
        } catch (_e) {
          handleNoText();
        }
      } else {
        handleNoText();
      }
    });
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-white text-black font-mono text-xs uppercase tracking-widest animate-pulse">
      Initialising...
    </div>
  )

  // Only reached if loading=false (No Text was found)
  return (
      <div className="flex flex-col items-center justify-center h-screen bg-white p-6 text-center border-4 border-black m-2">
        <div className="font-black text-6xl mb-4 transform -rotate-2">?</div>
        <h1 className="text-2xl font-bold uppercase tracking-tighter mb-2">No Text Selected</h1>
        <p className="font-mono text-sm leading-relaxed">
          Select some text on the webpage <br/>and open this popup again.
        </p>
      </div>
  )
}
