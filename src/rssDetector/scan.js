(function () {
    const feedsData = [];
    let oldHref = document.location.href;

    function init() {
        scan();
        let bodyList = document.querySelector('body');

        const observer = new MutationObserver(function () {
            if (oldHref !== document.location.href) {
                oldHref = document.location.href;
                scan();
            }
        });

        const config = {
            childList: true,
            subtree: true
        };
        observer.observe(bodyList, config);
        document.addEventListener('visibilitychange', updateAvailableSourcesList, false);
    }

    function docReady(fn) {
        // see if DOM is already available
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            // call on next available tick
            setTimeout(fn, 1);
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }

    function updateAvailableSourcesList() {
        if (document.hidden) {
            chrome.runtime.sendMessage({action: 'visibility-lost'});
            return;
        }
        console.log(feedsData);
        chrome.runtime.sendMessage({action: 'list-feeds', value: feedsData});
    }

    function scan() {
        const address = document.location.href;
        feedsData.length = 0;


        let rootNode = document.getRootNode().documentElement;
        // for chrome
        let d = document.getElementById('webkit-xml-viewer-source-xml');
        if (d && d.firstChild) {
            rootNode = d.firstChild;
        }
        const rootName = rootNode.nodeName.toLowerCase();
        let isRSS1 = false;

        if (rootName === 'rdf' || rootName === 'rdf:rdf') {
            if (rootNode.attributes['xmlns']) {
                isRSS1 = rootNode.attributes['xmlns'].nodeValue.search('rss') > 0;
            }
        }
        if (
            rootName === 'rss' ||
            rootName === 'channel' || // rss2
            rootName === 'feed' || // atom
            isRSS1) {
            feedsData.push({url: address, title: 'This feed'});
        }

        function findFeedsForYoutubeAddress(address) {
            const youtubeFeeds = [];
            const userMatch = /c\/(.+)/.exec(address);
            let deeperScan = true;
            let feedUrl = '';
            if (userMatch) {
                feedUrl = 'https://www.youtube.com/feeds/videos.xml?user=' + userMatch[1];
                deeperScan = false;
                youtubeFeeds.push({url: feedUrl, title: 'User feed'});
            }
            const channelMatch = /channel\/(.+)/.exec(address);
            if (channelMatch) {
                feedUrl = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + channelMatch[1];
                deeperScan = false;
                youtubeFeeds.push({url: feedUrl, title: 'Channel feed'});
            }
            const playlistMatch = /list=([a-zA-Z0-9]+)/.exec(address);
            if (playlistMatch) {
                feedUrl = 'https://www.youtube.com/feeds/videos.xml?playlist_id=' + playlistMatch[1];
                youtubeFeeds.push({url: feedUrl, title: 'Current playlist feed'});
            }
            return [youtubeFeeds, deeperScan];
        }

        if (address.includes('youtube')) {
            const [youtubeFeeds, deeperScan] = findFeedsForYoutubeAddress(address);
            feedsData.push(...youtubeFeeds);
            if (deeperScan && address.includes('watch')) {
                const channelLink = document.querySelector('#upload-info .ytd-channel-name>a');
                if (channelLink) {
                    const href = channelLink.getAttribute('href');
                    if (href) {
                        const linkFeeds = findFeedsForYoutubeAddress(href)[0];
                        feedsData.push(...linkFeeds);
                    }
                }
            }

            return updateAvailableSourcesList();
        }

        if (address.includes('bitchute.com')) {

            const channelLink = document.querySelector('.owner>a');
            if (channelLink) {
                const channelName = channelLink.textContent;
                const href = 'https://www.bitchute.com/feeds/rss/channel/' + channelName;
                feedsData.push({url: href, title: 'Channel feed'});
            }

            return updateAvailableSourcesList();
        }


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
        updateAvailableSourcesList();
    }


    docReady(init);
})();
