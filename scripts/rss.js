/*window.addEventListener('message', function(e) {
	window.frames.forEach(function(frame) {
		frame.postMessage(e.data, '*');
	});
});*/

var ls = parseInt(localStorage.getItem('vertical-layout')) || 0;

function layoutToVertical() {
	var fs = document.querySelectorAll('frameset');
	fs[1].cols = '*';
	fs[1].rows = '50%,50%';
}

function layoutToHorizontal() {
	var fs = document.querySelectorAll('frameset');
	fs[1].cols = '350,*';
	fs[1].rows = '';
}

document.addEventListener('DOMContentLoaded', function() {
	if (ls) layoutToVertical();
});

window.addEventListener('message', function(e) {
	if (e.data.action == 'layout-changed') {
		if (e.data.value) {
			layoutToVertical();
		} else {
			layoutToHorizontal();
		}
	}
});
