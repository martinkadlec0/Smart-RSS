/**
 * @module BgProcess
 * @submodule modules/RSSParser
 */
define(['he'], function (he) {
    class RSSParser {

        getLink() {
            const urlMatcher = /.+:\/\//;
            let base = urlMatcher.exec(this.source.get('base')) ? this.source.get('base') : this.source.get('url'); // some feeds only give relative URLs but no base

            const node = this.currentNode;
            let linkNode = node.querySelector('link[rel="alternate"]');
            if (!linkNode) {
                linkNode = node.querySelector('link[type="text/html"]');
            }

            // prefer non atom links over atom links because of http://logbuch-netzpolitik.de/
            if (!linkNode || linkNode.prefix === 'atom') {
                linkNode = node.querySelector('link');
            }

            if (!linkNode) {
                const guid = node.querySelector('guid');
                let tmp;
                if (guid && (tmp = guid.textContent.match(urlMatcher)) && tmp.length) {
                    linkNode = guid;
                }
            }
            if (!linkNode) {
                return false;
            }

            let address = (linkNode.textContent || linkNode.getAttribute('href')).trim();

            const match = urlMatcher.exec(address);
            if (!match) {
                try {
                    // it might be a relative URL, so try to convert it into one based on the base
                    address = new URL(address, base).toString();
                } catch (e) {
                    // not a valid URL
                    return false;
                }
            }

            return address.replace(/^(javascript:\.)/, '');
        }

        getSourceTitle() {
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
            title = title.trim();
            return title.length ? title : '<no title>';
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
            let publicationDate = node.querySelector('pubDate, published');
            if (publicationDate) {
                return (new Date(this.replaceUTCAbbr(publicationDate.textContent))).getTime() || 0;
            }

            publicationDate = node.querySelector('date');
            if (publicationDate) {
                return (new Date(this.replaceUTCAbbr(publicationDate.textContent))).getTime() || 0;
            }

            publicationDate = node.querySelector('lastBuildDate, updated, update');

            if (publicationDate) {
                return (new Date(this.replaceUTCAbbr(publicationDate.textContent))).getTime() || 0;
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
                return he.decode(creator.trim());
            }

            return 'no author';
        }

        getArticleTitle() {
            const node = this.currentNode.querySelector('title');
            const title = node ? this.currentNode.querySelector('title').textContent.trim() : '<no title>';
            return he.decode(title);
        }

        getArticleContent() {
            const node = this.currentNode;
            const encoded = node.querySelector('encoded');
            if (encoded) {
                return he.decode(encoded.textContent);
            }

            const description = node.querySelector('description');
            if (description) {
                return he.decode(description.textContent);
            }

            const content = node.querySelector('content');
            if (content) {
                if (content.getAttribute('type') !== 'xhtml') {
                    return he.decode(content.textContent);
                }
                const childNodes = content.childNodes;
                let stitchedText = '';
                const xmlSerializer = new XMLSerializer();
                [...childNodes].forEach((node) => {
                    if (node.nodeType !== Node.TEXT_NODE) {
                        stitchedText += xmlSerializer.serializeToString(node);
                    }
                });

                const text = stitchedText.replace(/xhtml:/g, '');
                return he.decode(text);
            }

            const summary = node.querySelector('summary');
            if (summary) {
                return summary.textContent;
            }

            return '&nbsp;';
        }

        getGuid() {
            const node = this.currentNode;
            let guid = node.querySelector('guid');
            if (!guid) {
                guid = node.querySelector('id');
            }
            return (guid ? guid.textContent : this.getLink() || '').trim() + this.source.get('id');
        }

        getOldGuid() {
            const node = this.currentNode;
            let guid = node.querySelector('guid');
            return (guid ? guid.textContent : this.getLink() || '').trim() + this.source.get('id');
        }

        getEnclosure(enclosureNode, title) {
            let enclosure = {};
            enclosure.url = enclosureNode.hasAttribute('url') ? enclosureNode.getAttribute('url').replace(/^(javascript:\.)/, '') : '';
            enclosure.name = he.decode(enclosureNode.hasAttribute('url') ? enclosure.url.substring(enclosure.url.lastIndexOf('/') + 1) : title);
            enclosure.type = enclosureNode.hasAttribute('type') ? enclosureNode.getAttribute('type') : '';
            enclosure.medium = enclosureNode.hasAttribute('medium') ? enclosureNode.getAttribute('medium') : this.getMediumFromType(enclosure.type, enclosure.name);
            enclosure.medium = enclosure.url.includes('youtube.com') ? 'youtube' : enclosure.medium;
            enclosure.length = enclosureNode.hasAttribute('length') ? enclosureNode.getAttribute('length') : '';
            return enclosure;
        }

        getEnclosures() {
            const node = this.currentNode;
            const knownUrls = [];
            const mediaTitleNode = [...node.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'title')][0];
            const title = mediaTitleNode ? mediaTitleNode.textContent : '';

            const enclosures = [];
            const enclosureNode = node.querySelector('enclosure');
            if (enclosureNode) {
                const foundEnclosure = this.getEnclosure(enclosureNode, title);
                enclosures.push(foundEnclosure);
                knownUrls.push(foundEnclosure.url);
            }

            const enclosureNodes = [...node.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'content')];
            enclosureNodes.forEach((enclosureNode) => {
                const foundEnclosure = this.getEnclosure(enclosureNode, title);
                if (knownUrls.includes(foundEnclosure.url)) {
                    return;
                }
                knownUrls.push(foundEnclosure.url);
                enclosures.push(foundEnclosure);
            });

            return enclosures;
        }

        getMediumFromType(type, name) {
            const extension = name.split('.')[1] ? name.split('.')[1] : '';
            const splitType = type.split('/');
            if (splitType.length > 0) {
                if (['audio', 'image', 'video'].includes(splitType[0])) {
                    return splitType[0];
                }
                if (splitType[0] === 'text') {
                    return 'document';
                }
            }
            if (type.includes('application/octet-stream')) {
                return 'executable';
            }
            if (type.includes('application/x-msdownload')) {
                return 'executable';
            }
            const imgExtensions = [
                'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'
            ];
            if (imgExtensions.includes(extension)) {
                return 'image';
            }


            return '';
        }

        getBaseUrl() {
            const rootElement = this.document.querySelector('rss, rdf, feed, channel');
            if (!rootElement) {
                return;
            }
            let baseStr = rootElement.getAttribute('xml:base');
            if (!baseStr) {
                baseStr = rootElement.getAttribute('xmlns:base');
            }
            if (!baseStr) {
                baseStr = rootElement.getAttribute('base');
            }
            if (!baseStr) {
                const node = rootElement.querySelector(':scope > link[rel="alternate"]');
                if (node) {
                    baseStr = node.textContent;
                }
            }
            if (!baseStr) {
                const node = rootElement.querySelector(':scope > link[rel="alternate"]');
                if (node) {
                    baseStr = node.getAttribute('href');
                }
            }
            if (!baseStr) {
                const node = rootElement.querySelector(':scope > link:not([rel="self"])');
                if (node) {
                    baseStr = node.getAttribute('href');
                }
            }
            if (!baseStr) {
                baseStr = new URL(this.source.get('url')).origin;
            }

            const urlMatcher = /.+:\/\//;
            return urlMatcher.exec(baseStr) ? baseStr : this.source.get('url');
        }


        parse() {
            const items = [];
            const sourceData = {};

            const nodes = [...this.document.querySelectorAll('item, entry')];

            const title = he.decode(this.getSourceTitle());
            if (title && (this.source.get('title') === this.source.get('url') || !this.source.get('title'))) {
                sourceData.title = title;
            }
            const baseUrl = this.getBaseUrl();
            if (baseUrl) {
                sourceData.base = baseUrl;
            }

            sourceData.uid = this.source.get('url').replace(/^(.*:)?(\/\/)?(ww+\.)?/, '').replace(/\/$/, '');
            this.source.save(sourceData);


            [...nodes].forEach((node) => {
                this.currentNode = node;
                const newItem = {
                    id: this.getGuid(),
                    oldId: this.getOldGuid(),
                    title: this.getArticleTitle(),
                    url: this.getLink(),
                    date: this.getDate(),
                    author: this.getAuthor(),
                    content: this.getArticleContent(),
                    sourceID: this.source.get('id'),
                    enclosure: this.getEnclosures(),
                    dateCreated: Date.now(),
                    emptyDate: false
                };
                if (newItem.date === 0) {
                    newItem.date = Date.now();
                    newItem.emptyDate = true;
                }
                items.push(newItem);
            });
            this.document = null;
            this.source = null;
            return items;
        }

        constructor(response, source) {
            const document = new DOMParser().parseFromString(response.trim(), 'text/xml');
            const error = document.querySelector('parsererror');
            if (error) {
                throw error.textContent;
            }
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
