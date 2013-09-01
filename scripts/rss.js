/*window.addEventListener('message', function(e) {
	window.frames.forEach(function(frame) {
		frame.postMessage(e.data, '*');
	});
});*/

var tabID = -1;



chrome.runtime.getBackgroundPage(function(bg) {

	chrome.extension.sendMessage({ action: 'get-tab-id'}, function(response) {
		if (response.action == 'response-tab-id') {
			tabID = response.value;	
		}
	});

	chrome.runtime.connect();

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
	
	function setFirstFrameSize() {
		var fs = document.querySelectorAll('frameset');
		if (!bg.settings.get('panelToggled')) {
			fs[0].cols = '4,*';
			fs[0].firstElementChild.setAttribute('noresize', true);
			fs[0].firstElementChild.setAttribute('scrolling', 'no');
		} else {
			fs[0].cols = bg.settings.get('posA');
			fs[0].firstElementChild.removeAttribute('noresize');
			fs[0].firstElementChild.setAttribute('scrolling', 'yes');
		}
	}

	function init() {
		setFirstFrameSize();
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
			bg.settings.off('change:panelToggled', setFirstFrameSize);
			bg.sources.off('clear-events', handleClearEvents);			
		}
	}

	bg.settings.on('change:layout', handleLayoutChange);
	bg.settings.on('change:panelToggled', setFirstFrameSize);
	bg.sources.on('clear-events', handleClearEvents);



});
