define([
	'backbone', 'jquery', '../../libs/template', 'modules/Locale', 'text!templates/source.html', 'views/feedList'
], function(BB, $, template, Locale, tplSource) {
	var TopView = BB.View.extend({
		tagName: 'div',
		className: 'list-item',
		template: template(tplSource),
		handleMouseUp: function(e) {
			if (e.which == 3) {
				this.showContextMenu(e);
			}
		},
		getSelectData: function(e) {
			return {
				action: 'new-select',
				value: this.model.id || Object.assign({}, this.model.get('filter')),
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