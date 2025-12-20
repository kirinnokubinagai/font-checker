chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "check-font",
    title: "Check Font for selection",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "check-font" && tab?.id) {
    // Send message to content script to show overlay
    chrome.tabs.sendMessage(tab.id, { 
      action: "showOverlay", 
      selectionText: info.selectionText 
    }).catch(() => {
      // If content script is not loaded, we might want to inject it
      // But for now, we rely on the manifest injection.
      console.warn("Could not send message to content script. Is it loaded?");
    });
  }
});
