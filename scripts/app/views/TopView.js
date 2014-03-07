define([
	'backbone', 'jquery', 'underscore', 'modules/Locale', 'text!templates/source.html', 'views/feedList'
], function(BB, $, _, Locale, tplSource) {
	var TopView = BB.View.extend({
		tagName: 'div',
		className: 'list-item',
		template: _.template(tplSource),
		handleMouseUp: function(e) {
			if (e.which == 3) {
				this.showContextMenu(e);
			}
		},
		getSelectData: function(e) {
			return {
				action: 'new-select',
				// _.extend is important, because otherwise it would be sent by reference
				value: this.model.id || _.extend({}, this.model.get('filter')),
				name: this.model.get('name'),
				unreadOnly: !!e.altKey
			};
		},
		setTitle: function(unread, total) {
			this.$el.attr('title',
				this.model.get('title') + ' (' + unread + ' ' + Locale.c.UNREAD + ', ' + total + ' ' + Locale.c.TOTAL + ')'
			);
		}
	});

	return TopView;
});