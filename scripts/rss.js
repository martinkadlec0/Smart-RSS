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
		fs[1].rows = '50%,*';
	}

	function layoutToHorizontal() {
		var fs = document.querySelectorAll('frameset');
		fs[1].cols = '350,*';
		fs[1].rows = '';
	}

	if (ls == 'vertical') {
		if (document.querySelectorAll('frameset').length > 1) {
			 layoutToVertical();
		} else {
			document.addEventListener('DOMContentLoaded', layoutToVertical);	
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
