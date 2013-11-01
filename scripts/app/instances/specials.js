define([
	'backbone', 'models/Special', 'instances/contextMenus', 'views/feedList'
],
function(BB, Special, contextMenus) {
	
	var specials = {
		trash: new Special({
			title: bg.lang.c.TRASH,
			icon: 'trashsource.png',
			filter: { trashed: true, deleted: false },
			position: 'bottom',
			name: 'trash',
			onReady: function() {
				this.contextMenu = contextMenus.get('trash');
				this.el.addEventListener('dragover', function(e) {
					e.preventDefault();
				});
				this.el.addEventListener('drop', function(e) {
					e.preventDefault();
					var ids = JSON.parse(e.dataTransfer.getData('text/plain') || '[]') || [];
					ids.forEach(function(id) {
						var item = bg.items.findWhere({ id: id });
						if (item && !item.get('trashed')) {
							item.save({
								trashed: true
							});
						}
					});
				});
			}
		}),
		allFeeds: new Special({
			title: bg.lang.c.ALL_FEEDS,
			icon: 'icon16_v2.png',
			filter: { trashed: false },
			position: 'top',
			name: 'all-feeds',
			onReady: function() {
				this.contextMenu = contextMenus.get('allFeeds');
			}
		}),
		pinned: new Special({
			title: bg.lang.c.PINNED,
			icon: 'pinsource.png',
			filter: { trashed: false, pinned: true },
			position: 'bottom',
			name: 'pinned'
		})
	};

	return specials;
});