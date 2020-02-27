function scan() {
    if (document.hidden) {
        return;
    }
    console.log('scanning');

    const selector = 'link[type="application/rss+xml"], link[type="application/atom+xml"]';
    const feedsData = [];
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
    chrome.runtime.sendMessage({action: 'feeds-detected', value: feedsData});

}

document.addEventListener('visibilitychange', scan, false);

scan();
