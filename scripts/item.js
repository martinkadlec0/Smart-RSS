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

	// Do not transalte whole body at once to prevent iframe readd
	$('#toolbar').html( bg.translate($('#toolbar').html()) );
	$('header').html( bg.translate($('header').html()) );
	$('.overlay').html( bg.translate($('.overlay').html()) );
	document.documentElement.style.fontSize = bg.settings.get('uiFontSize') + '%';

	$('iframe').load(function() {
		$('iframe').get(0).contentDocument.querySelector('#smart-rss-url').innerHTML = bg.lang.c.FULL_ARTICLE;
	});

	var toolbar = new (Backbone.View.extend({
		el: '#toolbar',
		events: {
			'click #button-print': 'handleButtonPrint',
			'click #button-read': 'handleButtonRead',
			'click #button-delete': 'handleButtonDelete',
			'click #button-config': 'handleButtonConfig',
			'click #button-download': 'handleButtonDownload',
		},
		initialize: function() {
			
		},
		handleButtonDownload: function() {
			if (!itemView.model) return;
			var tpl = _.template($('#template-download').html());
			var attrs = Object.create(itemView.model.attributes);
			attrs.date = itemView.getFormatedDate(attrs.date);
			var blob = new Blob([ tpl(attrs) ], { type: 'text\/html' });
			var url = URL.createObjectURL(blob);
			window.open(url);
			setTimeout(function() {
				URL.revokeObjectURL(url);	
			}, 30000);
			
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
				itemView.model.markAsDeleted();
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
		frameLoaded: false,
		events: {
			'mousedown': 'handleMouseDown',
			'click .pin-button': 'handlePinClick',
			'keydown': 'handleKeyDown'
		},
		handleMouseDown: function(e) {
			if (overlay.isVisible() && !e.target.matchesSelector('.overlay, .overlay *')) {
				overlay.hide();
			}
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
		getFormatedDate: function(unixtime) {
			var dateFormats = { normal: 'DD.MM.YYYY', iso: 'YYYY-MM-DD', us: 'MM/DD/YYYY' };
			var pickedFormat = dateFormats[bg.settings.get('dateType') || 'normal'] || dateFormats['normal'];

			var timeFormat = bg.settings.get('hoursFormat') == '12h' ? 'H:mm a' : 'hh:mm:ss';

			return formatDate(new Date(unixtime), pickedFormat + ' ' + timeFormat);
		},
		renderTime: null,
		render: function() {
			clearTimeout(this.renderTime);

			this.renderTime = setTimeout(function(that) {
				that.show();

				var date = that.getFormatedDate(that.model.get('date'));
				var source = that.model.getSource(); 
				var content = that.model.get('content');


				that.$el.find('h1 a').html(that.model.escape('title'));
				that.$el.find('h1 a').attr('href', escapeHtml(that.model.get('url')) );
				that.$el.find('.author').html(that.model.escape('author'));
				that.$el.find('.date').html(date);
				that.$el.find('.pin-button').toggleClass('pinned', that.model.get('pinned'));
				//that.$el.find('iframe').attr('src', 'data:text/html;charset=utf-8;base64,' + content);

				// first load might be too soon
				var fr = that.$el.find('iframe').get(0);
				fr.contentWindow.scrollTo(0, 0);
				fr.contentWindow.stop();

				if (fr.contentDocument.readyState == 'complete') {
					try {
						fr.contentDocument.documentElement.style.fontSize = bg.settings.get('articleFontSize') + '%';
						fr.contentDocument.querySelector('base').href = source ? source.get('url') : '#';
						fr.contentDocument.querySelector('#smart-rss-content').innerHTML = content;
						fr.contentDocument.querySelector('#smart-rss-url').href = that.model.get('url');
					} catch(e) {}
				} 
				if (!that.frameLoaded) {
					if (!fr.contentDocument.documentElement || fr.contentDocument.documentElement.innerHTML != content) {
						var that = that;
						fr.onload = function() {
							itemView.frameLoaded = true;
							fr.contentDocument.documentElement.style.fontSize = bg.settings.get('articleFontSize') + '%';
							fr.contentDocument.querySelector('base').href = source ? source.get('url') : '#';
							fr.contentDocument.querySelector('#smart-rss-content').innerHTML = content;
							fr.contentDocument.querySelector('#smart-rss-url').href = that.model.get('url');
						};
					}
				}
			}, 50, this);

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
			} else if (e.keyCode == 33) {
				var cw = $('iframe').get(0).contentWindow;
				var d = $('iframe').get(0).contentWindow.document;
				cw.scrollBy(0, -d.documentElement.clientHeight * 0.85);
				e.preventDefault();
			} else if (e.keyCode == 34) {
				var cw = $('iframe').get(0).contentWindow;
				var d = $('iframe').get(0).contentWindow.document;
				cw.scrollBy(0, d.documentElement.clientHeight * 0.85);
				e.preventDefault();
			} else if (e.keyCode == 35) {
				var cw = $('iframe').get(0).contentWindow;
				var d = $('iframe').get(0).contentWindow.document;
				cw.scrollTo(0, d.documentElement.offsetHeight);
				e.preventDefault();
			} else if (e.keyCode == 36) {
				var cw = $('iframe').get(0).contentWindow;
				var d = $('iframe').get(0).contentWindow.document;
				cw.scrollTo(0, 0);
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
			$('<div class="log">' + formatDate(new Date, 'hh:mm:ss') + ': ' + model.get('message') + '</div>').insertAfter(this.$el.find('#button-hide-log'));
		},
		hide: function() {
			this.$el.css('display', 'none');
		}
	}));

});

});