define(['backbone', 'modules/Locale'], function(BB, Locale) {
	var SandboxView = BB.View.extend({
		tagName: 'iframe',
		loaded: false,
		events: {
			'load': 'handleLoad'
		},
		initialize: function() {
			this.$el.attr('src', 'rss_content.html');
			this.$el.attr('sandbox', 'allow-popups allow-same-origin');
			this.$el.attr('frameborder', 0);
			this.$el.attr('tabindex', -1);
		},
		render: function() {
			return this;
		},
		handleLoad: function() {
			this.loaded = true;
			this.el.contentDocument.querySelector('#smart-rss-url').innerHTML = Locale.c.FULL_ARTICLE;
			this.trigger('load');
		}
	});

	return SandboxView;
});