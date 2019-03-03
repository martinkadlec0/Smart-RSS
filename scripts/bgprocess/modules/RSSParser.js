/**
 * @module BgProcess
 * @submodule modules/RSSParser
 */
define(['../../libs/favicon'], function (faviconLoader) {


    function checkFavicon(source) {

        function googleFallback() {
            faviconLoader.image('https://www.google.com/s2/favicons?domain=' + encodeURIComponent(source.get('url')))
                .then(response => {
                    source.save(response);
                });
        }

        if (source.get('faviconExpires') < parseInt(Math.round((new Date()).getTime() / 1000))) {
            let baseAddress = source.get('base');
            let xhr = new XMLHttpRequest();
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        const parser = new DOMParser();
                        const baseDocument = parser.parseFromString(xhr.responseText, 'text/html');
                        const length = baseAddress.length;
                        if (baseAddress[length - 1] === '/') {
                            baseAddress = baseAddress.substring(0, length - 1);
                        }
                        let iconAddress = baseAddress + '/favicon.ico';
                        const links = baseDocument.querySelectorAll('link');
                        const iconLinks = Array.from(links).filter(link => {
                            return link.hasAttribute('rel') && link.getAttribute('rel').includes('icon');
                        });
                        let foundIcon = '';
                        let tempIcon = '';
                        iconLinks.forEach((link) => {
                            if (link.hasAttribute('rel') && link.getAttribute('rel').includes('icon')) {
                                if (link.hasAttribute('href')) {
                                    tempIcon = link.getAttribute('href');
                                    if (!tempIcon.includes('svg')) {
                                        foundIcon = tempIcon;
                                    }
                                } else {
                                    tempIcon = link.textContent;
                                    if (!tempIcon.includes('svg')) {
                                        foundIcon = tempIcon;
                                    }
                                }
                            }
                        });
                        if (foundIcon && !foundIcon.includes('svg')) {
                            if (!foundIcon.includes('//')) {
                                if (foundIcon[0] === '.') {
                                    foundIcon = foundIcon.substr(1);
                                }
                                if (foundIcon[0] === '/') {
                                    foundIcon = foundIcon.substr(1);
                                }
                                iconAddress = baseAddress + '/' + foundIcon;
                            } else {
                                iconAddress = foundIcon;
                            }
                        }
                        const prefix = source.get('url').includes('http://') ? 'http://' : 'https://';
                        iconAddress = prefix + iconAddress.replace('http://', '').replace('https://', '').replace('//', '');

                        faviconLoader.image(iconAddress)
                            .then(response => {
                                source.save(response);
                            })
                            .catch(() => {
                                googleFallback();
                            });

                    } else {
                        googleFallback();
                    }
                }

            };
            xhr.open('GET', baseAddress);
            xhr.send();
        }
    }


    /**
     * RSS Parser
     * @class RSSParser
     * @constructor
     * @extends Object
     */
    function parseRSS(xml, sourceID) {
        var items = [];

        if (!xml || !(xml instanceof XMLDocument)) {
            return items;
        }


        var nodes = xml.querySelectorAll('item');
        if (!nodes.length) {
            nodes = xml.querySelectorAll('entry');
        }

        var title = getFeedTitle(xml);
        var source = sources.findWhere({
            id: sourceID
        });

        if (title && (source.get('title') === source.get('url') || !source.get('title'))) {
            source.save('title', title);
        }

        /**
         * TTL check
         */
        var ttl = xml.querySelector('channel > ttl, feed > ttl, rss > ttl');
        if (ttl && source.get('lastUpdate') === 0) {
            ttl = parseInt(ttl.textContent, 10);
            var values = [300, 600, 1440, 10080];
            if (ttl > 10080) {
                source.save({updateEvery: 10080});
            } else if (ttl > 180) {
                for (var i = 0; i < values.length; i++) {
                    if (ttl <= values[i]) {
                        ttl = values[i];
                        break;
                    }
                }
                source.save({updateEvery: ttl});
            }
        }
        /* END: ttl check */

        var mainEl = xml.querySelector('rss, rdf, feed, channel');
        if (mainEl) {
            var baseStr = mainEl.getAttribute('xml:base') || mainEl.getAttribute('xmlns:base') || mainEl.getAttribute('base') || mainEl.querySelector('link').textContent || (mainEl.querySelector('link') && mainEl.querySelector('link:not([rel="self"])').getAttribute('href'));
            if (!baseStr) {
                baseStr = source.get('url');
            }
            if (baseStr) {
                const prefix = source.get('url').includes('http://') ? 'http://' : 'https://';
                const urlParts = baseStr.replace('http://', '').replace('https://', '').replace('//', '').split(/[/?#]/);
                baseStr = prefix + urlParts[0];
                source.save({base: baseStr});
            }
        }
        checkFavicon(source);


        [].forEach.call(nodes, function (node) {
            items.push({
                id: rssGetGuid(node),
                title: rssGetTitle(node),
                url: rssGetLink(node),
                date: rssGetDate(node),
                author: rssGetAuthor(node, title),
                content: rssGetContent(node),
                sourceID: sourceID,
                unread: true,
                deleted: false,
                trashed: false,
                visited: false,
                pinned: false,
                dateCreated: Date.now()
            });

            var last = items[items.length - 1];

            if (last.date === 0) {
                last.date = Date.now();
            }
        });


        return items;
    }

    function rssGetGuid(node) {
        if (!node) {
            return false;
        }
        let guid = node.querySelector('guid');

        return guid ? guid.textContent : rssGetLink(node) || '';
    }

    function rssGetLink(node) {
        if (!node) {
            return false;
        }
        var link = node.querySelector('link[rel="alternate"]');
        if (!link) {
            if (!link) {
                link = node.querySelector('link[type="text/html"]');
            }
            // prefer non atom links over atom links because of http://logbuch-netzpolitik.de/
            if (!link || link.prefix === 'atom') {
                link = node.querySelector('link');
            }
            if (!link) {
                link = node.querySelector('link[type="text/html"]');
            }
            if (!link) {
                link = node.querySelector('link');
            }
        }

        if (!link) {
            var guid = node.querySelector('guid');
            var tmp;
            if (guid && (tmp = guid.textContent.match(/:\/\//)) && tmp.length) {
                link = guid;
            }
        }

        if (link) {
            return link.textContent || link.getAttribute('href');
        }

        return false;
    }

    function getFeedTitle(xml) {
        var title = xml.querySelector('channel > title, feed > title, rss > title');
        if (!title || !(title.textContent).trim()) {
            title = xml.querySelector('channel > description, feed > description, rss > description');
        }

        if (!title || !(title.textContent).trim()) {
            title = xml.querySelector('channel > description, feed > description, rss > description');
        }

        if (!title || !(title.textContent).trim()) {
            title = xml.querySelector('channel > link, feed > link, rss > link');
        }

        return title && title.textContent ? title.textContent.trim() || 'rss' : 'rss';
    }

    function replaceUTCAbbr(str) {
        str = String(str);
        var rep = {
            'CET': '+0100', 'CEST': '+0200', 'EST': '', 'WET': '+0000', 'WEZ': '+0000', 'WEST': '+0100',
            'EEST': '+0300', 'BST': '+0100', 'EET': '+0200', 'IST': '+0100', 'KUYT': '+0400', 'MSD': '+0400',
            'MSK': '+0400', 'SAMT': '+0400'
        };
        var reg = new RegExp('(' + Object.keys(rep).join('|') + ')', 'gi');
        return str.replace(reg, function (all, abbr) {
            return rep[abbr];
        });
    }

    function rssGetDate(node) {
        var pubDate = node.querySelector('pubDate, published');
        if (pubDate) {
            return (new Date(replaceUTCAbbr(pubDate.textContent))).getTime() || 0;
        }

        pubDate = node.querySelector('date');
        if (pubDate) {
            return (new Date(replaceUTCAbbr(pubDate.textContent))).getTime() || 0;
        }

        pubDate = node.querySelector('lastBuildDate, updated, update');

        if (pubDate) {
            return (new Date(replaceUTCAbbr(pubDate.textContent))).getTime() || 0;
        }
        return 0;
    }

    function rssGetAuthor(node, title) {
        var creator = node.querySelector('creator, author > name');
        if (creator) {
            creator = creator.textContent.trim();
        }

        if (!creator) {
            creator = node.querySelector('author');
            if (creator) {
                creator = creator.textContent.trim();
            }
        }

        if (!creator && title && title.length > 0) {
            creator = title;
        }

        if (creator) {
            if (/^\S+@\S+\.\S+\s+\(.+\)$/.test(creator)) {
                creator = creator.replace(/^\S+@\S+\.\S+\s+\((.+)\)$/, '$1');
            }
            creator = creator.replace(/\s*\(\)\s*$/, '');
            return creator;
        }

        return 'no author';
    }

    function rssGetTitle(node) {
        return node.querySelector('title') ? node.querySelector('title').textContent : '&lt;no title&gt;';
    }

    function rssGetContent(node) {
        var desc = node.querySelector('encoded');
        if (desc) {
            return desc.textContent;
        }

        desc = node.querySelector('description');
        if (desc) {
            return desc.textContent;
        }

        // content over summary because of "http://neregate.com/blog/feed/atom/"
        desc = node.querySelector('content');
        if (desc) {
            return desc.textContent;
        }

        desc = node.querySelector('summary');
        if (desc) {
            return desc.textContent;
        }

        return '&nbsp;';
    }


    return {
        parse: function () {
            return parseRSS.apply(null, arguments);
        }
    };
});