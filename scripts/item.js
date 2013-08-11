var chrome = window.top.chrome;

function utf8_to_b64( str ) {
	return btoa(unescape(encodeURIComponent( str )));
}

chrome.runtime.getBackgroundPage(function(bg) {

$(function() {

	var toolbar = new (Backbone.View.extend({
		el: '#toolbar',
		events: {
			'click #button-print': 'handleButtonPrint',
			'click #button-read': 'handleButtonRead',
			'click #button-delete': 'handleButtonDelete',
			'click #button-config': 'handleButtonConfig',
		},
		initialize: function() {
			
		},
		handleButtonPrint: function() {
			if (!itemView.model) return;
			window.print();
		},
		handleButtonRead: function() {
			if (!itemView.model) return;
			itemView.model.save({
				unread: !itemView.model.get('unread'),
				visited: true
			});
		},
		handleButtonDelete: function() {
			if (!itemView.model) return;
			/*itemView.model.save({
				'deleted': true,
				'content': '',
				'author': '',
				'title': ''
			});*/
			itemView.model.save({
				trashed: true
			});
		},
		handleButtonConfig: function() {
			overlay.show();
		}
	}));



	var overlay = new (Backbone.View.extend({
		el: '.overlay',
		events: {
			'change #config-layout': 'handleLayoutChange'
		},
		initialize: function() {
			window.addEventListener('blur', this.hide.bind(this));
			window.addEventListener('resize', this.hide.bind(this));
		},
		render: function() {
			var layout = parseInt(localStorage.getItem('vertical-layout')) || 0;
			this.$el.find('#config-layout').val(layout);
			return this;
		},
		handleLayoutChange: function(e) {
			var layout = parseInt($(e.currentTarget).val());
			localStorage.setItem('vertical-layout', layout.toString());
			window.top.postMessage({ action: 'layout-changed', value: layout }, '*');
			this.hide();
		},
		hide: function() {
			this.$el.css('display', 'none');
		},
		show: function() {
			this.render().$el.css('display', 'block');
		},
		isVisible: function() {
			return this.$el.css('display') == 'block';
		}
	}));

	var itemView = new (Backbone.View.extend({
		el: 'body',
		contentTemplate: _.template($('#template-content').html()),
		events: {
			'load iframe': 'handleIframeLoad',
			'mousedown': 'handleMouseDown'
		},
		handleMouseDown: function(e) {
			if (overlay.isVisible() && !e.target.matchesSelector('.overlay, .overlay *')) {
				overlay.hide();
			}
		},
		initialize: function() {
			var that = this;
			window.addEventListener('message', function(e) {
				if (e.data.action == 'new-select') {
					that.handleNewSelected(bg.items.findWhere({ id: e.data.value }));
				} else if (e.data.action == 'no-items') {
					that.model = null;
					that.hide();
				}
			});
		},
		handleIframeLoad: function() {
			alert('loaded');
		},
		render: function() {

			this.show();

			var date = bg.formatDate.call(new Date(this.model.get('date')), 'DD.MM.YYYY hh:mm:ss');

			var content = utf8_to_b64(this.contentTemplate({ 
				content: this.model.get('content'),
				url: this.model.get('url')
			}));

			this.$el.find('h1:first').html(this.model.escape('title'));
			this.$el.find('.author').html(this.model.escape('author'));
			this.$el.find('.date').html(date);
			this.$el.find('iframe').attr('src', 'data:text/html;charset=utf-8;base64,' + content);

			return this;
		},
		handleNewSelected: function(model) {
			this.model = model;
			this.render();
		},
		hide: function() {
			$('header,iframe').css('display', 'none');
		},
		show: function() {
			$('header,iframe').css('display', 'block');
		}
	}));

});

});