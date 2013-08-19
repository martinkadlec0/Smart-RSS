var chrome = window.top.chrome;
var topWindow = window.top;

function utf8_to_b64( str ) {
	return btoa(unescape(encodeURIComponent( str )));
}

if (!Element.prototype.hasOwnProperty('matchesSelector')) {
	Element.prototype.matchesSelector = Element.prototype.webkitMatchesSelector;
}

chrome.runtime.getBackgroundPage(function(bg) {

$(function() {

	$('body').html( bg.translate($('body').html()) );

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
		handleButtonDelete: function(e) {
			if (!itemView.model) return;
			if (e.shiftKey) {
				itemView.model.save({
					trashed: true,
					deleted: true,
					'pinned': false,
					'content': '',
					'author': '',
					'title': ''
				});
			} else {
				itemView.model.save({
					trashed: true
				});
			}
		},
		handleButtonConfig: function() {
			overlay.show();
		}
	}));



	var overlay = new (Backbone.View.extend({
		el: '.overlay',
		events: {
			'click #config-layout input[type=image]': 'handleLayoutChange',
			'change select': 'handleSelectChange',
		},
		initialize: function() {
			window.addEventListener('blur', this.hide.bind(this));
			window.addEventListener('resize', this.hide.bind(this));
		},
		render: function() {
			var layout = bg.settings.get('layout');
			if (layout == 'vertical') {
				$('#config-layout input[value=horizontal]').attr('src', '/images/layout_horizontal.png');
				$('#config-layout input[value=vertical]').attr('src', '/images/layout_vertical_selected.png');
			} else {
				$('#config-layout input[value=horizontal]').attr('src', '/images/layout_horizontal_selected.png');
				$('#config-layout input[value=vertical]').attr('src', '/images/layout_vertical.png');
			}
			this.$el.find('#config-lines').val(bg.settings.get('lines'));
			this.$el.find('#config-sort-order').val(bg.settings.get('sortOrder'));
			return this;
		},
		handleSelectChange: function(e) {
			bg.settings.save(e.currentTarget.dataset.name, e.currentTarget.value);
		},
		handleLayoutChange: function(e) {
			var layout = e.currentTarget.value;
			bg.settings.save('layout', layout);
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
			'mousedown': 'handleMouseDown',
			'click .pin-button': 'handlePinClick',
			'mousedown iframe': 'handleIframeClick',
			'keydown': 'handleKeyDown'
		},
		handleMouseDown: function(e) {
			if (overlay.isVisible() && !e.target.matchesSelector('.overlay, .overlay *')) {
				overlay.hide();
			}
		},
		handleIframeClick: function() {
			alert('now');
			window.focus();
		},
		handlePinClick: function(e) {
			$(e.currentTarget).toggleClass('pinned');
			this.model.save({
				pinned: $(e.currentTarget).hasClass('pinned')
			});
		},
		initialize: function() {
			var that = this;
			window.addEventListener('message', function(e) {
				if (e.data.action == 'new-select') {
					that.handleNewSelected(bg.items.findWhere({ id: e.data.value }));
				} else if (e.data.action == 'no-items') {
					that.model = null;
					that.hide();
				} else if (e.data.action == 'space-pressed') {
					that.handleSpace();
				}
			});

			bg.items.on('change:pinned', this.handleItemsPin, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);
		},
		handleClearEvents: function(id) {
			if (window == null || id == window.top.tabID) {
				bg.items.off('change:pinned', this.handleItemsPin, this);
				bg.sources.off('clear-events', this.handleClearEvents, this);
			}
		},
		handleItemsPin: function(model) {
			if (model == this.model) {
				this.$el.find('.pin-button').toggleClass('pinned', this.model.get('pinned'));
			}
		},
		render: function() {

			this.show();

			var dateFormats = { normal: 'DD.MM.YYYY', iso: 'YYYY-MM-DD', us: 'MM/DD/YYYY' };
			var pickedFormat = dateFormats[bg.settings.get('dateType') || 'normal'] || dateFormats['normal'];

			var date = bg.formatDate(new Date(this.model.get('date')), pickedFormat + ' hh:mm:ss');

			var source = bg.sources.findWhere({ id: this.model.get('sourceID') });

			var content = this.contentTemplate({ 
				content: this.model.get('content'),
				url: this.model.get('url'),
				sourceUrl: source ? source.get('url') : '#'
			});

			this.$el.find('h1').html(this.model.escape('title'));
			this.$el.find('.author').html(this.model.escape('author'));
			this.$el.find('.date').html(date);
			this.$el.find('.pin-button').toggleClass('pinned', this.model.get('pinned'));
			//this.$el.find('iframe').attr('src', 'data:text/html;charset=utf-8;base64,' + content);

			// first load might be too soon
			var fr = this.$el.find('iframe').get(0);
			fr.contentWindow.scrollTo(0, 0);
			if (fr.contentDocument.readyState == 'complete') {
				fr.contentDocument.documentElement.innerHTML = content;	
			} else {
				// load event from some reason isn't enough
				setTimeout(function() {
					fr.contentDocument.documentElement.innerHTML = content;
				}, 500);
			}
			

			return this;
		},
		handleNewSelected: function(model) {
			this.model = model;
			if (!this.model) {
				// should not happen but happens
				this.hide();
			} else {
				this.render();	
			}
			
		},
		hide: function() {
			$('header,iframe').css('display', 'none');
		},
		show: function() {
			$('header,iframe').css('display', 'block');
		},
		handleSpace: function() {
			var cw = $('iframe').get(0).contentWindow;
			var d = $('iframe').get(0).contentWindow.document;
			if (d.documentElement.clientHeight + $(d.body).scrollTop() >= d.body.offsetHeight ) {
				topWindow.frames[1].postMessage({ action: 'give-me-next' }, '*');
			} else {
				cw.scrollBy(0, d.documentElement.clientHeight * 0.85);
			}
		},
		handleKeyDown: function(e) {
			if (document.activeElement && document.activeElement.tagName == 'INPUT') {
				return;
			}

			if (e.keyCode == 49) {
				topWindow.frames[0].focus();
				e.preventDefault();
			} else if (e.keyCode == 50) {
				topWindow.frames[1].focus();
				e.preventDefault();
			} else if (e.keyCode == 38) {
				var cw = $('iframe').get(0).contentWindow;
				cw.scrollBy(0, -40);
				e.preventDefault();
			} else if (e.keyCode == 40) {
				var cw = $('iframe').get(0).contentWindow;
				cw.scrollBy(0, 40);
				e.preventDefault();
			} else if (e.keyCode == 32) {
				this.handleSpace();
				e.preventDefault();
			} else if (e.keyCode == 68 || e.keyCode == 46) {
				toolbar.handleButtonDelete(e);
				e.preventDefault();
			} else if (e.keyCode == 75) {
				toolbar.handleButtonRead();
				e.preventDefault();
			}
		}
	}));


	var log = new (Backbone.View.extend({
		el: 'footer',
		events: {
			'click #button-hide-log': 'hide'
		},
		initialize: function() {
			bg.logs.on('add', this.addItem, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);
		},
		handleClearEvents: function(id) {
			if (window == null || id == window.top.tabID) {
				bg.logs.off('add', this.addItem, this);
				bg.sources.off('clear-events', this.handleClearEvents, this);
			}
		},
		addItem: function(model) {
			this.$el.css('display', 'block');
			$('<div class="log">' + bg.formatDate(new Date, 'hh:mm:ss') + ': ' + model.get('message') + '</div>').insertAfter(this.$el.find('#button-hide-log'));
		},
		hide: function() {
			this.$el.css('display', 'none');
		}
	}));

});

});