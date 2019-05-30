chrome.runtime.onMessage.addListener(function(request, sender){
    if (request.action === 'show-rss-icon') {
        const tab = sender.tab;
        chrome.pageAction.setIcon({
            path: 'icon16.png',
            tabId: tab.id
        });
        chrome.pageAction.show(tab.id);
    }
});
