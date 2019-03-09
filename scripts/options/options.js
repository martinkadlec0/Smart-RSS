const entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;'
};

function escapeHtml(string) {
    var str = String(string).replace(/[&<>"']/gm, function (s) {
        return entityMap[s];
    });
    str = str.replace(/\s/, function (f) {
        if (f === ' ') return ' ';
        return '';
    });
    return str;
}

function decodeHTML(str) {
    str = str || '';
    var map = {'gt': '>', 'lt': '<', 'amp': '&', 'quot': '"'};
    return str.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);?/gmi, function ($0, $1) {
        if ($1[0] === '#') {
            return String.fromCharCode($1[1].toLowerCase() === 'x' ? parseInt($1.substr(2), 16) : parseInt($1.substr(1), 10));
        } else {
            return map.hasOwnProperty($1) ? map[$1] : $0;
        }
    });
}


JSON.safeParse = function (str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
};

chrome.runtime.getBackgroundPage(function (bg) {
    const documentReady = () => {
        document.querySelector('#version').innerHTML = bg.version || 'dev build';

        [...document.querySelectorAll('select[id], input[type=number], input[type=range], input[type=range]')].forEach((item) => {
            item.value = bg.settings.get(item.id);
            if (item.type === 'number') {
                item.addEventListener('input', handleChange);
            } else {
                item.addEventListener('change', handleChange);
            }
        });

        [...document.querySelectorAll('input[type=checkbox]')].forEach((item) => {
            item.checked = !!bg.settings.get(item.id);
            item.addEventListener('change', handleCheck);
        });

        document.querySelector('#useSound').addEventListener('change', () => {
            bg.loader.playNotificationSound();
        });

        document.querySelector('#default-sound').addEventListener('change', handleDefaultSound);
        document.querySelector('#export-smart').addEventListener('click', handleExportSmart);
        document.querySelector('#export-opml').addEventListener('click', handleExportOPML);
        document.querySelector('#clear-data').addEventListener('click', handleClearData);
        document.querySelector('#import-smart').addEventListener('change', handleImportSmart);
        document.querySelector('#import-opml').addEventListener('change', handleImportOPML);
    };


    if (document.readyState !== 'loading') {
        documentReady();
    } else {
        document.addEventListener('DOMContentLoaded', documentReady);
    }

    function handleChange(event) {
        const target = event.target;
        bg.settings.save(target.id, target.value);
    }

    function handleCheck(event) {
        const target = event.target;
        bg.settings.save(target.id, target.checked);
    }

    function handleDefaultSound(e) {
        const file = e.currentTarget.files[0];
        if (!file || file.size === 0) {
            return;
        }

        if (!file.type.match(/audio.*/)) {
            alert('Please select audio file!');
            return;
        }

        if (file.size > 500000) {
            alert('Please use file smaller than 500kB!');
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            bg.settings.save('defaultSound', this.result);
        };

        reader.readAsDataURL(file);
    }

    function handleExportSmart() {
        const smartExportStatus = document.querySelector('#smart-exported');
        const data = {
            folders: bg.folders.toJSON(),
            sources: bg.sources.toJSON(),
            items: bg.items.toJSON()
        };

        smartExportStatus.setAttribute('href', '#');
        smartExportStatus.removeAttribute('download');
        smartExportStatus.innerHTML = 'Exporting, please wait';


        setTimeout(() => {
            const expr = new Blob([JSON.stringify(data)]);
            smartExportStatus.setAttribute('href', URL.createObjectURL(expr));
            smartExportStatus.setAttribute('download', 'exported-rss.smart');
            smartExportStatus.innerHTML = 'Click to download exported data';
        }, 20);
    }

    function handleExportOPML() {

        function addFolder(doc, title, id) {
            const folder = doc.createElement('outline');
            folder.setAttribute('text', escapeHtml(title));
            folder.setAttribute('title', escapeHtml(title));
            folder.setAttribute('id', id);
            return folder;
        }

        function addSource(doc, title, url) {
            const source = doc.createElement('outline');
            source.setAttribute('text', escapeHtml(title));
            source.setAttribute('title', escapeHtml(title));
            source.setAttribute('type', 'rss');
            source.setAttribute('xmlUrl', url);
            return source;
        }

        function addLine(doc, to, ctn) {
            const line = doc.createTextNode(ctn || '\n\t');
            to.appendChild(line);
        }

        const opmlExportStatus = document.querySelector('#opml-exported');

        opmlExportStatus.setAttribute('href', '#');
        opmlExportStatus.removeAttribute('download');
        opmlExportStatus.innerHTML = 'Exporting, please wait';

        const start = '<?xml version="1.0" encoding="utf-8"?>\n<opml version="1.0">\n<head>\n\t<title>Newsfeeds exported from Smart RSS</title>\n</head>\n<body>';
        const end = '\n</body>\n</opml>';

        const parser = new DOMParser();
        const doc = parser.parseFromString(start + end, 'application/xml');


        setTimeout(function () {
            const body = doc.querySelector('body');

            bg.folders.forEach(function (folder) {
                addLine(doc, body);
                body.appendChild(addFolder(doc, folder.get('title'), folder.get('id')));
            });


            bg.sources.forEach(function (source) {
                if (source.get('folderID')) {
                    const folder = body.querySelector('[id="' + source.get('folderID') + '"]');
                    if (folder) {
                        addLine(doc, folder, '\n\t\t');
                        folder.appendChild(addSource(doc, source.get('title'), source.get('url')));
                    } else {
                        addLine(doc, body);
                        body.appendChild(addSource(doc, source.get('title'), source.get('url')));
                    }
                } else {
                    addLine(doc, body);
                    body.appendChild(addSource(doc, source.get('title'), source.get('url')));
                }
            });

            const folders = body.querySelectorAll('[id]');
            [...folders].forEach((folder) => {
                folder.removeAttribute('id');
            });

            const expr = new Blob([(new XMLSerializer()).serializeToString(doc)]);
            opmlExportStatus.setAttribute('href', URL.createObjectURL(expr));
            opmlExportStatus.setAttribute('download', 'exported-rss.opml');
            opmlExportStatus.innerHTML = 'Click to download exported data';
        }, 20);
    }

    function handleImportSmart(e) {
        const smartImportStatus = document.querySelector('#smart-imported');
        const file = e.target.files[0];
        if (!file || file.size === 0) {
            smartImportStatus.innerHTML = 'Wrong file';
            return;
        }
        smartImportStatus.innerHTML = 'Loading & parsing file';

        const reader = new FileReader();
        reader.onload = function (e) {
            const data = JSON.safeParse(this.result);

            if (!data || !data.items || !data.sources) {
                smartImportStatus.innerHTML = 'Wrong file';
                return;
            }

            smartImportStatus.innerHTML = 'Importing, please wait!';

            const worker = new Worker('scripts/options/worker.js');
            worker.onmessage = function (e) {
                if (e.data.action === 'finished') {
                    smartImportStatus.innerHTML = 'Loading data to memory!';

                    bg.fetchAll().always(function () {
                        bg.info.refreshSpecialCounters();
                        smartImportStatus.innerHTML = 'Import fully completed!';
                        bg.loader.downloadAll(true);
                    });
                } else if (e.data.action === 'message') {
                    smartImportStatus.innerHTML = e.data.value;
                }
            };
            worker.postMessage({action: 'file-content', value: data});

            worker.onerror = function (e) {
                alert('Importing error: ' + e.message);
            };
        };

        const url = chrome.extension.getURL('rss.html');
        chrome.tabs.query({url: url}, function (tabs) {
            for (let i = 0; i < tabs.length; i++) {
                chrome.tabs.remove(tabs[i].id);
            }

            // wait for clear events to happen
            setTimeout(function () {
                reader.readAsText(file);
            }, 1000);
        });
    }

    function handleImportOPML(e) {
        const opmlImportStatus = document.querySelector('#opml-imported');
        const file = e.target.files[0];
        if (!file || file.size === 0) {
            opmlImportStatus.innerHTML = 'Wrong file';
            return;
        }

        opmlImportStatus.innerHTML = 'Importing, please wait!';

        const reader = new FileReader();
        reader.onload = function (e) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(this.result, 'application/xml');

            if (!doc) {
                opmlImportStatus.innerHTML = 'Wrong file';
                return;
            }

            const feeds = doc.querySelectorAll('body > outline[text], body > outline[title]');

            [...feeds].forEach((feed)=>{
                if (!feed.hasAttribute('xmlUrl')) {
                    const subfeeds = feed.querySelectorAll('outline[xmlUrl]');
                    const folderTitle = decodeHTML(feed.getAttribute('title') || feed.getAttribute('text'));

                    const duplicate = bg.folders.findWhere({title: folderTitle});

                    const folder = duplicate || bg.folders.create({
                        title: folderTitle
                    }, {wait: true});

                    [...subfeeds].forEach((subfeed)=>{
                        if (bg.sources.findWhere({url: decodeHTML(subfeed.getAttribute('xmlUrl'))})) {
                            return;
                        }
                        bg.sources.create({
                            title: decodeHTML(subfeed.getAttribute('title') || subfeed.getAttribute('text')),
                            url: decodeHTML(subfeed.getAttribute('xmlUrl')),
                            updateEvery: -1,
                            folderID: folder.get('id')
                        }, {wait: true});

                    });
                  } else {
                    if (bg.sources.findWhere({url: decodeHTML(feed.getAttribute('xmlUrl'))})) {
                        return;
                    }
                    bg.sources.create({
                        title: decodeHTML(feed.getAttribute('title') || feed.getAttribute('text')),
                        url: decodeHTML(feed.getAttribute('xmlUrl')),
                        updateEvery: -1
                    }, {wait: true});
                }
            });

            opmlImportStatus.innerHTML = 'Import completed!';

            setTimeout(function () {
                bg.loader.downloadAll(true);
            }, 10);
        };


        reader.readAsText(file);
    }

    function handleClearData() {
        if (!confirm('Do you really want to remove all extension data?')) {
            return;
        }

        bg.indexedDB.deleteDatabase('backbone-indexeddb');
        localStorage.clear();
        chrome.alarms.clearAll();
        chrome.runtime.reload();
    }
});