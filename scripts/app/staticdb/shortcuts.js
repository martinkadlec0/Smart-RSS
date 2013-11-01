define({
	global: {
		'shift+1': 'feeds:focus',
		'shift+2': 'articles:focus',
		'shift+3': 'content:focus',
		'esc': 'global:hideContextMenus',
		'shift+insert': 'global:runTests'
	},
	feeds: {
		'up': 'feeds:selectPrevious',
		'down': 'feeds:selectNext',
		'u': 'feeds:selectPrevious',
		'j': 'feeds:selectNext',
		
		'ctrl+left': 'feeds:closeFolders',
		'ctrl+right': 'feeds:openFolders',
		'left': 'feeds:toggleFolder',
		'right': 'feeds:showArticles',
		'enter': 'feeds:showAndFocusArticles',

		'shift+j': 'feeds:selectNext',
		'shift+down': 'feeds:selectNext',
		'shift+u': 'feeds:selectPrevious',
		'shift+up': 'feeds:selectPrevious',
	},
	articles: {
		'd': 'articles:delete',
		'del': 'articles:delete',
		'ctrl+f': 'articles:focusSearch',
		'enter': 'articles:fullArticle',
		'k': 'articles:mark',
		'j': 'articles:selectNext',
		'down': 'articles:selectNext',
		'u': 'articles:selectPrevious',
		'up': 'articles:selectPrevious',

		'shift+j': 'articles:selectNext',
		'shift+down': 'articles:selectNext',
		'shift+u': 'articles:selectPrevious',
		'shift+up': 'articles:selectPrevious',

		'g': 'articles:markAndNextUnread',
		't': 'articles:markAndPrevUnread',
		'h': 'articles:nextUnread',
		'y': 'articles:prevUnread',
		'z': 'articles:prevUnread',
		'ctrl+shift+a': 'articles:markAllAsRead',
		'ctrl+a': 'articles:selectAll',
		'p': 'articles:pin',
		'n': 'articles:undelete',
		'space': 'articles:spaceThrough',
		'r': 'articles:update'
	},
	content: {
		'up': 'content:scrollUp',
		'down': 'content:scrollDown',
		'space': 'content:spaceThrough',
		'pgup': 'content:pageUp',
		'pgdown': 'content:pageDown',
		'end': 'content:scrollToBottom',
		'home': 'content:scrollToTop',
		'del': 'content:delete',
		'd': 'content:delete',
		'r': 'content:mark'
	},
	keys: {
		8: 'backspace',
		9: 'tab',
		13: 'enter',
		//16: 'shift',
		//17: 'ctrl',
		20: 'capslock',
		27: 'esc',
		32: 'space',
		33: 'pgup',
		34: 'pgdown',
		35: 'end',
		36: 'home',
		37: 'left',
		38: 'up',
		39: 'right',
		40: 'down',
		45: 'insert',
		46: 'del'
	}
});



/****
if (e.keyCode == 38) {
	var cs = $('.selected:first');
	var s;
	if (cs.length) {
		s = cs.prevAll('.list-item:not(.in-closed-folder):first').get(0);
	} else {
		s = $('.list-item:not(.in-closed-folder):last').get(0);
	}
	if (s) s.view.select();
	e.preventDefault();
} else if (e.keyCode == 40) {
	var cs = $('.selected:first');
	var s;
	if (cs.length) {
		s = cs.nextAll('.list-item:not(.in-closed-folder):first').get(0);
	} else {
		s = $('.list-item:not(.in-closed-folder):first').get(0);
	}
	if (s) s.view.select();
	e.preventDefault();
} 

****/

