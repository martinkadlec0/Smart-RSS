function utf8_to_b64( str ) {
	return btoa(unescape(encodeURIComponent( str )));
}

function b64_to_utf8( str ) {
	return atob(str);
}

var entityMap = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': '&quot;',
	"'": '&#39;'
};

function escapeHtml(string) {
	var str = String(string).replace(/[&<>"']/gm, function (s) {
	  return entityMap[s];
	});
	str = str.replace(/\s/, function(f) {
		if (f == ' ') return ' ';
		return '';
	});
	return str;
}


JSON.safeParse = function(str) {
	try {
		return JSON.parse(str);	
	} catch(e) {
		return null;
	}
}

chrome.runtime.getBackgroundPage(function(bg) {
	$(function() {
		$('select[id]').each(function(i, item) {
			$(item).val(bg.settings.get(item.id));
			$(item).change(handleChange);
		});

		$('#export-smart').click(handleExportSmart);
		$('#export-opml').click(handleExportOPML);
		$('#clear-data').click(handleClearData);
		$('#import-smart').change(handleImportSmart);
		$('#import-opml').change(handleImportOPML);
	});

	function handleChange(e) {
		var t = e.target;
		bg.settings.save(t.id, t.value);
	}

	function handleExportSmart() {
		var data = {
			folders: bg.folders.toJSON(),
			sources: bg.sources.toJSON(),
			items: bg.items.toJSON(),
		};

		$('#smart-exported').attr('href', '#');
		$('#smart-exported').removeAttr('download');
		$('#smart-exported').html('Exporting, please wait');


		setTimeout(function() {
			var expr = new Blob([JSON.stringify(data)]);
			$('#smart-exported').attr('href', URL.createObjectURL(expr));
			$('#smart-exported').attr('download', 'exported-rss.smart');
			$('#smart-exported').html('Click to download exported data');
		}, 20);
	}

	function handleExportOPML() {

		$('#opml-exported').attr('href', '#');
		$('#opml-exported').removeAttr('download');
		$('#opml-exported').html('Exporting, please wait');

		var start = '<?xml version="1.0" encoding="utf-8"?>\n<opml version="1.0">\n<head>\n\t<title>Newsfeeds exported from Smart RSS</title>\n</head>\n<body>';
		var middle = '';
		var end = '\n</body>\n</opml>';


		setTimeout(function() {
			bg.sources.forEach(function(source) {
				middle += '\n\t<outline text="' + escapeHtml(source.get('title')) + '" title="' + escapeHtml(source.get('title')) + '" type="rss" xmlUrl="' + escapeHtml(source.get('url')) + '" />';
			});

			var expr = new Blob([start + middle + end]);
			$('#opml-exported').attr('href', URL.createObjectURL(expr));
			$('#opml-exported').attr('download', 'exported-rss.opml');
			$('#opml-exported').html('Click to download exported data');
		}, 20);
	}

	function handleImportSmart(e) {
		var file = e.currentTarget.files[0];
		if (!file || file.size == 0) {
			$('#smart-imported').html('Wrong file');
			return;
		}

		$('#smart-imported').html('Importing, please wait!');

		

		var reader = new FileReader();
		reader.onload = function(e) {
			var data = JSON.safeParse(this.result);

			if (!data || !data.items || !data.sources) {
				$('#smart-imported').html('Wrong file');
				return;
			}

			var ifindex = 1;
			var isindex = 1;


			if (data.folders) {
				for (var i=0; i<data.folders.length; i++) {
					ifindex = Math.max(ifindex, data.folders[i].id);
					if (!bg.folders.get(data.folders[i].id)) {
						bg.folders.create(data.folders[i]);	
					}
				}
			}

			for (var i=0; i<data.sources.length; i++) {
				isindex = Math.max(isindex, data.sources[i].id);
				if (!bg.sources.get(data.sources[i].id)) {
					bg.sources.create(data.sources[i]);	
				}
			}

			for (var i=0; i<data.items.length; i++) {
				if (!bg.items.get(data.items[i].id)) {
					bg.items.create(data.items[i]);	
				}
			}

			bg.folderIdIndex = Math.max(bg.folderIdIndex, ifindex) + 1;
			bg.sourceIdIndex = Math.max(bg.sourceIdIndex, isindex) + 1;

			localStorage.setItem('folderIdIndex', bg.folderIdIndex);
			localStorage.setItem('sourceIdIndex', bg.sourceIdIndex);

			$('#smart-imported').html('Import completed!');
		}

		var url = chrome.extension.getURL('rss.html');
		chrome.tabs.query({ url: url }, function(tabs) {
			for (var i=0; i < tabs.length; i++) {
				chrome.tabs.remove(tabs[i].id);
			} 

			// wait for clear events to happen
			setTimeout(function() {
				reader.readAsText(file);
			}, 1000);
		});
	}

	function handleImportOPML(e) {
		var file = e.currentTarget.files[0];
		if (!file || file.size == 0) {
			$('#opml-imported').html('Wrong file');
			return;
		}

		$('#opml-imported').html('Importing, please wait!');

		var reader = new FileReader();
		reader.onload = function(e) {
			var parser = new DOMParser();
        	var doc = parser.parseFromString(this.result, 'application/xml');

			if (!doc) {
				$('#opml-imported').html('Wrong file');
				return;
			}

			var feeds = doc.querySelectorAll('outline[type=rss]');

			for (var i=0; i<feeds.length; i++) {
				bg.sources.create({
					id: bg.sourceIdIndex++,
					title: feeds[i].getAttribute('title'),
					url: feeds[i].getAttribute('xmlUrl'),
					updateEvery: 180
				});
			}

			$('#opml-imported').html('Import completed!');

			setTimeout(function() {
				bg.downloadAll();
			}, 10);
		}


		reader.readAsText(file);
	}

	function handleClearData() {
		var c = confirm('Do you really want to remove all extension data?');
		if (!c) return;

		localStorage.clear();
		chrome.alarms.clearAll()
		chrome.runtime.reload();
	}
});