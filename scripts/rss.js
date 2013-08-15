/*window.addEventListener('message', function(e) {
	window.frames.forEach(function(frame) {
		frame.postMessage(e.data, '*');
	});
});*/


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
	

	bg.settings.on('change:layout', function() {
		if (bg.settings.get('layout') == 'vertical') {
			layoutToVertical();
		} else {
			layoutToHorizontal();
		}
	});

});
