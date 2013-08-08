function utf8_to_b64( str ) {
	//return encodeURIComponent( str );
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
			window.print();
		},
		handleButtonRead: function() {
			itemView.model.save({
				unread: !itemView.model.get('unread')
			});
		},
		handleButtonDelete: function() {
			itemView.model.save({
				'deleted': true,
				'content': '',
				'author': '',
				'title': ''
			});
			itemView.getSome();
		},
		handleButtonConfig: function() {
			$('body').append(overlay.render().$el);
			setTimeout(function() {
				overlay.$el.remove();
			}, 2000);

		}
	}));



	var overlay = new (Backbone.View.extend({
		tagName: 'div',
		className: 'overlay',
		render: function() {
			this.$el.html('No options yet :(');
			return this;
		}
	}));

	var itemView = new (Backbone.View.extend({
		el: 'body',
		contentTemplate: _.template($('#template-content').html()),
		events: {
			'load iframe': 'handleIframeLoad'
		},
		initialize: function() {
			var that = this;
			//bg.items.on('new-selected', this.handleNewSelected, this);
			window.addEventListener('message', function(e) {
				if (e.data.action == 'new-select') {
					that.handleNewSelected(bg.items.findWhere({ id: e.data.value }));
				}
			});
			this.getSome();
		},
		handleIframeLoad: function() {
			alert('loaded');
		},
		getSome: function() {
			var first = bg.items.findWhere({ deleted: false });
			if (first) {
				this.$el.css('display', 'flex');
				this.model = first;
				this.model.on('destroy', this.getSome, this);
				this.render();
			} else {
				this.$el.css('display', 'none');
			}
		},
		render: function() {
			/*var data = this.model.toJSON();
			data.date = bg.formatDate.call(new Date(data.date), 'DD.MM.YYYY hh:mm:ss');
			data.content64 = utf8_to_b64(data.content);*/

			var date = bg.formatDate.call(new Date(this.model.escape('date')), 'DD.MM.YYYY hh:mm:ss');

			var content = utf8_to_b64(this.contentTemplate({ 
				content: this.model.get('content'),
				url: this.model.get('url')
			}));

			this.$el.find('h1:first').html(this.model.escape('title'));
			this.$el.find('.author').html(this.model.escape('author'));
			this.$el.find('.date').html(this.model.escape('author'));
			this.$el.find('iframe').attr('src', 'data:text/html;base64,' + content);
			//this.$el.find('footer a').attr('href', this.model.escape('url'));

			/*setTimeout(function() {
				var iframe = $('iframe').get(0);
				iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 'px';
			}, 500);*/
			//this.$el.html(this.template(data));
			return this;
		},
		handleNewSelected: function(model) {
			this.model = model;
			this.render();
		}
	}));

});

});