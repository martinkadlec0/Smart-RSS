var chrome = window.top.chrome;

document.addEventListener('contextmenu', function(e) {
	e.preventDefault();
});	


if (!Element.prototype.hasOwnProperty('matchesSelector')) {
	Element.prototype.matchesSelector = Element.prototype.webkitMatchesSelector;
}

window.addEventListener('focus', function() {
	document.documentElement.classList.add('focused');
});

window.addEventListener('blur', function() {
	document.documentElement.classList.remove('focused');
});

function fixURL(url) {
	if (url.search(/[a-z]+:\/\//) == -1) {
		url = 'http://' + url;
	}
	return url;
}


chrome.runtime.getBackgroundPage(function(bg) {

$(function() {

	var TopView = Backbone.View.extend({
		tagName: 'div',
		className: 'source',
		template: _.template($('#template-source').html()),
		handleMouseDown: function(e) {
			if (e.which == 1) {
				this.showSourceItems(e);
			} 
		},
		handleMouseUp: function(e) {
			if (e.which == 3) {
				this.showContextMenu(e);
			}
		},
		showContextMenu: function(e) {
			this.select(e);
			sourcesContextMenu.currentSource = this.model;
			sourcesContextMenu.show(e.clientX, e.clientY);
		},
		select: function(e) {
			//if (e.ctrlKey != true && e.shiftKey != true) {
				list.selectedItems = [];
				$('.selected').removeClass('selected');
			//} 

			$('.last-selected').removeClass('last-selected');

			list.selectedItems.push(this);
			this.$el.addClass('selected');
			this.$el.addClass('last-selected');
		},
		showSourceItems: function(e) {
			e = e || {};
			if (!e.noSelect) this.select(e);
			if (e.ctrlKey != true && e.shiftKey != true) {
				//bg.sources.trigger('new-selected', this.model);

				if (this.model.get('name') == 'all-feeds') {
					bg.sources.forEach(function(source) {
						source.save({ hasNew: false });
					});
					
				} else if (this.model instanceof bg.Source) {
					this.model.save({ hasNew: false });
				}

				
				window.top.frames[1].postMessage({
					action: 'new-select',
					value: this.model.id || this.model.get('filter'),
					name: this.model.get('name')
				}, '*');
			} 
		}
	});

	var SourceView = TopView.extend({
		events: {
			'mouseup': 'handleMouseUp',
			'mousedown': 'handleMouseDown',
		},
		initialize: function() {
			this.model.on('change', this.render, this);
			this.model.on('destroy', this.handleModelDestroy, this);
			this.el.view = this;
		},
		handleModelDestroy: function(e) {
			list.destroySource(this);
		},
		render: function() {
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		}
	});

	var Special = Backbone.Model.extend({
		defaults: {
			title: 'All feeds',
			icon: 'icon16_v2.png',
			name: '',
			filter: {},
			position: 'top',
			onReady: null
		}
	});

	var SpecialView = TopView.extend({
		className: 'source special',
		events: {
			'mousedown': 'handleMouseDown'
		},
		initialize: function() {
			this.el.view = this;
			if (this.model.get('onReady')) {
				this.model.get('onReady').call(this);
			}
		},
		template: _.template($('#template-special').html()),
		render: function() {
			/*if (this.model.get('position') == 'top') {
				this.$el.css('order', 1);
				this.$el.css('-webkit-order', 1);
			} else {
				this.$el.css('order', 3);
				this.$el.css('-webkit-order', 3);
			}*/
			this.$el.html(this.template(this.model.toJSON()));
			return this;
		}
	});

	var toolbar = new (Backbone.View.extend({
		el: '#toolbar',
		events: {
			'click #button-add': 'addSourceDialog',
			'click #button-reload': 'reloadSources'
		},
		initialize: function() {
			
		},
		addSourceDialog: function() {
			var url = prompt('RSS source url:').trim();
			if (url) {
				url = fixURL(url);
				bg.sources.create({
					id: bg.sourceIdIndex++,
					title: url,
					url: url,
					updateEvery: 180
				}).fetch();

				localStorage.setItem('sourceIdIndex', bg.sourceIdIndex);
			}
		},
		reloadSources: function() {
			bg.downloadAll(true);
		}
	}));


	var ContextMenu = bg.ContextMenu.extend({
		initialize: function(mc) {
			this.menuCollection = new (bg.MenuCollection)(mc);
			this.addItems(this.menuCollection);
			$('body').append(this.render().$el);

			window.addEventListener('blur', this.hide.bind(this));
			window.addEventListener('resize', this.hide.bind(this));
		},
		show: function(x, y) {
			if (x + this.$el.width() + 4 > document.body.offsetWidth) {
				x = document.body.offsetWidth - this.$el.width() - 8;
			} 
			if (y + this.$el.height() + 4 > document.body.offsetHeight) {
				y = document.body.offsetHeight - this.$el.height() - 8;
			} 
			this.$el.css('top', y + 'px');
			this.$el.css('left', x + 'px');
			this.$el.css('display', 'block');
		}
	});
	

	var sourcesContextMenu = new ContextMenu([
		{
			title: 'Update',
			icon: 'reload.png',
			action: function() {
				bg.downloadOne(sourcesContextMenu.currentSource);
			}
		},
		{ 
			title: 'Mark All As Read',
			icon: 'read.png',
			action: function() { 
				var id = sourcesContextMenu.currentSource.get('id');
				bg.items.where({ sourceID: id }).forEach(function(item) {
					item.save({
						unread: false,
						visited: true
					});
				});
			}
		},
		{ 
			title: 'Delete',
			icon: 'delete.png',
			action: function() { 
				if (confirm('Do you really want to delete this feed?')) {
					sourcesContextMenu.currentSource.destroy();	
				}
				
			}
		},
		{ 
			title: 'Properties',
			icon: 'properties.png',
			action: function() {
				properties.show(sourcesContextMenu.currentSource);
				properties.currentSource = sourcesContextMenu.currentSource;
			}
		}
	]);

	var properties = new (Backbone.View.extend({
		el: '#properties',
		currentSource: null,
		events: {
			'click button' : 'handleClick',
			'keydown button' : 'handleKeyDown',
			'click #advanced-switch' : 'handleSwitchClick',
		},
		initialize: function() {
			//$('#prop-cancel').on('click', this.hide);
			//$('#prop-cancel').on('keydown', this.handleKeyDown);
		},
		handleClick: function(e) {
			var t = e.currentTarget;
			if (t.id == 'prop-cancel') {
				this.hide();
			} else if (t.id == 'prop-ok') {
				this.saveData();
			}
		},
		saveData: function() {
			if (!this.currentSource) {
				this.hide();
				return;
			}

			this.currentSource.save({
				title: $('#prop-title').val(),
				url: fixURL($('#prop-url').val()),
				username: $('#prop-username').val(),
				password: $('#prop-password').val(),
				updateEvery: parseFloat($('#prop-update-every').val())
			});

			this.hide();

		},
		handleKeyDown: function(e) {
			if (e.keyCode == 13) {
				this.handleClick(e);
			} 
		},
		show: function(source) {
			$('#prop-title').val(source.get('title'));;
			$('#prop-url').val(source.get('url'));
			$('#prop-username').val(source.get('username'));
			$('#prop-password').val(source.get('password'));
			if (source.get('updateEvery')) {
				$('#prop-update-every').val(source.get('updateEvery'));	
			}
			
			properties.$el.css('display', 'block');
		},
		hide: function() {
			properties.$el.css('display', 'none');
		},
		handleSwitchClick: function() {
			$('#properties-advanced').toggleClass('visible');
			$('#advanced-switch').toggleClass('switched');
		}
	}));

	var list = new (Backbone.View.extend({
		el: '#list',
		selectedItems: [],
		events: {
			
		},
		initialize: function() {
			this.addSpecial(new Special({
				title: 'All feeds',
				icon: 'icon16_v2.png',
				filter: { trashed: false },
				position: 'top',
				name: 'all-feeds'
			}));

			this.addSpecial(new Special({
				title: 'Pinned',
				icon: 'pinsource.png',
				filter: { trashed: false, pinned: true },
				position: 'bottom',
				name: 'pinned'
			}));

			this.addSpecial(new Special({
				title: 'Trash',
				icon: 'trashsource.png',
				filter: { trashed: true, deleted: false },
				position: 'bottom',
				name: 'trash',
				onReady: function() {
					this.el.addEventListener('dragover', function(e) {
						e.preventDefault();
					});
					this.el.addEventListener('drop', function(e) {
						e.preventDefault();
						var id = e.dataTransfer.getData('text/plain');
						var item = bg.items.findWhere({ id: id });
						if (item && !item.get('trashed')) {
							item.save({
								trashed: true
							});
						}
					});
				}
			}));

			this.addSources(bg.sources);

			bg.sources.on('reset', this.addSources, this);
			bg.sources.on('add', this.addSource, this);
		},
		addSpecial: function(special) {

			var view = new SpecialView({ model: special });
			if (view.model.psoition == 'top') {
				this.$el.prepend(view.render().el);
			} else {
				this.$el.append(view.render().el);
			}
			
		},
		addSource: function(source) {
			var view = new SourceView({ model: source });
			var last = $('.source:not(.special):last');
			if (last.length) {
				view.render().$el.insertAfter(last);	
			} else if ($('.special:first').length) {
				// .special-first = all feeds, with more "top" specials this will have to be changed
				view.render().$el.insertAfter($('.special:first'));
			} else {
				this.$el.append(view.render().$el);
			}
		},
		addSources: function(sources) {
			$('.source').each(function(i, source) {
				if (!source.view || !(source instanceof SourceView)) return;
				list.destroySource(source.view);
			});
			sources.forEach(function(source) {
				this.addSource(source);
			}, this);
		},	
		removeSource: function(view) {
			view.model.destroy();
			/*view.undelegateEvents();
			view.$el.removeData().unbind(); 
			view.off();
			view.remove();*/
		},
		destroySource: function(view) {
			view.undelegateEvents();
			view.$el.removeData().unbind(); 
			view.off();
			view.remove();
			var io = list.selectedItems.indexOf(this);
			if (io >= 0) {
				list.selectedItems.splice(io, 1);
			}
		},
		generateAllFeedsSource: function() {

		}
	}));

	var app = new (Backbone.View.extend({
		el: 'body',
		events: {
			'keydown': 'handleKeyDown',
			'mousedown': 'handleMouseDown'
		},
		initialize: function() {
			bg.loader.on('change:loading', this.handleLoadingChange, this);
			bg.loader.on('change:loaded', this.renderIndicator, this);
			this.handleLoadingChange();
		},
		handleMouseDown: function(e) {
			if (sourcesContextMenu.el.parentNode && !e.target.matchesSelector('.context-menu, .context-menu *')) {
				// make sure the action gets executed
				sourcesContextMenu.hide();
			}
		},
		handleKeyDown: function(e) {
			if (document.activeElement && document.activeElement.tagName == 'INPUT') {
				return;
			}

			if (e.keyCode == 68) {
				//there shouldnt be same shortcut for deleting item and source
				//list.selectedItems.forEach(list.removeSource, list);
			} else if (e.keyCode == 50) {
				window.top.frames[1].focus();
				e.preventDefault();
			} else if (e.keyCode == 51) {
				window.top.frames[2].focus();
				e.preventDefault();
			} else if (e.keyCode == 38) {
				var cs = $('.selected:first');
				var s;
				if (cs.length) {
					s = cs.prevAll('.source:first').get(0);
				} else {
					s = $('.source:last').get(0);
				}
				if (s) s.view.select();
				e.preventDefault();
			} else if (e.keyCode == 40) {
				var cs = $('.selected:first');
				var s;
				if (cs.length) {
					s = cs.nextAll('.source:first').get(0);
				} else {
					s = $('.source:first').get(0);
				}
				if (s) s.view.select();
				e.preventDefault();
			} else if (e.keyCode == 13) {
				var cs = $('.selected:first');
				if (cs.length) {
					cs.get(0).view.showSourceItems({ noSelect: true });
				}
				e.preventDefault();
			}
		},
		handleLoadingChange: function(e) {
			if (bg.loader.get('loading') == true) {
				this.renderIndicator();
				$('#indicator').css('display', 'block');
			} else {
				setTimeout(function() {
					$('#indicator').css('display', 'none');
				}, 500);
			}
		},
		renderIndicator: function() {
			// should ount and show failed
			var l = bg.loader;
			var perc = Math.round(l.get('loaded') * 100 / l.get('maxSources'));
			$('#indicator').css('background', 'linear-gradient(to right,  #c5c5c5 ' + perc + '%, #eee ' + perc + '%)');
			$('#indicator').html('Updating feeds (' + l.get('loaded') + '/' + l.get('maxSources') + ')');
		}
	}));
});

});