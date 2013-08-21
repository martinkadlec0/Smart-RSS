function utf8_to_b64( str ) {
	return btoa(unescape(encodeURIComponent( str )));
}

function b64_to_utf8( str ) {
	return atob(str);
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
		$('#import-smart').change(handleImportSmart);
	});

	function handleChange(e) {
		var t = e.target;
		bg.settings.save(t.id, t.value);
	}

	function handleExportSmart() {
		var data = {
			sources: bg.sources.toJSON(),
			items: bg.items.toJSON(),
		};

		$('#smart-exported').attr('href', '#');
		$('#smart-exported').removeAttr('download');
		$('#smart-exported').html('Exporting, please wait');


		setTimeout(function() {
			var expr = JSON.stringify(data, null, '\t');
			$('#smart-exported').attr('href', 'data:text/plain;charset=UTF-8;text,' + expr);
			$('#smart-exported').attr('download', 'exported-rss.smart');
			$('#smart-exported').html('Click to download exported data');
		}, 20);
	}

	function handleImportSmart(e) {
		var file = e.currentTarget.files[0];
		if (!file || file.size == 0) return;

		var reader = new FileReader();
		reader.onload = function(e) {
			var data = JSON.safeParse(this.result);

			if (!data || !data.items || !data.sources) {
				alert('Wrong file');
				return;
			}

			alert('Starting import');

			alert(data.sources.length);

			for (var i=0; i<data.sources.length; i++) {
				if (!bg.sources.get(data.sources[i].id)) {
					bg.sources.create(data.sources[i]);	
				}
			}

			for (var i=0; i<data.items.length; i++) {
				if (!bg.items.get(data.items[i].id)) {
					bg.items.create(data.items[i]);	
				}
			}

			alert('Import completed');
		}

		reader.readAsText(file);
	}
});