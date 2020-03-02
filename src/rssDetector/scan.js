const feedsData = [];
function handleVisibilityChange() {
    if (document.hidden) {
        chrome.runtime.sendMessage({action: 'visibility-lost'});
        return;
    }
    chrome.runtime.sendMessage({action: 'list-feeds', value: feedsData});
}

function scan(){
    const selector = 'link[type="application/rss+xml"], link[type="application/atom+xml"]';
    feedsData.push(...[...document.querySelectorAll(selector)].map((feed) => {
        return {url: feed.href, title: feed.title || feed.href};
    }));
    if (feedsData.length === 0) {
        const generator = document.querySelector('meta[name="generator"]');
        if (generator && generator.getAttribute('content').includes('WordPress')) {
            const url = document.URL;
            const feedUrl = url.charAt(url.length - 1) === '/' ? url + 'feed' : url + '/feed';

            feedsData.push({url: feedUrl, title: feedUrl});
        }
    }
}

document.addEventListener('visibilitychange', handleVisibilityChange, false);

scan();
handleVisibilityChange();
