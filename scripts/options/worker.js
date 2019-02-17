self.indexedDB = self.indexedDB || self.mozIndexedDB || self.webkitIndexedDB || self.msIndexedDB;
self.IDBTransaction = self.IDBTransaction || self.webkitIDBTransaction || self.msIDBTransaction;
self.IDBKeyRange = self.IDBKeyRange || self.webkitIDBKeyRange || self.msIDBKeyRange;


var request = indexedDB.open('backbone-indexeddb', 4);

var db;
var content;


request.addEventListener('error', function (e) {
    throw 'Error code: ' + this.errorCode;
});

request.addEventListener('success', function (e) {
    db = this.result;
    if (content) startImport();
});

onmessage = function (e) {
    if (e.data.action === 'file-content') {
        content = e.data.value;
        if (db) startImport();
    }
};

var writes = 0;

function handleReq(req) {
    writes++;
    req.onsuccess = req.onerror = function () {
        writes--;
        if (writes <= 0) {
            postMessage({action: 'finished'});
        }
    };
}

function startImport() {
    var transaction = this.db.transaction(['folders-backbone', 'sources-backbone', 'items-backbone'], 'readwrite');
    var folders = transaction.objectStore('folders-backbone');
    var sources = transaction.objectStore('sources-backbone');
    var items = transaction.objectStore('items-backbone');

    var importedFolders = content.folders;
    var importedSources = content.sources;
    var importedItems = content.items;


    if (importedFolders) {
        for (let i = 0, j = importedFolders.length; i < j; i++) {
            handleReq(folders.add(importedFolders[i]));
            if (!(i % 10)) postMessage({action: 'message', value: 'Folders: ' + i + '/' + j});
        }
    }

    if (importedSources) {
        for (let i = 0, j = importedSources.length; i < j; i++) {
            handleReq(sources.add(importedSources[i]));
            if (!(i % 10)) postMessage({action: 'message', value: 'Feeds: ' + i + '/' + j});
        }
    }

    if (importedItems) {
        for (let i = 0, j = importedItems.length; i < j; i++) {
            handleReq(items.add(importedItems[i]));
            if (!(i % 10)) postMessage({action: 'message', value: 'Articles: ' + i + '/' + j});
        }
    }

    if (writes === 0) {
        postMessage({action: 'finished'});
    } else {
        postMessage({action: 'message', value: 'Writing...'});
    }

}