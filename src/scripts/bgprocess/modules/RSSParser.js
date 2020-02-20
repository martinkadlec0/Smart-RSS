/**
 * @module BgProcess
 * @submodule modules/RSSParser
 */
define([], function () {
    class RSSParser {

        getLink() {
            let base = this.source.get('base');
            const node = this.currentNode;
            let link = node.querySelector('link[rel="alternate"]');
            if (!link) {
                link = node.querySelector('link[type="text/html"]');
            }
            if (!link) {
                link = node.querySelector('link[type="text/html"]');
            }

            // prefer non atom links over atom links because of http://logbuch-netzpolitik.de/
            if (!link || link.prefix === 'atom') {
                link = node.querySelector('link');
            }

            if (!link) {
                const guid = node.querySelector('guid');
                let tmp;
                if (guid && (tmp = guid.textContent.match(/:\/\//)) && tmp.length) {
                    link = guid;
                }
            }
            if (!link) {
                return false;
            }

            let address = (link.textContent || link.getAttribute('href')).trim();

            if (!address.startsWith('http')) {
                if (address.startsWith('/')) {
                    address = address.substr(1);
                }
                if (base.endsWith('/')) {
                    base = base.substr(0, base.length - 1);
                }
                address = base + '/' + address;
            }

            return address;
        }

        getTitle() {
            let title = this.document.querySelector('channel > title, feed > title, rss > title');
            if (!title || !(title.textContent).trim()) {
                title = this.document.querySelector('channel > description, feed > description, rss > description');
            }

            if (!title || !(title.textContent).trim()) {
                title = this.document.querySelector('channel > description, feed > description, rss > description');
            }

            if (!title || !(title.textContent).trim()) {
                title = this.document.querySelector('channel > link, feed > link, rss > link');
            }
            title = title && title.textContent ? title.textContent.trim() || 'rss' : 'rss';
            return title.trim();
        }

        replaceUTCAbbr(str) {
            str = String(str);
            const rep = {
                'CET': '+0100', 'CEST': '+0200', 'EST': '', 'WET': '+0000', 'WEZ': '+0000', 'WEST': '+0100',
                'EEST': '+0300', 'BST': '+0100', 'EET': '+0200', 'IST': '+0100', 'KUYT': '+0400', 'MSD': '+0400',
                'MSK': '+0400', 'SAMT': '+0400'
            };
            const reg = new RegExp('(' + Object.keys(rep).join('|') + ')', 'gi');
            return str.replace(reg, (all, abbr) => {
                return rep[abbr];
            });
        }

        getDate() {
            const node = this.currentNode;
            let pubDate = node.querySelector('pubDate, published');
            if (pubDate) {
                return (new Date(this.replaceUTCAbbr(pubDate.textContent))).getTime() || 0;
            }

            pubDate = node.querySelector('date');
            if (pubDate) {
                return (new Date(this.replaceUTCAbbr(pubDate.textContent))).getTime() || 0;
            }

            pubDate = node.querySelector('lastBuildDate, updated, update');

            if (pubDate) {
                return (new Date(this.replaceUTCAbbr(pubDate.textContent))).getTime() || 0;
            }
            return 0;
        }

        getAuthor() {
            const node = this.currentNode;
            const feedTitle = this.source.get('title');
            let creator = node.querySelector('creator, author > name');
            if (creator) {
                creator = creator.textContent.trim();
            }

            if (!creator) {
                creator = node.querySelector('author');
                if (creator) {
                    creator = creator.textContent.trim();
                }
            }

            if (!creator && feedTitle && feedTitle.length > 0) {
                creator = feedTitle;
            }

            if (creator) {
                if (/^\S+@\S+\.\S+\s+\(.+\)$/.test(creator)) {
                    creator = creator.replace(/^\S+@\S+\.\S+\s+\((.+)\)$/, '$1');
                }
                creator = creator.replace(/\s*\(\)\s*$/, '');
                return creator.trim();
            }

            return 'no author';
        }

        getArticleTitle() {
            return (this.currentNode.querySelector('title') ? this.currentNode.querySelector('title').textContent : '&lt;no title&gt;').trim();
        }

        getArticleContent() {
            const node = this.currentNode;
            let desc = node.querySelector('encoded');
            if (desc) {
                return desc.textContent;
            }

            desc = node.querySelector('description');
            if (desc) {
                return desc.textContent;
            }

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

        getGuid() {
            const node = this.currentNode;
            let guid = node.querySelector('guid');
            return (guid ? guid.textContent : this.getLink() || '').trim();
        }

        getEnclosure() {
            const node = this.currentNode;
            let enclosureNode = node.querySelector('enclosure');
            if (!enclosureNode) {
                return '';
            }
            let enclosure = {};
            enclosure.url = enclosureNode.hasAttribute('url') ? enclosureNode.getAttribute('url') : '';
            enclosure.name = enclosureNode.hasAttribute('url') ? enclosure.url.substring(enclosure.url.lastIndexOf('/') + 1) : '';
            enclosure.type = enclosureNode.hasAttribute('type') ? enclosureNode.getAttribute('type') : '';
            enclosure.length = enclosureNode.hasAttribute('length') ? enclosureNode.getAttribute('length') : '';

            console.log(enclosureNode);


            return enclosure;
        }


        parse() {
            let items = [];
            const data = {};

            let nodes = this.document.querySelectorAll('item');
            if (!nodes.length) {
                nodes = this.document.querySelectorAll('entry');
            }

            const title = this.getTitle(this.document);


            if (title && (this.source.get('title') === this.source.get('url') || !this.source.get('title'))) {
                data.title = title;
            }


            const mainEl = this.document.querySelector('rss, rdf, feed, channel');
            if (mainEl) {
                let baseStr = mainEl.getAttribute('xml:base') || mainEl.getAttribute('xmlns:base') || mainEl.getAttribute('base') || mainEl.querySelector('link').textContent || (mainEl.querySelector('link') && mainEl.querySelector('link:not([rel="self"])').getAttribute('href'));
                if (!baseStr) {
                    baseStr = this.source.get('url');
                }
                if (baseStr) {
                    const prefix = this.source.get('url').includes('http://') ? 'http://' : 'https://';
                    const urlParts = baseStr.replace('http://', '').replace('https://', '').replace('//', '').split(/[/?#]/);
                    baseStr = prefix + urlParts[0];
                    data.base = baseStr;
                }
                data.uid = this.source.get('url').replace(/^(.*:)?(\/\/)?(www*?\.)?/, '').replace(/\/$/, '');
                this.source.save(data);
            }

            [...nodes].forEach((node) => {
                this.currentNode = node;
                items.push({
                    id: this.getGuid(),
                    title: this.getArticleTitle(),
                    url: this.getLink(),
                    date: this.getDate(),
                    author: this.getAuthor(),
                    content: this.getArticleContent(),
                    sourceID: this.source.get('id'),
                    enclosure: this.getEnclosure(),
                    dateCreated: Date.now()
                });

                const last = items[items.length - 1];

                if (last.date === 0) {
                    last.date = Date.now();
                }
            });
            return items;
        }

        constructor(document, source) {
            if (!document) {
                throw 'No document specified';
            }
            if (!(document instanceof XMLDocument)) {
                throw 'Invalid document';
            }
            if (!source) {
                throw 'No source specified';
            }
            this.document = document;
            this.source = source;
        }
    }

    return RSSParser;
});
