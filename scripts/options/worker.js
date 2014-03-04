self.indexedDB = self.indexedDB || self.mozIndexedDB || self.webkitIndexedDB || self.msIndexedDB;
self.IDBTransaction = self.IDBTransaction || self.webkitIDBTransaction || self.msIDBTransaction;
self.IDBKeyRange = self.IDBKeyRange || self.webkitIDBKeyRange || self.msIDBKeyRange;


var request = indexedDB.open('backbone-indexeddb', 4);

var db;
var content;


request.addEventListener('error', function(e) {
	throw 'Error code: ' + this.errorCode;
});

request.addEventListener('success', function(e) {
	db = this.result;
	if (content) startImport();
});

onmessage = function(e) {
	if (e.data.action == 'file-content') {
		content = e.data.value;
		if (db) startImport();
	}
}

var writes = 0;

function handleReq(req) {
	writes++;
	req.onsuccess = req.onerror = function() {
		writes--;
		if (writes <= 0) {
			postMessage({ action: 'finished' });
		}
	}
}

function startImport() {
	var tx = this.db.transaction(['folders-backbone', 'sources-backbone', 'items-backbone'], 'readwrite');
	var folders = tx.objectStore('folders-backbone');
	var sources = tx.objectStore('sources-backbone');
	var items = tx.objectStore('items-backbone');

	var f = content.folders;
	var s = content.sources;
	var t = content.items;


	if (f) {
		for (var i=0,j=f.length; i<j; i++) {
			handleReq( folders.add(f[i]) );
			if (!(i % 10)) postMessage({ action: 'message', value: 'Folders: ' + i + '/' + j });
		}
	}

	if (s) {
		for (var i=0,j=s.length; i<j; i++) {
			handleReq( sources.add(s[i]) );
			if (!(i % 10)) postMessage({ action: 'message', value: 'Feeds: ' + i + '/' + j });
		}
	}

	if (t) {
		for (var i=0,j=t.length; i<j; i++) {
			handleReq( items.add(t[i]) );
			if (!(i % 10)) postMessage({ action: 'message', value: 'Articles: ' + i + '/' + j });
		}
	}

	if (writes == 0) {
		postMessage({ action: 'finished' });
	} else {
		postMessage({ action: 'message', value: 'Writing...' });
	}

}