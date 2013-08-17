/*window.addEventListener('message', function(e) {
	window.frames.forEach(function(frame) {
		frame.postMessage(e.data, '*');
	});
});*/

var tabID = -1;

chrome.extension.sendMessage({ action: 'get-tab-id'}, function(response) {
	if (response.action == 'response-tab-id') {
		tabID = response.value;	
	}
});


chrome.runtime.getBackgroundPage(function(bg) {
	//var ls = parseInt(localStorage.getItem('vertical-layout')) || 0;
	var ls = bg.settings.get('layout');

	function layoutToVertical() {
		var fs = document.querySelectorAll('frameset');
		fs[1].cols = '*';
		fs[1].rows = bg.settings.get('posC');
	}

	function layoutToHorizontal() {
		var fs = document.querySelectorAll('frameset');
		fs[1].cols = bg.settings.get('posB');
		fs[1].rows = '';
	}

	
	if (document.querySelectorAll('frameset').length > 1) {
		init();
	} else {
		document.addEventListener('DOMContentLoaded', init);	
	}
	

	function init() {
		var fs = document.querySelectorAll('frameset');
		fs[0].cols = bg.settings.get('posA');
		if (ls == 'vertical') {
			layoutToVertical();
		} else {
			layoutToHorizontal();
		}
	}
	
	// might not happen!!!!!!!!
	
	function handleLayoutChange() {
		if (bg.settings.get('layout') == 'vertical') {
			layoutToVertical();
		} else {
			layoutToHorizontal();
		}
	}

	function handleClearEvents(id) {
		if (window == null || id == tabID) {
			bg.settings.off('change:layout', handleLayoutChange);
			bg.sources.off('clear-events', handleClearEvents);			
		}
	}

	bg.settings.on('change:layout', handleLayoutChange);
	bg.sources.on('clear-events', handleClearEvents);



});
