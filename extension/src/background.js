// Setup side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));


// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openTab') {
        chrome.tabs.create({
            url: request.url,
            active: true
        });
        sendResponse({ success: true });
    }
    return true;
});
