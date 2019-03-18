(function () {
    if (document.readyState === 'complete') {
        detectFeeds();
    } else {
        document.addEventListener('DOMContentLoaded', detectFeeds);
    }

    function detectFeeds() {
        const selector = 'link[type="application/rss+xml"], link[type="application/atom+xml"]';
        const feedsData = [...document.querySelectorAll(selector)].map((feed) => {
            return {url: feed.href, title: feed.title || feed.href};
        });

        if (feedsData.length > 0) {
            chrome.runtime.sendMessage({action: 'show-rss-icon'}, () => {
            });
        }
        chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
            if (message.action === 'get-list') {
                sendResponse({action: 'response-list', value: feedsData});
            }
        });
    }
})();