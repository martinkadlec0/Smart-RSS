define(['backbone', 'modules/Locale'], function(BB, Locale) {
	return BB.View.extend({
		tagName: 'iframe',
		loaded: false,
		events: {
			'load': 'handleLoad'
		},
		initialize: function () {
			this.el.setAttribute('src', 'rss_content.html');
			this.el.setAttribute('name', 'sandbox');
			this.el.setAttribute('frameborder', 0);
			this.el.setAttribute('tabindex', -1);
		},
		render: function () {
			return this;
		},
		handleLoad: function () {
			this.loaded = true;
			this.el.contentDocument.querySelector('#smart-rss-url').innerHTML = Locale.c.FULL_ARTICLE;
			this.el.contentDocument.addEventListener('keydown', app.handleKeyDown);
			this.trigger('load');
		}
	});
});